'use client'
import Link from 'next/link'
import { formatMktCap, formatFollowers, truncateWallet, BADGE_LABELS, BADGE_ICONS } from '@/lib/auth'

interface Token {
  id: string
  name: string
  ticker: string
  description?: string
  image_url?: string
  category?: string
  status: string
  market_cap_usd: number
  price_sol: number
  volume_24h_usd: number
  holder_count: number
  bonding_pct: number
  kol_call_count: number
  kol_pass_earned?: boolean
  kol_pass_number?: number
  created_at: string
  launcher_badge: string
  launcher_twitter?: string
  launcher_avatar?: string
  launcher_followers?: number
  launcher_wallet: string
}

const CATEGORY_ICONS: Record<string, string> = {
  meme: '🐸', ai: '🤖', gaming: '🎮', music: '🎵',
  sports: '🏃', political: '🗳️', animal: '🦴',
  defi: '💎', art: '🎨', other: '🌐'
}

export default function TokenCard({ token }: { token: Token }) {
  const isNew = (Date.now() - new Date(token.created_at).getTime()) < 3600000
  const isGraduating = token.bonding_pct > 85
  const badgeClass = `badge-${token.launcher_badge}`

  return (
    <Link href={`/token/${token.id}`} className="token-card" style={{ color: 'inherit' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Token avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: '6px',
            background: token.image_url ? `url(${token.image_url}) center/cover` : 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '14px',
            color: 'var(--accent)', flexShrink: 0,
            letterSpacing: '1px'
          }}>
            {!token.image_url && token.ticker.slice(0, 3)}
          </div>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '1px', lineHeight: 1 }}>
              ${token.ticker}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              {token.name}
              {token.category && ` · ${CATEGORY_ICONS[token.category] || ''}`}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
          {token.kol_call_count > 0 && (
            <span className="badge badge-hot">🔥 {token.kol_call_count} call{token.kol_call_count > 1 ? 's' : ''}</span>
          )}
          {isGraduating && <span className="badge badge-grad">⚡ Graduating</span>}
          {isNew && !isGraduating && <span className="badge badge-new">New</span>}
          {token.kol_pass_earned && (
            <span className="badge" style={{ background: 'rgba(255,215,0,0.15)', color: 'var(--accent3)', border: '1px solid rgba(255,215,0,0.3)' }}>
              🎫 Pass #{token.kol_pass_number}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {token.description && (
        <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
          {token.description}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
        {[
          { label: 'Market cap', value: formatMktCap(token.market_cap_usd) },
          { label: 'Volume 24h', value: formatMktCap(token.volume_24h_usd) },
          { label: 'Holders', value: token.holder_count.toLocaleString() },
          { label: 'Price', value: `${token.price_sol.toFixed(8)} SOL` },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '6px 10px' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '2px' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '16px', letterSpacing: '0.5px', color: 'var(--text)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bonding curve */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Bonding Curve
          </span>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '14px', color: token.bonding_pct > 85 ? 'var(--accent3)' : 'var(--accent)', letterSpacing: '1px' }}>
            {token.bonding_pct.toFixed(0)}%
          </span>
        </div>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${token.bonding_pct}%` }} />
        </div>
      </div>

      {/* Creator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
        <span className={`badge ${badgeClass}`}>
          {BADGE_ICONS[token.launcher_badge]} {BADGE_LABELS[token.launcher_badge]}
        </span>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.5px' }}>
          {token.launcher_twitter
            ? `@${token.launcher_twitter} · ${formatFollowers(token.launcher_followers || 0)}`
            : truncateWallet(token.launcher_wallet)
          }
        </span>
      </div>
    </Link>
  )
}
