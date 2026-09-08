import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tokenId = searchParams.get('token_id')
  if (!tokenId) return NextResponse.json({ error: 'token_id required' }, { status: 400 })

  const { data: vote, error } = await supabaseAdmin
    .from('community_votes')
    .select('*')
    .eq('token_id', tokenId)
    .order('opened_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return NextResponse.json({ vote: null })

  const { data: voters } = await supabaseAdmin
    .from('vote_records')
    .select('wallet_address, vote, voted_at')
    .eq('vote_id', vote.id)
    .order('voted_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    vote: {
      ...vote,
      recent_voters: (voters || []).map(v => ({
        wallet: v.wallet_address,
        vote: v.vote,
      }))
    }
  })
}

export async function POST(req: NextRequest) {
  const { token_id, wallet_address, vote } = await req.json()
  if (!token_id || !wallet_address || !vote) {
    return NextResponse.json({ error: 'token_id, wallet_address, vote required' }, { status: 400 })
  }
  if (!['yes', 'no'].includes(vote)) {
    return NextResponse.json({ error: 'vote must be yes or no' }, { status: 400 })
  }

  const { data: activeVote } = await supabaseAdmin
    .from('community_votes')
    .select('id, yes_count, no_count, unique_voters, expires_at, status')
    .eq('token_id', token_id)
    .eq('status', 'active')
    .single()

  if (!activeVote) return NextResponse.json({ error: 'No active vote for this token' }, { status: 404 })
  if (new Date(activeVote.expires_at) < new Date()) return NextResponse.json({ error: 'Vote has expired' }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from('vote_records')
    .select('id')
    .eq('vote_id', activeVote.id)
    .eq('wallet_address', wallet_address)
    .single()

  if (existing) return NextResponse.json({ error: 'Already voted' }, { status: 400 })

  await supabaseAdmin.from('vote_records').insert({
    vote_id: activeVote.id, wallet_address, vote, voted_at: new Date().toISOString()
  })

  const yesCount = (activeVote.yes_count || 0) + (vote === 'yes' ? 1 : 0)
  const noCount  = (activeVote.no_count  || 0) + (vote === 'no'  ? 1 : 0)
  const uniqueVoters = (activeVote.unique_voters || 0) + 1

  const { data: updated } = await supabaseAdmin
    .from('community_votes')
    .update({ yes_count: yesCount, no_count: noCount, unique_voters: uniqueVoters })
    .eq('id', activeVote.id)
    .select()
    .single()

  return NextResponse.json({ success: true, vote: updated })
}
