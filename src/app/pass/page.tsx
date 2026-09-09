'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { truncateWallet } from '@/lib/auth'

const CREATOR_LIMIT = 1000

export default function PassPage() {
  const { address, connected } = useAppStore()
  const [holders, setHolders]     = useState<any[]>([])
  const [myBadges, setMyBadges]   = useState<any[]>([])
  const [issued, setIssued]       = useState(0)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/badges/counts')
      .then(r => r.json())
      .then(d => { setIssued(d.counts?.creator || 0); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/badges/holders?badge=creator&limit=10')
      .then(r => r.json())
      .then(d => setHolders(d.holders || []))

    if (address) {
      fetch(`/api/badges/mine?wallet=${address}`)
        .then(r => r.json())
        .then(d => setMyBadges((d.badges || []).filter((b: any) => b.badge === 'creator')))
    }
  }, [address])

  return (
    <>
      <Nav />
      <main style={{ paddingTop:'64px' }}>

        {/* Hero */}
        <div style={{ padding:'60px 40px 40px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,215,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%,black,transparent)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:'500px', height:'500px', borderRadius:'50%', filter:'blur(80px)', top:'-100px', right:'-100px', background:'radial-gradient(circle,rgba(255,215,0,0.08),transparent 70%)', pointerEvents:'none' }} />

          <div style={{ maxWidth:'1200px', margin:'0 auto', position:'relative', zIndex:1 }}>
            <div style={{ display:'inline-block', fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'3px', textTransform:'uppercase', color:'var(--accent3)', marginBottom:'16px', borderLeft:'3px solid var(--accent3)', paddingLeft:'12px' }}>
              Creator Badge
            </div>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(40px,7vw,80px)', lineHeight:1, marginBottom:'12px' }}>
              THE <span style={{ color:'var(--accent3)' }}>CREATOR BADGE</span>
            </h1>
            <p style={{ color:'var(--muted)', fontSize:'16px', maxWidth:'580px', lineHeight:1.6, marginBottom:'32px' }}>
              Earn the Creator badge when your token reaches a $10M market cap on OnchainKOL. Only 1,000 exist — part of a wider 10,000-badge collection across all six categories. First come, first served.
            </p>

            {/* Stats */}
            <div style={{ display:'flex', gap:'40px', flexWrap:'wrap' }}>
              {[
                { label:'Badges Issued',    value:issued.toLocaleString(),          color:'var(--accent3)' },
                { label:'Remaining',        value:Math.max(0, CREATOR_LIMIT - issued).toLocaleString(), color:'var(--accent)' },
                { label:'Max Supply',       value:CREATOR_LIMIT.toLocaleString(),   color:'var(--muted)'  },
                { label:'Market Cap to Claim', value:'$10M',                        color:'var(--green)'  },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', color:s.color, letterSpacing:'1px' }}>{s.value}</div>
                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)', marginTop:'2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop:'24px', maxWidth:'400px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)' }}>Badges Claimed</span>
                <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', color:'var(--accent3)', letterSpacing:'1px' }}>{issued} / {CREATOR_LIMIT.toLocaleString()}</span>
              </div>
              <div style={{ height:'8px', background:'var(--border)', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(issued/CREATOR_LIMIT)*100}%`, background:'linear-gradient(90deg,var(--accent3),#ff8c00)', borderRadius:'4px', transition:'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px' }}>

            {/* LEFT — How to earn */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* My badge */}
              {connected && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px' }}>
                  <div className="section-tag" style={{ marginBottom:'16px' }}>My Creator Badge</div>
                  {myBadges.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'24px', color:'var(--muted)' }}>
                      <div style={{ fontSize:'40px', marginBottom:'8px' }}>🏆</div>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'24px', color:'var(--border)', marginBottom:'8px' }}>NOT EARNED YET</div>
                      <p style={{ fontSize:'14px', lineHeight:1.6 }}>
                        Launch a token and build it to a $10M market cap to earn the Creator badge.
                      </p>
                      <Link href="/launch" className="btn btn-primary" style={{ marginTop:'16px', display:'inline-flex' }}>
                        ⚡ Launch a Token
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {myBadges.map((b: any) => (
                        <div key={b.badge_number} style={{ padding:'16px', background:'var(--bg3)', border:'1px solid rgba(255,215,0,0.3)', borderRadius:'4px', display:'flex', alignItems:'center', gap:'14px' }}>
                          <div style={{ width:52, height:52, borderRadius:'8px', background:'linear-gradient(135deg,rgba(255,215,0,0.2),rgba(255,140,0,0.1))', border:'2px solid rgba(255,215,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', color:'var(--accent3)', letterSpacing:'1px' }}>#{b.badge_number}</span>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'1px', marginBottom:'2px' }}>
                              Creator Badge
                            </div>
                            <div style={{ fontSize:'12px', color:'var(--muted)' }}>
                              Badge #{b.badge_number} · Earned {new Date(b.earned_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--accent3)' }}>
                              FCFS #{b.badge_number}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* How to earn */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px' }}>
                <div className="section-tag" style={{ marginBottom:'16px' }}>How to Earn the Creator Badge</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[
                    { step:'01', title:'Launch a Token', desc:'Deploy your token on OnchainKOL for 0.0004 ETH. Fair launch — no pre-sale, no dev allocation.' },
                    { step:'02', title:'Get KOL Calls', desc:'Invite KOLs to discover and call your token. KOL calls drive volume and awareness.' },
                    { step:'03', title:'Build to $10M Market Cap', desc:'Your token needs to break $10M market cap.' },
                    { step:'04', title:'Auto-Claim FCFS', desc:'Once your token hits $10M market cap, the Creator badge is automatically granted to your wallet. First come, first served.' },
                  ].map(s => (
                    <div key={s.step} style={{ display:'flex', gap:'14px', alignItems:'flex-start', padding:'12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px' }}>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', color:'var(--accent3)', letterSpacing:'1px', lineHeight:1, flexShrink:0, width:'32px', textAlign:'center' }}>{s.step}</div>
                      <div>
                        <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:'4px' }}>{s.title}</div>
                        <p style={{ fontSize:'13px', color:'var(--muted)', lineHeight:1.5 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Recent badges */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* Badge visual */}
              <div style={{ background:'linear-gradient(135deg,#0d1117 0%,#1a1400 50%,#0d1117 100%)', border:'2px solid rgba(255,215,0,0.3)', borderRadius:'8px', padding:'32px', textAlign:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,215,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,0.03) 1px,transparent 1px)', backgroundSize:'30px 30px', pointerEvents:'none' }} />
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ fontSize:'48px', marginBottom:'8px' }}>🏆</div>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'36px', color:'var(--accent3)', letterSpacing:'3px', marginBottom:'4px' }}>CREATOR BADGE</div>
                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'3px', textTransform:'uppercase', color:'rgba(255,215,0,0.5)', marginBottom:'20px' }}>OnchainKOL · Robinhood Chain</div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                    {[
                      ['Token',      '$YOUR_TOKEN'],
                      ['Badge #',    '#0001'],
                      ['Market Cap', '$10,000,000'],
                      ['Earned',     'Today'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ padding:'8px 12px', background:'rgba(255,215,0,0.05)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:'3px' }}>
                        <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,215,0,0.5)', marginBottom:'2px' }}>{k}</div>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', letterSpacing:'1px', color:'var(--accent3)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent badges */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px' }}>
                <div className="section-tag" style={{ marginBottom:'16px' }}>Recent Creator Badges</div>
                {loading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {[...Array(3)].map((_,i) => (
                      <div key={i} style={{ height:'60px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', opacity:0.4 }} />
                    ))}
                  </div>
                ) : holders.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'24px', color:'var(--muted)' }}>
                    <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', color:'var(--border)', marginBottom:'8px' }}>NONE ISSUED YET</div>
                    <p style={{ fontSize:'13px' }}>Be the first to earn the Creator badge by building your token to a $10M market cap.</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {holders.slice(0, 10).map((h: any, i) => (
                      <div key={`${h.wallet_address}-${h.badge_number}`} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px' }}>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', color: i < 3 ? 'var(--accent3)' : 'var(--muted)', width:'40px', textAlign:'center', letterSpacing:'1px' }}>
                          #{h.badge_number}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700, letterSpacing:'0.5px' }}>
                            {h.token_ticker ? `$${h.token_ticker}` : truncateWallet(h.wallet_address, 4)}
                          </div>
                          <div style={{ fontSize:'11px', color:'var(--muted)' }}>
                            {new Date(h.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'11px', color:'var(--muted)', fontFamily:'Courier New,monospace' }}>
                            {truncateWallet(h.wallet_address, 4)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div style={{ background:'var(--bg2)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:'4px', padding:'24px', textAlign:'center' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'32px', letterSpacing:'2px', marginBottom:'8px' }}>
                  READY TO <span style={{ color:'var(--accent3)' }}>EARN?</span>
                </div>
                <p style={{ color:'var(--muted)', fontSize:'14px', lineHeight:1.6, marginBottom:'20px' }}>
                  Launch your token now. Build market cap. Earn the Creator badge before all 1,000 are claimed.
                </p>
                <Link href="/launch" className="btn btn-primary btn-lg" style={{ display:'inline-flex' }}>
                  ⚡ Launch Your Token
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
