import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sort = searchParams.get('sort') || 'trending'
  const badge = searchParams.get('badge') || 'all'
  const limit = parseInt(searchParams.get('limit') || '20')

  let query = supabaseAdmin
    .from('tokens_public')
    .select('*')
    .neq('status', 'dead')
    .limit(limit)

  if (badge !== 'all') query = query.eq('launcher_badge', badge)

  switch (sort) {
    case 'new':        query = query.order('created_at', { ascending: false }); break
    case 'kol_called': query = query.gt('kol_call_count', 0).order('kol_call_count', { ascending: false }); break
    case 'graduating': query = query.gt('bonding_pct', 80).order('bonding_pct', { ascending: false }); break
    default:           query = query.order('volume_24h_usd', { ascending: false })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tokens: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { wallet_address, name, ticker, tagline, description, category,
    image_url, banner_url, website_url, twitter_url, telegram_url,
    discord_url, youtube_url, tiktok_url, github_url } = body

  if (!wallet_address || !name || !ticker) {
    return NextResponse.json({ error: 'wallet_address, name, ticker required' }, { status: 400 })
  }

  // Get or create launcher
  let { data: launcher } = await supabaseAdmin
    .from('launchers')
    .select('id')
    .eq('wallet_address', wallet_address)
    .single()

  if (!launcher) {
    const { data: newLauncher, error: launchErr } = await supabaseAdmin
      .from('launchers')
      .insert({ wallet_address })
      .select('id')
      .single()
    if (launchErr) return NextResponse.json({ error: launchErr.message }, { status: 500 })
    launcher = newLauncher
  }

  const { data: token, error } = await supabaseAdmin
    .from('tokens')
    .insert({
      launcher_id: launcher!.id,
      name, ticker: ticker.toUpperCase(),
      tagline, description, category,
      image_url, banner_url,
      website_url, twitter_url, telegram_url,
      discord_url, youtube_url, tiktok_url, github_url,
      status: 'bonding',
      market_cap_usd: 0, price_sol: 0,
      volume_24h_usd: 0, volume_total_usd: 0,
      holder_count: 0, bonding_pct: 0, kol_call_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, token })
}
