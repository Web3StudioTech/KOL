import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tab    = searchParams.get('tab') || 'tokens'
  const limit  = parseInt(searchParams.get('limit') || '20')

  try {
    if (tab === 'tokens') {
      const { data } = await supabaseAdmin
        .from('tokens')
        .select('id, ticker, name, image_url, market_cap_usd, volume_24h_usd, volume_total_usd, kol_call_count, holder_count, status, created_at, launchers(twitter_handle, badge)')
        .neq('status', 'dead')
        .order('market_cap_usd', { ascending: false })
        .limit(limit)

      return NextResponse.json({ items: data || [] })
    }

    if (tab === 'kols') {
      const { data } = await supabaseAdmin
        .from('launchers')
        .select('id, wallet_address, twitter_handle, twitter_avatar_url, follower_count, badge, earnings_eth, total_volume_usd')
        .in('badge', ['kol', 'kol_crown'])
        .eq('is_banned', false)
        .order('earnings_eth', { ascending: false })
        .limit(limit)

      // Get call accuracy for each KOL
      const enriched = await Promise.all((data || []).map(async kol => {
        const { count: total } = await supabaseAdmin
          .from('kol_calls')
          .select('id', { count: 'exact', head: true })
          .eq('launcher_id', kol.id)

        const { count: accurate } = await supabaseAdmin
          .from('kol_calls')
          .select('id', { count: 'exact', head: true })
          .eq('launcher_id', kol.id)
          .in('accuracy_status', ['hit', 'partial'])

        const accuracy = total && total > 0 ? Math.round((accurate || 0) / total * 100) : 0
        return { ...kol, total_calls: total || 0, accuracy_pct: accuracy }
      }))

      return NextResponse.json({ items: enriched })
    }

    if (tab === 'traders') {
      const { data } = await supabaseAdmin
        .from('launchers')
        .select('id, wallet_address, twitter_handle, badge, total_volume_usd')
        .in('badge', ['trader', 'anon'])
        .order('total_volume_usd', { ascending: false })
        .limit(limit)

      return NextResponse.json({ items: data || [] })
    }

    return NextResponse.json({ items: [] })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
