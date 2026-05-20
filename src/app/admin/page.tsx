'use client'
import { useState, useEffect } from 'react'
import { BADGE_LABELS, BADGE_ICONS, truncateWallet, formatFollowers } from '@/lib/auth'

interface Launcher {
  id: string
  wallet_address: string
  twitter_handle: string | null
  twitter_id: string | null
  follower_count: number
  badge: string
  verified_at: string | null
  verification_tweet: string | null
  earnings_sol: number
  is_banned: boolean
  ban_reason: string | null
  gold_kol_applied_at: string | null
  gold_kol_approved_at: string | null
  created_at: string
}

function checkAdmin(key: string): Promise<boolean> {
  return fetch('/api/admin/launchers', { headers: { 'x-admin-key': key } })
    .then(r => r.ok)
}

export default function AdminPage() {
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [launchers, setLaunchers] = useState<Launcher[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [badgeFilter, setBadgeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [msg, setMsg] = useState('')
  const [goldQueue, setGoldQueue] = useState<Launcher[]>([])

  // Platform toggles
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [platformPaused, setPlatformPaused] = useState(false)

  const headers = { 'x-admin-key': key, 'Content-Type': 'application/json' }

  async function login() {
    setLoading(true)
    const ok = await checkAdmin(key)
    if (ok) {
      setAuthed(true)
      localStorage.setItem('okl-admin-key', key)
      loadAll()
    } else {
      setMsg('Invalid admin key')
    }
    setLoading(false)
  }

  async function loadAll() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('search', search)
      if (badgeFilter) params.set('badge', badgeFilter)

      const res = await fetch(`/api/admin/launchers?${params}`, { headers })
      const data = await res.json()
      setLaunchers(data.launchers || [])
      setTotal(data.total || 0)

      // Gold KOL queue — pending approval
      const pending = (data.launchers || []).filter((l: Launcher) =>
        l.follower_count >= 50000 && l.badge !== 'gold_kol' && !l.is_banned
      )
      setGoldQueue(pending)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function doAction(id: string, action: string, reason?: string) {
    const res = await fetch('/api/admin/launchers', {
      method: 'POST',
      headers,
      body: JSON.stringify({ launcher_id: id, action, reason })
    })
    const data = await res.json()
    if (data.success) {
      setMsg(`${action} successful`)
      loadAll()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function approveGoldKol(id: string) {
    const res = await fetch('/api/admin/gold-kol', {
      method: 'POST',
      headers,
      body: JSON.stringify({ launcher_id: id, action: 'approve' })
    })
    if (res.ok) {
      setMsg('Gold KOL badge approved!')
      loadAll()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function saveToggles() {
    await fetch('/api/admin/config', {
      method: 'POST',
      headers,
      body: JSON.stringify({ show_leaderboard: showLeaderboard, platform_paused: platformPaused })
    })
    setMsg('Settings saved')
    setTimeout(() => setMsg(''), 3000)
  }

  useEffect(() => {
    const saved = localStorage.getItem('okl-admin-key')
    if (saved) { setKey(saved); }
  }, [])

  useEffect(() => { if (authed) loadAll() }, [page, search, badgeFilter])

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'launchers', label: 'Launchers' },
    { key: 'gold-queue', label: `Gold KOL Queue ${goldQueue.length > 0 ? `(${goldQueue.length})` : ''}` },
    { key: 'toggles', label: 'Platform Toggles' },
  ]

  if (!authed) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '32px', letterSpacing: '3px', color: 'var(--accent)', marginBottom: '4px' }}>
            ONCHAIN<span style={{ color: 'var(--accent2)' }}>KOL</span>
          </div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)' }}>Admin Dashboard</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          {msg && <div style={{ padding: '8px 12px', background: 'rgba(255,61,107,0.1)', border: '1px solid rgba(255,61,107,0.3)', borderRadius: '3px', color: 'var(--accent2)', fontSize: '13px', marginBottom: '1rem' }}>{msg}</div>}
          <label>Admin Secret Key</label>
          <input
            className="input"
            type="password"
            placeholder="Enter admin key..."
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ marginBottom: '10px' }}
          />
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '2px' }} onClick={login} disabled={loading}>
            {loading ? <span className="spin">◌</span> : 'Enter'}
          </button>
        </div>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Admin nav */}
      <div style={{ padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '2px', color: 'var(--accent)' }}>
          ONCHAIN<span style={{ color: 'var(--accent2)' }}>KOL</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '12px', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '2px' }}>ADMIN</span>
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>Service role · Full access</span>
          <button className="btn btn-secondary btn-sm" onClick={loadAll} disabled={loading}>
            {loading ? <span className="spin">◌</span> : 'Refresh'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 40px', background: 'rgba(0,229,255,0.08)', borderBottom: '1px solid rgba(0,229,255,0.2)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: 'var(--accent)' }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 40px', background: 'var(--bg2)' }}>
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '12px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              color: activeTab === t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottom: `2px solid ${activeTab === t.key ? 'var(--accent)' : 'transparent'}`,
              marginBottom: '-1px'
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 40px' }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Total Launchers', value: total.toLocaleString(), color: 'var(--accent)' },
                { label: 'Twitter Verified', value: launchers.filter(l => l.badge !== 'anon').length.toLocaleString(), color: '#60a5fa' },
                { label: 'Gold KOL Queue', value: goldQueue.length.toLocaleString(), color: 'var(--accent3)' },
                { label: 'Banned', value: launchers.filter(l => l.is_banned).length.toLocaleString(), color: 'var(--accent2)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '20px 24px' }}>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>{s.label}</div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '36px', letterSpacing: '1px', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Platform toggle preview */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '20px 24px' }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px' }}>Quick Toggles</div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text)' }}>Leaderboard</span>
                  <button
                    onClick={() => { setShowLeaderboard(!showLeaderboard); saveToggles() }}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: showLeaderboard ? 'var(--green)' : 'var(--border)',
                      border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', transition: 'left 0.2s', left: showLeaderboard ? '23px' : '3px' }} />
                  </button>
                  <span style={{ fontSize: '12px', color: showLeaderboard ? 'var(--green)' : 'var(--muted)' }}>
                    {showLeaderboard ? 'Visible in nav' : 'Hidden'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text)' }}>Platform</span>
                  <button
                    onClick={() => { setPlatformPaused(!platformPaused); saveToggles() }}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: !platformPaused ? 'var(--green)' : 'var(--accent2)',
                      border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', transition: 'left 0.2s', left: !platformPaused ? '23px' : '3px' }} />
                  </button>
                  <span style={{ fontSize: '12px', color: !platformPaused ? 'var(--green)' : 'var(--accent2)' }}>
                    {!platformPaused ? 'Live' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LAUNCHERS */}
        {activeTab === 'launchers' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input className="input" placeholder="Search @handle or wallet..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: '200px' }} />
              <select className="input" style={{ width: 'auto' }} value={badgeFilter} onChange={e => setBadgeFilter(e.target.value)}>
                <option value="">All badges</option>
                <option value="anon">Anon</option>
                <option value="verified">Verified</option>
                <option value="kol">KOL</option>
                <option value="pro_kol">Pro KOL</option>
                <option value="gold_kol">Gold KOL</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={loadAll}>Search</button>
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['Launcher', 'Wallet', 'Badge', 'Followers', 'Verified', 'Earnings', 'Proof', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {launchers.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', background: l.is_banned ? 'rgba(255,61,107,0.04)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.5px' }}>
                          {l.twitter_handle ? `@${l.twitter_handle}` : '—'}
                        </div>
                        {l.twitter_id && <div style={{ fontFamily: 'Courier New, monospace', fontSize: '10px', color: 'var(--muted)' }}>id: {l.twitter_id}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Courier New, monospace', fontSize: '11px', color: 'var(--muted)' }}>
                        {truncateWallet(l.wallet_address, 5)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className={`badge badge-${l.badge}`}>{BADGE_ICONS[l.badge]} {BADGE_LABELS[l.badge]}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '0.5px' }}>
                        {formatFollowers(l.follower_count)}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--muted)' }}>
                        {l.verified_at ? new Date(l.verified_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Bebas Neue, sans-serif', fontSize: '16px', letterSpacing: '0.5px', color: 'var(--accent3)' }}>
                        {l.earnings_sol?.toFixed(4)} SOL
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {l.verification_tweet ? (
                          <a href={l.verification_tweet} target="_blank" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--accent)', textDecoration: 'none' }}>
                            VIEW ↗
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {l.is_banned ? (
                          <div>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 700, color: 'var(--accent2)' }}>BANNED</span>
                            {l.ban_reason && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{l.ban_reason}</div>}
                          </div>
                        ) : (
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>ACTIVE</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {l.is_banned ? (
                            <button className="btn btn-sm" style={{ color: 'var(--green)', border: '1px solid rgba(0,229,160,0.3)', background: 'transparent', fontSize: '10px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '1px' }} onClick={() => doAction(l.id, 'unban')}>
                              UNBAN
                            </button>
                          ) : (
                            <button className="btn btn-danger btn-sm" style={{ fontSize: '10px', padding: '4px 8px' }} onClick={() => { const r = prompt('Ban reason:'); if (r !== null) doAction(l.id, 'ban', r) }}>
                              BAN
                            </button>
                          )}
                          {l.follower_count >= 50000 && l.badge !== 'gold_kol' && (
                            <button className="btn btn-sm" style={{ color: 'var(--accent3)', border: '1px solid rgba(255,215,0,0.3)', background: 'transparent', fontSize: '10px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '1px' }} onClick={() => approveGoldKol(l.id)}>
                              GOLD ✓
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  {launchers.length} of {total} launchers
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>← Prev</button>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', fontWeight: 700, padding: '5px 12px', color: 'var(--muted)' }}>Page {page}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p+1)} disabled={launchers.length < 50}>Next →</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GOLD KOL QUEUE */}
        {activeTab === 'gold-queue' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div className="section-tag" style={{ marginBottom: '8px' }}>Gold KOL Approval Queue</div>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
                Accounts with 50,000+ followers pending manual Gold KOL approval. Review each carefully — check follower quality, reputation, and history.
              </p>
            </div>

            {goldQueue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', color: 'var(--border)', marginBottom: '16px' }}>QUEUE EMPTY</div>
                <p style={{ color: 'var(--muted)' }}>No accounts pending Gold KOL approval.</p>
              </div>
            ) : goldQueue.map(l => (
              <div key={l.id} style={{ background: 'var(--bg2)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '4px', padding: '20px 24px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px', fontWeight: 700, letterSpacing: '1px' }}>
                        @{l.twitter_handle || 'unknown'}
                      </span>
                      <span className={`badge badge-${l.badge}`}>{BADGE_ICONS[l.badge]} {BADGE_LABELS[l.badge]}</span>
                      <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: 'var(--accent3)', letterSpacing: '1px' }}>
                        {formatFollowers(l.follower_count)} followers
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'Courier New, monospace' }}>
                      Wallet: {truncateWallet(l.wallet_address, 8)}
                    </div>
                    {l.verification_tweet && (
                      <div style={{ marginTop: '8px' }}>
                        <a href={l.verification_tweet} target="_blank" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: 'var(--accent)', textDecoration: 'none' }}>
                          View proof tweet ↗
                        </a>
                      </div>
                    )}

                    {/* Gold KOL checklist */}
                    <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        'Account age > 6 months',
                        'Followers appear genuine',
                        'Real crypto engagement',
                        'No scam history',
                        'Wallet has tx history',
                      ].map(item => (
                        <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '5px 10px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'none', color: 'var(--muted)' }}>
                          <input type="checkbox" style={{ cursor: 'pointer', accentColor: 'var(--accent)' }} />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(255,215,0,0.15)', color: 'var(--accent3)', border: '1px solid rgba(255,215,0,0.3)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '16px', letterSpacing: '1px', padding: '10px 20px', cursor: 'pointer' }}
                      onClick={() => approveGoldKol(l.id)}
                    >
                      ✓ Approve Gold KOL
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '14px', letterSpacing: '1px' }}
                      onClick={() => doAction(l.id, 'reject_gold', 'Does not meet Gold KOL standards')}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PLATFORM TOGGLES */}
        {activeTab === 'toggles' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div className="section-tag" style={{ marginBottom: '8px' }}>Platform Feature Toggles</div>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
                Control platform features without deploying code. Changes take effect immediately.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
              {[
                {
                  label: 'Leaderboard Page',
                  desc: 'Show leaderboard link in main navigation. Enable when 1,000+ tokens launched.',
                  value: showLeaderboard,
                  set: setShowLeaderboard,
                  threshold: 'Recommended: enable at 1,000 tokens'
                },
                {
                  label: 'Platform Trading',
                  desc: 'Emergency pause — disables all buys and sells. Use only in critical situations.',
                  value: !platformPaused,
                  set: (v: boolean) => setPlatformPaused(!v),
                  threshold: 'Platform is currently ' + (!platformPaused ? 'LIVE' : 'PAUSED')
                },
              ].map(toggle => (
                <div key={toggle.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '16px', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>{toggle.label}</div>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '6px' }}>{toggle.desc}</p>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: toggle.value ? 'var(--green)' : 'var(--muted)' }}>
                        {toggle.threshold}
                      </span>
                    </div>
                    <button
                      onClick={() => { toggle.set(!toggle.value); }}
                      style={{
                        width: '52px', height: '28px', borderRadius: '14px',
                        background: toggle.value ? 'var(--green)' : 'var(--border)',
                        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
                      }}
                    >
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '4px', transition: 'left 0.2s', left: toggle.value ? '28px' : '4px' }} />
                    </button>
                  </div>
                </div>
              ))}

              <button
                className="btn btn-primary"
                style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '2px', padding: '14px 32px', alignSelf: 'flex-start' }}
                onClick={saveToggles}
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
