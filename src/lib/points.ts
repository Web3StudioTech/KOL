// ============================================================
// OnchainKOL — Points Calculation Engine
// Configurable weights. Works backwards on config change.
// Admin-only. Never exposed to public.
// ============================================================

import { supabaseAdmin } from './supabase'
// ── Types ─────────────────────────────────────────────────────
export interface PointsConfig {
  version: number
  volume_weight: number
  social_weight: number
  age_weight: number
  active_weight: number
  points_per_sol: number
  bonding_curve_multiplier: number
  kolswap_multiplier: number
  early_buyer_multiplier: number
  gold_token_multiplier: number
  trading_streak_multiplier: number
  silver_threshold_sol: number
  gold_threshold_sol: number
  diamond_threshold_sol: number
  silver_bonus_pct: number
  gold_bonus_pct: number
  diamond_bonus_pct: number
  pts_launch_token: number
  pts_token_graduates: number
  pts_token_hits_1m: number
  pts_verified_badge: number
  pts_kol_badge: number
  pts_pro_kol_badge: number
  pts_gold_kol_badge: number
  pts_call_submitted: number
  pts_call_hit: number
  pts_call_partial: number
  pts_referral_joined: number
  pts_referral_traded: number
  pts_hold_kol_pass_daily: number
  pts_vote_cast: number
  pts_vote_winner: number
  pts_streak_5_hits: number
  pts_streak_10_hits: number
  pts_age_day_1_30: number
  pts_age_day_31_90: number
  pts_age_day_91_180: number
  pts_age_day_181_365: number
  pts_age_day_365_plus: number
  pts_active_day_1_30: number
  pts_active_day_31_60: number
  pts_active_day_61_90: number
  pts_active_day_91_plus: number
  pts_streak_7_days: number
  pts_streak_30_days: number
  pts_streak_100_days: number
  pts_streak_365_days: number
  min_trade_sol: number
  inactivity_decay_days: number
  inactivity_decay_pct: number
}

export interface WalletPoints {
  wallet_address: string
  volume_points_raw: number
  social_points_raw: number
  age_points_raw: number
  active_points_raw: number
  total_points: number
  trader_tier: string
  total_sol_traded: number
  current_streak: number
  longest_streak: number
}

// ── Load active config ────────────────────────────────────────
export async function getActiveConfig(): Promise<PointsConfig> {
  const { data, error } = await supabaseAdmin
    .from('points_config')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error || !data) throw new Error('No active points config found')
  return data as PointsConfig
}

// ── Calculate total points from raw components ────────────────
export function calculateTotalPoints(
  volumeRaw: number,
  socialRaw: number,
  ageRaw: number,
  activeRaw: number,
  config: PointsConfig
): number {
  return (
    (volumeRaw  * config.volume_weight / 100) +
    (socialRaw  * config.social_weight / 100) +
    (ageRaw     * config.age_weight    / 100) +
    (activeRaw  * config.active_weight / 100)
  )
}

// ── Get trader tier from SOL volume ───────────────────────────
export function getTraderTier(totalSolTraded: number, config: PointsConfig): string {
  if (totalSolTraded >= config.diamond_threshold_sol) return 'diamond'
  if (totalSolTraded >= config.gold_threshold_sol)    return 'gold'
  if (totalSolTraded >= config.silver_threshold_sol)  return 'silver'
  if (totalSolTraded > 0)                             return 'bronze'
  return 'none'
}

// ── Get tier multiplier ───────────────────────────────────────
export function getTierMultiplier(tier: string, config: PointsConfig): number {
  switch (tier) {
    case 'diamond': return 1 + config.diamond_bonus_pct / 100
    case 'gold':    return 1 + config.gold_bonus_pct    / 100
    case 'silver':  return 1 + config.silver_bonus_pct  / 100
    default:        return 1.0
  }
}

// ── Process a trade event ─────────────────────────────────────
export async function processTrade(
  walletAddress: string,
  solAmount: number,
  tradingVenue: 'bonding_curve' | 'kolswap',
  isEarlyBuyer: boolean,
  isGoldToken: boolean,
  hasActiveStreak: boolean,
  config: PointsConfig
): Promise<number> {
  // Minimum trade size check
  if (solAmount < config.min_trade_sol) return 0

  let basePoints = solAmount * config.points_per_sol

  // Apply venue multiplier
  const venueMultiplier = tradingVenue === 'kolswap'
    ? config.kolswap_multiplier
    : config.bonding_curve_multiplier
  basePoints *= venueMultiplier

  // Apply other multipliers
  if (isEarlyBuyer) basePoints *= config.early_buyer_multiplier
  if (isGoldToken)  basePoints *= config.gold_token_multiplier
  if (hasActiveStreak) basePoints *= config.trading_streak_multiplier

  // Apply tier bonus
  const { data: walletData } = await supabaseAdmin
    .from('wallet_points')
    .select('total_sol_traded, trader_tier')
    .eq('wallet_address', walletAddress)
    .single()

  const currentSol = walletData?.total_sol_traded || 0
  const tier = getTraderTier(currentSol + solAmount, config)
  const tierMultiplier = getTierMultiplier(tier, config)
  basePoints *= tierMultiplier

  const pointsEarned = Math.floor(basePoints)

  // Log raw event
  await logPointsEvent(walletAddress, 'trade', 'volume', pointsEarned, {
    sol_amount: solAmount,
    venue: tradingVenue,
    is_early_buyer: isEarlyBuyer,
    is_gold_token: isGoldToken,
    tier,
    venue_multiplier: venueMultiplier,
    tier_multiplier: tierMultiplier,
  }, config.version)

  // Update wallet totals
  await updateWalletVolume(walletAddress, solAmount, pointsEarned, tier, config)

  return pointsEarned
}

// ── Process social action ─────────────────────────────────────
export async function processSocialAction(
  walletAddress: string,
  action: string,
  referenceId: string,
  metadata: Record<string, any>,
  config: PointsConfig
): Promise<number> {
  const pointsMap: Record<string, number> = {
    'launch_token':      config.pts_launch_token,
    'token_graduates':   config.pts_token_graduates,
    'token_hits_1m':     config.pts_token_hits_1m,
    'verified_badge':    config.pts_verified_badge,
    'kol_badge':         config.pts_kol_badge,
    'pro_kol_badge':     config.pts_pro_kol_badge,
    'gold_kol_badge':    config.pts_gold_kol_badge,
    'call_submitted':    config.pts_call_submitted,
    'call_hit':          config.pts_call_hit,
    'call_partial':      config.pts_call_partial,
    'referral_joined':   config.pts_referral_joined,
    'referral_traded':   config.pts_referral_traded,
    'hold_kol_pass':     config.pts_hold_kol_pass_daily,
    'vote_cast':         config.pts_vote_cast,
    'vote_winner':       config.pts_vote_winner,
    'streak_5_hits':     config.pts_streak_5_hits,
    'streak_10_hits':    config.pts_streak_10_hits,
  }

  const pointsEarned = pointsMap[action] || 0
  if (pointsEarned === 0) return 0

  await logPointsEvent(
    walletAddress, action, 'social',
    pointsEarned, { ...metadata, reference_id: referenceId },
    config.version
  )

  await supabaseAdmin.rpc('increment_wallet_social_points', {
    p_wallet: walletAddress,
    p_points: pointsEarned,
    p_config_version: config.version,
  })

  return pointsEarned
}

// ── Process daily active visit ────────────────────────────────
export async function processDailyVisit(
  walletAddress: string,
  config: PointsConfig
): Promise<{ points: number; streak: number; bonus: number }> {
  const today = new Date().toISOString().split('T')[0]

  // Check if already recorded today
  const { data: existing } = await supabaseAdmin
    .from('wallet_active_days')
    .select('*')
    .eq('wallet_address', walletAddress)
    .eq('active_date', today)
    .single()

  if (existing) return { points: 0, streak: existing.streak_day, bonus: 0 }

  // Get yesterday's record to calculate streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const { data: yesterdayRecord } = await supabaseAdmin
    .from('wallet_active_days')
    .select('streak_day')
    .eq('wallet_address', walletAddress)
    .eq('active_date', yesterday)
    .single()

  const streak = yesterdayRecord ? yesterdayRecord.streak_day + 1 : 1

  // Calculate points based on streak
  let pointsPerDay: number
  if (streak <= 30)      pointsPerDay = config.pts_active_day_1_30
  else if (streak <= 60) pointsPerDay = config.pts_active_day_31_60
  else if (streak <= 90) pointsPerDay = config.pts_active_day_61_90
  else                   pointsPerDay = config.pts_active_day_91_plus

  // Streak bonuses
  let bonus = 0
  if (streak === 7)   bonus = config.pts_streak_7_days
  if (streak === 30)  bonus = config.pts_streak_30_days
  if (streak === 100) bonus = config.pts_streak_100_days
  if (streak === 365) bonus = config.pts_streak_365_days

  const totalPoints = pointsPerDay + bonus

  // Record active day
  await supabaseAdmin.from('wallet_active_days').insert({
    wallet_address: walletAddress,
    active_date: today,
    streak_day: streak,
    points_earned: totalPoints,
  })

  // Log events
  await logPointsEvent(walletAddress, 'daily_visit', 'active', pointsPerDay, { streak }, config.version)
  if (bonus > 0) {
    await logPointsEvent(walletAddress, 'streak_bonus', 'active', bonus, { streak, milestone: streak }, config.version)
  }

  // Update wallet active points and streak
  await supabaseAdmin.rpc('update_wallet_active_points', {
    p_wallet: walletAddress,
    p_points: totalPoints,
    p_streak: streak,
    p_config_version: config.version,
  })

  return { points: pointsPerDay, streak, bonus }
}

// ── Calculate age points for a wallet ────────────────────────
export async function calculateAgePoints(
  walletAddress: string,
  config: PointsConfig
): Promise<number> {
  // Get all active days grouped by period
  const { data: activityDays } = await supabaseAdmin
    .from('wallet_activity_days')
    .select('active_date')
    .eq('wallet_address', walletAddress)
    .order('active_date', { ascending: true })

  if (!activityDays || activityDays.length === 0) return 0

  const firstDay = new Date(activityDays[0].active_date)
  let totalAgePoints = 0

  activityDays.forEach((day, index) => {
    const dayNumber = index + 1
    const platformAge = Math.floor(
      (new Date(day.active_date).getTime() - firstDay.getTime()) / 86400000
    ) + 1

    let ptsPerDay: number
    if (platformAge <= 30)       ptsPerDay = config.pts_age_day_1_30
    else if (platformAge <= 90)  ptsPerDay = config.pts_age_day_31_90
    else if (platformAge <= 180) ptsPerDay = config.pts_age_day_91_180
    else if (platformAge <= 365) ptsPerDay = config.pts_age_day_181_365
    else                         ptsPerDay = config.pts_age_day_365_plus

    totalAgePoints += ptsPerDay
  })

  return Math.floor(totalAgePoints)
}

// ── Full recalculation for all wallets ────────────────────────
// Called when config changes — works backwards on all raw events
export async function recalculateAllWallets(
  newConfig: PointsConfig,
  oldVersion: number,
  triggeredBy: string
): Promise<void> {
  console.log(`[Points] Starting full recalculation v${oldVersion} → v${newConfig.version}`)

  // Log recalculation start
  const { data: recalcLog } = await supabaseAdmin
    .from('points_recalculations')
    .insert({
      from_version: oldVersion,
      to_version: newConfig.version,
      triggered_by: triggeredBy,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  const recalcId = recalcLog?.id

  try {
    // Get all unique wallets
    const { data: wallets } = await supabaseAdmin
      .from('wallet_points')
      .select('wallet_address')

    if (!wallets) return

    let walletsProcessed = 0
    let eventsProcessed  = 0

    // Process in batches of 100
    const batchSize = 100
    for (let i = 0; i < wallets.length; i += batchSize) {
      const batch = wallets.slice(i, i + batchSize)

      await Promise.all(batch.map(async ({ wallet_address }) => {
        const result = await recalculateWallet(wallet_address, newConfig)
        eventsProcessed += result.eventsProcessed
        walletsProcessed++
      }))

      console.log(`[Points] Processed ${walletsProcessed}/${wallets.length} wallets`)
    }

    // Mark complete
    await supabaseAdmin
      .from('points_recalculations')
      .update({
        status: 'completed',
        wallets_processed: walletsProcessed,
        events_processed: eventsProcessed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', recalcId)

    console.log(`[Points] Recalculation complete. ${walletsProcessed} wallets, ${eventsProcessed} events`)
  } catch (err) {
    await supabaseAdmin
      .from('points_recalculations')
      .update({ status: 'failed' })
      .eq('id', recalcId)
    throw err
  }
}

// ── Recalculate a single wallet from raw events ───────────────
export async function recalculateWallet(
  walletAddress: string,
  config: PointsConfig
): Promise<{ eventsProcessed: number }> {
  // Fetch all raw events for this wallet
  const { data: events } = await supabaseAdmin
    .from('points_events')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('earned_at', { ascending: true })

  if (!events || events.length === 0) return { eventsProcessed: 0 }

  // Sum raw points by category
  let volumeRaw = 0
  let socialRaw = 0
  let ageRaw    = 0
  let activeRaw = 0
  let totalSolTraded = 0

  for (const event of events) {
    switch (event.event_category) {
      case 'volume':
        volumeRaw += event.points_raw
        if (event.metadata?.sol_amount) {
          totalSolTraded += event.metadata.sol_amount
        }
        break
      case 'social': socialRaw += event.points_raw; break
      case 'age':    ageRaw    += event.points_raw; break
      case 'active': activeRaw += event.points_raw; break
    }
  }

  // Recalculate age points with new config
  const freshAgePoints = await calculateAgePoints(walletAddress, config)

  // Calculate total with new weights
  const totalPoints = calculateTotalPoints(
    volumeRaw, socialRaw, freshAgePoints, activeRaw, config
  )

  const tier = getTraderTier(totalSolTraded, config)

  // Update wallet_points record
  await supabaseAdmin
    .from('wallet_points')
    .upsert({
      wallet_address: walletAddress,
      volume_points_raw: volumeRaw,
      social_points_raw: socialRaw,
      age_points_raw: freshAgePoints,
      active_points_raw: activeRaw,
      total_points: Math.floor(totalPoints),
      trader_tier: tier,
      total_sol_traded: totalSolTraded,
      config_version: config.version,
      last_calculated: new Date().toISOString(),
    })

  return { eventsProcessed: events.length }
}

// ── Activate a new config version ────────────────────────────
export async function activateConfig(
  newVersion: number,
  activatedBy: string
): Promise<void> {
  // Get current active version
  const { data: current } = await supabaseAdmin
    .from('points_config')
    .select('version')
    .eq('is_active', true)
    .single()

  const oldVersion = current?.version || 0

  // Deactivate old
  await supabaseAdmin
    .from('points_config')
    .update({
      is_active: false,
      superseded_at: new Date().toISOString()
    })
    .eq('is_active', true)

  // Activate new
  const { data: newConfig } = await supabaseAdmin
    .from('points_config')
    .update({
      is_active: true,
      activated_at: new Date().toISOString(),
      created_by: activatedBy,
    })
    .eq('version', newVersion)
    .select()
    .single()

  if (!newConfig) throw new Error('Config version not found')

  // Trigger full recalculation in background
  recalculateAllWallets(newConfig as PointsConfig, oldVersion, activatedBy)
    .catch(err => console.error('[Points] Recalculation failed:', err))
}

// ── Take airdrop snapshot ────────────────────────────────────
export async function takeAirdropSnapshot(
  name: string,
  notes: string,
  createdBy: string
): Promise<string> {
  const config = await getActiveConfig()

  // Get all wallet points
  const { data: wallets } = await supabaseAdmin
    .from('wallet_points')
    .select('*')
    .order('total_points', { ascending: false })

  if (!wallets) throw new Error('No wallet data')

  const totalPoints = wallets.reduce((sum, w) => sum + (w.total_points || 0), 0)

  const { data: snapshot } = await supabaseAdmin
    .from('airdrop_snapshots')
    .insert({
      snapshot_name: name,
      snapshot_at: new Date().toISOString(),
      config_version: config.version,
      total_wallets: wallets.length,
      total_points: totalPoints,
      top_wallet: wallets[0]?.wallet_address,
      top_wallet_points: wallets[0]?.total_points,
      data: wallets,
      created_by: createdBy,
      notes,
    })
    .select('id')
    .single()

  return snapshot?.id || ''
}

// ── Helper: log a points event ────────────────────────────────
async function logPointsEvent(
  walletAddress: string,
  eventType: string,
  category: 'volume' | 'social' | 'age' | 'active',
  pointsRaw: number,
  metadata: Record<string, any>,
  configVersion: number
): Promise<void> {
  await supabaseAdmin.from('points_events').insert({
    wallet_address: walletAddress,
    event_type: eventType,
    event_category: category,
    points_raw: pointsRaw,
    metadata,
    config_version: configVersion,
    earned_at: new Date().toISOString(),
  })
}

// ── Helper: update wallet volume ──────────────────────────────
async function updateWalletVolume(
  walletAddress: string,
  solAmount: number,
  pointsEarned: number,
  tier: string,
  config: PointsConfig
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('wallet_points')
    .select('volume_points_raw, total_sol_traded, social_points_raw, age_points_raw, active_points_raw')
    .eq('wallet_address', walletAddress)
    .single()

  const volumeRaw = (existing?.volume_points_raw || 0) + pointsEarned
  const totalSol  = (existing?.total_sol_traded   || 0) + solAmount
  const socialRaw = existing?.social_points_raw   || 0
  const ageRaw    = existing?.age_points_raw       || 0
  const activeRaw = existing?.active_points_raw    || 0

  const totalPoints = calculateTotalPoints(volumeRaw, socialRaw, ageRaw, activeRaw, config)

  await supabaseAdmin.from('wallet_points').upsert({
    wallet_address: walletAddress,
    volume_points_raw: volumeRaw,
    total_sol_traded: totalSol,
    total_points: Math.floor(totalPoints),
    trader_tier: tier,
    config_version: config.version,
    last_calculated: new Date().toISOString(),
  })
}
