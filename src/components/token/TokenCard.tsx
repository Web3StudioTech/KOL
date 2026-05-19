import Link from 'next/link'
import { TokenWithLauncher } from '@/types'
import { formatMktCap, formatFollowers, truncateWallet } from '@/lib/auth'

interface TokenCardProps {
  token: TokenWithLauncher
}

const BADGE_ICONS: Record<string, string> = {
  anon: '👤',
  twitter_verified: '✓',
  kol: '👑'
}

export default function TokenCard({ token }: TokenCardProps) {
  const priceChange = Math.random() > 0.3
    ? +(Math.random() * 400).toFixed(1)
    : -(Math.random() * 40).toFixed(1)
  const isUp = Number(priceChange) >= 0

  return (
    <Link href={`/token/${token.mint_address || token.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
        borderColor: 'var(--border)'
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.4)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '10px',
              background: token.image_url ? `url(${token.image_url}) center/cover` : 'var(--bg-4)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', flexShrink: 0
            }}>
              {!token.image_url && token.ticker.slice(0, 2)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                ${token.ticker}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                {token.name}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {token.kol_call_count > 0 && (
              <span className="badge badge-hot">🔥 {token.kol_call_count} call{token.kol_call_count > 1 ? 's' : ''}</span>
            )}
            {token.bonding_pct > 85 && (
              <span className="badge badge-grad">⚡ Graduating</span>
            )}
            {(Date.now() - new Date(token.created_at).getTime()) < 3600000 && (
              <span className="badge badge-new">New</span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Mkt cap', value: formatMktCap(token.market_cap_usd) },
            { label: '24h change', value: `${isUp ? '+' : ''}${priceChange}%`, className: isUp ? 'up' : 'dn' },
            { label: 'Holders', value: token.holder_count.toLocaleString() },
            { label: 'Volume 24h', value: formatMktCap(token.volume_24h_usd) },
          ].map(s => (
            <div key={s.label} className="card-sm" style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }} className={s.className || ''}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bonding curve */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '5px' }}>
            <span>Bonding curve</span>
            <span>{token.bonding_pct.toFixed(0)}% to Raydium</span>
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${token.bonding_pct}%` }} />
          </div>
        </div>

        {/* Creator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`badge badge-${token.badge}`}>
            {BADGE_ICONS[token.badge]} {token.badge === 'anon' ? 'Anon' : token.badge === 'kol' ? 'KOL' : 'Verified'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
            {token.twitter_handle
              ? `@${token.twitter_handle} · ${formatFollowers(token.follower_count)} followers`
              : truncateWallet(token.launcher_wallet)
            }
          </span>
        </div>
      </div>
    </Link>
  )
}
