import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
export async function POST(req: NextRequest) {
  const { tweet_url, wallet_address } = await req.json()
  if (!tweet_url || !wallet_address) return NextResponse.json({ error: 'tweet_url and wallet_address required' }, { status: 400 })
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweet_url)}`
    const res = await fetch(oembedUrl)
    if (!res.ok) throw new Error('Could not fetch tweet. Make sure it is public.')
    const oembed = await res.json()
    const authorUrl: string = oembed.author_url || ''
    const handleMatch = authorUrl.match(/twitter\.com\/([^/]+)/)
    const twitterHandle = handleMatch ? handleMatch[1] : null
    if (!twitterHandle) throw new Error('Could not extract Twitter handle')
    const html: string = oembed.html || ''
    const proofMatch = html.match(/okl-verify:([^:]+):([^:]+):([^"<\s]+)/)
    if (!proofMatch) throw new Error('Verification proof not found in tweet')
    const [, tweetWallet, tweetNonce] = proofMatch
    if (tweetWallet.toLowerCase() !== wallet_address.toLowerCase()) throw new Error('Wallet address mismatch')
    const { data: nonceRecord } = await supabaseAdmin.from('nonces').select('*').eq('wallet_address', wallet_address).eq('nonce', tweetNonce).single()
    if (!nonceRecord) throw new Error('Invalid or expired nonce')
    const { data: existing } = await supabaseAdmin.from('launchers').select('id').eq('wallet_address', wallet_address).single()
    const updateData = { twitter_handle: twitterHandle, verified_at: new Date().toISOString(), verification_tweet: tweet_url }
    if (existing) {
      await supabaseAdmin.from('launchers').update(updateData).eq('wallet_address', wallet_address)
    } else {
      await supabaseAdmin.from('launchers').insert({ wallet_address, ...updateData })
    }
    await supabaseAdmin.from('nonces').delete().eq('wallet_address', wallet_address).eq('nonce', tweetNonce)
    const { data: launcher } = await supabaseAdmin.from('launchers').select('*').eq('wallet_address', wallet_address).single()
    return NextResponse.json({ success: true, launcher, twitter_handle: twitterHandle })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
