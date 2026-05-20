import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tokenId = searchParams.get('token_id')
  const launcherId = searchParams.get('launcher_id')

  let query = supabaseAdmin
    .from('kol_calls')
    .select(`*, launchers_public(twitter_handle, badge, follower_count), tokens(ticker, name)`)
    .order('called_at', { ascending: false })
    .limit(50)

  if (tokenId) query = query.eq('token_id', tokenId)
  if (launcherId) query = query.eq('launcher_id', launcherId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ calls: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { wallet_address, wallet_signature, nonce, token_id, thesis } = body

  if (!wallet_address || !wallet_signature || !token_id) {
    return NextResponse.json({ error: 'wallet_address, wallet_signature, token_id required' }, { status: 400 })
  }

  // Get launcher
  const { data: launcher } = await supabaseAdmin
    .from('launchers')
    .select('id, badge, wallet_address')
    .eq('wallet_address', wallet_address)
    .single()

  if (!launcher) return NextResponse.json({ error: 'Wallet not registered' }, { status: 404 })
  if (!['kol','pro_kol','gold_kol'].includes(launcher.badge)) {
    return NextResponse.json({ error: 'KOL badge required to submit calls' }, { status: 403 })
  }

  // Get token price snapshot
  const { data: token } = await supabaseAdmin
    .from('tokens')
    .select('price_sol, market_cap_usd, launcher_id')
    .eq('id', token_id)
    .single()

  if (!token) return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  if (token.launcher_id === launcher.id) {
    return NextResponse.json({ error: 'Cannot call your own token' }, { status: 400 })
  }

  // Check not already called
  const { data: existing } = await supabaseAdmin
    .from('kol_calls')
    .select('id')
    .eq('launcher_id', launcher.id)
    .eq('token_id', token_id)
    .single()

  if (existing) return NextResponse.json({ error: 'Already called this token' }, { status: 400 })

  const { data: call, error } = await supabaseAdmin
    .from('kol_calls')
    .insert({
      launcher_id: launcher.id,
      token_id,
      thesis: thesis || null,
      wallet_signature,
      price_at_call: token.price_sol,
      mktcap_at_call: token.market_cap_usd,
      accuracy_status: 'pending',
      called_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, call })
}
