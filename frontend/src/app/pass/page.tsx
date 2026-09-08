'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, truncateWallet } from '@/lib/auth'

export default function PassPage() {
  const { address, connected } = useAppStore()
  const [passes, setPasses]       = useState<any[]>([])
  const [myPasses, setMyPasses]   = useState<any[]>([])
  const [stats, setStats]         = useState({ issued: 0, remaining: 10000 })
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/passes')
      .then(r => r.json())
      .then(d => {
        setPasses(d.passes || [])
        setStats(d.stats || { issued: 0, remaining: 10000 })
        setLoading(false)
      })
      .catch(() => setLoading(false))

    if (address) {
      fetch(`/api/passes?wallet=${address}`)
        .then(r => r.json())
        .then(d => setMyPasses(d.passes || []))
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
              Creator Pass
            </div>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(40px,7vw,80px)', lineHeight:1, marginBottom:'12px' }}>
              THE <span style={{ color:'var(--accent3)' }}>CREATOR PASS</span>
            </h1>
            <p style={{ color:'var(--muted)', fontSize:'16px', maxWidth:'580px', lineHeight:1.6, marginBottom:'32px' }}>
              Earn a Creator Pass when your token reaches $10M cumulative volume on OnchainKOL. Only 10,000 passes exist — first come, first served. Proof of your success, permanently onchain.
            </p>

            {/* Stats */}
            <div style={{ display:'flex', gap:'40px', flexWrap:'wrap' }}>
              {[
                { label:'Passes Issued',    value:stats.issued.toLocaleString(),          color:'var(--accent3)' },
                { label:'Remaining',        value:Math.max(0, 10000 - stats.issued).toLocaleString(), color:'var(--accent)' },
                { label:'Max Supply',       value:'10,000',                               color:'var(--muted)'  },
                { label:'Volume to Claim',  value:'$10M cumulative',                      color:'var(--green)'  },
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
                <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)' }}>Passes Claimed</span>
                <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', color:'var(--accent3)', letterSpacing:'1px' }}>{stats.issued} / 10,000</span>
              </div>
              <div style={{ height:'8px', background:'var(--border)', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(stats.issued/10000)*100}%`, background:'linear-gradient(90deg,var(--accent3),#ff8c00)', borderRadius:'4px', transition:'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px' }}>

            {/* LEFT — How to earn */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* My passes */}
              {connected && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px' }}>
                  <div className="section-tag" style={{ marginBottom:'16px' }}>My Creator Passes</div>
                  {myPasses.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'24px', color:'var(--muted)' }}>
                      <div style={{ fontSize:'40px', marginBottom:'8px' }}>🎫</div>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'24px', color:'var(--border)', marginBottom:'8px' }}>NO PASSES YET</div>
                      <p style={{ fontSize:'14px', lineHeight:1.6 }}>
                        Launch a token and build it to $10M cumulative volume to earn your Creator Pass.
                      </p>
                      <Link href="/launch" className="btn btn-primary" style={{ marginTop:'16px', display:'inline-flex' }}>
                        ⚡ Launch a Token
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {myPasses.map((pass: any) => (
                        <div key={pass.id} style={{ padding:'16px', background:'var(--bg3)', border:'1px solid rgba(255,215,0,0.3)', borderRadius:'4px', display:'flex', alignItems:'center', gap:'14px' }}>
                          <div style={{ width:52, height:52, borderRadius:'8px', background:'linear-gradient(135deg,rgba(255,215,0,0.2),rgba(255,140,0,0.1))', border:'2px solid rgba(255,215,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', color:'var(--accent3)', letterSpacing:'1px' }}>#{pass.pass_number}</span>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'1px', marginBottom:'2px' }}>
                              ${pass.ticker} Creator Pass
                            </div>
                            <div style={{ fontSize:'12px', color:'var(--muted)' }}>
                              Pass #{pass.pass_number} · Earned at {formatMktCap(pass.volume_at_earn)} volume · {new Date(pass.earned_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--accent3)', marginBottom:'4px' }}>
                              FCFS #{pass.pass_number}
                            </div>
                            {pass.tx_hash && (
                              <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${pass.tx_hash}`} target="_blank" style={{ fontSize:'11px', color:'var(--accent)', textDecoration:'none', fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, letterSpacing:'1px' }}>
                                View Onchain ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* How to earn */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px' }}>
                <div className="section-tag" style={{ marginBottom:'16px' }}>How to Earn a Creator Pass</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[
                    { step:'01', title:'Launch a Token', desc:'Deploy your token on OnchainKOL for 0.0004 ETH. Fair launch — no pre-sale, no dev allocation.' },
                    { step:'02', title:'Get KOL Calls', desc:'Invite KOLs to discover and call your token. KOL calls drive volume and awareness.' },
                    { step:'03', title:'Build to $10M Volume', desc:'Your token needs $10M cumulative trading volume across both bonding curve and KOLSwap phases.' },
                    { step:'04', title:'Auto-Claim FCFS', desc:'Once your token hits $10M volume, a Creator Pass is automatically minted to your wallet. First come, first served.' },
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

              {/* Pass benefits */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px' }}>
                <div className="section-tag" style={{ marginBottom:'16px' }}>Creator Pass Benefits</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[
                    ['🏆', 'Proof of success permanently onchain'],
                    ['🎖️', 'Exclusive Creator Pass holder badge'],
                    ['📊', 'Featured on OnchainKOL leaderboard'],
                    ['🔐', 'Access to future Creator Pass gated features'],
                    ['💎', 'Part of the first 10,000 — forever verifiable'],
                    ['🌐', 'Cross-chain recognition in future bridge'],
                  ].map(([icon, benefit]) => (
                    <div key={benefit} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', fontSize:'13px' }}>
                      <span style={{ fontSize:'16px', flexShrink:0 }}>{icon}</span>
                      <span style={{ color:'var(--text)' }}>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Recent passes */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* Pass visual */}
              <div style={{ background:'linear-gradient(135deg,#0d1117 0%,#1a1400 50%,#0d1117 100%)', border:'2px solid rgba(255,215,0,0.3)', borderRadius:'8px', padding:'32px', textAlign:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,215,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,0.03) 1px,transparent 1px)', backgroundSize:'30px 30px', pointerEvents:'none' }} />
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ fontSize:'48px', marginBottom:'8px' }}>🎫</div>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'36px', color:'var(--accent3)', letterSpacing:'3px', marginBottom:'4px' }}>CREATOR PASS</div>
                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'3px', textTransform:'uppercase', color:'rgba(255,215,0,0.5)', marginBottom:'20px' }}>OnchainKOL · Robinhood Chain</div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                    {[
                      ['Token',   '$YOUR_TOKEN'],
                      ['Pass #',  '#0001'],
                      ['Volume',  '$10,000,000'],
                      ['Earned',  'Today'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ padding:'8px 12px', background:'rgba(255,215,0,0.05)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:'3px' }}>
                        <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,215,0,0.5)', marginBottom:'2px' }}>{k}</div>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', letterSpacing:'1px', color:'var(--accent3)' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontFamily:'Courier New,monospace', fontSize:'11px', color:'rgba(255,215,0,0.4)' }}>
                    0x1234...6b6f6c · Robinhood Chain
                  </div>
                </div>
              </div>

              {/* Recent passes */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px' }}>
                <div className="section-tag" style={{ marginBottom:'16px' }}>Recent Creator Passes</div>
                {loading ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {[...Array(3)].map((_,i) => (
                      <div key={i} style={{ height:'60px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', opacity:0.4 }} />
                    ))}
                  </div>
                ) : passes.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'24px', color:'var(--muted)' }}>
                    <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', color:'var(--border)', marginBottom:'8px' }}>NONE ISSUED YET</div>
                    <p style={{ fontSize:'13px' }}>Be the first to earn a Creator Pass by building your token to $10M volume.</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {passes.slice(0, 10).map((pass: any, i) => (
                      <div key={pass.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px' }}>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', color: i < 3 ? 'var(--accent3)' : 'var(--muted)', width:'40px', textAlign:'center', letterSpacing:'1px' }}>
                          #{pass.pass_number}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700, letterSpacing:'0.5px' }}>
                            ${pass.ticker}
                          </div>
                          <div style={{ fontSize:'11px', color:'var(--muted)' }}>
                            {formatMktCap(pass.volume_at_earn)} volume · {new Date(pass.earned_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'11px', color:'var(--muted)', fontFamily:'Courier New,monospace' }}>
                            {truncateWallet(pass.creator_wallet || '0x000', 4)}
                          </div>
                          {pass.tx_hash && (
                            <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${pass.tx_hash}`} target="_blank" style={{ fontSize:'10px', color:'var(--accent)', textDecoration:'none', fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, letterSpacing:'1px' }}>
                              ONCHAIN ↗
                            </a>
                          )}
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
                  Launch your token now. Build volume. Earn your Creator Pass before all 10,000 are claimed.
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
