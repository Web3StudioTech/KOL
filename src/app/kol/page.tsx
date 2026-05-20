'use client'
import { useState } from 'react'
import useSWR from 'swr'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, formatFollowers, BADGE_LABELS, BADGE_ICONS } from '@/lib/auth'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function KolZonePage() {
  const { launcher } = useAppStore()
  const [activeTab, setActiveTab] = useState<'discover'|'my-calls'|'top-kols'>('discover')
  const isKol = launcher && ['kol','pro_kol','gold_kol'].includes(launcher.badge)

  const { data: tokensData } = useSWR('/api/tokens?sort=new&limit=20', fetcher, { refreshInterval: 15000 })
  const { data: callsData } = useSWR(launcher ? `/api/calls?launcher_id=${launcher.id}` : null, fetcher)
  const { data: topKolsData } = useSWR('/api/kols/top', fetcher)

  const tokens = tokensData?.tokens || []
  const myCalls = callsData?.calls || []
  const topKols = topKolsData?.kols || []

  const TABS = [
    { key: 'discover', label: '🔍 Discover Tokens' },
    { key: 'my-calls', label: '📢 My Calls' },
    { key: 'top-kols', label: '👑 Top KOLs' },
  ]

  return (
    <>
      <Nav />
      <main style={{ paddingTop: '64px' }}>
        {/* Header */}
        <div style={{ padding: '60px 40px 40px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-grid" />
          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div className="section-tag">KOL Zone</div>
            <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', lineHeight: 1, marginBottom: '12px' }}>
              DISCOVER. <span style={{ color: 'var(--accent)' }}>CALL.</span> <span style={{ WebkitTextStroke: '2px var(--accent2)', color: 'transparent' }}>EARN.</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '560px', lineHeight: 1.6 }}>
              Browse new token launches. Call what you believe in. Earn 0.15% of all trading volume your call generates — automatically, forever.
            </p>

            {/* KOL reward pool stats */}
            <div style={{ display: 'flex', gap: '32px', marginTop: '32px', flexWrap: 'wrap' }}>
              {[
                { label: 'Weekly Reward Pool', value: '$42K', color: 'var(--accent3)' },
                { label: 'Avg KOL Accuracy', value: '67%', color: 'var(--accent)' },
                { label: 'Calls This Week', value: '1,840', color: 'var(--accent4)' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '32px', color: s.color, letterSpacing: '1px', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KOL status banner */}
        {!isKol && launcher && (
          <div style={{ padding: '14px 40px', background: 'rgba(255,215,0,0.06)', borderBottom: '1px solid rgba(255,215,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: 'var(--accent3)' }}>
                You need 1,000+ Twitter followers to submit calls and earn from the reward pool.
              </span>
            </div>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', color: 'var(--muted)', letterSpacing: '1px' }}>
              Current: {formatFollowers(launcher.follower_count)} followers
            </span>
          </div>
        )}

        {!launcher && (
          <div style={{ padding: '14px 40px', background: 'rgba(0,229,255,0.06)', borderBottom: '1px solid rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: 'var(--accent)' }}>
              Connect wallet + verify Twitter to join the KOL reward pool.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', background: 'var(--bg2)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                style={{
                  padding: '14px 20px',
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: activeTab === t.key ? 'var(--accent)' : 'var(--muted)',
                  borderBottom: `2px solid ${activeTab === t.key ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: '-1px', transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px' }}>
          {/* DISCOVER TOKENS */}
          {activeTab === 'discover' && (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="section-tag" style={{ marginBottom: 0 }}>New Launches — Uncalled</div>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Sorted by newest — lowest market cap first
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tokens.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', color: 'var(--border)', marginBottom: '16px' }}>NO TOKENS YET</div>
                    <p>New token launches will appear here.</p>
                  </div>
                ) : tokens.map((token: any) => (
                  <div key={token.id} style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px', background: 'var(--bg2)',
                    border: '1px solid var(--border)', borderRadius: '4px',
                    transition: 'border-color 0.2s'
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: '6px', background: token.image_url ? `url(${token.image_url}) center/cover` : 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '12px', color: 'var(--accent)', flexShrink: 0 }}>
                      {!token.image_url && token.ticker?.slice(0, 3)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '1px' }}>${token.ticker}</span>
                        <span className={`badge badge-${token.launcher_badge}`}>{BADGE_ICONS[token.launcher_badge]} {BADGE_LABELS[token.launcher_badge]}</span>
                        {token.kol_call_count === 0 && <span className="badge badge-new">Uncalled</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{token.description?.slice(0, 80)}{token.description?.length > 80 ? '...' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: '8px' }}>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '1px' }}>{formatMktCap(token.market_cap_usd)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '1px', textTransform: 'uppercase' }}>Market cap</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <a href={`/token/${token.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>View</a>
                      {isKol && (
                        <a href={`/token/${token.id}`} className="btn btn-primary btn-sm" style={{ fontSize: '11px' }}>Call It</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MY CALLS */}
          {activeTab === 'my-calls' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <div className="section-tag" style={{ marginBottom: '8px' }}>My Call History</div>
              </div>
              {!launcher ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', color: 'var(--border)', marginBottom: '16px' }}>CONNECT WALLET</div>
                  <p>Connect your wallet to see your call history.</p>
                </div>
              ) : myCalls.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', color: 'var(--border)', marginBottom: '16px' }}>NO CALLS YET</div>
                  <p>Discover tokens and start calling to earn rewards.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {myCalls.map((call: any) => (
                    <div key={call.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '1px' }}>${call.tokens?.ticker}</span>
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>called at {formatMktCap(call.mktcap_at_call)}</span>
                        </div>
                        {call.thesis && <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{call.thesis}</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '1px',
                          color: call.accuracy_status === 'hit' ? 'var(--green)' : call.accuracy_status === 'miss' ? 'var(--red)' : 'var(--muted)'
                        }}>
                          {call.accuracy_status === 'hit' ? '✓ HIT' : call.accuracy_status === 'partial' ? '~ PARTIAL' : call.accuracy_status === 'miss' ? '✗ MISS' : '⏳ PENDING'}
                        </div>
                        {call.reward_sol > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--accent3)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                            +{call.reward_sol.toFixed(4)} SOL earned
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TOP KOLS */}
          {activeTab === 'top-kols' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <div className="section-tag" style={{ marginBottom: '8px' }}>Top KOLs by Earnings</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3,4,5].map((rank) => (
                  <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <div style={{
                      fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', width: '32px', textAlign: 'center',
                      color: rank === 1 ? 'var(--accent3)' : rank === 2 ? '#9CA3AF' : rank === 3 ? '#CD7F32' : 'var(--muted)'
                    }}>
                      {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '14px', color: 'var(--accent)', flexShrink: 0 }}>
                      K{rank}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}>@kol{rank}example</span>
                        <span className="badge badge-gold">🥇 Gold KOL</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>88% accuracy · {50-rank*5} calls this week</div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        <div style={{ height: '3px', width: `${90-rank*5}%`, background: 'var(--accent)', borderRadius: '2px', flex: 1, maxWidth: '200px' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', letterSpacing: '1px', color: 'var(--accent3)' }}>
                        ${(9000-rank*1000).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '1px', textTransform: 'uppercase' }}>earned this week</div>
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
