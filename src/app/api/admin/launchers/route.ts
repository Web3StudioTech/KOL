import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50
  const search = searchParams.get('search') || ''
  const badge = searchParams.get('badge') || ''
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('launchers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`twitter_handle.ilike.%${search}%,wallet_address.ilike.%${search}%`)
  }
  if (badge) query = query.eq('badge', badge)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ launchers: data || [], total: count || 0 })
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { launcher_id, action, reason } = await req.json()
  if (!launcher_id || !action) return NextResponse.json({ error: 'launcher_id and action required' }, { status: 400 })

  let update: Record<string, any> = {}

  switch (action) {
    case 'ban':
      update = { is_banned: true, ban_reason: reason || 'Banned by admin', ban_at: new Date().toISOString() }
      break
    case 'unban':
      update = { is_banned: false, ban_reason: null, ban_at: null }
      break
    case 'approve_gold':
      update = { badge: 'gold_kol', gold_kol_approved_at: new Date().toISOString(), gold_kol_approved_by: 'admin' }
      break
    case 'reject_gold':
      update = { gold_kol_rejected_at: new Date().toISOString(), gold_kol_reject_reason: reason }
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('launchers')
    .update(update)
    .eq('id', launcher_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
