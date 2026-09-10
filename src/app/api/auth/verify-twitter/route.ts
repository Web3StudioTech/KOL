import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Fetch live follower count from X API v2 (pay-per-use pricing, ~$0.01/lookup).
// Returns null on any failure so verification never blocks on this.
async function fetchFollowerCount(handle: string): Promise<number | null> {
  const token = process.env.TWITTER_BEARER_TOKEN
  if (!token) return null
  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json?.data?.public_metrics?.followers_count ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const tweet_url = body.tweet_url
  // Normalize to lowercase everywhere — Ethereum addresses are case-insensitive
  // at the protocol level, only checksummed for display. Comparing/storing
  // with mixed case risks a silent mismatch between requests.
  const wallet_address: string = (body.wallet_address || '').toLowerCase()
  if (!tweet_url || !wallet_address) return NextResponse.json({ error: 'tweet_url and wallet_address required' }, { status: 400 })
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweet_url)}`
    const res = await fetch(oembedUrl)
    if (!res.ok) throw new Error('Could not fetch tweet. Make sure it is public.')
    const oembed = await res.json()
    const authorUrl: string = oembed.author_url || ''
    const html: string = oembed.html || ''

    // X's oEmbed has been inconsistent post-2023 — accept both domains,
    // and fall back to pulling the handle out of the embed HTML itself
    // if author_url is missing or doesn't match.
    let twitterHandle: string | null = null
    const authorMatch = authorUrl.match(/(?:twitter|x)\.com\/([^/?]+)/)
    if (authorMatch) {
      twitterHandle = authorMatch[1]
    } else {
      // Embed HTML usually contains a link like
      // href="https://twitter.com/HANDLE?ref_src=..."> just before the tweet permalink
      const htmlMatch = html.match(/(?:twitter|x)\.com\/([^/"?]+)\/status\//)
      if (htmlMatch) twitterHandle = htmlMatch[1]
    }

    if (!twitterHandle) {
      console.error('[verify-twitter] Could not extract handle. Raw oembed response:', JSON.stringify(oembed))
      throw new Error('Could not extract Twitter handle')
    }

    const proofMatch = html.match(/okl-verify:([^:\s]+):([^:\s<"]+)/)
    if (!proofMatch) {
      console.error('[verify-twitter] Proof pattern not found. Raw embed HTML:', html)
      throw new Error('Verification proof not found in tweet')
    }
    const [, tweetWalletRaw, tweetNonce] = proofMatch
    const tweetWallet = tweetWalletRaw.toLowerCase()
    if (tweetWallet !== wallet_address) {
      console.error('[verify-twitter] Wallet mismatch.', { extracted: tweetWallet, request: wallet_address })
      throw new Error('Wallet address mismatch')
    }

    const { data: nonceRecord } = await supabaseAdmin.from('nonces').select('*').eq('wallet_address', wallet_address).eq('nonce', tweetNonce).maybeSingle()
    if (!nonceRecord) {
      const { data: anyNonceForWallet } = await supabaseAdmin.from('nonces').select('*').eq('wallet_address', wallet_address).maybeSingle()
      console.error('[verify-twitter] Nonce mismatch.', {
        extracted_wallet: tweetWallet,
        extracted_nonce: tweetNonce,
        request_wallet: wallet_address,
        current_db_nonce_for_wallet: anyNonceForWallet?.nonce ?? '(none found for this wallet at all)',
        current_db_expires_at: anyNonceForWallet?.expires_at ?? null,
      })
      throw new Error('This code no longer matches — you may have generated a new one after posting this tweet. Go back and generate a fresh code, then post a new tweet with it.')
    }
    if (nonceRecord.expires_at && new Date(nonceRecord.expires_at) < new Date()) {
      throw new Error('This code expired (codes last 30 minutes). Go back and generate a fresh one.')
    }

    const followerCount = await fetchFollowerCount(twitterHandle)

    const { data: existing } = await supabaseAdmin.from('launchers').select('id').eq('wallet_address', wallet_address).maybeSingle()
    const updateData: Record<string, any> = { twitter_handle: twitterHandle, verified_at: new Date().toISOString(), verification_tweet: tweet_url }
    if (followerCount !== null) updateData.follower_count = followerCount
    if (existing) {
      await supabaseAdmin.from('launchers').update(updateData).eq('wallet_address', wallet_address)
    } else {
      await supabaseAdmin.from('launchers').insert({ wallet_address, ...updateData })
    }
    await supabaseAdmin.from('nonces').delete().eq('wallet_address', wallet_address).eq('nonce', tweetNonce)

    // Auto-detect + auto-issue KOL / KOL Crown badges immediately if the threshold is already met
    if (followerCount !== null) {
      await supabaseAdmin.rpc('check_wallet_badges', { p_wallet: wallet_address })
    }

    const { data: launcher } = await supabaseAdmin.from('launchers').select('*').eq('wallet_address', wallet_address).single()
    return NextResponse.json({ success: true, launcher, twitter_handle: twitterHandle, follower_count: followerCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
