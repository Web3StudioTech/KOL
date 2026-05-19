import { NextRequest, NextResponse } from 'next/server'
import { runWeeklyJob } from '@/cron/jobs'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await runWeeklyJob()
    return NextResponse.json({ ok: true, ran: 'weekly', at: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
