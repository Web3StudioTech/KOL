import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export async function GET() {
  const [{ data: launches }, { data: calls }] = await Promise.all([
    supabaseAdmin
      .from('tokens')
      .select('ticker, creator_wallet, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('kol_calls')
      .select('called_at, tokens(ticker), launchers(twitter_handle)')
      .order('called_at', { ascending: false })
      .limit(10),
  ])

  const launchItems = (launches || []).map(t => ({
    text: `$${t.ticker} launched · ${timeAgo(t.created_at)}`,
    timestamp: t.created_at,
  }))

  const callItems = (calls || []).map((c: any) => ({
    text: `${c.launchers?.twitter_handle ? '@' + c.launchers.twitter_handle : 'Someone'} called $${c.tokens?.ticker} · ${timeAgo(c.called_at)}`,
    timestamp: c.called_at,
  }))

  const feed = [...launchItems, ...callItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
    .map(f => f.text)

  return NextResponse.json({ feed })
}
