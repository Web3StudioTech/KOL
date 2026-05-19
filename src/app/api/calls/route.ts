import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWalletSignature, buildSignMessage, buildCallTweetUrl } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const {
      wallet_address,
      wallet_signature,
      nonce,
      token_id,
      thesis,
      tweet_url
    } = await req.json()

    if (!wallet_address || !wallet_signature || !nonce || !token_id) {
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
      action: 'submit_call'
    })
    if (!verifyWalletSignature(message, wallet_signature, wallet_address)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 3. Delete nonce
    await supabaseAdmin.from('nonces').delete().eq('wallet_address', wallet_address)

    // 4. Get launcher and verify KOL status
    const { data: launcher } = await supabaseAdmin
      .from('launchers')
      .select('id, badge, is_banned')
      .eq('wallet_address', wallet_address)
      .single()

    if (!launcher) {
      return NextResponse.json({ error: 'Launcher not found' }, { status: 404 })
    }
    if (launcher.is_banned) {
      return NextResponse.json({ error: 'Account banned' }, { status: 403 })
    }
    if (launcher.badge !== 'kol') {
      return NextResponse.json(
        { error: 'Only KOLs (1000+ followers) can submit calls' },
        { status: 403 }
      )
    }

    // 5. Check not already called this token
    const { data: existing } = await supabaseAdmin
      .from('kol_calls')
      .select('id')
      .eq('launcher_id', launcher.id)
      .eq('token_id', token_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You already called this token' },
        { status: 409 }
      )
    }

    // 6. Get token for price snapshot
    const { data: token } = await supabaseAdmin
      .from('tokens')
      .select('market_cap_usd, price_sol, ticker')
      .eq('id', token_id)
      .single()

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    // 7. Insert call
    const { data: call, error: callErr } = await supabaseAdmin
      .from('kol_calls')
      .insert({
        launcher_id: launcher.id,
        token_id,
        thesis: thesis?.trim() || null,
        mktcap_at_call: token.market_cap_usd,
        price_at_call: token.price_sol,
        wallet_signature,
        tweet_url: tweet_url || null,
        accuracy_status: 'pending'
      })
      .select()
      .single()

    if (callErr) throw callErr

    // 8. Build tweet URL for KOL to post
    const tweetUrl = buildCallTweetUrl(
      token.ticker,
      token.market_cap_usd,
      call.id,
      thesis
    )

    return NextResponse.json({
      success: true,
      call,
      tweet_url: tweetUrl,
      message: 'Call submitted! Share it on Twitter to amplify.'
    })
  } catch (err) {
    console.error('submit call error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET - list calls with KOL info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token_id = searchParams.get('token_id')
    const launcher_id = searchParams.get('launcher_id')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabaseAdmin
      .from('kol_calls')
      .select(`
        *,
        launchers_public (twitter_handle, twitter_avatar_url, follower_count, badge),
        tokens (name, ticker, image_url)
      `)
      .order('called_at', { ascending: false })
      .limit(limit)

    if (token_id) query = query.eq('token_id', token_id)
    if (launcher_id) query = query.eq('launcher_id', launcher_id)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ calls: data || [] })
  } catch (err) {
    console.error('list calls error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
