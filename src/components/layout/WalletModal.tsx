'use client'
import { useState } from 'react'
import { useWalletStore } from '@/lib/store'
import { buildSignMessage, buildVerifyTweetUrl, truncateWallet } from '@/lib/auth'

type Step = 'connect' | 'connected' | 'verify-twitter' | 'tweet-posted' | 'done'

interface WalletModalProps {
  onClose: () => void
}

export default function WalletModal({ onClose }: WalletModalProps) {
  const { address, connected, setAddress, setLauncher, disconnect } = useWalletStore()
  const [step, setStep] = useState<Step>(connected ? 'connected' : 'connect')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState('')
  const [signature, setSignature] = useState('')
  const [tweetUrl, setTweetUrl] = useState('')
  const [pastedTweetUrl, setPastedTweetUrl] = useState('')

  // Simulated wallet connection — in production use @solana/wallet-adapter-react
  async function connectWallet() {
    setLoading(true)
    setError('')
    try {
      // Check if Phantom is available
      const phantom = (window as any).phantom?.solana
      if (!phantom?.isPhantom) {
        window.open('https://phantom.app', '_blank')
        throw new Error('Phantom wallet not found. Please install it.')
      }

      const resp = await phantom.connect()
      const walletAddress = resp.publicKey.toString()

      // Get nonce from backend
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress })
      })
      const { nonce: freshNonce } = await nonceRes.json()
      setNonce(freshNonce)

      setAddress(walletAddress)
      setStep('connected')

      // Load launcher profile
      const { supabase } = await import('@/lib/supabase')
      const { data: launcher } = await supabase
        .from('launchers')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()
      if (launcher) setLauncher(launcher)

    } catch (err: any) {
      setError(err.message || 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  async function startTwitterVerification() {
    if (!address) return
    setLoading(true)
    setError('')
    try {
      // Get fresh nonce
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      })
      const { nonce: freshNonce } = await nonceRes.json()
      setNonce(freshNonce)

      // Sign with wallet
      const phantom = (window as any).phantom?.solana
      const message = buildSignMessage({
        wallet: address,
        nonce: freshNonce,
        timestamp: new Date().toISOString(),
        action: 'verify_twitter'
      })
      const messageBytes = new TextEncoder().encode(message)
      const { signature: sig } = await phantom.signMessage(messageBytes, 'utf8')

      // Convert to base58
      const { default: bs58 } = await import('bs58')
      const sigBase58 = bs58.encode(sig)
      setSignature(sigBase58)

      // Build tweet URL
      const url = buildVerifyTweetUrl(address, freshNonce, sigBase58)
      setTweetUrl(url)
      setStep('verify-twitter')
    } catch (err: any) {
      setError(err.message || 'Signing failed')
    } finally {
      setLoading(false)
    }
  }

  function openTweetAndWait() {
    window.open(tweetUrl, '_blank')
    setStep('tweet-posted')
  }

  async function verifyTweet() {
    if (!pastedTweetUrl || !address) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweet_url: pastedTweetUrl,
          wallet_address: address
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Reload launcher profile
      const { supabase } = await import('@/lib/supabase')
      const { data: launcher } = await supabase
        .from('launchers')
        .select('*')
        .eq('wallet_address', address)
        .single()
      if (launcher) setLauncher(launcher)

      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card fade-in" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3>
            {step === 'connect' && 'Connect wallet'}
            {step === 'connected' && 'Wallet connected'}
            {step === 'verify-twitter' && 'Step 2 — sign & tweet'}
            {step === 'tweet-posted' && 'Step 3 — verify tweet'}
            {step === 'done' && 'Verified!'}
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
            color: '#FCA5A5', fontSize: '0.8rem', marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* STEP: connect */}
        {step === 'connect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>
              Connect your Solana wallet to launch tokens. Twitter verification is optional — link it to get a verified badge.
            </p>
            <button className="btn btn-primary" onClick={connectWallet} disabled={loading}>
              {loading ? <span className="spin">◌</span> : ''}
              Connect Phantom
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              Use Backpack
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              Use Solflare
            </button>
          </div>
        )}

        {/* STEP: connected */}
        {step === 'connected' && address && (
          <div>
            <div style={{
              padding: '12px 14px',
              background: 'var(--bg-3)',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--purple-glow)', border: '1px solid rgba(124,58,237,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', color: '#A78BFA', fontFamily: 'var(--font-mono)'
              }}>
                {address.slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{truncateWallet(address, 6)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--green)' }}>✓ Connected</div>
              </div>
            </div>
            <div className="divider" />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Link your Twitter account to get a verified badge on all your tokens. Takes 2 minutes. Completely optional.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-primary" onClick={startTwitterVerification} disabled={loading}>
                {loading ? <span className="spin">◌</span> : '𝕏'}
                Link Twitter (get verified badge)
              </button>
              <button className="btn btn-ghost" style={{ justifyContent: 'center' }} onClick={onClose}>
                Skip — launch anonymously
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-3)', justifyContent: 'center' }}
                onClick={() => { disconnect(); setStep('connect') }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* STEP: verify twitter - sign */}
        {step === 'verify-twitter' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
              {[
                { num: 1, label: 'Wallet connected', done: true },
                { num: 2, label: 'Sign verification message', done: !!signature },
                { num: 3, label: 'Post tweet with proof', done: false },
              ].map(s => (
                <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: s.done ? 'var(--green)' : 'var(--bg-4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, flexShrink: 0
                  }}>
                    {s.done ? '✓' : s.num}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: s.done ? 'var(--text)' : 'var(--text-3)' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-3)',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.75rem',
              color: 'var(--text-2)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.7,
              wordBreak: 'break-all'
            }}>
              <div style={{ color: 'var(--text-3)', marginBottom: '4px' }}>Tweet will contain:</div>
              Verifying my identity on @onchainkol{'\n\n'}
              okl-verify:{address?.slice(0, 8)}…:{nonce}:[signature]
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={openTweetAndWait}>
              𝕏 Open Twitter to post proof
            </button>
          </div>
        )}

        {/* STEP: tweet posted - paste URL */}
        {step === 'tweet-posted' && (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1rem' }}>
              After posting the tweet, paste the tweet URL here to complete verification.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label>Paste your tweet URL</label>
              <input
                className="input"
                placeholder="https://twitter.com/yourhandle/status/..."
                value={pastedTweetUrl}
                onChange={e => setPastedTweetUrl(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={verifyTweet}
              disabled={!pastedTweetUrl || loading}
            >
              {loading ? <span className="spin">◌</span> : ''}
              Verify tweet
            </button>
          </div>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✓</div>
            <h3 style={{ color: 'var(--green)', marginBottom: '0.5rem' }}>Identity verified!</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Your Twitter account is now permanently linked to your wallet. Every token you launch will show your verified badge.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
              Start launching
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
