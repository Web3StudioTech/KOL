import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ethers } from 'ethers'
import { CONTRACTS, BONDING_CURVE_ABI, CHAIN } from '@/lib/contracts'
import { getAccuracyStatus, calculateRewards, formatRewardResults } from '@/lib/kolRewards'

function checkAuth(req: NextRequest): boolean {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

async function getTokenPrice(contractAddress: string, provider: ethers.JsonRpcProvider): Promise<number> {
  try {
    const contract = new ethers.Contract(CONTRACTS.BONDING_CURVE, BONDING_CURVE_ABI, provider)
    const price = await contract.getPrice(contractAddress)
    return parseFloat(ethers.formatUnits(price, 18))
  } catch { return 0 }
}

// Re-check follower counts for already-verified KOLs, so growth into
// KOL Crown after initial verification is caught automatically.
async function refreshKolFollowerCounts(log: string[]) {
  const token = process.env.TWITTER_BEARER_TOKEN
  if (!token) { log.push('[Cron] Skipping follower refresh — TWITTER_BEARER_TOKEN not set'); return }

  const { data: verified } = await supabaseAdmin
    .from('launchers')
    .select('wallet_address, twitter_handle, follower_count')
    .not('twitter_handle', 'is', null)

  for (const l of (verified || [])) {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/users/by/username/${encodeURIComponent(l.twitter_handle)}?user.fields=public_metrics`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) continue
      const json = await res.json()
      const newCount = json?.data?.public_metrics?.followers_count
      if (typeof newCount !== 'number' || newCount === l.follower_count) continue

      await supabaseAdmin.from('launchers').update({ follower_count: newCount }).eq('wallet_address', l.wallet_address)
      await supabaseAdmin.rpc('check_wallet_badges', { p_wallet: l.wallet_address })
      log.push(`[Cron] @${l.twitter_handle} followers ${l.follower_count} → ${newCount}`)
    } catch (e: any) {
      log.push(`[Cron] ⚠️ Follower refresh failed for @${l.twitter_handle}: ${e.message}`)
    }
  }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log: string[] = []
  const now = new Date()
  log.push(`[Cron] Started at ${now.toISOString()}`)

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL || CHAIN.RPC)
    const priceRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/price`)
    const { price: ethPriceUsd } = await priceRes.json()
    log.push(`[Cron] ETH price: $${ethPriceUsd}`)

    // Refresh KOL follower counts and auto-issue any newly-earned badges
    await refreshKolFollowerCounts(log)

    // Step 1 — Resolve pending calls 24h+ old
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: pendingCalls } = await supabaseAdmin
      .from('kol_calls')
      .select('*, launchers(wallet_address, twitter_handle), tokens(contract_address, ticker, volume_24h_usd)')
      .eq('accuracy_status', 'pending')
      .lt('called_at', cutoff)

    log.push(`[Cron] ${pendingCalls?.length || 0} pending calls to resolve`)

    const resolvedCalls: any[] = []

    for (const call of (pendingCalls || [])) {
      if (!call.tokens?.contract_address) continue
      const currentPrice = await getTokenPrice(call.tokens.contract_address, provider)
      if (currentPrice <= 0) continue

      const priceMultiplier = call.price_at_call > 0 ? currentPrice / call.price_at_call : 0
      const status = getAccuracyStatus(call.price_at_call, currentPrice)

      await supabaseAdmin.from('kol_calls').update({
        accuracy_status:  status,
        final_price:      currentPrice,
        price_multiplier: parseFloat(priceMultiplier.toFixed(4)),
        resolved_at:      now.toISOString(),
      }).eq('id', call.id)

      resolvedCalls.push({ ...call, accuracy_status: status, final_price: currentPrice })
      log.push(`[Cron] @${call.launchers?.twitter_handle} → $${call.tokens.ticker} → ${status.toUpperCase()} (${priceMultiplier.toFixed(2)}x)`)
    }

    // Step 2 — Calculate and distribute rewards
    const { data: stats } = await supabaseAdmin.from('platform_stats').select('volume_24h_usd').single()
    const dailyVolumeUsd = stats?.volume_24h_usd || 0
    const poolEthTotal   = (dailyVolumeUsd * 0.0005) / ethPriceUsd
    log.push(`[Cron] Pool: ${poolEthTotal.toFixed(6)} ETH`)

    const callsByToken = new Map<string, any[]>()
    for (const call of resolvedCalls) {
      if (!callsByToken.has(call.token_id)) callsByToken.set(call.token_id, [])
      callsByToken.get(call.token_id)!.push(call)
    }

    let totalDistributed = 0

    for (const [tokenId, calls] of callsByToken) {
      const tokenVolumeShare = dailyVolumeUsd > 0
        ? (calls[0].tokens?.volume_24h_usd || 0) / dailyVolumeUsd
        : 1 / callsByToken.size
      const tokenPoolEth = poolEthTotal * tokenVolumeShare

      const kolCalls = calls.map(c => ({
        id: c.id, launcher_id: c.launcher_id, token_id: c.token_id,
        wallet_address: c.launchers?.wallet_address || '',
        price_at_call: c.price_at_call, called_at: c.called_at,
        accuracy_status: c.accuracy_status,
      }))

      const rewards = calculateRewards(kolCalls, calls[0].final_price || 0, tokenPoolEth)
      log.push(formatRewardResults(rewards, ethPriceUsd))

      // Save reward calculations to database
      for (const reward of rewards) {
        await supabaseAdmin.from('kol_calls').update({
          timing_score: reward.timing_score, price_score: reward.price_score,
          raw_score: reward.raw_score, accuracy_multiplier: reward.accuracy_multiplier,
          final_score: reward.final_score, reward_share_pct: reward.reward_share_pct,
          reward_eth: reward.reward_eth,
        }).eq('id', reward.call_id)
      }

      // Pay out rewards
      if (poolEthTotal > 0.0001 && process.env.DEPLOYER_PRIVATE_KEY) {
        const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider)
        for (const reward of rewards) {
          if (reward.reward_eth < 0.000001 || !reward.wallet_address) continue
          try {
            const tx = await signer.sendTransaction({
              to: reward.wallet_address,
              value: ethers.parseEther(reward.reward_eth.toFixed(8)),
            })
            await tx.wait()
            await supabaseAdmin.from('kol_calls').update({
              reward_paid: true, payout_tx_hash: tx.hash, paid_at: new Date().toISOString(),
            }).eq('id', reward.call_id)
            totalDistributed += reward.reward_eth
            log.push(`[Cron] 💸 Paid ${reward.reward_eth.toFixed(6)} ETH → ${reward.wallet_address.slice(0,10)}...`)
          } catch (e: any) { log.push(`[Cron] ⚠️ Payout failed: ${e.message}`) }
        }
      }
    }

    await supabaseAdmin.from('platform_stats').upsert({
      id: 'main', last_cron_at: now.toISOString(), total_rewards_paid_eth: totalDistributed
    })

    log.push(`[Cron] ✅ Done. Distributed: ${totalDistributed.toFixed(6)} ETH`)
    return NextResponse.json({ ok: true, resolved: resolvedCalls.length, distributed: totalDistributed, log })

  } catch (err: any) {
    log.push(`[Cron] ❌ ${err.message}`)
    return NextResponse.json({ ok: false, error: err.message, log }, { status: 500 })
  }
}
