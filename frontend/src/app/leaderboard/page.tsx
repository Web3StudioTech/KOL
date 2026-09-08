'use client'
import { useState } from 'react'
import Nav from '@/components/layout/Nav'
import { formatMktCap, BADGE_LABELS, BADGE_ICONS } from '@/lib/auth'

export default function LeaderboardPage() {
  const [tab, setTab] = useState('tokens')
  const rankColor = (r:number) => r===1?'var(--accent3)':r===2?'#9CA3AF':r===3?'#CD7F32':'var(--muted)'
  const mock = Array.from({length:10},(_,i)=>i+1)

  return (
    <>
      <Nav />
      <main style={{paddingTop:'64px'}}>
        <div style={{padding:'60px 40px 0',borderBottom:'1px solid var(--border)',background:'var(--bg2)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)',backgroundSize:'60px 60px',maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%,black,transparent)',pointerEvents:'none'}} />
          <div style={{maxWidth:'1200px',margin:'0 auto',position:'relative',zIndex:1}}>
            <div className="section-tag">Leaderboard</div>
            <h1 style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'clamp(40px,7vw,80px)',lineHeight:1,marginBottom:'12px'}}>
              WHO'S <span style={{color:'var(--accent3)'}}>WINNING?</span>
            </h1>
            <p style={{color:'var(--muted)',fontSize:'16px',maxWidth:'560px',lineHeight:1.6,marginBottom:'32px'}}>Real-time rankings updated hourly.</p>
            <div style={{display:'flex'}}>
              {[{key:'tokens',label:'🔥 Top Tokens'},{key:'kols',label:'👑 Top KOLs'},{key:'traders',label:'💎 Top Traders'}].map(t => (
                <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'14px 24px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'Barlow Condensed,sans-serif',fontSize:'14px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:tab===t.key?'var(--accent)':'var(--muted)',borderBottom:`2px solid ${tab===t.key?'var(--accent)':'transparent'}`,marginBottom:'-1px',transition:'all 0.2s'}}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 40px'}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',overflow:'hidden'}}>
            {mock.map(rank => (
              <div key={rank} style={{display:'flex',alignItems:'center',gap:'16px',padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
                <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'24px',width:'40px',textAlign:'center',color:rankColor(rank)}}>
                  {rank<=3?['🥇','🥈','🥉'][rank-1]:rank}
                </div>
                <div style={{width:36,height:36,borderRadius:tab==='kols'?'50%':'6px',background:'var(--surface)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue,sans-serif',fontSize:'11px',color:'var(--accent)',flexShrink:0}}>
                  {tab==='tokens'?`T${rank}`:tab==='kols'?`K${rank}`:`W${rank}`}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                    <span style={{fontFamily:tab==='traders'?'Courier New,monospace':'Barlow Condensed,sans-serif',fontSize:tab==='traders'?'13px':'16px',fontWeight:700,letterSpacing:'0.5px'}}>
                      {tab==='tokens'?`$TOKEN${rank}`:tab==='kols'?`@kol${rank}example`:`0xAbC${rank}...Def${rank}`}
                    </span>
                    {tab==='kols' && <span className="badge badge-kol">💙 KOL</span>}
                    {tab==='traders' && <span style={{padding:'2px 8px',borderRadius:'2px',fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',background:'rgba(6,182,212,0.2)',color:'#06b6d4',border:'1px solid rgba(6,182,212,0.3)'}}>💎 Trader</span>}
                  </div>
                  <div style={{fontSize:'12px',color:'var(--muted)'}}>
                    {tab==='tokens'?`${rank*100} holders · ${12-rank} KOL calls`:tab==='kols'?`${88-rank*3}% accuracy · ${50-rank*5} calls this week`:`$${(50000+rank*5000).toLocaleString()} volume · ${45-rank*4}d streak 🔥`}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'22px',letterSpacing:'1px',color:tab==='kols'?'var(--accent3)':tab==='traders'?'var(--accent)':'var(--text)'}}>
                    {tab==='tokens'?formatMktCap(rank*500000):tab==='kols'?`$${(9000-rank*800).toLocaleString()}`:`${(85000-rank*7000).toLocaleString()} pts`}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--muted)',fontFamily:'Barlow Condensed,sans-serif',letterSpacing:'1px',textTransform:'uppercase'}}>
                    {tab==='tokens'?'market cap':tab==='kols'?'earned this week':'points'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
