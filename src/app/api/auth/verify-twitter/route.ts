import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { tweet_url, wallet_address } = await req.json()

  if (!tweet_url || !wallet_address) {
    return NextResponse.json({ error: 'tweet_url and wallet_address required' }, { status: 400 })
  }

  try {
    // Fetch tweet via oEmbed (free, no API key needed)
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweet_url)}`
    const res = await fetch(oembedUrl)
    if (!res.ok) throw new Error('Could not fetch tweet. Make sure the tweet is public.')

    const oembed = await res.json()
    const html: string = oembed.html || ''
    const authorName: string = oembed.author_name || ''
    const authorUrl: string = oembed.author_url || ''

    // Extract Twitter handle from author URL
    const handleMatch = authorUrl.match(/twitter\.com\/([^/]+)/)
    const twitterHandle = handleMatch ? handleMatch[1] : null
    if (!twitterHandle) throw new Error('Could not extract Twitter handle from tweet')

    // Verify the tweet contains our proof format
    const proofMatch = html.match(/okl-verify:([^:]+):([^:]+):([^"<\s]+)/)
    if (!proofMatch) throw new Error('Verification proof not found in tweet. Make sure you posted the exact tweet.')

    const [, tweetWallet, tweetNonce] = proofMatch

    // Check wallet matches
    if (tweetWallet.toLowerCase() !== wallet_address.toLowerCase()) {
      throw new Error('Wallet address in tweet does not match your connected wallet')
    }

    // Check nonce exists and is valid
    const { data: nonceRecord } = await supabaseAdmin
      .from('nonces')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('nonce', tweetNonce)
      .single()

    if (!nonceRecord) throw new Error('Invalid or expired verification nonce. Please try again.')
    if (new Date(nonceRecord.expires_at) < new Date()) throw new Error('Verification nonce expired. Please try again.')

    // Get follower count via oEmbed (approximate from author name)
    // In production: use Twitter API for accurate follower count
    const followerCount = 0 // Will be updated on next weekly refresh

    // Get or create launcher and update with Twitter info
    const { data: existing } = await supabaseAdmin
      .from('launchers')
      .select('id')
      .eq('wallet_address', wallet_address)
      .single()

    let launcherId: string

    if (existing) {
      const { data } = await supabaseAdmin
        .from('launchers')
        .update({
          twitter_handle: twitterHandle,
          follower_count: followerCount,
          verified_at: new Date().toISOString(),
          verification_tweet: tweet_url,
        })
        .eq('wallet_address', wallet_address)
        .select('id')
        .single()
      launcherId = data?.id
    } else {
      const { data } = await supabaseAdmin
        .from('launchers')
        .insert({
          wallet_address,
          twitter_handle: twitterHandle,
          follower_count: followerCount,
          verified_at: new Date().toISOString(),
          verification_tweet: tweet_url,
        })
        .select('id')
        .single()
      launcherId = data?.id
    }

    // Delete used nonce
    await supabaseAdmin
      .from('nonces')
      .delete()
      .eq('wallet_address', wallet_address)
      .eq('nonce', tweetNonce)

    // Fetch updated launcher
    const { data: launcher } = await supabaseAdmin
      .from('launchers')
      .select('*')
      .eq('id', launcherId)
      .single()

    return NextResponse.json({ success: true, launcher, twitter_handle: twitterHandle })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 400 })
  }
}
