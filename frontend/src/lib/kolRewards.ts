/**
 * OnchainKOL — KOL Reward Math Engine
 *
 * Formula per call:
 *   Raw Score = (Timing Score × 0.40) + (Price Score × 0.60)
 *   Final Score = Raw Score × Accuracy Multiplier
 *   Reward Share = Final Score / Sum of all Final Scores
 *
 * Timing Score:
 *   Earlier callers score higher
 *   Score = (Total callers - rank + 1) / Total callers
 *
 * Price Score:
 *   Lower call price = higher return = higher score
 *   Score = their multiplier / sum of all multipliers
 *
 * Accuracy Multiplier:
 *   HIT (2x+)        = 1.00
 *   PARTIAL (1.2-2x) = 0.50
 *   MISS (below 1.2x)= 0.00
 */

export interface KolCall {
  id:             string
  launcher_id:    string
  token_id:       string
  wallet_address: string
  price_at_call:  number   // ETH price when called
  called_at:      string   // ISO timestamp
  accuracy_status: 'pending' | 'hit' | 'partial' | 'miss'
  timing_rank?:   number
  timing_score?:  number
  price_score?:   number
  raw_score?:     number
  final_score?:   number
  reward_share?:  number   // percentage 0-100
  reward_eth?:    number
}

export interface RewardResult {
  call_id:         string
  launcher_id:     string
  wallet_address:  string
  timing_score:    number
  price_score:     number
  raw_score:       number
  accuracy_multiplier: number
  final_score:     number
  reward_share_pct: number
  reward_eth:      number
}

// ── Accuracy check ────────────────────────────────────────────
export function getAccuracyStatus(priceAtCall: number, currentPrice: number): 'hit' | 'partial' | 'miss' {
  if (priceAtCall <= 0) return 'miss'
  const multiplier = currentPrice / priceAtCall
  if (multiplier >= 2.0)  return 'hit'
  if (multiplier >= 1.2)  return 'partial'
  return 'miss'
}

export function getAccuracyMultiplier(status: string): number {
  switch (status) {
    case 'hit':     return 1.00
    case 'partial': return 0.50
    case 'miss':    return 0.00
    default:        return 0.00
  }
}

// ── Calculate timing scores for all calls on a token ─────────
export function calculateTimingScores(calls: KolCall[]): Map<string, number> {
  // Sort by call time — earliest first
  const sorted = [...calls].sort((a, b) =>
    new Date(a.called_at).getTime() - new Date(b.called_at).getTime()
  )

  const total = sorted.length
  const scores = new Map<string, number>()

  sorted.forEach((call, index) => {
    const rank = index + 1
    // Earlier = higher score
    // Rank 1 (earliest) gets score = total/total = 1.0
    // Rank N (latest)   gets score = 1/total
    const score = (total - rank + 1) / total
    scores.set(call.id, score)
  })

  return scores
}

// ── Calculate price scores for all calls on a token ──────────
export function calculatePriceScores(
  calls: KolCall[],
  currentPrice: number
): Map<string, number> {
  // Price multiplier per call
  const multipliers = calls.map(call => ({
    id:         call.id,
    multiplier: call.price_at_call > 0 ? currentPrice / call.price_at_call : 0,
  }))

  const totalMultiplier = multipliers.reduce((sum, m) => sum + m.multiplier, 0)
  const scores = new Map<string, number>()

  multipliers.forEach(({ id, multiplier }) => {
    const score = totalMultiplier > 0 ? multiplier / totalMultiplier : 0
    scores.set(id, score)
  })

  return scores
}

// ── Main reward calculation ───────────────────────────────────
export function calculateRewards(
  calls:        KolCall[],
  currentPrice: number,
  poolEth:      number,   // total ETH available in pool for this batch
): RewardResult[] {
  if (calls.length === 0 || poolEth <= 0) return []

  // Filter to calls that have been resolved (not pending)
  const resolved = calls.filter(c => c.accuracy_status !== 'pending')
  if (resolved.length === 0) return []

  // Calculate timing and price scores
  const timingScores = calculateTimingScores(resolved)
  const priceScores  = calculatePriceScores(resolved, currentPrice)

  // Calculate raw score and apply accuracy multiplier
  const scored = resolved.map(call => {
    const timingScore  = timingScores.get(call.id) || 0
    const priceScore   = priceScores.get(call.id)  || 0
    const rawScore     = (timingScore * 0.40) + (priceScore * 0.60)
    const multiplier   = getAccuracyMultiplier(call.accuracy_status)
    const finalScore   = rawScore * multiplier

    return {
      call,
      timingScore,
      priceScore,
      rawScore,
      multiplier,
      finalScore,
    }
  })

  // Sum of all final scores for normalization
  const totalFinalScore = scored.reduce((sum, s) => sum + s.finalScore, 0)

  // Calculate reward amounts
  const results: RewardResult[] = scored.map(s => {
    const rewardSharePct = totalFinalScore > 0
      ? (s.finalScore / totalFinalScore) * 100
      : 0

    const rewardEth = (rewardSharePct / 100) * poolEth

    return {
      call_id:              s.call.id,
      launcher_id:          s.call.launcher_id,
      wallet_address:       s.call.wallet_address,
      timing_score:         parseFloat(s.timingScore.toFixed(6)),
      price_score:          parseFloat(s.priceScore.toFixed(6)),
      raw_score:            parseFloat(s.rawScore.toFixed(6)),
      accuracy_multiplier:  s.multiplier,
      final_score:          parseFloat(s.finalScore.toFixed(6)),
      reward_share_pct:     parseFloat(rewardSharePct.toFixed(4)),
      reward_eth:           parseFloat(rewardEth.toFixed(8)),
    }
  })

  // Sort by reward amount descending
  return results.sort((a, b) => b.reward_eth - a.reward_eth)
}

// ── Format results for display ────────────────────────────────
export function formatRewardResults(results: RewardResult[], ethPriceUsd: number): string {
  const lines = ['KOL Reward Distribution:', '─'.repeat(60)]

  results.forEach((r, i) => {
    const rank = i + 1
    const usd  = r.reward_eth * ethPriceUsd
    lines.push(
      `${rank}. ${r.wallet_address.slice(0,10)}...` +
      `  Share: ${r.reward_share_pct.toFixed(2)}%` +
      `  Earned: ${r.reward_eth.toFixed(6)} ETH ($${usd.toFixed(2)})` +
      `  [T:${r.timing_score.toFixed(2)} P:${r.price_score.toFixed(2)} x${r.accuracy_multiplier}]`
    )
  })

  const totalEth = results.reduce((s, r) => s + r.reward_eth, 0)
  lines.push('─'.repeat(60))
  lines.push(`Total distributed: ${totalEth.toFixed(6)} ETH ($${(totalEth * ethPriceUsd).toFixed(2)})`)

  return lines.join('\n')
}
