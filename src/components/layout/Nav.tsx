'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useWalletStore } from '@/lib/store'
import { truncateWallet } from '@/lib/auth'
import WalletModal from './WalletModal'

export default function Nav() {
  const pathname = usePathname()
  const { address, connected, launcher, disconnect } = useWalletStore()
  const [showWallet, setShowWallet] = useState(false)

  const links = [
    { href: '/',           label: 'Explore' },
    { href: '/launch',     label: 'Launch' },
    { href: '/kol',        label: 'KOL zone' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ]

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', gap: '2rem',
        height: '56px'
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>
            onchain<span style={{ color: 'var(--purple)' }}>KOL</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1 }}>
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${pathname === l.href ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="live-dot" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Live</span>
        </div>

        {/* Wallet */}
        {connected && address ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {launcher?.twitter_handle && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                @{launcher.twitter_handle}
              </span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowWallet(true)}
            >
              {truncateWallet(address)}
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowWallet(true)}
          >
            Connect wallet
          </button>
        )}
      </nav>

      {showWallet && (
        <WalletModal onClose={() => setShowWallet(false)} />
      )}
    </>
  )
}
