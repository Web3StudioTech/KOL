import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const badge = searchParams.get('badge')
  const limit = parseInt(searchParams.get('limit') || '12')

  let query = supabaseAdmin
    .from('launcher_badges')
    .select('wallet_address, badge, badge_number, source_token, earned_at')
    .neq('badge', 'anon')
    .order('earned_at', { ascending: false })
    .limit(limit)

  if (badge) query = query.eq('badge', badge)

  const { data: badges } = await query
  if (!badges || badges.length === 0) return NextResponse.json({ holders: [] })

  const wallets = [...new Set(badges.map(b => b.wallet_address))]
  const { data: launchers } = await supabaseAdmin
    .from('launchers')
    .select('wallet_address, twitter_handle')
    .in('wallet_address', wallets)

  const tokenAddrs = [...new Set(badges.map(b => b.source_token).filter(Boolean))]
  const { data: tokens } = tokenAddrs.length > 0
    ? await supabaseAdmin.from('tokens').select('contract_address, ticker, name').in('contract_address', tokenAddrs)
    : { data: [] }

  const handleByWallet = new Map((launchers || []).map(l => [l.wallet_address, l.twitter_handle]))
  const tokenByAddr = new Map((tokens || []).map(t => [t.contract_address, t]))

  const holders = badges.map(b => ({
    wallet_address: b.wallet_address,
    twitter_handle: handleByWallet.get(b.wallet_address) || null,
    badge: b.badge,
    badge_number: b.badge_number,
    created_at: b.earned_at,
    token_ticker: b.source_token ? tokenByAddr.get(b.source_token)?.ticker || null : null,
    token_name: b.source_token ? tokenByAddr.get(b.source_token)?.name || null : null,
  }))

  return NextResponse.json({ holders })
}
