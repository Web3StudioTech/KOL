'use client'
import { useState, useEffect } from 'react'

interface PointsConfig {
  id: string
  version: number
  is_active: boolean
  volume_weight: number
  social_weight: number
  age_weight: number
  active_weight: number
  points_per_sol: number
  pts_launch_token: number
  pts_token_graduates: number
  pts_token_hits_1m: number
  pts_kol_badge: number
  pts_pro_kol_badge: number
  pts_gold_kol_badge: number
  pts_call_hit: number
  pts_call_partial: number
  pts_hold_kol_pass_daily: number
  silver_threshold_sol: number
  gold_threshold_sol: number
  diamond_threshold_sol: number
  notes: string
  created_at: string
  activated_at: string
  [key: string]: any
}

interface WalletPoints {
  wallet_address: string
  total_points: number
  volume_points_raw: number
  social_points_raw: number
  age_points_raw: number
  active_points_raw: number
  trader_tier: string
  total_sol_traded: number
  current_streak: number
  is_flagged: boolean
  flag_reason: string
}

const ADMIN_KEY = typeof window !== 'undefined'
  ? localStorage.getItem('admin_key') || ''
  : ''

export default function AdminPointsDashboard() {
  const [tab, setTab] = useState<'overview'|'config'|'wallets'|'snapshots'>('overview')
  const [configs, setConfigs] = useState<PointsConfig[]>([])
  const [activeConfig, setActiveConfig] = useState<PointsConfig | null>(null)
  const [wallets, setWallets] = useState<WalletPoints[]>([])
  const [totalWallets, setTotalWallets] = useState(0)
  const [loading, setLoading] = useState(false)
  const [adminKey, setAdminKey] = useState(ADMIN_KEY)
  const [authed, setAuthed] = useState(false)
  const [editingConfig, setEditingConfig] = useState<PointsConfig | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const headers = { 'x-admin-key': adminKey, 'Content-Type': 'application/json' }

  async function login() {
    const res = await fetch('/api/admin/points', { headers })
    if (res.ok) {
      setAuthed(true)
      localStorage.setItem('admin_key', adminKey)
      loadAll()
    }
  }

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadConfigs(), loadWallets()])
    setLoading(false)
  }

  async function loadConfigs() {
    const res = await fetch('/api/admin/points/config', { headers })
    const data = await res.json()
    setConfigs(data.configs || [])
    setActiveConfig(data.configs?.find((c: PointsConfig) => c.is_active) || null)
  }

  async function loadWallets() {
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/points/wallets?${params}`, { headers })
    const data = await res.json()
    setWallets(data.wallets || [])
    setTotalWallets(data.total || 0)
  }

  async function createNewVersion() {
    if (!activeConfig) return
    const { id: _id, created_at: _ca, activated_at: _aa, ...rest } = activeConfig
    const newConfig = { ...rest, version: activeConfig.version + 1, is_active: false, notes: '' } as PointsConfig
    setEditingConfig(newConfig)
  }

  async function saveConfig() {
    if (!editingConfig) return
    setLoading(true)
    const res = await fetch('/api/admin/points/config', {
      method: 'POST',
      headers,
      body: JSON.stringify(editingConfig)
    })
    if (res.ok) {
      setMsg('Config saved. Preview impact before activating.')
      setEditingConfig(null)
      loadConfigs()
    }
    setLoading(false)
  }

  async function previewConfig(version: number) {
    setLoading(true)
    const res = await fetch(`/api/admin/points/config/preview?version=${version}`, { headers })
    const data = await res.json()
    setPreviewData(data)
    setLoading(false)
  }

  async function activateConfig(version: number) {
    if (!confirm(`Activate version ${version}? This will recalculate all wallet points.`)) return
    setLoading(true)
    const res = await fetch('/api/admin/points/config/activate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ version })
    })
    if (res.ok) {
      setMsg(`Version ${version} activated. Recalculation running in background.`)
      loadConfigs()
    }
    setLoading(false)
  }

  async function takeSnapshot() {
    const name = prompt('Snapshot name (e.g. "Pre-airdrop Jan 2026"):')
    if (!name) return
    const notes = prompt('Notes (optional):') || ''
    setLoading(true)
    const res = await fetch('/api/admin/points/snapshot', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, notes })
    })
    if (res.ok) setMsg('Snapshot taken successfully')
    setLoading(false)
  }

  const tierColor = (tier: string) => ({
    diamond: '#06B6D4', gold: '#F59E0B',
    silver: '#9CA3AF', bronze: '#B45309', none: '#6B7280'
  }[tier] || '#6B7280')

  const weightTotal = editingConfig
    ? (editingConfig.volume_weight + editingConfig.social_weight +
       editingConfig.age_weight + editingConfig.active_weight)
    : 100

  if (!authed) return (
    <div style={{ maxWidth: 360, margin: '8rem auto', padding: '1.5rem' }}>
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Points dashboard — admin</h3>
        <input className="input" type="password" placeholder="Admin key"
          value={adminKey} onChange={e => setAdminKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ marginBottom: 10 }} />
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={login}>
          Enter
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2>Points control panel</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginTop: 4 }}>
            Admin only · adjustable weights · works backwards on change
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadAll}>Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={takeSnapshot}>📸 Take snapshot</button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: '#6EE7B7', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {msg}
        </div>
      )}

      {/* Active config summary */}
      {activeConfig && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: '1.5rem' }}>
          {[
            { label: 'Volume weight', value: `${activeConfig.volume_weight}%`, color: '#7C3AED' },
            { label: 'Social weight', value: `${activeConfig.social_weight}%`, color: '#3B82F6' },
            { label: 'Age weight', value: `${activeConfig.age_weight}%`, color: '#F59E0B' },
            { label: 'Active weight', value: `${activeConfig.active_weight}%`, color: '#10B981' },
            { label: 'Config version', value: `v${activeConfig.version}`, color: '#E5E7EB' },
          ].map(s => (
            <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        {(['overview','config','wallets','snapshots'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 16px', fontSize: '0.875rem', cursor: 'pointer',
            background: 'transparent', border: 'none', fontFamily: 'var(--font-sans)',
            color: tab === t ? '#7C3AED' : 'var(--text-2)',
            borderBottom: tab === t ? '2px solid #7C3AED' : '2px solid transparent',
            fontWeight: tab === t ? 600 : 400,
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.5rem' }}>
            <div className="card-sm">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Total wallets tracked</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{totalWallets.toLocaleString()}</div>
            </div>
            <div className="card-sm">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Diamond tier wallets</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#06B6D4' }}>
                {wallets.filter(w => w.trader_tier === 'diamond').length}
              </div>
            </div>
            <div className="card-sm">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Flagged wallets</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#EF4444' }}>
                {wallets.filter(w => w.is_flagged).length}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-3)', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', fontWeight: 600 }}>
              Top 10 wallets by points
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Rank','Wallet','Total points','Volume pts','Social pts','Age pts','Active pts','Tier','SOL traded'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wallets.slice(0, 10).map((w, i) => (
                  <tr key={w.wallet_address} style={{ borderBottom: '1px solid var(--border)', background: w.is_flagged ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: i < 3 ? '#F59E0B' : 'var(--text-3)' }}>#{i+1}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
                      {w.wallet_address.slice(0,6)}…{w.wallet_address.slice(-4)}
                      {w.is_flagged && <span style={{ color: '#EF4444', marginLeft: 6, fontSize: '0.7rem' }}>⚠ {w.flag_reason}</span>}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>{Math.floor(w.total_points).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#7C3AED' }}>{Math.floor(w.volume_points_raw).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#3B82F6' }}>{Math.floor(w.social_points_raw).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#F59E0B' }}>{Math.floor(w.age_points_raw).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#10B981' }}>{Math.floor(w.active_points_raw).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600, background: `${tierColor(w.trader_tier)}22`, color: tierColor(w.trader_tier) }}>
                        {w.trader_tier}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                      {w.total_sol_traded?.toFixed(2)} SOL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIG TAB */}
      {tab === 'config' && (
        <div>
          {/* Config version history */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Configuration versions</h3>
              <button className="btn btn-primary btn-sm" onClick={createNewVersion}>
                + Create new version
              </button>
            </div>

            {configs.map(c => (
              <div key={c.id} className="card" style={{ marginBottom: 10, borderColor: c.is_active ? 'rgba(124,58,237,0.4)' : 'var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>Version {c.version}</span>
                      {c.is_active && <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: '0.7rem', fontWeight: 600 }}>ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      Weights: Vol {c.volume_weight}% · Social {c.social_weight}% · Age {c.age_weight}% · Active {c.active_weight}%
                    </div>
                    {c.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 2 }}>"{c.notes}"</div>}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>
                      Created: {new Date(c.created_at).toLocaleDateString()}
                      {c.activated_at && ` · Activated: ${new Date(c.activated_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!c.is_active && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => previewConfig(c.version)}>Preview impact</button>
                        <button className="btn btn-primary btn-sm" onClick={() => activateConfig(c.version)}>Activate</button>
                      </>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingConfig({...c})}>Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit config form */}
          {editingConfig && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3>Editing Version {editingConfig.version}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingConfig(null)}>Cancel</button>
              </div>

              {/* Weight warning */}
              {weightTotal !== 100 && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#FCA5A5', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  ⚠ Weights must sum to 100%. Current total: {weightTotal}%
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1.5rem' }}>
                {/* Weights */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Score weights (must sum to 100%)
                  </div>
                  {[
                    { key: 'volume_weight', label: 'Volume weight %', color: '#7C3AED' },
                    { key: 'social_weight', label: 'Social weight %', color: '#3B82F6' },
                    { key: 'age_weight',    label: 'Age weight %',    color: '#F59E0B' },
                    { key: 'active_weight', label: 'Active weight %', color: '#10B981' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label style={{ color: f.color }}>{f.label}</label>
                      <input type="number" className="input" min="0" max="100"
                        value={editingConfig[f.key]}
                        onChange={e => setEditingConfig({...editingConfig, [f.key]: +e.target.value})} />
                    </div>
                  ))}
                </div>

                {/* Volume rates */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Volume rates
                  </div>
                  {[
                    { key: 'points_per_sol', label: 'Points per 1 SOL traded' },
                    { key: 'kolswap_multiplier', label: 'KOLSwap trade multiplier' },
                    { key: 'early_buyer_multiplier', label: 'Early buyer multiplier' },
                    { key: 'gold_token_multiplier', label: 'Gold KOL token multiplier' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label>{f.label}</label>
                      <input type="number" className="input" step="0.1"
                        value={editingConfig[f.key]}
                        onChange={e => setEditingConfig({...editingConfig, [f.key]: +e.target.value})} />
                    </div>
                  ))}
                </div>

                {/* Social points */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Social action points
                  </div>
                  {[
                    { key: 'pts_launch_token', label: 'Launch a token' },
                    { key: 'pts_token_graduates', label: 'Token graduates' },
                    { key: 'pts_token_hits_1m', label: 'Token hits $1M volume' },
                    { key: 'pts_kol_badge', label: 'Earn KOL badge' },
                    { key: 'pts_pro_kol_badge', label: 'Earn Pro KOL badge' },
                    { key: 'pts_gold_kol_badge', label: 'Earn Gold KOL badge' },
                    { key: 'pts_call_hit', label: 'Call is HIT (2x+)' },
                    { key: 'pts_call_partial', label: 'Call is PARTIAL (1.2x)' },
                    { key: 'pts_hold_kol_pass_daily', label: 'Hold KOL Pass (per day)' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label>{f.label}</label>
                      <input type="number" className="input"
                        value={editingConfig[f.key]}
                        onChange={e => setEditingConfig({...editingConfig, [f.key]: +e.target.value})} />
                    </div>
                  ))}
                </div>

                {/* Tier thresholds */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Trader tier thresholds (SOL)
                  </div>
                  {[
                    { key: 'silver_threshold_sol', label: 'Silver threshold (SOL)' },
                    { key: 'gold_threshold_sol', label: 'Gold threshold (SOL)' },
                    { key: 'diamond_threshold_sol', label: 'Diamond threshold (SOL)' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label>{f.label}</label>
                      <input type="number" className="input"
                        value={editingConfig[f.key]}
                        onChange={e => setEditingConfig({...editingConfig, [f.key]: +e.target.value})} />
                    </div>
                  ))}

                  <div style={{ marginTop: '1rem', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Notes
                  </div>
                  <textarea className="input" placeholder="Why are you changing this config?"
                    value={editingConfig.notes || ''}
                    onChange={e => setEditingConfig({...editingConfig, notes: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setEditingConfig(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveConfig} disabled={weightTotal !== 100 || loading}>
                  {loading ? <span className="spin">◌</span> : ''}
                  Save version {editingConfig.version}
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Impact preview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1rem' }}>
                <div className="card-sm">
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Total points change</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: previewData.totalChange > 0 ? '#10B981' : '#EF4444' }}>
                    {previewData.totalChange > 0 ? '+' : ''}{previewData.totalChange?.toFixed(1)}%
                  </div>
                </div>
                <div className="card-sm">
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Biggest gainer</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {previewData.biggestGainer?.wallet?.slice(0,8)}…
                  </div>
                </div>
                <div className="card-sm">
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Biggest loser</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {previewData.biggestLoser?.wallet?.slice(0,8)}…
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewData(null)}>Close preview</button>
            </div>
          )}
        </div>
      )}

      {/* WALLETS TAB */}
      {tab === 'wallets' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
            <input className="input" placeholder="Search wallet address..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={loadWallets}>Search</button>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}>
                  {['Wallet','Total pts','Volume','Social','Age','Active','Tier','SOL traded','Streak','Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wallets.map(w => (
                  <tr key={w.wallet_address} style={{ borderBottom: '1px solid var(--border)', background: w.is_flagged ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-2)', fontSize: '0.75rem' }}>
                      {w.wallet_address.slice(0,6)}…{w.wallet_address.slice(-4)}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>{Math.floor(w.total_points).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#7C3AED' }}>{Math.floor(w.volume_points_raw).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#3B82F6' }}>{Math.floor(w.social_points_raw).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#F59E0B' }}>{Math.floor(w.age_points_raw).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', color: '#10B981' }}>{Math.floor(w.active_points_raw).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 7px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600, background: `${tierColor(w.trader_tier)}22`, color: tierColor(w.trader_tier) }}>
                        {w.trader_tier}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {w.total_sol_traded?.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{w.current_streak}d</td>
                    <td style={{ padding: '8px 12px' }}>
                      {w.is_flagged
                        ? <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>⚠ {w.flag_reason}</span>
                        : <span style={{ color: '#10B981', fontSize: '0.75rem' }}>Active</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                {wallets.length} of {totalWallets} wallets
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Prev</button>
                <span style={{ fontSize: '0.8rem', padding: '5px 10px', color: 'var(--text-2)' }}>Page {page}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p+1)} disabled={wallets.length < 50}>Next →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SNAPSHOTS TAB */}
      {tab === 'snapshots' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Airdrop snapshots</h3>
            <button className="btn btn-primary btn-sm" onClick={takeSnapshot}>📸 New snapshot</button>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
            <p>No snapshots yet. Take one when you're ready for an airdrop.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Snapshots freeze all wallet points at a moment in time. They're permanent and exportable to CSV.</p>
          </div>
        </div>
      )}
    </div>
  )
}
