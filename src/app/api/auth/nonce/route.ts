import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateNonce } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { wallet_address } = await req.json()

    if (!wallet_address || typeof wallet_address !== 'string') {
      return NextResponse.json({ error: 'wallet_address required' }, { status: 400 })
    }

    // Generate fresh nonce
    const nonce = generateNonce()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Upsert nonce (one per wallet at a time)
    await supabaseAdmin
      .from('nonces')
      .upsert({
        wallet_address,
        nonce,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })

    // Ensure launcher row exists (upsert on connect)
    await supabaseAdmin
      .from('launchers')
      .upsert(
        { wallet_address },
        { onConflict: 'wallet_address', ignoreDuplicates: true }
      )

    return NextResponse.json({ nonce, expires_at: expiresAt })
  } catch (err) {
    console.error('nonce error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
