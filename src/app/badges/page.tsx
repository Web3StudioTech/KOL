'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { BADGE_IMAGES, BADGE_LABELS, BADGE_COLORS, BADGE_LIMITS, BADGE_REQUIREMENTS, formatMktCap, truncateWallet } from '@/lib/auth'
import BadgeImage from '@/components/ui/BadgeImage'
import Link from 'next/link'

const BADGES = [
  { key:'anon',      tier:1, category:'trader'  },
  { key:'trader',    tier:2, category:'trader'  },
  { key:'kol',       tier:1, category:'kol'     },
  { key:'kol_crown', tier:2, category:'kol'     },
  { key:'creator',   tier:1, category:'creator' },
  { key:'builder',   tier:2, category:'creator' },
]

export default function BadgesPage() {
  const { address, connected, launcher } = useAppStore()
  const [counts, setCounts]   = useState<Record<string, number>>({})
  const [holders, setHolders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch badge counts
    fetch('/api/badges/counts')
      .then(r => r.json())
      .then(d => { setCounts(d.counts || {}); setLoading(false) })
      .catch(() => setLoading(false))

    // Fetch recent badge holders
    fetch('/api/badges/holders?limit=12')
      .then(r => r.json())
      .then(d => setHolders(d.holders || []))
  }, [])

  const myBadge = launcher?.badge || null

  return (
    <>
      <Nav />
      <main style={{ paddingTop:'64px' }}>
        {/* Hero */}
        <div style={{ padding:'60px 40px 40px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(168,85,247,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(168,85,247,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%,black,transparent)', pointerEvents:'none' }} />
          <div style={{ maxWidth:'1200px', margin:'0 auto', position:'relative', zIndex:1 }}>
            <div className="section-tag">Badges</div>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(40px,7vw,80px)', lineHeight:1, marginBottom:'12px' }}>
              EARN YOUR <span style={{ color:'var(--accent4)' }}>BADGE</span>
            </h1>
            <p style={{ color:'var(--muted)', fontSize:'16px', maxWidth:'560px', lineHeight:1.6 }}>
              6 exclusive badges. Limited supply. First come, first served. Each badge is permanently recorded onchain.
            </p>
          </div>
        </div>

        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px' }}>

          {/* My badge */}
          {connected && myBadge && myBadge !== 'anon' && (
            <div style={{ background:'var(--bg2)', border:`1px solid ${BADGE_COLORS[myBadge]}40`, borderRadius:'4px', padding:'20px 24px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'16px' }}>
              <BadgeImage badge={myBadge} size={56} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'24px', letterSpacing:'1px', color:BADGE_COLORS[myBadge], marginBottom:'4px' }}>
                  You have the {BADGE_LABELS[myBadge]} Badge!
                </div>
                <div style={{ fontSize:'13px', color:'var(--muted)' }}>{BADGE_REQUIREMENTS[myBadge]}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)', marginBottom:'4px' }}>Badge #{launcher?.kol_badge_number || launcher?.trader_badge_number || '—'}</div>
                <div style={{ fontSize:'11px', color:'var(--accent)' }}>Permanently onchain ✓</div>
              </div>
            </div>
          )}

          {/* Badge grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginBottom:'40px' }}>
            {BADGES.map(b => {
              const issued    = counts[b.key] || 0
              const limit     = BADGE_LIMITS[b.key]
              const pct       = Math.min(100, (issued / limit) * 100)
              const remaining = Math.max(0, limit - issued)
              const isMine    = myBadge === b.key
              const isFull    = issued >= limit

              return (
                <div key={b.key} style={{
                  background:'var(--bg2)',
                  border:`1px solid ${isMine ? BADGE_COLORS[b.key] : isFull ? 'rgba(255,61,107,0.3)' : 'var(--border)'}`,
                  borderRadius:'4px',
                  padding:'20px',
                  position:'relative',
                  overflow:'hidden',
                }}>
                  {isMine && (
                    <div style={{ position:'absolute', top:'10px', right:'10px', padding:'2px 8px', background:BADGE_COLORS[b.key] + '20', border:`1px solid ${BADGE_COLORS[b.key]}40`, borderRadius:'100px', fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', color:BADGE_COLORS[b.key] }}>
                      MINE ✓
                    </div>
                  )}
                  {isFull && !isMine && (
                    <div style={{ position:'absolute', top:'10px', right:'10px', padding:'2px 8px', background:'rgba(255,61,107,0.1)', border:'1px solid rgba(255,61,107,0.3)', borderRadius:'100px', fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', color:'var(--accent2)' }}>
                      FULL
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                    <BadgeImage badge={b.key} size={48} />
                    <div>
                      <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'16px', fontWeight:700, letterSpacing:'1px', color:BADGE_COLORS[b.key] }}>
                        {BADGE_LABELS[b.key]}
                      </div>
                      <div style={{ fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'1px' }}>
                        {b.category} · Tier {b.tier}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.6, marginBottom:'12px' }}>
                    {BADGE_REQUIREMENTS[b.key]}
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'1px', color:'var(--muted)', textTransform:'uppercase' }}>Claimed</span>
                      <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'14px', color: isFull ? 'var(--accent2)' : BADGE_COLORS[b.key], letterSpacing:'0.5px' }}>
                        {issued.toLocaleString()} / {limit.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height:'6px', background:'var(--border)', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:isFull ? 'var(--accent2)' : BADGE_COLORS[b.key], borderRadius:'3px', transition:'width 0.5s ease' }} />
                    </div>
                  </div>

                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', color: isFull ? 'var(--accent2)' : 'var(--muted)' }}>
                    {isFull ? '❌ No badges remaining' : `${remaining.toLocaleString()} badges remaining`}
                  </div>
                </div>
              )
            })}
          </div>

          {/* How to earn */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px', marginBottom:'24px' }}>
            <div className="section-tag" style={{ marginBottom:'16px' }}>How to Earn Each Badge</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
              {[
                { title:'Trader Badges', color:'#06b6d4', steps:['Trade on OnchainKOL', '$10K volume → Anon badge', '$50K volume → Trader badge', 'Auto-assigned onchain'] },
                { title:'KOL Badges',    color:'#3b82f6', steps:['Connect wallet', 'Go to /verify', 'Post verification tweet', '2K followers → KOL', '5K followers → KOL Crown'] },
                { title:'Creator Badges',color:'#f59e0b', steps:['Launch a token', 'Build community + volume', '$10M market cap → Creator', '$50M market cap → Builder', 'Permanently onchain'] },
              ].map(c => (
                <div key={c.title} style={{ padding:'16px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px' }}>
                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:c.color, marginBottom:'12px' }}>{c.title}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {c.steps.map((s, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'12px', color:'var(--muted)' }}>
                        <span style={{ color:c.color, fontWeight:700, flexShrink:0 }}>{i + 1}.</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display:'flex', gap:'12px', justifyContent:'center' }}>
            <Link href="/launch" className="btn btn-primary">⚡ Launch Token → Creator Badge</Link>
            <Link href="/verify" className="btn btn-secondary">💙 Get KOL Badge</Link>
            <Link href="/" className="btn btn-secondary">💎 Start Trading → Anon Badge</Link>
          </div>
        </div>
      </main>
    </>
  )
}
