import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')

  if (wallet) {
    const { data: passes } = await supabaseAdmin
      .from('tokens')
      .select('id, ticker, name, kol_pass_number, kol_pass_market_cap_usd, contract_address, creator_wallet, kol_pass_earned_at')
      .eq('creator_wallet', wallet.toLowerCase())
      .eq('kol_pass_earned', true)
      .order('kol_pass_number', { ascending: true })

    return NextResponse.json({
      passes: (passes || []).map(p => ({
        id: p.id, ticker: p.ticker, name: p.name,
        pass_number: p.kol_pass_number,
        market_cap_at_earn: p.kol_pass_market_cap_usd,
        creator_wallet: p.creator_wallet,
        earned_at: p.kol_pass_earned_at,
        tx_hash: null,
      }))
    })
  }

  const { data: passes } = await supabaseAdmin
    .from('tokens')
    .select('id, ticker, name, kol_pass_number, kol_pass_market_cap_usd, contract_address, creator_wallet, kol_pass_earned_at')
    .eq('kol_pass_earned', true)
    .order('kol_pass_number', { ascending: true })
    .limit(50)

  const { count } = await supabaseAdmin
    .from('tokens')
    .select('id', { count: 'exact', head: true })
    .eq('kol_pass_earned', true)

  return NextResponse.json({
    passes: (passes || []).map(p => ({
      id: p.id, ticker: p.ticker,
      pass_number: p.kol_pass_number,
      market_cap_at_earn: p.kol_pass_market_cap_usd,
      creator_wallet: p.creator_wallet,
      earned_at: p.kol_pass_earned_at,
    })),
    stats: {
      issued: count || 0,
      remaining: Math.max(0, 10000 - (count || 0))
    }
  })
}
