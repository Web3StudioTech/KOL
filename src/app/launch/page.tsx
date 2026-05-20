'use client'
import { useState } from 'react'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { buildSignMessage, BADGE_LABELS, BADGE_ICONS } from '@/lib/auth'

const CATEGORIES = [
  { value: 'meme', label: '🐸 Meme' },
  { value: 'ai', label: '🤖 AI' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'music', label: '🎵 Music' },
  { value: 'sports', label: '🏃 Sports' },
  { value: 'political', label: '🗳️ Political' },
  { value: 'animal', label: '🦴 Animal' },
  { value: 'defi', label: '💎 DeFi' },
  { value: 'art', label: '🎨 Art' },
  { value: 'other', label: '🌐 Other' },
]

export default function LaunchPage() {
  const { address, connected, launcher } = useAppStore()

  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [telegramUrl, setTelegramUrl] = useState('')
  const [discordUrl, setDiscordUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [initialBuy, setInitialBuy] = useState('')
  const [identity, setIdentity] = useState<'anon' | 'twitter'>('anon')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)

  async function handleLaunch() {
    if (!connected || !address) { setError('Connect your wallet first'); return }
    if (!name.trim() || !ticker.trim()) { setError('Token name and ticker are required'); return }
    setLoading(true)
    setError('')
    try {
      const nonceRes = await fetch('/api/auth/nonce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet_address: address }) })
      const { nonce } = await nonceRes.json()
      const message = buildSignMessage(address, nonce, 'Launch Token')
      const messageBytes = new TextEncoder().encode(message)
      const phantom = (window as any).phantom?.solana
      const { signature } = await phantom.signMessage(messageBytes, 'utf8')
      const { default: bs58 } = await import('bs58')
      const sigBase58 = bs58.encode(signature)

      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          wallet_signature: sigBase58,
          nonce,
          name: name.trim(),
          ticker: ticker.trim().toUpperCase(),
          tagline: tagline.trim() || undefined,
          description: description.trim() || undefined,
          category: category || undefined,
          image_url: imageUrl.trim() || undefined,
          banner_url: bannerUrl.trim() || undefined,
          website_url: websiteUrl.trim() || undefined,
          twitter_url: twitterUrl.trim() || undefined,
          telegram_url: telegramUrl.trim() || undefined,
          discord_url: discordUrl.trim() || undefined,
          youtube_url: youtubeUrl.trim() || undefined,
          tiktok_url: tiktokUrl.trim() || undefined,
          github_url: githubUrl.trim() || undefined,
          initial_buy_sol: initialBuy ? parseFloat(initialBuy) : undefined,
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

  if (success) return (
    <>
      <Nav />
      <main style={{ paddingTop: '64px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '480px' }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '80px', color: 'var(--accent)', letterSpacing: '2px', lineHeight: 1 }}>🚀</div>
          <h1 style={{ fontSize: '48px', color: 'var(--accent)', marginBottom: '8px' }}>${success.token?.ticker} IS LIVE!</h1>
          <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
            Your token is now trading on the bonding curve. Share it with KOLs to get your first call.
          </p>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '16px', marginBottom: '1.5rem', textAlign: 'left' }}>
            {[
              ['Name', success.token?.name],
              ['Ticker', `$${success.token?.ticker}`],
              ['Launch fee paid', '0.02 SOL'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{k}</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.5px' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <a href={`/token/${success.token?.id}`} className="btn btn-primary">View Token Page</a>
            <a href="/" className="btn btn-secondary">Back to Explore</a>
          </div>
        </div>
      </main>
    </>
  )

  return (
    <>
      <Nav />
      <main style={{ paddingTop: '64px' }}>
        {/* Hero */}
        <div style={{ padding: '60px 40px 40px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-grid" />
          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div className="section-tag">Token Launch</div>
            <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', lineHeight: 1, marginBottom: '12px' }}>
              LAUNCH YOUR <span style={{ color: 'var(--accent)' }}>TOKEN</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '500px' }}>
              30 seconds. 0.02 SOL. No approval. Fair launch only — no pre-sales, no dev allocation, no bullshit.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,61,107,0.1)', border: '1px solid rgba(255,61,107,0.3)', borderRadius: '3px', color: 'var(--accent2)', fontSize: '14px', marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* LEFT: Token details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Basic info */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Token Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label>Token Name *</label>
                    <input className="input" placeholder="e.g. Moon Token" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <label>Ticker *</label>
                    <input className="input" placeholder="e.g. MOON" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} maxLength={10} />
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label>Tagline <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(60 chars max)</span></label>
                  <input className="input" placeholder="One punchy line that sells the vibe" value={tagline} onChange={e => setTagline(e.target.value)} maxLength={60} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label>Description / Lore</label>
                  <textarea className="input" placeholder="What's the narrative? The thesis? Why will people ape?" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div>
                  <label>Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setCategory(c.value)}
                        style={{
                          padding: '6px 4px', borderRadius: '3px', cursor: 'pointer',
                          border: `1px solid ${category === c.value ? 'var(--accent)' : 'var(--border)'}`,
                          background: category === c.value ? 'rgba(0,229,255,0.08)' : 'var(--bg3)',
                          color: category === c.value ? 'var(--accent)' : 'var(--muted)',
                          fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px',
                          fontWeight: 700, letterSpacing: '0.5px', transition: 'all 0.15s'
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Media */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Media</h3>
                <div style={{ marginBottom: '14px' }}>
                  <label>Token Image URL <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(400×400px recommended)</span></label>
                  <input className="input" placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                </div>
                <div>
                  <label>Banner Image URL <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(1200×400px recommended)</span></label>
                  <input className="input" placeholder="https://..." value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} />
                </div>
                {imageUrl && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '6px', background: `url(${imageUrl}) center/cover`, border: '1px solid var(--border)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Image preview</span>
                  </div>
                )}
              </div>

              {/* Social links */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Social Links <span style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontWeight: 400 }}>(all optional)</span></h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { label: '🌐 Website', value: websiteUrl, set: setWebsiteUrl, ph: 'https://yoursite.com' },
                    { label: '𝕏 Twitter/X', value: twitterUrl, set: setTwitterUrl, ph: 'https://twitter.com/...' },
                    { label: '✈️ Telegram', value: telegramUrl, set: setTelegramUrl, ph: 'https://t.me/...' },
                    { label: '💬 Discord', value: discordUrl, set: setDiscordUrl, ph: 'https://discord.gg/...' },
                    { label: '▶️ YouTube', value: youtubeUrl, set: setYoutubeUrl, ph: 'https://youtube.com/...' },
                    { label: '🎵 TikTok', value: tiktokUrl, set: setTiktokUrl, ph: 'https://tiktok.com/@...' },
                    { label: '💻 GitHub', value: githubUrl, set: setGithubUrl, ph: 'https://github.com/...' },
                  ].map(f => (
                    <div key={f.label}>
                      <label>{f.label}</label>
                      <input className="input" placeholder={f.ph} value={f.value} onChange={e => f.set(e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Identity + Launch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Identity */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Creator Identity</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
                  Your choice. Buyers see what you show. You can upgrade anytime.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { key: 'anon' as const, icon: '👤', label: 'Stay Anon', desc: 'Wallet address only' },
                    { key: 'twitter' as const, icon: '𝕏', label: 'Link Twitter', desc: 'Get verified badge' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setIdentity(opt.key)}
                      style={{
                        padding: '16px', borderRadius: '3px', cursor: 'pointer', textAlign: 'center',
                        border: `1px solid ${identity === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                        background: identity === opt.key ? 'rgba(0,229,255,0.06)' : 'var(--bg3)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{opt.icon}</div>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: identity === opt.key ? 'var(--accent)' : 'var(--text)' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {identity === 'twitter' && (
                  launcher?.badge !== 'anon' ? (
                    <div style={{ padding: '12px 14px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '3px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '1px', color: 'var(--green)' }}>
                          ✓ @{launcher?.twitter_handle} Verified
                        </span>
                        <span className={`badge badge-${launcher?.badge}`}>{BADGE_ICONS[launcher?.badge || 'anon']} {BADGE_LABELS[launcher?.badge || 'anon']}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>Your verified badge will appear on this token automatically.</p>
                    </div>
                  ) : (
                    <div style={{ padding: '12px 14px', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '3px', marginBottom: '14px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--accent3)', lineHeight: 1.6 }}>
                        Connect wallet first, then verify Twitter from the wallet menu to get your badge.
                      </p>
                    </div>
                  )
                )}

                {/* Preview */}
                <div style={{ padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>Token Card Preview</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '6px', background: imageUrl ? `url(${imageUrl}) center/cover` : 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '12px', color: 'var(--accent)' }}>
                      {!imageUrl && (ticker.slice(0, 3) || '??')}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '1px' }}>
                        ${ticker || 'TICKER'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        {identity === 'twitter' && launcher?.badge !== 'anon' ? (
                          <span className={`badge badge-${launcher?.badge}`}>{BADGE_ICONS[launcher?.badge || 'anon']} {BADGE_LABELS[launcher?.badge || 'anon']}</span>
                        ) : (
                          <span className="badge badge-anon">👤 Anon</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Launch settings */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Launch Settings</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label>Initial Buy — SOL <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional, sniper protection)</span></label>
                  <input className="input" type="number" placeholder="0.0" step="0.1" min="0" value={initialBuy} onChange={e => setInitialBuy(e.target.value)} />
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.5 }}>
                    Buy tokens immediately at launch to prevent bots from sniping the entire supply.
                  </p>
                </div>

                {/* Fee breakdown */}
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '14px', marginBottom: '16px' }}>
                  {[
                    ['Launch fee', '0.02 SOL (~$3)', 'var(--text)'],
                    ['Platform fee per trade', '1.25%', 'var(--text)'],
                    ['Your creator royalty', '0.15% forever', 'var(--green)'],
                    ['Graduation target', '$69K market cap', 'var(--accent)'],
                    ['Post-graduation', 'KOLSwap (your own DEX)', 'var(--accent)'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
                      <span style={{ color: 'var(--muted)' }}>{k}</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.5px', color: c as string }}>{v}</span>
                    </div>
                  ))}
                </div>

                {!connected ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)', fontSize: '14px' }}>
                    Connect wallet to launch
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '2px', padding: '16px' }}
                    onClick={handleLaunch}
                    disabled={loading || !name || !ticker}
                  >
                    {loading ? <span className="spin">◌</span> : '⚡'} {loading ? 'Deploying...' : 'Launch on Solana — 0.02 SOL'}
                  </button>
                )}
                <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '10px', lineHeight: 1.5, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.5px' }}>
                  FAIR LAUNCH ONLY. NO DEV ALLOCATION. NO PRE-SALE. MINT AUTHORITY REVOKED AT LAUNCH.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
