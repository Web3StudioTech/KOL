'use client'
import { useState, useEffect } from 'react'
import { BADGE_LABELS, BADGE_ICONS, truncateWallet } from '@/lib/auth'

export default function AdminPage() {
  const [key, setKey]         = useState('')
  const [authed, setAuthed]   = useState(false)
  const [tab, setTab]         = useState('overview')
  const [launchers, setLaunchers] = useState<any[]>([])
  const [total, setTotal]     = useState(0)
  const [msg, setMsg]         = useState('')
  const [loading, setLoading] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [paused, setPaused]   = useState(false)
  const headers = { 'x-admin-key': key, 'Content-Type': 'application/json' }

  async function login() {
    setLoading(true)
    const res = await fetch('/api/admin/launchers', { headers: {'x-admin-key': key} })
    if (res.ok) { setAuthed(true); localStorage.setItem('okl-admin-key', key); load() }
    else setMsg('Invalid admin key')
    setLoading(false)
  }

  async function load() {
    const res = await fetch('/api/admin/launchers', { headers })
    const data = await res.json()
    setLaunchers(data.launchers||[]); setTotal(data.total||0)
  }

  async function doAction(id:string, action:string) {
    await fetch('/api/admin/launchers', { method:'POST', headers, body: JSON.stringify({ launcher_id:id, action }) })
    setMsg(`${action} done`); load()
    setTimeout(() => setMsg(''), 3000)
  }

  useEffect(() => { const k = localStorage.getItem('okl-admin-key'); if(k) setKey(k) }, [])

  if (!authed) return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{width:'100%',maxWidth:'360px',padding:'2rem'}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'32px',letterSpacing:'3px',color:'var(--accent)'}}>ONCHAIN<span style={{color:'var(--accent2)'}}>KOL</span></div>
          <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'var(--muted)'}}>Admin Dashboard</div>
        </div>
        <div className="card" style={{padding:'1.5rem'}}>
          {msg && <div style={{padding:'8px 12px',background:'rgba(255,61,107,0.1)',border:'1px solid rgba(255,61,107,0.3)',borderRadius:'3px',color:'var(--accent2)',fontSize:'13px',marginBottom:'1rem'}}>{msg}</div>}
          <label>Admin Key</label>
          <input className="input" type="password" placeholder="Enter admin key..." value={key} onChange={e=>setKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} style={{marginBottom:'10px'}} />
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontFamily:'Bebas Neue,sans-serif',fontSize:'18px',letterSpacing:'2px'}} onClick={login} disabled={loading}>Enter</button>
        </div>
      </div>
    </main>
  )

  return (
    <main style={{minHeight:'100vh',background:'var(--bg)'}}>
      <div style={{padding:'0 40px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--bg2)',borderBottom:'1px solid var(--border)'}}>
        <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'20px',letterSpacing:'2px',color:'var(--accent)'}}>ONCHAIN<span style={{color:'var(--accent2)'}}>KOL</span> <span style={{fontSize:'12px',color:'var(--muted)',fontFamily:'Barlow Condensed,sans-serif',letterSpacing:'2px'}}>ADMIN</span></span>
        <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
      </div>
      {msg && <div style={{padding:'10px 40px',background:'rgba(0,229,255,0.08)',borderBottom:'1px solid rgba(0,229,255,0.2)',fontFamily:'Barlow Condensed,sans-serif',fontSize:'13px',fontWeight:700,letterSpacing:'1px',color:'var(--accent)'}}>{msg}</div>}
      <div style={{borderBottom:'1px solid var(--border)',padding:'0 40px',background:'var(--bg2)',display:'flex'}}>
        {[{k:'overview',l:'Overview'},{k:'launchers',l:'Launchers'},{k:'toggles',l:'Platform Toggles'}].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'12px 18px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'Barlow Condensed,sans-serif',fontSize:'13px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:tab===t.k?'var(--accent)':'var(--muted)',borderBottom:`2px solid ${tab===t.k?'var(--accent)':'transparent'}`,marginBottom:'-1px'}}>{t.l}</button>
        ))}
      </div>
      <div style={{maxWidth:'1400px',margin:'0 auto',padding:'32px 40px'}}>
        {tab==='overview' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px'}}>
            {[['Total Launchers',total,'var(--accent)'],['KOL Badge',launchers.filter(l=>l.badge==='kol').length,'#3b82f6'],['Trader Badge',launchers.filter(l=>l.badge==='trader').length,'#06b6d4'],['Banned',launchers.filter(l=>l.is_banned).length,'var(--accent2)']].map(([label,value,color]) => (
              <div key={label} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'20px 24px'}}>
                <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'8px'}}>{label}</div>
                <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'36px',letterSpacing:'1px',color:color as string}}>{value}</div>
              </div>
            ))}
          </div>
        )}
        {tab==='launchers' && (
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'var(--surface)',borderBottom:'1px solid var(--border)'}}>
                  {['Wallet','Twitter','Badge','Followers','Status','Actions'].map(h => (
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {launchers.map(l => (
                  <tr key={l.id} style={{borderBottom:'1px solid var(--border)',background:l.is_banned?'rgba(255,61,107,0.04)':'transparent'}}>
                    <td style={{padding:'10px 14px',fontFamily:'Courier New,monospace',fontSize:'11px',color:'var(--muted)'}}>{truncateWallet(l.wallet_address,5)}</td>
                    <td style={{padding:'10px 14px',fontFamily:'Barlow Condensed,sans-serif',fontWeight:700}}>{l.twitter_handle?`@${l.twitter_handle}`:'—'}</td>
                    <td style={{padding:'10px 14px'}}><span className={`badge badge-${l.badge||'anon'}`}>{BADGE_ICONS[l.badge||'anon']} {BADGE_LABELS[l.badge||'anon']}</span></td>
                    <td style={{padding:'10px 14px',fontFamily:'Bebas Neue,sans-serif',fontSize:'18px',letterSpacing:'0.5px'}}>{l.follower_count?.toLocaleString()||'0'}</td>
                    <td style={{padding:'10px 14px'}}><span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'12px',fontWeight:700,color:l.is_banned?'var(--accent2)':'var(--green)'}}>{l.is_banned?'BANNED':'ACTIVE'}</span></td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:'4px'}}>
                        {l.is_banned
                          ? <button onClick={()=>doAction(l.id,'unban')} style={{padding:'4px 8px',background:'transparent',border:'1px solid rgba(0,229,160,0.3)',borderRadius:'2px',cursor:'pointer',color:'var(--green)',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'1px'}}>UNBAN</button>
                          : <button onClick={()=>doAction(l.id,'ban')} style={{padding:'4px 8px',background:'transparent',border:'1px solid rgba(255,61,107,0.3)',borderRadius:'2px',cursor:'pointer',color:'var(--accent2)',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'1px'}}>BAN</button>
                        }
                        {l.follower_count>=5000 && l.badge!=='kol' && (
                          <button onClick={()=>doAction(l.id,'set_kol')} style={{padding:'4px 8px',background:'transparent',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'2px',cursor:'pointer',color:'#3b82f6',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'1px'}}>SET KOL</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab==='toggles' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px',maxWidth:'500px'}}>
            {[{label:'Leaderboard Page',desc:'Show leaderboard link in nav. Enable when 1,000+ tokens launched.',value:showLeaderboard,set:setShowLeaderboard},{label:'Platform Trading',desc:'Emergency pause. Disables all buys and sells.',value:!paused,set:(v:boolean)=>setPaused(!v)}].map(t => (
              <div key={t.label} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'20px 24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'16px'}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'16px',fontWeight:700,letterSpacing:'1px',marginBottom:'4px'}}>{t.label}</div>
                  <p style={{fontSize:'13px',color:'var(--muted)',lineHeight:1.6}}>{t.desc}</p>
                </div>
                <button onClick={()=>t.set(!t.value)} style={{width:'52px',height:'28px',borderRadius:'14px',background:t.value?'var(--green)':'var(--border)',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                  <div style={{width:'20px',height:'20px',borderRadius:'50%',background:'#fff',position:'absolute',top:'4px',transition:'left 0.2s',left:t.value?'28px':'4px'}} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
