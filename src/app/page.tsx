'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Nav from '@/components/layout/Nav'
import TokenCard from '@/components/token/TokenCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SORTS = [
  { key: 'trending', label: '🔥 Trending' },
  { key: 'new', label: '🆕 New' },
  { key: 'kol_called', label: '📢 KOL Called' },
  { key: 'graduating', label: '⚡ Graduating' },
]

const BADGE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'gold_kol', label: '🥇 Gold KOL' },
  { key: 'pro_kol', label: '💜 Pro KOL' },
  { key: 'kol', label: '💙 KOL' },
  { key: 'anon', label: '👤 Anon' },
]

const PLATFORM_STATS = [
  { label: '24H Volume', value: '$8.4M', sub: '+31% today' },
  { label: 'Tokens Today', value: '1,240', sub: '88 last hour' },
  { label: 'KOL Calls', value: '342', sub: '67% of volume' },
  { label: 'Fees Earned', value: '$84K', sub: 'today' },
]

const LIVE_FEED_ITEMS = [
  'CryptoKing called $PEPE2 · 2m ago',
  '$MOON launched by @degenlife · 5m ago',
  'SolBull called $WAGMI · 11m ago',
  '$REKT launched anonymously · 14m ago',
  'AlphaWolf called $DEGEN · 22m ago',
]

export default function HomePage() {
  const [sort, setSort] = useState('trending')
  const [badge, setBadge] = useState('all')
  const [feed, setFeed] = useState(LIVE_FEED_ITEMS)

  const { data, isLoading } = useSWR(
    `/api/tokens?sort=${sort}&badge=${badge}`,
    fetcher,
    { refreshInterval: 10000 }
  )

  useEffect(() => {
    const timer = setInterval(() => {
      const items = [
        `$${['MOON','FROG','BASED','DEGEN','WAGMI'][Math.floor(Math.random()*5)]} launched just now`,
        `NiquiTrades called $PEPE · just now`,
        `$${['SOL','KOL','PUMP','REKT'][Math.floor(Math.random()*4)]} launched anonymously · just now`,
      ]
      setFeed(prev => [items[Math.floor(Math.random()*items.length)], ...prev.slice(0,5)])
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <Nav />
      <main>
        {/* HERO */}
        <section style={{
          position: 'relative', minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', overflow: 'hidden', padding: '120px 24px 80px'
        }}>
          {/* Grid background */}
          <div className="hero-grid" />

          {/* Orbs */}
          <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', filter: 'blur(80px)', top: '-100px', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(0,229,255,0.12), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', filter: 'blur(80px)', bottom: 0, right: '-100px', background: 'radial-gradient(circle, rgba(255,61,107,0.1), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', filter: 'blur(80px)', bottom: 0, left: '-100px', background: 'radial-gradient(circle, rgba(168,85,247,0.1), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', border: '1px solid var(--border)',
              borderRadius: '100px', fontSize: '12px', fontWeight: 600,
              letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent)',
              marginBottom: '32px', background: 'rgba(0,229,255,0.05)',
              animation: 'fadeUp 0.8s ease both',
              fontFamily: 'Barlow Condensed, sans-serif'
            }}>
              <span className="live-dot live-dot-cyan" />
              Season 1 — Genesis Traders Now Live
            </div>

            {/* Hero title */}
            <h1 style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 'clamp(64px, 12vw, 140px)',
              lineHeight: 0.9, letterSpacing: '2px',
              animation: 'fadeUp 0.8s 0.1s ease both',
              marginBottom: '8px'
            }}>
              <span style={{ display: 'block', color: 'var(--text)' }}>LAUNCH WITH</span>
              <span style={{ display: 'block', color: 'var(--accent)' }}>YOUR KOLS.</span>
              <span style={{ display: 'block', WebkitTextStroke: '2px var(--accent2)', color: 'transparent' }}>EARN TOGETHER.</span>
            </h1>

            {/* Sub */}
            <p style={{
              fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'var(--muted)',
              maxWidth: '600px', margin: '24px auto 40px',
              fontWeight: 300, lineHeight: 1.6,
              animation: 'fadeUp 0.8s 0.2s ease both'
            }}>
              The first KOL-powered token launchpad on Solana.{' '}
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Anyone launches.</strong>{' '}
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>KOLs discover.</strong>{' '}
              Creator royalties forever.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.8s 0.3s ease both', marginBottom: '64px' }}>
              <a href="/launch" className="btn btn-primary btn-lg">⚡ Launch a Token</a>
              <a href="/kol" className="btn btn-secondary btn-lg">👑 KOL Zone</a>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '48px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.8s 0.4s ease both' }}>
              {PLATFORM_STATS.map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div className="stat-num">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, letterSpacing: '1px', marginTop: '2px' }}>
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LIVE FEED */}
        <div style={{
          background: 'var(--bg2)', borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)', padding: '10px 40px',
          display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span className="live-dot" />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent2)' }}>Live</span>
          </div>
          <div style={{ display: 'flex', gap: '32px', overflow: 'hidden' }}>
            {feed.map((item, i) => (
              <span key={i} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', letterSpacing: '0.5px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* TOKEN EXPLORER */}
        <section style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ marginBottom: '32px' }}>
            <div className="section-tag">Token Explorer</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1 }}>
              All Tokens
            </h2>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {SORTS.map(s => (
                <button
                  key={s.key}
                  className={`btn btn-sm ${sort === s.key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {BADGE_FILTERS.map(b => (
                <button
                  key={b.key}
                  className={`btn btn-sm ${badge === b.key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBadge(b.key)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Token grid */}
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: '280px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', opacity: 0.4 }} />
              ))}
            </div>
          ) : (data?.tokens?.length ?? 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--muted)' }}>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', color: 'var(--border)', marginBottom: '16px' }}>NO TOKENS YET</div>
              <p style={{ marginBottom: '24px' }}>Be the first to launch.</p>
              <a href="/launch" className="btn btn-primary">⚡ Launch First Token</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {data?.tokens?.map((token: any) => (
                <TokenCard key={token.id} token={token} />
              ))}
            </div>
          )}
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: '100px 40px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '72px' }}>
              <div className="section-tag">How It Works</div>
              <h2 style={{ fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1 }}>
                Simple. Fair. <span style={{ color: 'var(--accent)' }}>Onchain.</span>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', background: 'var(--border)' }}>
              {[
                { num: '01', icon: '🚀', color: 'cyan', title: 'Anyone Launches', desc: 'Pay 0.02 SOL. Deploy in 30 seconds. No approval. Fair launch — no pre-sales, no dev allocation. Bonding curve handles pricing automatically.' },
                { num: '02', icon: '👑', color: 'red', title: 'KOLs Discover', desc: 'Verified KOLs browse new launches. When they call a token, their call is recorded onchain with a price snapshot. Unfakeable. Permanent.' },
                { num: '03', icon: '💰', color: 'purple', title: 'Everyone Earns', desc: 'Creators earn 0.15% royalty forever. KOLs earn from the reward pool for accurate calls. Traders earn by buying early. Platform earns 0.90%.' },
              ].map(step => (
                <div key={step.num} style={{
                  background: 'var(--bg2)', padding: '48px 40px',
                  position: 'relative', overflow: 'hidden',
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: '16px', right: '24px',
                    fontFamily: 'Bebas Neue, sans-serif', fontSize: '80px',
                    lineHeight: 1, color: 'var(--border)', letterSpacing: '2px'
                  }}>
                    {step.num}
                  </div>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', marginBottom: '24px',
                    background: step.color === 'cyan' ? 'rgba(0,229,255,0.1)' : step.color === 'red' ? 'rgba(255,61,107,0.1)' : 'rgba(168,85,247,0.1)',
                    border: `1px solid ${step.color === 'cyan' ? 'rgba(0,229,255,0.2)' : step.color === 'red' ? 'rgba(255,61,107,0.2)' : 'rgba(168,85,247,0.2)'}`,
                  }}>
                    {step.icon}
                  </div>
                  <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '24px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7 }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '40px', borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '3px', color: 'var(--accent)' }}>
              ONCHAIN<span style={{ color: 'var(--accent2)' }}>KOL</span>
            </span>
            <div style={{ display: 'flex', gap: '24px' }}>
              {['Twitter', 'Telegram', 'Discord', 'Docs'].map(l => (
                <a key={l} href="#" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}>
                  {l}
                </a>
              ))}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              © 2025 OnchainKOL. All rights reserved.
            </span>
          </div>
        </footer>
      </main>
    </>
  )
}
