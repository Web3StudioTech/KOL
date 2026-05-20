import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('wallet_points')
    .select('*', { count: 'exact' })
    .order('total_points', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike('wallet_address', `%${search}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ wallets: data || [], total: count || 0 })
}
