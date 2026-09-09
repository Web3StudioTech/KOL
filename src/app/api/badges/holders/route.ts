import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const badge = searchParams.get('badge')
  const limit = parseInt(searchParams.get('limit') || '12')

  let query = supabaseAdmin
    .from('launchers')
    .select('wallet_address, twitter_handle, badge, created_at')
    .not('badge', 'eq', 'anon')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (badge) query = query.eq('badge', badge)

  const { data } = await query
  return NextResponse.json({ holders: data || [] })
}
