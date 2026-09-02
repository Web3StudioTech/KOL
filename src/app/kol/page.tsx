'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, BADGE_LABELS, BADGE_ICONS } from '@/lib/auth'

export default function KolPage() {
  const { launcher } = useAppStore()
  const [tab, setTab]     = useState<'discover'|'my-calls'|'top-kols'>('discover')
  const [tokens, setTokens] = useState<any[]>([])
  const [calls, setCalls]   = useState<any[]>([])
  const isKol = launcher?.badge === 'kol'

  useEffect(() => {
    fetch('/api/tokens?sort=new&limit=20').then(r=>r.json()).then(d=>setTokens(d.tokens||[]))
    if (launcher) fetch(`/api/calls?launcher_id=${launcher.id}`).then(r=>r.json()).then(d=>setCalls(d.calls||[]))
  }, [launcher])

  return (
    <>
      <Nav />
      <main style={{paddingTop:'64px'}}>
        <div style={{padding:'60px 40px 0',borderBottom:'1px solid var(--border)',background:'var(--bg2)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)',backgroundSize:'60px 60px',maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%,black,transparent)',pointerEvents:'none'}} />
          <div style={{maxWidth:'1200px',margin:'0 auto',position:'relative',zIndex:1}}>
            <div className="section-tag">KOL Zone</div>
            <h1 style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'clamp(40px,7vw,80px)',lineHeight:1,marginBottom:'12px'}}>
              DISCOVER. <span style={{color:'var(--accent)'}}>CALL.</span> <span style={{WebkitTextStroke:'2px var(--accent2)',color:'transparent'}}>EARN.</span>
            </h1>
            <p style={{color:'var(--muted)',fontSize:'16px',maxWidth:'560px',lineHeight:1.6,marginBottom:'32px'}}>
              Browse new launches on Robinhood Chain. Call what you believe in. Earn from the 0.10% KOL reward pool on every trade your call generates.
            </p>
            {!isKol && (
              <div style={{padding:'12px 16px',background:'rgba(0,229,255,0.06)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'3px',marginBottom:'16px',display:'inline-block'}}>
                <span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'13px',fontWeight:700,letterSpacing:'1px',color:'var(--accent)'}}>
                  💙 Verify Twitter with 5,000+ followers to earn KOL badge and submit calls
                </span>
              </div>
            )}
            <div style={{display:'flex'}}>
              {[{key:'discover',label:'🔍 Discover'},{key:'my-calls',label:'📢 My Calls'},{key:'top-kols',label:'👑 Top KOLs'}].map(t => (
                <button key={t.key} onClick={()=>setTab(t.key as any)} style={{padding:'14px 20px',fontFamily:'Barlow Condensed,sans-serif',fontSize:'13px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',background:'transparent',border:'none',cursor:'pointer',color:tab===t.key?'var(--accent)':'var(--muted)',borderBottom:`2px solid ${tab===t.key?'var(--accent)':'transparent'}`,marginBottom:'-1px',transition:'all 0.2s'}}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 40px'}}>
          {tab === 'discover' && (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {tokens.length === 0 ? (
                <div style={{textAlign:'center',padding:'4rem',color:'var(--muted)'}}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'48px',color:'var(--border)',marginBottom:'16px'}}>NO TOKENS YET</div>
                  <p>New token launches will appear here.</p>
                </div>
              ) : tokens.map((token:any) => (
                <div key={token.id} style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px 20px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px'}}>
                  <div style={{width:40,height:40,borderRadius:'6px',background:token.image_url?`url(${token.image_url}) center/cover`:'var(--surface)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue,sans-serif',fontSize:'12px',color:'var(--accent)',flexShrink:0}}>
                    {!token.image_url && token.ticker?.slice(0,3)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                      <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'20px',letterSpacing:'1px'}}>${token.ticker}</span>
                      <span className={`badge badge-${token.launcher_badge||'anon'}`}>{BADGE_ICONS[token.launcher_badge||'anon']} {BADGE_LABELS[token.launcher_badge||'anon']}</span>
                      {token.kol_call_count === 0 && <span className="badge badge-new">Uncalled</span>}
                    </div>
                    <div style={{fontSize:'13px',color:'var(--muted)'}}>{token.description?.slice(0,80)}{token.description?.length>80?'...':''}</div>
                  </div>
                  <div style={{textAlign:'right',marginRight:'8px'}}>
                    <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'20px',letterSpacing:'1px'}}>{formatMktCap(token.market_cap_usd||0)}</div>
                    <div style={{fontSize:'11px',color:'var(--muted)',fontFamily:'Barlow Condensed,sans-serif',letterSpacing:'1px',textTransform:'uppercase'}}>Market cap</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                    <a href={`/token/${token.id}`} className="btn btn-secondary btn-sm" style={{fontSize:'11px'}}>View</a>
                    {isKol && <a href={`/token/${token.id}`} className="btn btn-primary btn-sm" style={{fontSize:'11px'}}>Call It</a>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'my-calls' && (
            <div>
              {!launcher ? (
                <div style={{textAlign:'center',padding:'4rem',color:'var(--muted)'}}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'48px',color:'var(--border)',marginBottom:'16px'}}>CONNECT WALLET</div>
                  <p>Connect your wallet to see your call history.</p>
                </div>
              ) : calls.length === 0 ? (
                <div style={{textAlign:'center',padding:'4rem',color:'var(--muted)'}}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'48px',color:'var(--border)',marginBottom:'16px'}}>NO CALLS YET</div>
                  <p>Discover tokens and start calling to earn rewards.</p>
                </div>
              ) : calls.map((call:any) => (
                <div key={call.id} style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px 20px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',marginBottom:'8px'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                      <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'20px',letterSpacing:'1px'}}>${call.tokens?.ticker}</span>
                      <span style={{fontSize:'12px',color:'var(--muted)'}}>called at {formatMktCap(call.mktcap_at_call||0)}</span>
                    </div>
                    {call.thesis && <p style={{fontSize:'13px',color:'var(--muted)'}}>{call.thesis}</p>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'22px',letterSpacing:'1px',color:call.accuracy_status==='hit'?'var(--green)':call.accuracy_status==='miss'?'var(--red)':'var(--muted)'}}>
                      {call.accuracy_status==='hit'?'✓ HIT':call.accuracy_status==='partial'?'~ PARTIAL':call.accuracy_status==='miss'?'✗ MISS':'⏳ PENDING'}
                    </div>
                    {call.reward_eth>0 && <div style={{fontSize:'12px',color:'var(--accent3)',fontFamily:'Barlow Condensed,sans-serif',fontWeight:700}}>+{call.reward_eth?.toFixed(4)} ETH</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'top-kols' && (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[1,2,3,4,5].map(rank => (
                <div key={rank} style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px 20px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px'}}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'28px',width:'32px',textAlign:'center',color:rank===1?'var(--accent3)':rank===2?'#9CA3AF':rank===3?'#CD7F32':'var(--muted)'}}>
                    {rank<=3?['🥇','🥈','🥉'][rank-1]:rank}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                      <span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'16px',fontWeight:700,letterSpacing:'0.5px'}}>@kol{rank}example</span>
                      <span className="badge badge-kol">💙 KOL</span>
                    </div>
                    <div style={{fontSize:'12px',color:'var(--muted)'}}>{88-rank*3}% accuracy · {50-rank*5} calls this week</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'24px',letterSpacing:'1px',color:'var(--accent3)'}}>${(9000-rank*1000).toLocaleString()}</div>
                    <div style={{fontSize:'11px',color:'var(--muted)',fontFamily:'Barlow Condensed,sans-serif',letterSpacing:'1px',textTransform:'uppercase'}}>earned this week</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
