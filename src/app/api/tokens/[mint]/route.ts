import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  const { data, error } = await supabaseAdmin
    .from('tokens')
    .select(`*, launchers(wallet_address, twitter_handle, twitter_avatar_url, follower_count, badge)`)
    .or(`id.eq.${params.mint},mint_address.eq.${params.mint}`)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ token: data })
}
