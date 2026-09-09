import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('launcher_badges')
    .select('badge, badge_number, earned_at')
    .eq('wallet_address', wallet.toLowerCase())
    .order('earned_at', { ascending: true })

  return NextResponse.json({ badges: data || [] })
}
