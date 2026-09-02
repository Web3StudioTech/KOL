'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { truncateWallet, BADGE_LABELS, BADGE_ICONS } from '@/lib/auth'

export default function Nav() {
  const pathname = usePathname()
  const { address, connected, launcher, theme, toggleTheme, showLeaderboard, disconnect } = useAppStore()
  const [scrolled, setScrolled] = useState(false)
  const [showWalletMenu, setShowWalletMenu] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('okl-theme') as 'dark'|'light'|null
    if (saved) useAppStore.getState().setTheme(saved)
  }, [])

  const links = [
    { href: '/', label: 'Explore' },
    { href: '/launch', label: 'Launch' },
    { href: '/kol', label: 'KOL Zone' },
    ...(showLeaderboard ? [{ href: '/leaderboard', label: 'Leaderboard' }] : []),
  ]

  async function connectWallet() {
    const eth = (window as any).ethereum
    if (!eth) { alert('Please install MetaMask'); return }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      useAppStore.getState().setAddress(accounts[0], 'metamask')
    } catch(e) { console.error(e) }
  }

  return (
    <nav style={{
      position:'fixed',top:0,left:0,right:0,zIndex:100,
      padding:'0 40px',height:'64px',
      display:'flex',alignItems:'center',justifyContent:'space-between',
      background: scrolled ? 'rgba(8,11,15,0.95)' : 'rgba(8,11,15,0.75)',
      backdropFilter:'blur(16px)',
      borderBottom:`1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
      transition:'all 0.3s',
    }}>
      <Link href="/" style={{ textDecoration:'none' }}>
        <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'22px', letterSpacing:'3px', color:'var(--accent)' }}>
          ONCHAIN<span style={{ color:'var(--accent2)' }}>KOL</span>
        </span>
      </Link>

      <div style={{ display:'flex', gap:'32px', alignItems:'center' }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} className={`nav-link ${pathname === l.href ? 'active' : ''}`}>{l.label}</Link>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <span className="live-dot live-dot-cyan" />
          <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)' }}>Robinhood Chain</span>
        </div>

        <button onClick={toggleTheme} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:'2px', padding:'6px 10px', cursor:'pointer', color:'var(--muted)', fontSize:'14px' }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {connected && address ? (
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowWalletMenu(!showWalletMenu)} className="btn btn-secondary btn-sm">
              {launcher?.badge && launcher.badge !== 'anon' && (
                <span>{BADGE_ICONS[launcher.badge]}</span>
              )}
              {truncateWallet(address)}
            </button>
            {showWalletMenu && (
              <div style={{ position:'absolute', right:0, top:'100%', marginTop:'8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'8px', minWidth:'180px', zIndex:200 }}>
                {launcher?.twitter_handle && (
                  <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border)', marginBottom:'4px' }}>
                    <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700 }}>@{launcher.twitter_handle}</div>
                    <div style={{ fontSize:'11px', color:'var(--muted)' }}>{BADGE_LABELS[launcher.badge]} · {launcher.follower_count?.toLocaleString()} followers</div>
                  </div>
                )}
                <button onClick={() => { disconnect(); setShowWalletMenu(false) }} style={{ width:'100%', padding:'8px 12px', background:'transparent', border:'none', cursor:'pointer', color:'var(--accent2)', fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', textAlign:'left' }}>
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  )
}
