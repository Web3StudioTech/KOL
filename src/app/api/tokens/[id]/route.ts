import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Try by UUID first, then by contract address
  let query = supabaseAdmin
    .from('tokens')
    .select(`
      *,
      launchers (
        id,
        wallet_address,
        twitter_handle,
        twitter_avatar_url,
        follower_count,
        badge,
        verified_at
      )
    `)

  // Check if it looks like a contract address (0x...)
  if (id.startsWith('0x')) {
    query = query.eq('contract_address', id.toLowerCase())
  } else {
    query = query.eq('id', id)
  }

  const { data: token, error } = await query.single()

  if (error || !token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  // Real source of truth for Creator/Builder badges is launcher_badges,
  // keyed by source_token — not the legacy kol_pass_* columns on tokens.
  const { data: tokenBadges } = await supabaseAdmin
    .from('launcher_badges')
    .select('badge, badge_number')
    .eq('source_token', token.contract_address)
    .in('badge', ['creator', 'builder'])

  const creatorBadge = (tokenBadges || []).find(b => b.badge === 'creator')
  const builderBadge = (tokenBadges || []).find(b => b.badge === 'builder')

  // Flatten launcher fields for easy frontend use
  const result = {
    ...token,
    launcher_wallet:  token.launchers?.wallet_address,
    launcher_twitter: token.launchers?.twitter_handle,
    launcher_avatar:  token.launchers?.twitter_avatar_url,
    launcher_badge:   token.launchers?.badge || 'anon',
    launcher_followers: token.launchers?.follower_count || 0,
    creator_badge_number: creatorBadge?.badge_number ?? null,
    builder_badge_number: builderBadge?.badge_number ?? null,
  }

  return NextResponse.json({ token: result })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id }  = params
  const body    = await req.json()
  const adminKey = req.headers.get('x-admin-key')

  // Only admin or the creator can update
  const isAdmin = adminKey === process.env.ADMIN_SECRET_KEY

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = [
    'name', 'ticker', 'tagline', 'description', 'category',
    'image_url', 'banner_url', 'website_url', 'twitter_url',
    'telegram_url', 'discord_url', 'youtube_url', 'tiktok_url',
    'github_url', 'status', 'is_rug_flagged',
  ]

  const update: any = {}
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from('tokens')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ token: data })
}
