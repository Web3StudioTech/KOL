import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { launcher_id, action } = await req.json()
  if (action === 'approve') {
    const { error } = await supabaseAdmin
      .from('launchers')
      .update({ badge: 'gold_kol', gold_kol_approved_at: new Date().toISOString() })
      .eq('id', launcher_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
