import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

function periodStart(period: string): string {
  const now = Date.now()
  const ms = {
    hour:  60 * 60 * 1000,
    day:   24 * 60 * 60 * 1000,
    week:  7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  }[period] || 24 * 60 * 60 * 1000
  return new Date(now - ms).toISOString()
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'day' // hour | day | week | month
  const since = periodStart(period)

  const [
    { data: tokens },
    { count: totalUsers },
    { count: tokensInPeriod },
    { count: newUsersInPeriod },
    { data: tradesInPeriod },
    { count: callsInPeriod },
    { data: badgesInPeriod },
    { data: allBadges },
  ] = await Promise.all([
    supabaseAdmin.from('tokens').select('id, ticker, name, contract_address, creator_wallet, status, market_cap_usd, price_eth, volume_24h_usd, volume_total_usd, holder_count, bonding_pct, kol_call_count, created_at, graduated_at').order('market_cap_usd', { ascending: false }),
    supabaseAdmin.from('launchers').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tokens').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabaseAdmin.from('launchers').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabaseAdmin.from('token_trades').select('wallet_address, volume_usd').gte('created_at', since),
    supabaseAdmin.from('kol_calls').select('id', { count: 'exact', head: true }).gte('called_at', since),
    supabaseAdmin.from('launcher_badges').select('wallet_address, badge, source_token').gte('earned_at', since),
    supabaseAdmin.from('launcher_badges').select('wallet_address, badge, source_token'),
  ])

  const list = tokens || []
  const totalTokens    = list.length
  const totalGraduated = list.filter(t => t.status === 'graduated').length
  const totalVolumeAll = list.reduce((sum, t) => sum + (t.volume_total_usd || 0), 0)

  // Volume + per-wallet breakdown for the selected period
  const trades = tradesInPeriod || []
  const volumeInPeriod = trades.reduce((sum, t) => sum + (t.volume_usd || 0), 0)

  const byWallet = new Map<string, { volume: number; trades: number }>()
  for (const t of trades) {
    const cur = byWallet.get(t.wallet_address) || { volume: 0, trades: 0 }
    cur.volume += t.volume_usd || 0
    cur.trades += 1
    byWallet.set(t.wallet_address, cur)
  }
  const tradingWallets = [...byWallet.entries()]
  const activeTraders = tradingWallets.length

  // Attach Twitter handles to the top traders for readability
  const topWallets = tradingWallets.sort((a, b) => b[1].volume - a[1].volume).slice(0, 50).map(w => w[0])
  const { data: handles } = topWallets.length > 0
    ? await supabaseAdmin.from('launchers').select('wallet_address, twitter_handle').in('wallet_address', topWallets)
    : { data: [] }
  const handleByWallet = new Map((handles || []).map(h => [h.wallet_address, h.twitter_handle]))

  const topTraders = tradingWallets
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 50)
    .map(([wallet, stats]) => ({
      wallet_address: wallet,
      twitter_handle: handleByWallet.get(wallet) || null,
      volume_usd: stats.volume,
      trade_count: stats.trades,
    }))

  // Fee estimates — from confirmed split, not a stored on-chain ledger (see UI note)
  const periodFees = {
    platform_revenue_usd: volumeInPeriod * 0.0025,
    creator_fees_usd:     volumeInPeriod * 0.0070,
    kol_pool_fees_usd:    volumeInPeriod * 0.0005,
  }
  const allTimeFees = {
    platform_revenue_usd: totalVolumeAll * 0.0025,
    creator_fees_usd:     totalVolumeAll * 0.0070,
    kol_pool_fees_usd:    totalVolumeAll * 0.0005,
  }

  // Badge counts
  const badges = allBadges || []
  const walletsWithBadges  = new Set(badges.map(b => b.wallet_address)).size
  const projectsWithBadges = new Set(badges.filter(b => b.source_token).map(b => b.source_token)).size
  const badgesInPeriodList = badgesInPeriod || []
  const walletsBadgedInPeriod  = new Set(badgesInPeriodList.map(b => b.wallet_address)).size
  const projectsBadgedInPeriod = new Set(badgesInPeriodList.filter(b => b.source_token).map(b => b.source_token)).size

  return NextResponse.json({
    period,
    period_stats: {
      tokens_launched: tokensInPeriod || 0,
      new_users: newUsersInPeriod || 0,
      volume_usd: volumeInPeriod,
      active_traders: activeTraders,
      kol_calls: callsInPeriod || 0,
      wallets_badged: walletsBadgedInPeriod,
      projects_badged: projectsBadgedInPeriod,
      ...periodFees,
    },
    all_time: {
      total_tokens: totalTokens,
      total_graduated: totalGraduated,
      total_users: totalUsers || 0,
      total_volume_usd: totalVolumeAll,
      total_wallets_with_badges: walletsWithBadges,
      total_projects_with_badges: projectsWithBadges,
      ...allTimeFees,
    },
    top_traders: topTraders,
    tokens: list,
  })
}
