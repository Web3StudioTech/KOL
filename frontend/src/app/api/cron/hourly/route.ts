// /api/cron/hourly/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runHourlyJob } from '@/lib/cron'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await runHourlyJob()
    return NextResponse.json({ ok: true, ran: 'hourly', at: new Date().toISOString() })
  } catch (err: any) {
    console.error('[Cron] Hourly job failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
