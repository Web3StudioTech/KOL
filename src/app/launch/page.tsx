'use client'
import { useState } from 'react'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'

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

// Mining steps shown to user
const MINING_STEPS = [
  'Preparing your token...',
  'Mining vanity address...',
  'Looking for ...kol suffix...',
  'Almost there...',
  'Address found!',
]

export default function LaunchPage() {
  const { address, connected, launcher } = useAppStore()

  // Form fields
  const [name, setName]           = useState('')
  const [ticker, setTicker]       = useState('')
  const [tagline, setTagline]     = useState('')
  const [description, setDesc]    = useState('')
  const [category, setCategory]   = useState('')
  const [imageUrl, setImageUrl]   = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [websiteUrl, setWebsite]  = useState('')
  const [twitterUrl, setTwitter]  = useState('')
  const [telegramUrl, setTelegram]= useState('')
  const [discordUrl, setDiscord]  = useState('')
  const [youtubeUrl, setYoutube]  = useState('')
  const [tiktokUrl, setTiktok]    = useState('')
  const [githubUrl, setGithub]    = useState('')

  // Launch state
  const [loading, setLoading]         = useState(false)
  const [miningStep, setMiningStep]   = useState('')
  const [miningAttempts, setAttempts] = useState(0)
  const [minedAddress, setMinedAddr]  = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState<any>(null)

  async function handleLaunch() {
    if (!connected || !address) { setError('Connect your wallet first'); return }
    if (!name.trim() || !ticker.trim()) { setError('Token name and ticker are required'); return }

    setLoading(true)
    setError('')
    setMiningStep(MINING_STEPS[0])

    try {
      // Step 1 — Mine the salt in the browser
      setMiningStep(MINING_STEPS[1])
      const { mineKolSalt } = await import('@/lib/saltMiner')

      const bondingCurveAddress = process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS!
      const totalSupply = BigInt('1000000000000000000000000000') // 1B * 1e18

      let salt = ''
      setMiningStep(MINING_STEPS[2])

      salt = await mineKolSalt(
        bondingCurveAddress,
        name.trim(),
        ticker.trim().toUpperCase(),
        '', // uri (empty at launch, set via metadata)
        totalSupply,
        (attempts) => {
          setAttempts(attempts)
          setMiningStep(`Mining... ${(attempts / 1000).toFixed(0)}K attempts`)
        }
      )

      setMiningStep(MINING_STEPS[4])

      // Step 2 — Send to backend to record + get MetaMask tx
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address:  address,
          name:            name.trim(),
          ticker:          ticker.trim().toUpperCase(),
          tagline:         tagline.trim() || undefined,
          description:     description.trim() || undefined,
          category:        category || undefined,
          image_url:       imageUrl.trim() || undefined,
          banner_url:      bannerUrl.trim() || undefined,
          website_url:     websiteUrl.trim() || undefined,
          twitter_url:     twitterUrl.trim() || undefined,
          telegram_url:    telegramUrl.trim() || undefined,
          discord_url:     discordUrl.trim() || undefined,
          youtube_url:     youtubeUrl.trim() || undefined,
          tiktok_url:      tiktokUrl.trim() || undefined,
          github_url:      githubUrl.trim() || undefined,
          salt,            // browser-mined CREATE2 salt
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Step 3 — Trigger MetaMask to sign the actual contract call
      // (In production: ethers.js contract.launchToken(..., salt))
      setMinedAddr(data.token?.address || '')
      setSuccess(data)

    } catch (err: any) {
      setError(err.message || 'Launch failed')
    } finally {
      setLoading(false)
      setMiningStep('')
    }
  }

  if (success) return (
    <>
      <Nav />
      <main style={{ paddingTop: '64px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '520px' }}>
          <div style={{ fontSize: '5rem', marginBottom: '0.5rem' }}>🚀</div>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '56px', color: 'var(--accent)', letterSpacing: '2px', marginBottom: '8px' }}>
            ${success.token?.ticker} IS LIVE!
          </h1>

          {/* Vanity address display */}
          {success.token?.address && (
            <div style={{ margin: '16px 0', padding: '12px 16px', background: 'var(--bg2)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '4px' }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>
                Token Contract Address
              </div>
              <div style={{ fontFamily: 'Courier New, monospace', fontSize: '13px', color: 'var(--text)', wordBreak: 'break-all' }}>
                {success.token.address.slice(0, -6)}
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  {success.token.address.slice(-6)}
                </span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--accent)' }}>
                ✓ Ends in <strong>...kol</strong> — OnchainKOL branded
              </div>
            </div>
          )}

          <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '2rem', fontSize: '14px' }}>
            Your token is now live on Robinhood Chain. Share it with KOLs to get your first call and start building volume.
          </p>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '16px', marginBottom: '1.5rem', textAlign: 'left' }}>
            {[
              ['Name', success.token?.name],
              ['Ticker', `$${success.token?.ticker}`],
              ['Launch fee', '0.02 ETH'],
              ['Your royalty', '0.15% of every trade forever'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>{k}</span>
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
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>
              Token Launch
            </div>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(40px, 7vw, 80px)', lineHeight: 1, marginBottom: '12px' }}>
              LAUNCH YOUR <span style={{ color: 'var(--accent)' }}>TOKEN</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '520px', lineHeight: 1.6 }}>
              30 seconds. 0.02 ETH. No approval needed. Every token gets a unique <strong style={{ color: 'var(--accent)' }}>...kol</strong> address — mined instantly in your browser.
            </p>

            {/* Vanity address explainer */}
            <div style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 16px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '4px' }}>
              <span style={{ fontFamily: 'Courier New, monospace', fontSize: '14px', color: 'var(--muted)' }}>0x4a7f...</span>
              <span style={{ fontFamily: 'Courier New, monospace', fontSize: '14px', color: 'var(--accent)', fontWeight: 700 }}>6b6f6c</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: 'var(--muted)' }}>= ...kol ✓</span>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,61,107,0.1)', border: '1px solid rgba(255,61,107,0.3)', borderRadius: '3px', color: 'var(--accent2)', fontSize: '14px', marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* LEFT — Token details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Basic info */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '24px' }}>
                <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', letterSpacing: '1px' }}>
                  Token Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Token Name *</label>
                    <input className="input" placeholder="e.g. Moon Token" value={name} onChange={e => setName(e.target.value)} maxLength={32} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Ticker *</label>
                    <input className="input" placeholder="e.g. MOON" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} maxLength={10} />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Tagline</label>
                  <input className="input" placeholder="One punchy line that sells the vibe" value={tagline} onChange={e => setTagline(e.target.value)} maxLength={60} />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Description / Lore</label>
                  <textarea className="input" placeholder="What's the narrative? The thesis? Why will people buy?" value={description} onChange={e => setDesc(e.target.value)} style={{ minHeight: '80px' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>Category</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {CATEGORIES.map(c => (
                      <button key={c.value} onClick={() => setCategory(c.value)} style={{
                        padding: '6px 4px', borderRadius: '3px', cursor: 'pointer',
                        border: `1px solid ${category === c.value ? 'var(--accent)' : 'var(--border)'}`,
                        background: category === c.value ? 'rgba(0,229,255,0.08)' : 'var(--bg3)',
                        color: category === c.value ? 'var(--accent)' : 'var(--muted)',
                        fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px',
                        fontWeight: 700, letterSpacing: '0.5px', transition: 'all 0.15s'
                      }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Media */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '24px' }}>
                <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', letterSpacing: '1px' }}>Media</h3>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Token Image URL</label>
                  <input className="input" placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Banner Image URL</label>
                  <input className="input" placeholder="https://..." value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} />
                </div>
                {imageUrl && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '6px', background: `url(${imageUrl}) center/cover`, border: '1px solid var(--border)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Image preview</span>
                  </div>
                )}
              </div>

              {/* Socials */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '24px' }}>
                <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', letterSpacing: '1px' }}>Social Links <span style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontWeight: 400 }}>(all optional)</span></h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { label: '🌐 Website', value: websiteUrl, set: setWebsite, ph: 'https://yoursite.com' },
                    { label: '𝕏 Twitter/X', value: twitterUrl, set: setTwitter, ph: 'https://twitter.com/...' },
                    { label: '✈️ Telegram', value: telegramUrl, set: setTelegram, ph: 'https://t.me/...' },
                    { label: '💬 Discord', value: discordUrl, set: setDiscord, ph: 'https://discord.gg/...' },
                    { label: '▶️ YouTube', value: youtubeUrl, set: setYoutube, ph: 'https://youtube.com/...' },
                    { label: '🎵 TikTok', value: tiktokUrl, set: setTiktok, ph: 'https://tiktok.com/@...' },
                    { label: '💻 GitHub', value: githubUrl, set: setGithub, ph: 'https://github.com/...' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>{f.label}</label>
                      <input className="input" placeholder={f.ph} value={f.value} onChange={e => f.set(e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Launch + preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Launch settings */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '24px' }}>
                <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', letterSpacing: '1px' }}>Launch Settings</h3>

                {/* Vanity address info */}
                <div style={{ padding: '14px', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '3px', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: 'var(--accent)', marginBottom: '6px' }}>
                    ✓ Vanity Address — Ends in ...kol
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
                    Your token contract address will end in <strong style={{ color: 'var(--accent)' }}>6b6f6c</strong> (kol in hex). Mined in your browser in ~2 seconds. Zero extra cost.
                  </p>
                  <div style={{ marginTop: '8px', fontFamily: 'Courier New, monospace', fontSize: '12px', color: 'var(--muted)' }}>
                    Example: 0x4a7f8e2d...<span style={{ color: 'var(--accent)' }}>6b6f6c</span>
                  </div>
                </div>

                {/* Fee breakdown */}
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>Economics</div>
                  {[
                    ['Launch fee', '0.02 ETH', 'var(--text)'],
                    ['Trading fee', '1% per trade', 'var(--text)'],
                    ['Your royalty', '0.15% forever', 'var(--green)'],
                    ['Graduation', '$69K market cap', 'var(--accent)'],
                    ['KOL Pass', '$1M volume milestone', 'var(--accent3)'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid rgba(30,45,61,0.5)' }}>
                      <span style={{ color: 'var(--muted)' }}>{k}</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.5px', color: c as string }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Mining progress */}
                {loading && miningStep && (
                  <div style={{ padding: '14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: 'var(--accent)' }}>
                        {miningStep}
                      </span>
                    </div>
                    {miningAttempts > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'Courier New, monospace' }}>
                        {(miningAttempts / 1000).toFixed(0)}K hashes tried...
                      </div>
                    )}
                    <div style={{ marginTop: '8px', height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent4))', borderRadius: '2px', animation: 'progress 2s ease-in-out infinite', width: '60%' }} />
                    </div>
                  </div>
                )}

                {!connected ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)', fontSize: '14px', border: '1px solid var(--border)', borderRadius: '3px' }}>
                    Connect your MetaMask wallet to launch
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '2px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}
                    onClick={handleLaunch}
                    disabled={loading || !name || !ticker}
                  >
                    {loading ? (
                      <>
                        <span className="spin" style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%' }} />
                        {miningStep || 'Launching...'}
                      </>
                    ) : (
                      <>⚡ Launch — 0.02 ETH</>
                    )}
                  </button>
                )}

                <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '10px', lineHeight: 1.5, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.5px' }}>
                  FAIR LAUNCH ONLY · NO DEV ALLOCATION · NO PRE-SALE · FIXED SUPPLY FOREVER
                </p>
              </div>

              {/* Token preview card */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '24px' }}>
                <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', marginBottom: '16px', letterSpacing: '1px' }}>Preview</h3>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '6px',
                      background: imageUrl ? `url(${imageUrl}) center/cover` : 'var(--bg3)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Bebas Neue, sans-serif', fontSize: '13px', color: 'var(--accent)',
                      flexShrink: 0
                    }}>
                      {!imageUrl && (ticker.slice(0, 3) || '???')}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '1px', lineHeight: 1 }}>
                        ${ticker || 'TICKER'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{name || 'Token Name'}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '2px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
                        👤 Anon
                      </span>
                    </div>
                  </div>
                  {tagline && (
                    <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '10px' }}>{tagline}</p>
                  )}
                  <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: '0%', background: 'linear-gradient(90deg, var(--accent), var(--accent4))', borderRadius: '2px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '1px' }}>0% to graduation</span>
                    <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '14px', color: 'var(--accent)' }}>$0 mkt cap</span>
                  </div>
                </div>
              </div>

              {/* Badges info */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '24px' }}>
                <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', marginBottom: '16px', letterSpacing: '1px' }}>Get Badges</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>💙</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: '#3b82f6' }}>KOL Badge</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Verify Twitter with 5,000+ followers. Submit up to 3 calls per day. Earn from the KOL reward pool.
                    </p>
                  </div>
                  <div style={{ padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>💎</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: '#06B6D4' }}>Trader Badge</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Trade $50,000+ cumulative volume on OnchainKOL. Badge assigned automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
