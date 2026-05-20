'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { truncateWallet } from '@/lib/auth'
import WalletModal from './WalletModal'

export default function Nav() {
  const pathname = usePathname()
  const { address, connected, launcher, theme, toggleTheme, showLeaderboard, disconnect } = useAppStore()
  const [showWallet, setShowWallet] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Init theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('okl-theme') as 'dark' | 'light' | null
    if (saved) useAppStore.getState().setTheme(saved)
  }, [])

  const links = [
    { href: '/', label: 'Explore' },
    { href: '/launch', label: 'Launch' },
    { href: '/kol', label: 'KOL Zone' },
    ...(showLeaderboard ? [{ href: '/leaderboard', label: 'Leaderboard' }] : []),
  ]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(8,11,15,0.92)' : 'rgba(8,11,15,0.75)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
        transition: 'all 0.3s',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '22px',
            letterSpacing: '3px',
            color: 'var(--accent)',
          }}>
            ONCHAIN<span style={{ color: 'var(--accent2)' }}>KOL</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
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

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="live-dot live-dot-cyan" />
            <span style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: '11px', fontWeight: 700,
              letterSpacing: '2px', textTransform: 'uppercase',
              color: 'var(--muted)'
            }}>Live</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              padding: '6px 10px',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: '14px',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.2s',
            }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Wallet */}
          {connected && address ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {launcher?.twitter_handle && (
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: '12px', color: 'var(--muted)',
                  letterSpacing: '0.5px'
                }}>
                  @{launcher.twitter_handle}
                </span>
              )}
              <button
                onClick={() => setShowWallet(true)}
                className="btn btn-secondary btn-sm"
              >
                {truncateWallet(address)}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowWallet(true)}
              disabled={useAppStore.getState().connecting}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
    </>
  )
}
