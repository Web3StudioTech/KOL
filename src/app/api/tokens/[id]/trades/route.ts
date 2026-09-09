import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const INTERVAL_SECONDS: Record<string, number> = {
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id }       = params
  const { searchParams } = new URL(req.url)
  const interval     = searchParams.get('interval') || '1h'
  const intervalSecs = INTERVAL_SECONDS[interval] || 3600

  // Fetch trades from database
  const { data: trades, error } = await supabaseAdmin
    .from('token_trades')
    .select('price_eth, volume_eth, created_at')
    .eq('token_id', id)
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error || !trades || trades.length === 0) {
    return NextResponse.json({ candles: [] })
  }

  // Group trades into candles
  const candles: any[] = []
  const now    = Date.now() / 1000
  const start  = now - intervalSecs * 100 // last 100 candles

  let bucketStart = start
  let bucket: number[] = []

  trades.forEach(trade => {
    const ts = new Date(trade.created_at).getTime() / 1000
    const p  = parseFloat(trade.price_eth)

    if (ts >= bucketStart + intervalSecs) {
      if (bucket.length > 0) {
        candles.push({
          time:  Math.floor(bucketStart),
          open:  bucket[0],
          high:  Math.max(...bucket),
          low:   Math.min(...bucket),
          close: bucket[bucket.length - 1],
        })
      }
      bucketStart = Math.floor(ts / intervalSecs) * intervalSecs
      bucket = [p]
    } else {
      bucket.push(p)
    }
  })

  // Push final bucket
  if (bucket.length > 0) {
    candles.push({
      time:  Math.floor(bucketStart),
      open:  bucket[0],
      high:  Math.max(...bucket),
      low:   Math.min(...bucket),
      close: bucket[bucket.length - 1],
    })
  }

  return NextResponse.json({ candles })
}
