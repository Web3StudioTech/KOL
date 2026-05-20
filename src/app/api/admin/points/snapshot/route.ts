import { NextRequest, NextResponse } from 'next/server'
import { takeAirdropSnapshot } from '@/lib/points'

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  try {
    const id = await takeAirdropSnapshot(name, notes || '', 'admin')
    return NextResponse.json({ success: true, snapshot_id: id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
