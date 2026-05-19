'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import TokenCard from '@/components/token/TokenCard'
import { TokenWithLauncher, TokenSortBy, BadgeFilter } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SORT_OPTS: { key: TokenSortBy; label: string; icon: string }[] = [
  { key: 'trending',   label: 'Trending',   icon: '🔥' },
  { key: 'new',        label: 'New',        icon: '🆕' },
  { key: 'kol_called', label: 'KOL called', icon: '📢' },
  { key: 'graduating', label: 'Graduating', icon: '⚡' },
]

const BADGE_OPTS: { key: BadgeFilter; label: string }[] = [
  { key: 'all',              label: 'All' },
  { key: 'kol',             label: '👑 KOL only' },
  { key: 'twitter_verified', label: '✓ Verified' },
  { key: 'anon',            label: '👤 Anon' },
]

// Live stats strip
const PLATFORM_STATS = [
  { label: '24h volume', value: '$8.4M', chg: '+31%' },
  { label: 'Tokens today', value: '1,240', chg: '+88 last hour' },
  { label: 'KOL calls', value: '342', chg: '67% of volume' },
  { label: 'Fees earned', value: '$84K', chg: 'today' },
]

export default function ExploreClient() {
  const [sort, setSort] = useState<TokenSortBy>('trending')
  const [badge, setBadge] = useState<BadgeFilter>('all')
  const [liveFeed, setLiveFeed] = useState<string[]>([
    'CryptoKing called $PEPE2 · 2m ago',
    'SolBull called $WAGMI · 8m ago',
    '$MOON launched by @degenlife · 11m ago',
    'AlphaWolf called $DEGEN · 32m ago',
  ])

  const { data, isLoading } = useSWR<{ tokens: TokenWithLauncher[] }>(
    `/api/tokens?sort=${sort}&badge=${badge}`,
    fetcher,
    { refreshInterval: 10000 }
  )

  // Simulate live feed updates
  useEffect(() => {
    const timer = setInterval(() => {
      const examples = [
        '$SOLKID launched anonymously · just now',
        'NiquiTrades called $MOON · just now',
        '$REKT launched by @anon · just now',
        'CryptoKing called $WAGMI · just now',
      ]
      setLiveFeed(prev => [examples[Math.floor(Math.random() * examples.length)], ...prev.slice(0, 4)])
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '2.5rem 0 2rem' }}>
        <h1 style={{ marginBottom: '0.75rem', fontSize: '2.5rem' }}>
          Launch your influence,{' '}
          <span style={{ color: 'var(--purple)' }}>onchain</span>
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
          Anyone can launch a token. KOLs discover the gems. The market decides everything else.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/launch" className="btn btn-primary btn-lg">🚀 Launch a token</a>
          <a href="/kol" className="btn btn-ghost btn-lg">👑 KOL zone</a>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '1.5rem' }}>
        {PLATFORM_STATS.map(s => (
          <div key={s.label} className="card-sm">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--green)' }}>{s.chg}</div>
          </div>
        ))}
      </div>

      {/* Live feed strip */}
      <div style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '1.5rem',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="live-dot" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, flexShrink: 0 }}>Live</span>
          <div style={{ display: 'flex', gap: '1.5rem', overflow: 'hidden' }}>
            {liveFeed.map((item, i) => (
              <span key={i} style={{ fontSize: '0.8rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        {/* Sort */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {SORT_OPTS.map(o => (
            <button
              key={o.key}
              className={`btn btn-sm ${sort === o.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSort(o.key)}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>

        {/* Badge filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {BADGE_OPTS.map(o => (
            <button
              key={o.key}
              className={`btn btn-sm ${badge === o.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setBadge(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Token grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: '220px', opacity: 0.4 }}>
              <div style={{ height: '100%', background: 'var(--bg-3)', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      ) : (data?.tokens?.length ?? 0) === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏜️</div>
          <div>No tokens yet. Be the first to launch.</div>
          <a href="/launch" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
            Launch first token
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {data?.tokens?.map(token => (
            <TokenCard key={token.id} token={token} />
          ))}
        </div>
      )}
    </main>
  )
}
