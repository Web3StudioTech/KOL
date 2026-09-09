import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const now = Date.now()
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const since48h = new Date(now - 48 * 60 * 60 * 1000).toISOString()
  const sinceHour = new Date(now - 60 * 60 * 1000).toISOString()

  const [
    { data: trades24h },
    { data: tradesPrev24h },
    { count: tokensToday },
    { count: tokensLastHour },
    { count: callsToday },
    { count: callsAllTime },
  ] = await Promise.all([
    supabaseAdmin.from('token_trades').select('volume_usd').gte('created_at', since24h),
    supabaseAdmin.from('token_trades').select('volume_usd').gte('created_at', since48h).lt('created_at', since24h),
    supabaseAdmin.from('tokens').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
    supabaseAdmin.from('tokens').select('id', { count: 'exact', head: true }).gte('created_at', sinceHour),
    supabaseAdmin.from('kol_calls').select('id', { count: 'exact', head: true }).gte('called_at', since24h),
    supabaseAdmin.from('kol_calls').select('id', { count: 'exact', head: true }),
  ])

  const volume24h     = (trades24h || []).reduce((sum, t) => sum + (t.volume_usd || 0), 0)
  const volumePrev24h = (tradesPrev24h || []).reduce((sum, t) => sum + (t.volume_usd || 0), 0)
  const volumeChangePct = volumePrev24h > 0
    ? Math.round(((volume24h - volumePrev24h) / volumePrev24h) * 100)
    : null

  // Platform's 0.25% cut of 24h volume — an estimate from the fee split,
  // not a stored ledger of fees actually paid out to the platform wallet.
  const feesEarned24h = volume24h * 0.0025

  return NextResponse.json({
    volume_24h_usd: volume24h,
    volume_change_pct: volumeChangePct,
    tokens_today: tokensToday || 0,
    tokens_last_hour: tokensLastHour || 0,
    kol_calls_today: callsToday || 0,
    kol_calls_all_time: callsAllTime || 0,
    fees_earned_24h_usd: feesEarned24h,
  })
}
