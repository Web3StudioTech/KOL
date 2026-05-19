'use client'
import { useState } from 'react'
import Nav from '@/components/layout/Nav'
import { useWalletStore } from '@/lib/store'
import { buildSignMessage, generateNonce } from '@/lib/auth'

type Identity = 'anon' | 'twitter'

export default function LaunchPage() {
  const { address, connected, launcher } = useWalletStore()
  const [identity, setIdentity] = useState<Identity>(
    launcher?.badge !== 'anon' ? 'twitter' : 'anon'
  )
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [initialBuy, setInitialBuy] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ token: any; message: string } | null>(null)

  const alreadyVerified = launcher && launcher.badge !== 'anon'

  async function handleLaunch() {
    if (!connected || !address) {
      setError('Connect your wallet first')
      return
    }
    if (!name.trim() || !ticker.trim()) {
      setError('Token name and ticker are required')
      return
    }

    setLoading(true)
    setError('')
    try {
      // Get nonce
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      })
      const { nonce } = await nonceRes.json()

      // Sign with wallet
      const phantom = (window as any).phantom?.solana
      const message = buildSignMessage({
        wallet: address,
        nonce,
        timestamp: new Date().toISOString(),
        action: 'launch_token'
      })
      const messageBytes = new TextEncoder().encode(message)
      const { signature } = await phantom.signMessage(messageBytes, 'utf8')
      const { default: bs58 } = await import('bs58')
      const sigBase58 = bs58.encode(signature)

      // Launch
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          wallet_signature: sigBase58,
          nonce,
          name: name.trim(),
          ticker: ticker.trim().toUpperCase(),
          description: description.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          initial_buy_sol: initialBuy ? parseFloat(initialBuy) : undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccess(data)
    } catch (err: any) {
      setError(err.message || 'Launch failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <>
        <Nav />
        <main style={{ maxWidth: '560px', margin: '4rem auto', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h2 style={{ color: 'var(--green)', marginBottom: '0.5rem' }}>${success.token.ticker} is live!</h2>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Your token is now trading on the bonding curve. Share it with KOLs to get your first call.
          </p>
          <div className="card" style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-3)' }}>Name</span>
              <span>{success.token.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-3)' }}>Ticker</span>
              <span>${success.token.ticker}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-3)' }}>Identity</span>
              <span className={`badge badge-${launcher?.badge || 'anon'}`}>
                {launcher?.badge === 'anon' ? '👤 Anon' : launcher?.badge === 'kol' ? '👑 KOL' : '✓ Verified'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <a href={`/token/${success.token.id}`} className="btn btn-primary">View token page</a>
            <a href="/" className="btn btn-ghost">Back to explore</a>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2>Launch a token</h2>
          <p style={{ color: 'var(--text-2)', marginTop: '4px', fontSize: '0.875rem' }}>
            30 seconds. 0.02 SOL. No approval needed. Fair launch, bonding curve only.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
            color: '#FCA5A5', fontSize: '0.875rem', marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left: Token details */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Token details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label>Token name</label>
                <input className="input" placeholder="e.g. Moon Token" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label>Ticker</label>
                <input className="input" placeholder="e.g. MOON" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} maxLength={10} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label>Description / lore</label>
              <textarea className="input" placeholder="What's the narrative? The vibe? The thesis?" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label>Image URL (optional)</label>
              <input className="input" placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Initial buy — SOL (optional, sniper protection)</label>
              <input className="input" type="number" placeholder="0.0" step="0.1" min="0" value={initialBuy} onChange={e => setInitialBuy(e.target.value)} />
            </div>

            {/* Fee breakdown */}
            <div className="card-sm" style={{ marginBottom: '1rem' }}>
              {[
                ['Launch fee', '0.02 SOL (~$3)'],
                ['Platform fee per trade', '1%'],
                ['Your cut', '0% (fair launch)'],
                ['Graduates to Raydium at', '$69K mkt cap'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '3px 0' }}>
                  <span style={{ color: 'var(--text-3)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Identity */}
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Creator identity</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Your choice. Buyers see what you show. You can upgrade anytime.
            </p>

            {/* Identity toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
              {[
                { key: 'anon' as Identity, icon: '👤', label: 'Stay anon', desc: 'Wallet address only' },
                { key: 'twitter' as Identity, icon: '𝕏', label: 'Twitter linked', desc: 'Get verified badge' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setIdentity(opt.key)}
                  style={{
                    padding: '12px', borderRadius: '8px',
                    border: `1px solid ${identity === opt.key ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
                    background: identity === opt.key ? 'rgba(124,58,237,0.1)' : 'var(--bg-3)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{opt.icon}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: identity === opt.key ? '#A78BFA' : 'var(--text)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '2px' }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Twitter identity details */}
            {identity === 'twitter' && (
              alreadyVerified ? (
                <div style={{
                  padding: '12px 14px', background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--green)' }}>
                      ✓ @{launcher?.twitter_handle} verified
                    </span>
                    <span className={`badge badge-${launcher?.badge}`}>
                      {launcher?.badge === 'kol' ? '👑 KOL' : '✓ Verified'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                    Your verified badge will appear on this token automatically.
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: '12px 14px', background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', marginBottom: '1rem'
                }}>
                  <p style={{ fontSize: '0.8rem', color: '#FCD34D', lineHeight: 1.6, marginBottom: '8px' }}>
                    You haven't linked Twitter yet. Connect wallet first, then verify Twitter from the wallet menu to get your badge.
                  </p>
                </div>
              )
            )}

            {/* Preview */}
            <div className="card-sm" style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '8px' }}>Token card preview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '8px',
                  background: 'var(--bg-4)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700
                }}>
                  {ticker.slice(0, 2) || '??'}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    ${ticker || 'TICKER'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    {identity === 'twitter' && alreadyVerified ? (
                      <span className={`badge badge-${launcher?.badge}`}>
                        {launcher?.badge === 'kol' ? '👑 KOL' : '✓ Verified'}
                      </span>
                    ) : (
                      <span className="badge badge-anon">👤 Anon</span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      {identity === 'twitter' && alreadyVerified && launcher?.twitter_handle
                        ? `@${launcher.twitter_handle}`
                        : 'Wallet only'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch button */}
            {!connected ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-3)', fontSize: '0.875rem' }}>
                Connect wallet to launch
              </div>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleLaunch}
                disabled={loading || !name || !ticker}
              >
                {loading ? <span className="spin">◌</span> : '🚀'}
                {loading ? 'Deploying...' : 'Launch on Solana — 0.02 SOL'}
              </button>
            )}

            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
              Fair launch only. No dev allocation. No pre-sale. Mint authority revoked at launch.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
