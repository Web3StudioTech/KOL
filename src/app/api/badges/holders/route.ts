import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const badge = searchParams.get('badge')
  const limit = parseInt(searchParams.get('limit') || '12')

  let query = supabaseAdmin
    .from('launcher_badges')
    .select('wallet_address, badge, badge_number, earned_at')
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

  const handleByWallet = new Map((launchers || []).map(l => [l.wallet_address, l.twitter_handle]))
  const holders = badges.map(b => ({
    wallet_address: b.wallet_address,
    twitter_handle: handleByWallet.get(b.wallet_address) || null,
    badge: b.badge,
    badge_number: b.badge_number,
    created_at: b.earned_at,
  }))

  return NextResponse.json({ holders })
}
