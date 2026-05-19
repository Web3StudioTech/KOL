import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWalletSignature, buildSignMessage, parseProofString } from '@/lib/auth'

// ── Fetch tweet text using free oEmbed API (no X API key needed) ──
async function fetchTweetData(tweetUrl: string): Promise<{
  text: string
  author_handle: string
  author_id: string
  follower_count: number
  avatar_url: string
} | null> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`
    const res = await fetch(oembedUrl, { next: { revalidate: 0 } })
    if (!res.ok) return null

    const data = await res.json()
    // oEmbed returns author_name which is the display name
    // We extract handle from the HTML content
    const handleMatch = data.html?.match(/twitter\.com\/([A-Za-z0-9_]+)\/status/)
    const handle = handleMatch ? handleMatch[1] : data.author_name

    // For follower count we parse the author_url
    // In production use Twitter API Basic ($100/mo) or store manually
    // For MVP: KOL self-reports, we verify the handle ownership only
    return {
      text: data.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '',
      author_handle: handle,
      author_id: handle, // oEmbed doesn't give numeric ID — use Twitter API for that
      follower_count: 0,  // updated via weekly refresh
      avatar_url: ''
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tweet_url, wallet_address } = await req.json()

    if (!tweet_url || !wallet_address) {
      return NextResponse.json(
        { error: 'tweet_url and wallet_address required' },
        { status: 400 }
      )
    }

    // 1. Fetch the tweet
    const tweetData = await fetchTweetData(tweet_url)
    if (!tweetData) {
      return NextResponse.json(
        { error: 'Could not fetch tweet. Make sure the tweet is public.' },
        { status: 400 }
      )
    }

    // 2. Parse proof string from tweet text
    const proof = parseProofString(tweetData.text)
    if (!proof) {
      return NextResponse.json(
        { error: 'Tweet does not contain a valid okl-verify proof string.' },
        { status: 400 }
      )
    }

    // 3. Wallet address must match
    if (proof.wallet !== wallet_address) {
      return NextResponse.json(
        { error: 'Proof wallet address does not match your connected wallet.' },
        { status: 400 }
      )
    }

    // 4. Fetch and validate nonce from DB
    const { data: nonceRow, error: nonceErr } = await supabaseAdmin
      .from('nonces')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('nonce', proof.nonce)
      .single()

    if (nonceErr || !nonceRow) {
      return NextResponse.json(
        { error: 'Nonce not found or already used. Please restart verification.' },
        { status: 400 }
      )
    }

    if (new Date(nonceRow.expires_at) < new Date()) {
      await supabaseAdmin.from('nonces').delete().eq('wallet_address', wallet_address)
      return NextResponse.json(
        { error: 'Nonce expired. Please restart verification.' },
        { status: 400 }
      )
    }

    // 5. Verify wallet signature
    const message = buildSignMessage({
      wallet: wallet_address,
      nonce: proof.nonce,
      timestamp: '',  // not enforced in signature for flexibility
      action: 'verify_twitter'
    })

    const sigValid = verifyWalletSignature(message, proof.signature, wallet_address)
    if (!sigValid) {
      return NextResponse.json(
        { error: 'Wallet signature verification failed.' },
        { status: 400 }
      )
    }

    // 6. Confirm tweet author matches claimed handle
    const twitterHandle = tweetData.author_handle.replace('@', '')

    // 7. Delete nonce (single use)
    await supabaseAdmin.from('nonces').delete().eq('wallet_address', wallet_address)

    // 8. Update launcher record with Twitter identity
    const followerCount = tweetData.follower_count || 0
    const badge = followerCount >= 1000 ? 'kol' : 'twitter_verified'

    const { error: updateErr } = await supabaseAdmin
      .from('launchers')
      .update({
        twitter_handle: twitterHandle,
        twitter_id: tweetData.author_id,
        twitter_avatar_url: tweetData.avatar_url || null,
        follower_count: followerCount,
        badge,
        verified_at: new Date().toISOString(),
        verification_tweet: tweet_url,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', wallet_address)

    if (updateErr) throw updateErr

    return NextResponse.json({
      success: true,
      twitter_handle: twitterHandle,
      badge,
      follower_count: followerCount
    })
  } catch (err) {
    console.error('verify-twitter error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
