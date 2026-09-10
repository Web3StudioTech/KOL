import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateNonce } from '@/lib/auth'
export async function POST(req: NextRequest) {
  const body = await req.json()
  const wallet_address: string = (body.wallet_address || '').toLowerCase()
  if (!wallet_address) return NextResponse.json({ error: 'wallet_address required' }, { status: 400 })
  const nonce = generateNonce()
  const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const { error } = await supabaseAdmin.from('nonces').upsert({ wallet_address, nonce, action: 'auth', expires_at })
  if (error) {
    console.error('[auth/nonce] Failed to save nonce:', error)
    return NextResponse.json({ error: `Could not save verification code: ${error.message}` }, { status: 500 })
  }
  return NextResponse.json({ nonce, expires_at })
}
