import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateNonce } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { wallet_address } = await req.json()
  if (!wallet_address) return NextResponse.json({ error: 'wallet_address required' }, { status: 400 })

  const nonce = generateNonce()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin.from('nonces').upsert({
    wallet_address,
    nonce,
    action: 'auth',
    expires_at: expiresAt,
  })

  return NextResponse.json({ nonce, expires_at: expiresAt })
}
