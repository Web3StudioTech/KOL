import { NextRequest, NextResponse } from 'next/server'
import { activateConfig } from '@/lib/points'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

// POST /api/admin/points/config/activate
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { version } = await req.json()
  if (!version) return NextResponse.json({ error: 'version required' }, { status: 400 })
  try {
    await activateConfig(version, 'admin')
    return NextResponse.json({ success: true, message: `Version ${version} activated. Recalculating all wallets...` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
