import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Simple admin auth check — in production use proper auth (NextAuth, Clerk, etc.)
function checkAdminAuth(req: NextRequest): boolean {
  const adminKey = req.headers.get('x-admin-key')
  return adminKey === process.env.ADMIN_SECRET_KEY
}

// GET /api/admin/launchers — full launcher records
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit
  const badge = searchParams.get('badge')
  const search = searchParams.get('search')

  let query = supabaseAdmin
    .from('launchers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (badge) query = query.eq('badge', badge)
  if (search) {
    query = query.or(
      `twitter_handle.ilike.%${search}%,wallet_address.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ launchers: data, total: count, page, limit })
}

// POST /api/admin/launchers — ban/unban a launcher
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { launcher_id, action, reason } = await req.json()

  if (!launcher_id || !action) {
    return NextResponse.json({ error: 'launcher_id and action required' }, { status: 400 })
  }

  if (action === 'ban') {
    const { error } = await supabaseAdmin
      .from('launchers')
      .update({
        is_banned: true,
        ban_reason: reason || 'Banned by admin',
        ban_at: new Date().toISOString()
      })
      .eq('id', launcher_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'banned' })
  }

  if (action === 'unban') {
    const { error } = await supabaseAdmin
      .from('launchers')
      .update({ is_banned: false, ban_reason: null, ban_at: null })
      .eq('id', launcher_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'unbanned' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
