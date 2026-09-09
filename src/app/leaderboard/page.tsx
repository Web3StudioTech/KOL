'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/layout/Nav'
import { formatMktCap, truncateWallet, BADGE_IMAGES, BADGE_COLORS } from '@/lib/auth'
import BadgeImage from '@/components/ui/BadgeImage'
import Link from 'next/link'

const TABS = [
  { key:'tokens',  label:'🔥 Top Tokens'  },
  { key:'kols',    label:'👑 Top KOLs'    },
  { key:'traders', label:'💎 Top Traders' },
]

const RANK_COLORS = ['#ffd700','#9ca3af','#cd7f32']
const RANK_ICONS  = ['🥇','🥈','🥉']

export default function LeaderboardPage() {
  const [tab, setTab]       = useState('tokens')
  const [items, setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setItems([])
    fetch(`/api/leaderboard?tab=${tab}&limit=20`)
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab])

  return (
    <>
      <Nav />
      <main style={{ paddingTop:'64px' }}>
        {/* Hero */}
        <div style={{ padding:'60px 40px 0', borderBottom:'1px solid var(--border)', background:'var(--bg2)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%,black,transparent)', pointerEvents:'none' }} />
          <div style={{ maxWidth:'1200px', margin:'0 auto', position:'relative', zIndex:1 }}>
            <div className="section-tag">Leaderboard</div>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(40px,7vw,80px)', lineHeight:1, marginBottom:'12px' }}>
              WHO'S <span style={{ color:'var(--accent3)' }}>WINNING?</span>
            </h1>
            <p style={{ color:'var(--muted)', fontSize:'16px', maxWidth:'560px', lineHeight:1.6, marginBottom:'32px' }}>
              Real-time rankings from onchain data. Updated continuously.
            </p>
            <div style={{ display:'flex' }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ padding:'14px 24px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:tab===t.key?'var(--accent)':'var(--muted)', borderBottom:`2px solid ${tab===t.key?'var(--accent)':'transparent'}`, marginBottom:'-1px', transition:'all 0.2s' }}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'32px 40px' }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {[...Array(10)].map((_,i) => <div key={i} style={{ height:'64px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', opacity:0.4 }} />)}
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign:'center', padding:'6rem', color:'var(--muted)' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'48px', color:'var(--border)', marginBottom:'16px' }}>NO DATA YET</div>
              <p>Rankings will appear as the platform grows.</p>
            </div>
          ) : (
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden' }}>
              {items.map((item, i) => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'14px 16px', borderBottom:'1px solid var(--border)', background: i < 3 ? 'rgba(255,215,0,0.02)' : 'transparent' }}>
                  {/* Rank */}
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'24px', width:'40px', textAlign:'center', color:RANK_COLORS[i] || 'var(--muted)', flexShrink:0 }}>
                    {i < 3 ? RANK_ICONS[i] : i + 1}
                  </div>

                  {/* Token tab */}
                  {tab === 'tokens' && (
                    <>
                      <div style={{ width:40, height:40, borderRadius:'6px', background: item.image_url ? `url(${item.image_url}) center/cover` : 'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'12px', color:'var(--accent)', flexShrink:0 }}>
                        {!item.image_url && item.ticker?.slice(0,3)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px' }}>
                          <Link href={`/token/${item.id}`} style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'1px', textDecoration:'none', color:'var(--text)' }}>${item.ticker}</Link>
                          {item.status === 'graduated' && <span className="badge badge-grad">⚡ KOLSwap</span>}
                          {item.kol_call_count > 0 && <span className="badge badge-hot">🔥 {item.kol_call_count} calls</span>}
                        </div>
                        <div style={{ fontSize:'12px', color:'var(--muted)' }}>
                          {item.holder_count?.toLocaleString()} holders · {formatMktCap(item.volume_24h_usd || 0)} 24h vol
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'22px', letterSpacing:'1px' }}>{formatMktCap(item.market_cap_usd || 0)}</div>
                        <div style={{ fontSize:'11px', color:'var(--muted)', fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>market cap</div>
                      </div>
                    </>
                  )}

                  {/* KOLs tab */}
                  {tab === 'kols' && (
                    <>
                      <BadgeImage badge={item.badge || 'kol'} size={36} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px' }}>
                          <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'16px', fontWeight:700 }}>
                            {item.twitter_handle ? `@${item.twitter_handle}` : truncateWallet(item.wallet_address || '', 5)}
                          </span>
                        </div>
                        <div style={{ fontSize:'12px', color:'var(--muted)' }}>
                          {item.accuracy_pct}% accuracy · {item.total_calls?.toLocaleString()} total calls · {item.follower_count?.toLocaleString()} followers
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'22px', letterSpacing:'1px', color:'var(--accent3)' }}>
                          {item.earnings_eth?.toFixed(4)} ETH
                        </div>
                        <div style={{ fontSize:'11px', color:'var(--muted)', fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>earned</div>
                      </div>
                    </>
                  )}

                  {/* Traders tab */}
                  {tab === 'traders' && (
                    <>
                      <BadgeImage badge={item.badge || 'anon'} size={36} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily: item.twitter_handle ? 'Barlow Condensed,sans-serif' : 'Courier New,monospace', fontSize: item.twitter_handle ? '16px' : '13px', fontWeight:700, marginBottom:'2px' }}>
                          {item.twitter_handle ? `@${item.twitter_handle}` : truncateWallet(item.wallet_address || '', 6)}
                        </div>
                        <div style={{ fontSize:'12px', color:'var(--muted)' }}>
                          {item.badge?.replace('_',' ').toUpperCase()} badge holder
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'22px', letterSpacing:'1px', color:'var(--accent)' }}>
                          {formatMktCap(item.total_volume_usd || 0)}
                        </div>
                        <div style={{ fontSize:'11px', color:'var(--muted)', fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>volume</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
