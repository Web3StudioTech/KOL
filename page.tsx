'use client'
import { useState, useEffect } from 'react'
import { Launcher } from '@/types'
import { formatFollowers, truncateWallet } from '@/lib/auth'

const BADGE_LABELS: Record<string, string> = {
  anon: '👤 Anon',
  twitter_verified: '✓ Verified',
  kol: '👑 KOL'
}

export default function AdminPage() {
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [launchers, setLaunchers] = useState<Launcher[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [badgeFilter, setBadgeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const stats = {
    total,
    verified: launchers.filter(l => l.badge !== 'anon').length,
    kol: launchers.filter(l => l.badge === 'kol').length,
    banned: launchers.filter(l => l.is_banned).length,
  }

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (search) params.set('search', search)
      if (badgeFilter) params.set('badge', badgeFilter)

      const res = await fetch(`/api/admin/launchers?${params}`, {
        headers: { 'x-admin-key': key }
      })
      if (res.status === 401) { setAuthed(false); return }
      const data = await res.json()
      setLaunchers(data.launchers || [])
      setTotal(data.total || 0)
      setAuthed(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (authed) load() }, [page, search, badgeFilter])

  async function doAction(launcher_id: string, action: 'ban' | 'unban', reason?: string) {
    setActionLoading(launcher_id)
    try {
      const res = await fetch('/api/admin/launchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ launcher_id, action, reason })
      })
      const data = await res.json()
      if (data.success) {
        setMsg(`${action === 'ban' ? 'Banned' : 'Unbanned'} successfully`)
        load()
      }
    } finally {
      setActionLoading(null)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Auth gate
  if (!authed) {
    return (
      <main style={{ maxWidth: '380px', margin: '8rem auto', padding: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Admin access</h3>
          <input
            className="input"
            type="password"
            placeholder="Admin secret key"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            style={{ marginBottom: '10px' }}
          />
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={load}>
            Enter
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2>Admin dashboard</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Full access · service role</p>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          onchainkol.com/admin
        </span>
      </div>

      {msg && (
        <div style={{
          padding: '10px 14px', background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px',
          color: '#6EE7B7', marginBottom: '1rem', fontSize: '0.875rem'
        }}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total launchers', value: total.toLocaleString() },
          { label: 'Verified (Twitter)', value: stats.verified.toLocaleString() },
          { label: 'KOL accounts', value: stats.kol.toLocaleString() },
          { label: 'Banned', value: stats.banned.toLocaleString(), danger: true },
        ].map(s => (
          <div key={s.label} className="card-sm">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.danger ? 'var(--red)' : 'var(--text)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search @handle or wallet..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select
          className="input"
          style={{ width: 'auto' }}
          value={badgeFilter}
          onChange={e => setBadgeFilter(e.target.value)}
        >
          <option value="">All badges</option>
          <option value="anon">Anon</option>
          <option value="twitter_verified">Twitter verified</option>
          <option value="kol">KOL</option>
        </select>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? <span className="spin">◌</span> : 'Refresh'}
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}>
              {['Launcher', 'Wallet', 'Badge', 'Followers', 'Verified at', 'Earnings SOL', 'Proof tweet', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {launchers.map(l => (
              <tr
                key={l.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: l.is_banned ? 'rgba(239,68,68,0.04)' : 'transparent'
                }}
              >
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600 }}>
                    {l.twitter_handle ? `@${l.twitter_handle}` : '—'}
                  </div>
                  {l.twitter_id && (
                    <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      id: {l.twitter_id}
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span className="mono" style={{ color: 'var(--text-2)' }}>
                    {truncateWallet(l.wallet_address, 5)}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span className={`badge badge-${l.badge}`}>
                    {BADGE_LABELS[l.badge]}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>
                  {formatFollowers(l.follower_count)}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: '0.75rem' }}>
                  {l.verified_at ? new Date(l.verified_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                  {l.earnings_sol?.toFixed(4) || '0.0000'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {l.verification_tweet ? (
                    <a
                      href={l.verification_tweet}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: 'var(--purple)' }}
                    >
                      View proof ↗
                    </a>
                  ) : '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {l.is_banned ? (
                    <div>
                      <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: '0.75rem' }}>Banned</span>
                      {l.ban_reason && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{l.ban_reason}</div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--green)', fontSize: '0.75rem' }}>Active</span>
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {l.is_banned ? (
                      <button
                        className="btn btn-sm"
                        style={{ color: 'var(--green)', border: '1px solid rgba(16,185,129,0.3)', background: 'transparent', fontSize: '0.75rem' }}
                        onClick={() => doAction(l.id, 'unban')}
                        disabled={actionLoading === l.id}
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          const reason = prompt('Ban reason:')
                          if (reason !== null) doAction(l.id, 'ban', reason)
                        }}
                        disabled={actionLoading === l.id}
                      >
                        Ban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
            Showing {launchers.length} of {total} launchers
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              ← Prev
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', padding: '5px 10px' }}>Page {page}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)} disabled={launchers.length < 50}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
