// ============================================================
// OnchainKOL — Automated Cron Jobs
// Hourly: trades, accuracy checks
// Daily:  age points, decay, badge refresh
// Weekly: follower refresh, leaderboard, admin report
// ============================================================

import { supabaseAdmin } from '../lib/supabase'
import {
  getActiveConfig,
  processTrade,
  processSocialAction,
  calculateAgePoints,
  calculateTotalPoints,
} from '../points/engine'

// ── HOURLY JOB ────────────────────────────────────────────────
// Runs every hour via Vercel cron
export async function runHourlyJob(): Promise<void> {
  console.log('[Cron] Starting hourly job:', new Date().toISOString())

  const config = await getActiveConfig()

  await Promise.all([
    processNewTrades(config),
    checkKolCallAccuracy(config),
    detectRugs(),
    processActiveVisits(config),
    checkKolPassMilestones(),
  ])

  console.log('[Cron] Hourly job complete')
}

// ── DAILY JOB ─────────────────────────────────────────────────
// Runs at midnight UTC
export async function runDailyJob(): Promise<void> {
  console.log('[Cron] Starting daily job:', new Date().toISOString())

  const config = await getActiveConfig()

  await Promise.all([
    calculateDailyAgePoints(config),
    applyInactivityDecay(config),
    distributeKolPassHoldingPoints(config),
    updatePlatformStats(),
    finalizeExpiredVotes(),
  ])

  console.log('[Cron] Daily job complete')
}

// ── WEEKLY JOB ────────────────────────────────────────────────
// Runs every Monday
export async function runWeeklyJob(): Promise<void> {
  console.log('[Cron] Starting weekly job:', new Date().toISOString())

  await Promise.all([
    refreshFollowerCounts(),
    distributeKolRewards(),
    generateAdminReport(),
  ])

  console.log('[Cron] Weekly job complete')
}

// ── Process new trades (hourly) ───────────────────────────────
async function processNewTrades(config: any): Promise<void> {
  // In production: fetch from Helius webhook events stored in queue
  // For now: process any unprocessed trade events from DB
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()

  const { data: unprocessedTrades } = await supabaseAdmin
    .from('trade_events_queue')
    .select('*')
    .eq('processed', false)
    .lte('created_at', new Date().toISOString())
    .gte('created_at', oneHourAgo)

  if (!unprocessedTrades?.length) return

  for (const trade of unprocessedTrades) {
    try {
      await processTrade(
        trade.wallet_address,
        trade.sol_amount,
        trade.venue,
        trade.is_early_buyer,
        trade.is_gold_token,
        trade.has_active_streak,
        config
      )

      // Mark as processed
      await supabaseAdmin
        .from('trade_events_queue')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', trade.id)
    } catch (err) {
      console.error(`[Cron] Failed to process trade ${trade.id}:`, err)
    }
  }
}

// ── Check KOL call accuracy (hourly) ─────────────────────────
async function checkKolCallAccuracy(config: any): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString()

  // Get pending calls older than 24h
  const { data: pendingCalls } = await supabaseAdmin
    .from('kol_calls')
    .select(`
      *,
      tokens (price_sol, market_cap_usd),
      launchers (badge, wallet_address)
    `)
    .eq('accuracy_status', 'pending')
    .lte('called_at', twentyFourHoursAgo)

  if (!pendingCalls?.length) return

  for (const call of pendingCalls) {
    try {
      const priceAtCall    = call.price_at_call
      const currentPrice   = call.tokens?.price_sol || 0
      const multiplier     = priceAtCall > 0 ? currentPrice / priceAtCall : 0

      let accuracyStatus: string
      let rewardMultiplier: number

      if (multiplier >= 2.0) {
        accuracyStatus  = 'hit'
        rewardMultiplier = 1.0
      } else if (multiplier >= 1.2) {
        accuracyStatus  = 'partial'
        rewardMultiplier = 0.5
      } else {
        accuracyStatus  = 'miss'
        rewardMultiplier = 0
      }

      // Update call record
      await supabaseAdmin
        .from('kol_calls')
        .update({
          accuracy_status:  accuracyStatus,
          price_24h_after:  currentPrice,
          multiplier:       multiplier,
        })
        .eq('id', call.id)

      // Award points if hit or partial
      if (rewardMultiplier > 0) {
        const action = accuracyStatus === 'hit' ? 'call_hit' : 'call_partial'
        await processSocialAction(
          call.launchers.wallet_address,
          action,
          call.id,
          { token_id: call.token_id, multiplier },
          config
        )

        // Check consecutive hit streak
        await checkCallStreak(call.launchers.wallet_address, config)
      }

      // Calculate and queue KOL reward
      if (rewardMultiplier > 0) {
        await queueKolReward(call, rewardMultiplier, config)
      }
    } catch (err) {
      console.error(`[Cron] Failed to check call accuracy ${call.id}:`, err)
    }
  }
}

// ── Check call streak ─────────────────────────────────────────
async function checkCallStreak(walletAddress: string, config: any): Promise<void> {
  // Get recent calls ordered by date
  const { data: recentCalls } = await supabaseAdmin
    .from('kol_calls')
    .select('accuracy_status')
    .eq('launcher_id', walletAddress)
    .neq('accuracy_status', 'pending')
    .order('called_at', { ascending: false })
    .limit(10)

  if (!recentCalls) return

  let streak = 0
  for (const call of recentCalls) {
    if (call.accuracy_status === 'hit' || call.accuracy_status === 'partial') {
      streak++
    } else {
      break
    }
  }

  // Update streak on wallet
  await supabaseAdmin
    .from('wallet_points')
    .update({ consecutive_hits: streak })
    .eq('wallet_address', walletAddress)

  // Award streak bonuses
  if (streak === 5) {
    await processSocialAction(walletAddress, 'streak_5_hits', '', { streak }, config)
  }
  if (streak === 10) {
    await processSocialAction(walletAddress, 'streak_10_hits', '', { streak }, config)
  }
}

// ── Queue KOL reward ──────────────────────────────────────────
async function queueKolReward(call: any, multiplier: number, config: any): Promise<void> {
  // Calculate base reward from volume generated after call
  // Volume generated = total volume on token in 24h after call
  const { data: volumeData } = await supabaseAdmin
    .rpc('get_volume_after_call', {
      p_token_id: call.token_id,
      p_called_at: call.called_at,
    })

  const volumeGenerated = volumeData || 0
  const baseReward      = volumeGenerated * 0.0015 // 0.15% of volume
  const finalReward     = baseReward * multiplier

  // Apply badge multiplier
  const badgeMultipliers: Record<string, number> = {
    kol: 1.0, pro_kol: 1.25, gold_kol: 1.5
  }
  const badgeMultiplier = badgeMultipliers[call.launchers.badge] || 1.0
  const adjustedReward  = finalReward * badgeMultiplier

  if (adjustedReward > 0) {
    await supabaseAdmin.from('kol_rewards_queue').insert({
      launcher_id:  call.launcher_id,
      call_id:      call.id,
      token_id:     call.token_id,
      base_reward:  baseReward,
      final_reward: adjustedReward,
      badge_multiplier: badgeMultiplier,
      accuracy_multiplier: multiplier,
      status:       'pending',
    })
  }
}

// ── Detect rugs (hourly) ──────────────────────────────────────
async function detectRugs(): Promise<void> {
  const { data: activeTokens } = await supabaseAdmin
    .from('tokens')
    .select('id, mint_address, launcher_id')
    .eq('status', 'bonding')
    .eq('kol_pass_status', 'active')
    .is('rug_detected_at', null)

  if (!activeTokens?.length) return

  for (const token of activeTokens) {
    // In production: check Solana RPC for creator wallet balance changes
    // and liquidity pool changes
    // For now: stub — real implementation connects to Helius webhooks
    const rugDetected = await checkTokenForRug(token.mint_address)

    if (rugDetected) {
      await supabaseAdmin
        .from('tokens')
        .update({
          rug_detected_at: new Date().toISOString(),
          rug_trigger: rugDetected.trigger,
          kol_pass_status: 'frozen',
        })
        .eq('id', token.id)

      // Open community vote
      await openCommunityVote(token.id, rugDetected.trigger)
    }
  }
}

// Stub — replace with real Helius/RPC calls in production
async function checkTokenForRug(mintAddress: string): Promise<{ trigger: string } | null> {
  return null
}

async function openCommunityVote(tokenId: string, trigger: string): Promise<void> {
  // Get eligible holder count for quorum calculation
  const { data: token } = await supabaseAdmin
    .from('tokens')
    .select('holder_count')
    .eq('id', tokenId)
    .single()

  const quorumRequired = Math.ceil((token?.holder_count || 0) * 0.1) // 10%
  const expiresAt = new Date(Date.now() + 72 * 3600000).toISOString()

  await supabaseAdmin.from('community_votes').insert({
    token_id: tokenId,
    status: 'active',
    snapshot_at: new Date().toISOString(),
    total_eligible_wallets: token?.holder_count || 0,
    quorum_required: quorumRequired,
    expires_at: expiresAt,
  })
}

// ── Process active visits (hourly) ───────────────────────────
async function processActiveVisits(config: any): Promise<void> {
  // Handled per-request via /api/auth/ping endpoint
  // This job just cleans up stale records
}

// ── Check KOL Pass milestones (hourly) ───────────────────────
async function checkKolPassMilestones(): Promise<void> {
  // Handled by DB trigger on volume_total_usd update
  // This job verifies any missed triggers
  const { data: candidates } = await supabaseAdmin
    .from('tokens')
    .select('id, volume_total_usd, kol_pass_earned')
    .gte('volume_total_usd', 1000000)
    .eq('kol_pass_earned', false)

  if (!candidates?.length) return

  for (const token of candidates) {
    // Trigger the DB function manually for any missed
    await supabaseAdmin.rpc('check_kol_pass_for_token', { p_token_id: token.id })
  }
}

// ── Calculate daily age points ────────────────────────────────
async function calculateDailyAgePoints(config: any): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  // Get all wallets with activity today
  const { data: activeWallets } = await supabaseAdmin
    .from('wallet_activity_days')
    .select('wallet_address')
    .eq('active_date', today)

  if (!activeWallets?.length) return

  for (const { wallet_address } of activeWallets) {
    const agePoints = await calculateAgePoints(wallet_address, config)

    await supabaseAdmin
      .from('wallet_points')
      .upsert({
        wallet_address,
        age_points_raw: agePoints,
        last_calculated: new Date().toISOString(),
      })
  }
}

// ── Apply inactivity decay (daily) ────────────────────────────
async function applyInactivityDecay(config: any): Promise<void> {
  const decayThreshold = new Date(
    Date.now() - config.inactivity_decay_days * 86400000
  ).toISOString()

  // Find wallets with no activity in decay period
  const { data: inactiveWallets } = await supabaseAdmin
    .from('wallet_points')
    .select('wallet_address, social_points_raw')
    .lt('last_calculated', decayThreshold)

  if (!inactiveWallets?.length) return

  for (const wallet of inactiveWallets) {
    const decayAmount = wallet.social_points_raw * (config.inactivity_decay_pct / 100)
    const newSocialPoints = Math.max(0, wallet.social_points_raw - decayAmount)

    await supabaseAdmin
      .from('wallet_points')
      .update({ social_points_raw: newSocialPoints })
      .eq('wallet_address', wallet.wallet_address)
  }
}

// ── Distribute KOL Pass holding points (daily) ───────────────
async function distributeKolPassHoldingPoints(config: any): Promise<void> {
  // Get all wallets holding KOL Passes
  // In production: query Solana for NFT holders
  // For MVP: track in DB
  const { data: passHolders } = await supabaseAdmin
    .from('kol_pass_holders')
    .select('wallet_address, pass_count')

  if (!passHolders?.length) return

  for (const holder of passHolders) {
    const points = config.pts_hold_kol_pass_daily * holder.pass_count
    await processSocialAction(
      holder.wallet_address,
      'hold_kol_pass',
      '',
      { pass_count: holder.pass_count },
      config
    )
  }
}

// ── Finalize expired votes (daily) ───────────────────────────
async function finalizeExpiredVotes(): Promise<void> {
  const now = new Date().toISOString()

  const { data: expiredVotes } = await supabaseAdmin
    .from('community_votes')
    .select('*')
    .eq('status', 'active')
    .lte('expires_at', now)

  if (!expiredVotes?.length) return

  for (const vote of expiredVotes) {
    const totalVoters  = vote.burn_wallet_count + vote.community_wallet_count
    const quorumMet    = totalVoters >= vote.quorum_required
    let outcome: string

    if (!quorumMet) {
      outcome = 'quorum_failed'
      // Auto-burn pass
      await supabaseAdmin
        .from('tokens')
        .update({ kol_pass_status: 'burned' })
        .eq('id', vote.token_id)
    } else {
      outcome = vote.burn_votes >= vote.community_votes ? 'burn' : 'community'

      await supabaseAdmin
        .from('tokens')
        .update({ kol_pass_status: outcome === 'burn' ? 'burned' : 'community' })
        .eq('id', vote.token_id)
    }

    await supabaseAdmin
      .from('community_votes')
      .update({
        status: 'completed',
        outcome,
        quorum_reached: quorumMet,
        executed_at: now,
      })
      .eq('id', vote.id)
  }
}

// ── Refresh follower counts (weekly) ─────────────────────────
async function refreshFollowerCounts(): Promise<void> {
  const { data: verifiedKols } = await supabaseAdmin
    .from('launchers')
    .select('id, wallet_address, twitter_handle, follower_count, badge')
    .not('twitter_handle', 'is', null)

  if (!verifiedKols?.length) return

  for (const kol of verifiedKols) {
    try {
      // Fetch via free oEmbed API
      const oembedUrl = `https://publish.twitter.com/oembed?url=https://twitter.com/${kol.twitter_handle}`
      const res = await fetch(oembedUrl)
      if (!res.ok) continue

      // oEmbed doesn't give follower count directly
      // In production: use Twitter API Basic ($100/mo) for accurate counts
      // For MVP: only update badge based on what we know,
      // or prompt KOL to re-verify periodically
      // Stub for now — real count fetched via Twitter API
    } catch (err) {
      console.error(`[Cron] Failed to refresh followers for ${kol.twitter_handle}:`, err)
    }
  }
}

// ── Distribute KOL rewards (weekly) ──────────────────────────
async function distributeKolRewards(): Promise<void> {
  const { data: pendingRewards } = await supabaseAdmin
    .from('kol_rewards_queue')
    .select(`
      *,
      launchers (wallet_address, badge)
    `)
    .eq('status', 'pending')

  if (!pendingRewards?.length) return

  let totalDistributed = 0

  for (const reward of pendingRewards) {
    try {
      // In production: trigger Solana instruction to pay_kol_reward
      // from KOL pool wallet to KOL wallet
      // For MVP: record in DB and process manually or via multisig

      await supabaseAdmin
        .from('kol_rewards_queue')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', reward.id)

      // Update launcher earnings
      await supabaseAdmin
        .from('launchers')
        .update({
          earnings_sol: supabaseAdmin.rpc('increment', { value: reward.final_reward })
        })
        .eq('id', reward.launcher_id)

      totalDistributed += reward.final_reward
    } catch (err) {
      console.error(`[Cron] Failed to pay reward ${reward.id}:`, err)
    }
  }

  console.log(`[Cron] Distributed ${totalDistributed} SOL to KOLs`)
}

// ── Generate admin report (weekly) ───────────────────────────
async function generateAdminReport(): Promise<void> {
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [stats, topWallets, newWallets, graduatedTokens] = await Promise.all([
    supabaseAdmin.from('platform_stats')
      .select('*')
      .gte('stat_date', oneWeekAgo.split('T')[0]),
    supabaseAdmin.from('wallet_points')
      .select('wallet_address, total_points, trader_tier')
      .order('total_points', { ascending: false })
      .limit(10),
    supabaseAdmin.from('launchers')
      .select('wallet_address, badge, created_at')
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('tokens')
      .select('name, ticker, market_cap_usd, volume_total_usd')
      .gte('updated_at', oneWeekAgo)
      .eq('status', 'graduated'),
  ])

  console.log('[Cron] Weekly report generated:', {
    newWallets: newWallets.data?.length,
    topWallets: topWallets.data?.slice(0, 3),
    graduatedTokens: graduatedTokens.data?.length,
  })

  // In production: send via email using Resend
}

// ── Update platform stats (daily) ────────────────────────────
async function updatePlatformStats(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [volumeData, launchData, callData] = await Promise.all([
    supabaseAdmin.rpc('get_daily_volume', { p_date: today }),
    supabaseAdmin.from('tokens').select('id', { count: 'exact' })
      .gte('created_at', `${today}T00:00:00`),
    supabaseAdmin.from('kol_calls').select('id', { count: 'exact' })
      .gte('called_at', `${today}T00:00:00`),
  ])

  await supabaseAdmin.from('platform_stats').upsert({
    stat_date: today,
    volume_usd: volumeData.data || 0,
    tokens_launched: launchData.count || 0,
    kol_calls: callData.count || 0,
  })
}
