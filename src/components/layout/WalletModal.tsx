'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { buildSignMessage, buildVerifyTweetUrl, truncateWallet } from '@/lib/auth'

type Step = 'select' | 'connected' | 'verify-twitter' | 'tweet-posted' | 'done'

const WALLETS = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    color: '#AB9FF2',
    desc: 'Solana native wallet',
    check: () => typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom,
    url: 'https://phantom.app',
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '⬡',
    color: '#00E5FF',
    desc: 'Multi-chain wallet',
    check: () => typeof window !== 'undefined' && (window as any).okxwallet,
    url: 'https://www.okx.com/web3',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    color: '#F6851B',
    desc: 'EVM wallet',
    check: () => typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask,
    url: 'https://metamask.io',
  },
]

export default function WalletModal({ onClose }: { onClose: () => void }) {
  const { address, connected, setAddress, setConnecting, setLauncher, disconnect } = useAppStore()
  const [step, setStep] = useState<Step>(connected ? 'connected' : 'select')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState('')
  const [tweetUrl, setTweetUrl] = useState('')
  const [pastedTweetUrl, setPastedTweetUrl] = useState('')

  async function connectWallet(walletId: string) {
    setLoading(true)
    setError('')
    try {
      const wallet = WALLETS.find(w => w.id === walletId)!
      if (!wallet.check()) {
        window.open(wallet.url, '_blank')
        throw new Error(`${wallet.name} not found. Please install it and refresh.`)
      }

      let walletAddress = ''

      if (walletId === 'phantom') {
        const phantom = (window as any).phantom.solana
        const resp = await phantom.connect()
        walletAddress = resp.publicKey.toString()
      } else if (walletId === 'okx') {
        const okx = (window as any).okxwallet
        const resp = await okx.solana?.connect() || await okx.connect()
        walletAddress = resp.publicKey?.toString() || resp.address
      } else if (walletId === 'metamask') {
        const eth = (window as any).ethereum
        const accounts = await eth.request({ method: 'eth_requestAccounts' })
        walletAddress = accounts[0]
      }

      if (!walletAddress) throw new Error('Could not get wallet address')

      // Get nonce from backend
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress })
      })
      const { nonce: freshNonce } = await nonceRes.json()
      setNonce(freshNonce)
      setAddress(walletAddress, walletId as any)
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
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      })
      const { nonce: freshNonce } = await nonceRes.json()
      setNonce(freshNonce)

      const message = buildSignMessage(address, freshNonce, 'Twitter Verification')
      const messageBytes = new TextEncoder().encode(message)

      let signatureBase58 = ''
      const walletType = useAppStore.getState().walletType

      if (walletType === 'phantom') {
        const phantom = (window as any).phantom.solana
        const { signature } = await phantom.signMessage(messageBytes, 'utf8')
        const { default: bs58 } = await import('bs58')
        signatureBase58 = bs58.encode(signature)
      } else if (walletType === 'okx') {
        const okx = (window as any).okxwallet
        const { signature } = await okx.solana?.signMessage(messageBytes, 'utf8')
        const { default: bs58 } = await import('bs58')
        signatureBase58 = bs58.encode(signature)
      } else if (walletType === 'metamask') {
        const eth = (window as any).ethereum
        signatureBase58 = await eth.request({
          method: 'personal_sign',
          params: [message, address]
        })
      }

      const url = buildVerifyTweetUrl(address, freshNonce, signatureBase58)
      setTweetUrl(url)
      setStep('verify-twitter')
    } catch (err: any) {
      setError(err.message || 'Signing failed')
    } finally {
      setLoading(false)
    }
  }

  async function verifyTweet() {
    if (!pastedTweetUrl || !address) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet_url: pastedTweetUrl, wallet_address: address })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const { supabase } = await import('@/lib/supabase')
      const { data: launcher } = await supabase
        .from('launchers').select('*')
        .eq('wallet_address', address).single()
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
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card fade-up" style={{ width: '100%', maxWidth: '440px', padding: '2rem', position: 'relative' }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '18px' }}
        >✕</button>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(255,61,107,0.1)', border: '1px solid rgba(255,61,107,0.3)', borderRadius: '3px', color: 'var(--accent2)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* SELECT WALLET */}
        {step === 'select' && (
          <>
            <h2 style={{ fontSize: '28px', marginBottom: '6px' }}>Connect Wallet</h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '1.5rem' }}>
              Choose your wallet to get started
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {WALLETS.map(w => (
                <button
                  key={w.id}
                  onClick={() => connectWallet(w.id)}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 18px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '3px', cursor: 'pointer',
                    transition: 'all 0.2s', textAlign: 'left',
                    color: 'var(--text)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = w.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <span style={{ fontSize: '24px' }}>{w.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '1px', fontSize: '16px' }}>
                      {w.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{w.desc}</div>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '16px' }}>→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* CONNECTED */}
        {step === 'connected' && address && (
          <>
            <h2 style={{ fontSize: '28px', marginBottom: '1rem' }}>Wallet Connected</h2>
            <div style={{
              padding: '14px', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: '3px',
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--glow)',
                border: '1px solid rgba(0,229,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Courier New, monospace', fontSize: '11px', color: 'var(--accent)'
              }}>
                {address.slice(0, 2)}
              </div>
              <div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '1px' }}>
                  {truncateWallet(address, 6)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--green)' }}>✓ Connected</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Link your Twitter to get a verified badge on all your tokens. Takes 2 minutes. Completely optional.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={startTwitterVerification} disabled={loading}>
                  {loading ? <span className="spin">◌</span> : '𝕏'} Link Twitter — Get Verified Badge
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'center' }} onClick={onClose}>
                  Skip — Launch Anonymously
                </button>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', marginTop: '4px' }}
                  onClick={() => { disconnect(); setStep('select') }}
                >
                  Disconnect wallet
                </button>
              </div>
            </div>
          </>
        )}

        {/* VERIFY TWITTER */}
        {step === 'verify-twitter' && (
          <>
            <h2 style={{ fontSize: '28px', marginBottom: '1rem' }}>Verify Twitter</h2>
            {[
              { num: 1, label: 'Wallet connected', done: true },
              { num: 2, label: 'Sign verification message', done: !!tweetUrl },
              { num: 3, label: 'Post tweet proof', done: false },
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: s.done ? 'var(--green)' : 'var(--surface)',
                  border: `1px solid ${s.done ? 'var(--green)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: s.done ? '#000' : 'var(--muted)',
                  flexShrink: 0
                }}>
                  {s.done ? '✓' : s.num}
                </div>
                <span style={{ fontSize: '13px', color: s.done ? 'var(--text)' : 'var(--muted)' }}>{s.label}</span>
              </div>
            ))}

            <div style={{ padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', margin: '1rem 0', fontSize: '11px', color: 'var(--muted)', fontFamily: 'Courier New, monospace', wordBreak: 'break-all', lineHeight: 1.7 }}>
              <div style={{ color: 'var(--muted)', marginBottom: '4px' }}>Tweet will contain:</div>
              okl-verify:{address?.slice(0, 8)}…:{nonce}:[signature]
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { window.open(tweetUrl, '_blank'); setStep('tweet-posted') }}>
              𝕏 Post Proof Tweet
            </button>
          </>
        )}

        {/* TWEET POSTED */}
        {step === 'tweet-posted' && (
          <>
            <h2 style={{ fontSize: '28px', marginBottom: '1rem' }}>Paste Tweet URL</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
              After posting the tweet, paste the tweet URL here to complete verification.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label>Your tweet URL</label>
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
              {loading ? <span className="spin">◌</span> : ''} Verify Tweet
            </button>
          </>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✓</div>
            <h2 style={{ color: 'var(--green)', marginBottom: '0.5rem', fontSize: '32px' }}>Verified!</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your Twitter is now permanently linked. Every token you launch will show your verified badge.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
              Start Launching
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
