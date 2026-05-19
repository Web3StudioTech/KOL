import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWalletSignature, buildSignMessage } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const {
      wallet_address,
      wallet_signature,
      nonce,
      name,
      ticker,
      description,
      image_url,
      initial_buy_sol
    } = await req.json()

    if (!wallet_address || !wallet_signature || !nonce || !name || !ticker) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Validate nonce
    const { data: nonceRow } = await supabaseAdmin
      .from('nonces')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('nonce', nonce)
      .single()

    if (!nonceRow || new Date(nonceRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 400 })
    }

    // 2. Verify wallet signature
    const message = buildSignMessage({
      wallet: wallet_address,
      nonce,
      timestamp: '',
      action: 'launch_token'
    })
    if (!verifyWalletSignature(message, wallet_signature, wallet_address)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 3. Delete nonce
    await supabaseAdmin.from('nonces').delete().eq('wallet_address', wallet_address)

    // 4. Get launcher
    const { data: launcher } = await supabaseAdmin
      .from('launchers')
      .select('id, is_banned')
      .eq('wallet_address', wallet_address)
      .single()

    if (!launcher) {
      return NextResponse.json({ error: 'Launcher not found' }, { status: 404 })
    }
    if (launcher.is_banned) {
      return NextResponse.json({ error: 'Account banned' }, { status: 403 })
    }

    // 5. Insert token
    // In production: also deploy bonding curve program on Solana here
    const { data: token, error: tokenErr } = await supabaseAdmin
      .from('tokens')
      .insert({
        launcher_id: launcher.id,
        name: name.trim(),
        ticker: ticker.trim().toUpperCase(),
        description: description?.trim() || null,
        image_url: image_url || null,
        status: 'bonding',
        market_cap_usd: 0,
        price_sol: 0,
        bonding_pct: 0
      })
      .select()
      .single()

    if (tokenErr) throw tokenErr

    return NextResponse.json({
      success: true,
      token,
      message: `${ticker.toUpperCase()} launched successfully!`
    })
  } catch (err) {
    console.error('launch token error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET - list tokens with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sort = searchParams.get('sort') || 'trending'
    const badge = searchParams.get('badge') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('tokens_with_launcher')
      .select('*')
      .neq('status', 'dead')
      .range(offset, offset + limit - 1)

    // Badge filter
    if (badge !== 'all') {
      query = query.eq('badge', badge)
    }

    // Sort
    switch (sort) {
      case 'new':
        query = query.order('created_at', { ascending: false })
        break
      case 'kol_called':
        query = query.order('kol_call_count', { ascending: false })
        break
      case 'graduating':
        query = query.order('bonding_pct', { ascending: false })
        break
      default: // trending
        query = query.order('volume_24h_usd', { ascending: false })
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ tokens: data || [] })
  } catch (err) {
    console.error('list tokens error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
