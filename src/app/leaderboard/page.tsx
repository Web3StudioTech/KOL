'use client'
import { useState } from 'react'
import useSWR from 'swr'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, formatFollowers, BADGE_LABELS, BADGE_ICONS } from '@/lib/auth'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TABS = [
  { key: 'tokens', label: '🔥 Top Tokens', desc: 'By trading volume' },
  { key: 'kols', label: '👑 Top KOLs', desc: 'By accuracy score' },
  { key: 'traders', label: '💎 Top Traders', desc: 'By points earned' },
]

const TIER_COLORS: Record<string, string> = {
  diamond: '#06B6D4',
  gold: '#F59E0B',
  silver: '#9CA3AF',
  bronze: '#B45309',
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState('tokens')
  const { data: tokensData } = useSWR('/api/tokens?sort=trending&limit=20', fetcher)
  const tokens = tokensData?.tokens || []

  // Mock data for demo — real data comes from points system
  const mockKols = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    handle: `kol${i+1}`,
    badge: i < 2 ? 'gold_kol' : i < 5 ? 'pro_kol' : 'kol',
    followers: Math.floor(Math.random() * 2000000) + 10000,
    accuracy: Math.floor(88 - i * 3),
    calls: Math.floor(50 - i * 4),
    earned: Math.floor(9000 - i * 800),
  }))

  const mockTraders = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    wallet: `${Math.random().toString(36).substr(2, 4).toUpperCase()}…${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    points: Math.floor(85000 - i * 7000),
    tier: i < 2 ? 'diamond' : i < 4 ? 'gold' : i < 7 ? 'silver' : 'bronze',
    sol_traded: Math.floor(1500 - i * 120),
    streak: Math.floor(45 - i * 4),
  }))

  const rankColor = (rank: number) =>
    rank === 1 ? 'var(--accent3)' : rank === 2 ? '#9CA3AF' : rank === 3 ? '#CD7F32' : 'var(--muted)'

  return (
    <>
      <Nav />
      <main style={{ paddingTop: '64px' }}>
        {/* Header */}
        <div style={{ padding: '60px 40px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-grid" />
          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div className="section-tag">Leaderboard</div>
            <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', lineHeight: 1, marginBottom: '12px' }}>
              WHO'S <span style={{ color: 'var(--accent3)' }}>WINNING?</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '560px', lineHeight: 1.6, marginBottom: '32px' }}>
              Real-time rankings across tokens, KOLs, and traders. Updated every hour.
            </p>

            {/* Tabs */}
            <div style={{ display: 'flex' }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '14px 24px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: '-1px', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: tab === t.key ? 'var(--accent)' : 'var(--muted)' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px' }}>

          {/* TOP TOKENS */}
          {tab === 'tokens' && (
            <div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 120px 120px 80px', padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Token', 'Market Cap', 'Volume 24h', 'Holders', 'KOL Calls'].map(h => (
                    <div key={h} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</div>
                  ))}
                </div>
                {(tokens.length === 0 ? Array.from({length:5},(_,i)=>({id:i,ticker:`TOKEN${i+1}`,name:`Token ${i+1}`,market_cap_usd:(5-i)*1000000,volume_24h_usd:(5-i)*200000,holder_count:(5-i)*1000,kol_call_count:5-i,launcher_badge:'kol',launcher_twitter:`trader${i+1}`})) : tokens).map((token: any, idx: number) => (
                  <div key={token.id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 120px 120px 80px', padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: 'background 0.2s' }}>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: rankColor(idx+1) }}>
                      {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx+1}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '10px', color: 'var(--accent)' }}>
                        {token.ticker?.slice(0,3)}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '1px' }}>${token.ticker}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{token.name}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '0.5px' }}>{formatMktCap(token.market_cap_usd)}</div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '0.5px', color: 'var(--accent)' }}>{formatMktCap(token.volume_24h_usd)}</div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '0.5px' }}>{token.holder_count?.toLocaleString()}</div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '0.5px', color: token.kol_call_count > 0 ? 'var(--accent2)' : 'var(--muted)' }}>{token.kol_call_count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOP KOLS */}
          {tab === 'kols' && (
            <div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 80px 120px 140px', padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'KOL', 'Accuracy', 'Calls', 'Followers', 'Earned'].map(h => (
                    <div key={h} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</div>
                  ))}
                </div>
                {mockKols.map((kol) => (
                  <div key={kol.rank} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 80px 120px 140px', padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: rankColor(kol.rank) }}>
                      {kol.rank <= 3 ? ['🥇','🥈','🥉'][kol.rank-1] : kol.rank}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '12px', color: 'var(--accent)' }}>
                        {kol.handle.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px' }}>@{kol.handle}</span>
                          <span className={`badge badge-${kol.badge}`}>{BADGE_ICONS[kol.badge]} {BADGE_LABELS[kol.badge]}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.5px', color: kol.accuracy > 80 ? 'var(--green)' : 'var(--text)' }}>{kol.accuracy}%</div>
                      <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${kol.accuracy}%`, background: 'var(--green)', borderRadius: '2px' }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.5px' }}>{kol.calls}</div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--muted)' }}>{formatFollowers(kol.followers)}</div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.5px', color: 'var(--accent3)' }}>${kol.earned.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOP TRADERS */}
          {tab === 'traders' && (
            <div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 100px 120px 80px', padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Wallet', 'Points', 'Tier', 'SOL Traded', 'Streak'].map(h => (
                    <div key={h} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</div>
                  ))}
                </div>
                {mockTraders.map((trader) => (
                  <div key={trader.rank} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 100px 120px 80px', padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: rankColor(trader.rank) }}>
                      {trader.rank <= 3 ? ['🥇','🥈','🥉'][trader.rank-1] : trader.rank}
                    </div>
                    <div style={{ fontFamily: 'Courier New, monospace', fontSize: '13px', color: 'var(--text)' }}>
                      {trader.wallet}
                    </div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.5px', color: 'var(--accent)' }}>
                      {trader.points.toLocaleString()}
                    </div>
                    <div>
                      <span style={{ padding: '3px 8px', borderRadius: '2px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', background: `${TIER_COLORS[trader.tier]}22`, color: TIER_COLORS[trader.tier], border: `1px solid ${TIER_COLORS[trader.tier]}44` }}>
                        {trader.tier}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.5px' }}>
                      {trader.sol_traded} SOL
                    </div>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '0.5px', color: 'var(--accent4)' }}>
                      {trader.streak}d 🔥
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
