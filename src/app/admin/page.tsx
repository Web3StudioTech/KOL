'use client'
import { useState, useEffect } from 'react'
import { BADGE_LABELS, BADGE_ICONS, truncateWallet } from '@/lib/auth'

export default function AdminPage() {
  const [key, setKey]         = useState('')
  const [authed, setAuthed]   = useState(false)
  const [tab, setTab]         = useState('review')
  const [launchers, setLaunchers] = useState<any[]>([])
  const [total, setTotal]     = useState(0)
  const [msg, setMsg]         = useState('')
  const [loading, setLoading] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [paused, setPaused]   = useState(false)
  const [overview, setOverview] = useState<any>(null)
  const [period, setPeriod] = useState('day')
  const headers = { 'x-admin-key': key, 'Content-Type': 'application/json' }

  async function login() {
    setLoading(true)
    const res = await fetch('/api/admin/launchers', { headers: {'x-admin-key': key} })
    if (res.ok) { setAuthed(true); localStorage.setItem('okl-admin-key', key); load() }
    else setMsg('Invalid admin key')
    setLoading(false)
  }

  async function load() {
    const pending = tab === 'review' ? '&pending=true' : ''
    const res = await fetch(`/api/admin/launchers?limit=100${pending}`, { headers })
    const data = await res.json()
    setLaunchers(data.launchers||[]); setTotal(data.total||0)
  }

  async function doAction(id: string, wallet: string, action: string) {
    const res = await fetch('/api/admin/launchers', { method:'POST', headers, body: JSON.stringify({ launcher_id: id, wallet_address: wallet, action }) })
    const data = await res.json()
    if (!res.ok) { setMsg(`❌ ${data.error}`) }
    else { setMsg(`✅ ${action} done${data.badge_number ? ` — badge #${data.badge_number}` : ''}`); load() }
    setTimeout(() => setMsg(''), 4000)
  }

  async function loadOverview() {
    const res = await fetch(`/api/admin/overview?period=${period}`, { headers })
    const data = await res.json()
    setOverview(data)
  }

  useEffect(() => { const k = localStorage.getItem('okl-admin-key'); if(k) setKey(k) }, [])
  useEffect(() => { if (authed) { if (tab === 'platform') loadOverview(); else load() } }, [tab, authed, period])

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

  const pendingCount = tab === 'review' ? launchers.length : null

  return (
    <main style={{minHeight:'100vh',background:'var(--bg)'}}>
      <div style={{padding:'0 40px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--bg2)',borderBottom:'1px solid var(--border)'}}>
        <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'20px',letterSpacing:'2px',color:'var(--accent)'}}>ONCHAIN<span style={{color:'var(--accent2)'}}>KOL</span> <span style={{fontSize:'12px',color:'var(--muted)',fontFamily:'Barlow Condensed,sans-serif',letterSpacing:'2px'}}>ADMIN</span></span>
        <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
      </div>
      {msg && <div style={{padding:'10px 40px',background:'rgba(0,229,255,0.08)',borderBottom:'1px solid rgba(0,229,255,0.2)',fontFamily:'Barlow Condensed,sans-serif',fontSize:'13px',fontWeight:700,letterSpacing:'1px',color:'var(--accent)'}}>{msg}</div>}
      <div style={{borderBottom:'1px solid var(--border)',padding:'0 40px',background:'var(--bg2)',display:'flex'}}>
        {[{k:'review',l:`KOL Review${pendingCount ? ` (${pendingCount})` : ''}`},{k:'platform',l:'Platform Stats'},{k:'overview',l:'Overview'},{k:'launchers',l:'All Launchers'},{k:'toggles',l:'Platform Toggles'}].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'12px 18px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'Barlow Condensed,sans-serif',fontSize:'13px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:tab===t.k?'var(--accent)':'var(--muted)',borderBottom:`2px solid ${tab===t.k?'var(--accent)':'transparent'}`,marginBottom:'-1px'}}>{t.l}</button>
        ))}
      </div>
      <div style={{maxWidth:'1400px',margin:'0 auto',padding:'32px 40px'}}>

        {tab==='review' && (
          <>
            <p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'16px'}}>
              Wallets that verified Twitter ownership and don't hold a KOL or KOL Crown badge yet — newest first. Open each Twitter profile, check their real follower count, and grant the matching badge.
            </p>
            {launchers.length === 0 ? (
              <div style={{textAlign:'center',padding:'4rem',color:'var(--muted)'}}>
                <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'32px',color:'var(--border)',marginBottom:'8px'}}>NOTHING PENDING</div>
                <p>Everyone who's verified Twitter already holds a KOL-tier badge, or nobody's verified yet.</p>
              </div>
            ) : (
              <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                  <thead>
                    <tr style={{background:'var(--surface)',borderBottom:'1px solid var(--border)'}}>
                      {['Verified','Wallet','Twitter','Reported Followers','Actions'].map(h => (
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {launchers.map(l => (
                      <tr key={l.id} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'10px 14px',color:'var(--muted)',fontSize:'12px'}}>{l.verified_at ? new Date(l.verified_at).toLocaleString() : '—'}</td>
                        <td style={{padding:'10px 14px',fontFamily:'Courier New,monospace',fontSize:'11px',color:'var(--muted)'}}>{truncateWallet(l.wallet_address,5)}</td>
                        <td style={{padding:'10px 14px'}}>
                          {l.twitter_handle ? (
                            <a href={`https://twitter.com/${l.twitter_handle}`} target="_blank" style={{fontFamily:'Barlow Condensed,sans-serif',fontWeight:700,color:'var(--accent)'}}>@{l.twitter_handle} ↗</a>
                          ) : '—'}
                        </td>
                        <td style={{padding:'10px 14px',fontFamily:'Bebas Neue,sans-serif',fontSize:'18px',letterSpacing:'0.5px'}}>
                          {l.follower_count ? l.follower_count.toLocaleString() : <span style={{color:'var(--muted)',fontSize:'12px',fontFamily:'Barlow Condensed,sans-serif'}}>not fetched — check manually</span>}
                        </td>
                        <td style={{padding:'10px 14px'}}>
                          <div style={{display:'flex',gap:'6px'}}>
                            <button onClick={()=>doAction(l.id,l.wallet_address,'set_kol')} style={{padding:'5px 10px',background:'transparent',border:'1px solid rgba(59,130,246,0.3)',borderRadius:'2px',cursor:'pointer',color:'#3b82f6',fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'1px'}}>💙 GRANT KOL</button>
                            <button onClick={()=>doAction(l.id,l.wallet_address,'set_kol_crown')} style={{padding:'5px 10px',background:'transparent',border:'1px solid rgba(236,72,153,0.3)',borderRadius:'2px',cursor:'pointer',color:'#ec4899',fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'1px'}}>👑 GRANT CROWN</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab==='platform' && (
          <>
            {/* Period selector */}
            <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
              {[{k:'hour',l:'Hourly'},{k:'day',l:'Daily'},{k:'week',l:'Weekly'},{k:'month',l:'Monthly'}].map(p => (
                <button key={p.k} onClick={()=>setPeriod(p.k)} style={{padding:'8px 16px',background:period===p.k?'var(--accent)':'var(--bg2)',border:'1px solid var(--border)',borderRadius:'3px',cursor:'pointer',color:period===p.k?'#000':'var(--muted)',fontFamily:'Barlow Condensed,sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}}>{p.l}</button>
              ))}
            </div>

            {!overview ? (
              <div style={{textAlign:'center',padding:'4rem',color:'var(--muted)'}}>Loading...</div>
            ) : (
              <>
                {/* Period-scoped metrics */}
                <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--accent)',marginBottom:'8px'}}>
                  This {period}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'12px'}}>
                  {[
                    ['New Tokens', overview.period_stats.tokens_launched.toLocaleString(), 'var(--accent)'],
                    ['New Users', overview.period_stats.new_users.toLocaleString(), '#3b82f6'],
                    ['Volume', `$${overview.period_stats.volume_usd.toLocaleString(undefined,{maximumFractionDigits:0})}`, 'var(--accent3)'],
                    ['Active Traders', overview.period_stats.active_traders.toLocaleString(), 'var(--green)'],
                  ].map(([label,value,color]) => (
                    <div key={label as string} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'20px 24px'}}>
                      <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'8px'}}>{label}</div>
                      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'28px',letterSpacing:'1px',color:color as string}}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'24px'}}>
                  {[
                    ['Platform Revenue', `$${overview.period_stats.platform_revenue_usd.toLocaleString(undefined,{maximumFractionDigits:2})}`, 'var(--green)'],
                    ['KOL Calls', overview.period_stats.kol_calls.toLocaleString(), '#ec4899'],
                    ['Wallets Badged', overview.period_stats.wallets_badged.toLocaleString(), '#f59e0b'],
                    ['Projects Badged', overview.period_stats.projects_badged.toLocaleString(), '#f59e0b'],
                  ].map(([label,value,color]) => (
                    <div key={label as string} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'20px 24px'}}>
                      <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'8px'}}>{label}</div>
                      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'28px',letterSpacing:'1px',color:color as string}}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* All-time totals */}
                <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'8px'}}>
                  All-Time Totals
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px',marginBottom:'24px'}}>
                  {[
                    ['Total Tokens', overview.all_time.total_tokens.toLocaleString()],
                    ['Graduated', overview.all_time.total_graduated.toLocaleString()],
                    ['Total Users', overview.all_time.total_users.toLocaleString()],
                    ['All-Time Volume', `$${overview.all_time.total_volume_usd.toLocaleString(undefined,{maximumFractionDigits:0})}`],
                    ['Wallets w/ Badges', overview.all_time.total_wallets_with_badges.toLocaleString()],
                    ['Projects w/ Badges', overview.all_time.total_projects_with_badges.toLocaleString()],
                  ].map(([label,value]) => (
                    <div key={label as string} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'14px 16px'}}>
                      <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'6px'}}>{label}</div>
                      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'20px',letterSpacing:'0.5px'}}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'16px 20px',marginBottom:'24px'}}>
                  <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'10px'}}>
                    All-Time Fee Distribution
                  </div>
                  <div style={{display:'flex',gap:'32px',flexWrap:'wrap'}}>
                    {[
                      ['Platform Revenue (0.25%)', overview.all_time.platform_revenue_usd],
                      ['To Creators (0.70%)', overview.all_time.creator_fees_usd],
                      ['To KOL Pool (0.05%)', overview.all_time.kol_pool_fees_usd],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'22px',letterSpacing:'1px'}}>${(value as number).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                        <div style={{fontSize:'11px',color:'var(--muted)'}}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{fontSize:'11px',color:'var(--muted)',marginTop:'10px',lineHeight:1.5}}>
                    ⚠️ Estimated from total volume × the confirmed fee split — not a stored ledger of actual on-chain transfers. For exact figures, the contracts would need to emit fee amounts in their trade events for the webhook to log precisely.
                  </p>
                </div>

                {/* Top traders in period */}
                <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'8px'}}>
                  Top Traders — This {period}
                </div>
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',overflow:'hidden',marginBottom:'24px'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                    <thead>
                      <tr style={{background:'var(--surface)',borderBottom:'1px solid var(--border)'}}>
                        {['#','Wallet','Twitter','Volume','Trades'].map(h => (
                          <th key={h} style={{padding:'10px 14px',textAlign:'left',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.top_traders.length === 0 ? (
                        <tr><td colSpan={5} style={{padding:'30px',textAlign:'center',color:'var(--muted)'}}>No trades in this period.</td></tr>
                      ) : overview.top_traders.map((t: any, i: number) => (
                        <tr key={t.wallet_address} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'8px 14px',color:'var(--muted)'}}>{i+1}</td>
                          <td style={{padding:'8px 14px',fontFamily:'Courier New,monospace',fontSize:'11px',color:'var(--muted)'}}>{truncateWallet(t.wallet_address,5)}</td>
                          <td style={{padding:'8px 14px',fontFamily:'Barlow Condensed,sans-serif',fontWeight:700}}>{t.twitter_handle?`@${t.twitter_handle}`:'—'}</td>
                          <td style={{padding:'8px 14px',fontFamily:'Bebas Neue,sans-serif',fontSize:'16px'}}>${t.volume_usd.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                          <td style={{padding:'8px 14px'}}>{t.trade_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Per-token breakdown */}
                <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'8px'}}>
                  All Tokens
                </div>
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                    <thead>
                      <tr style={{background:'var(--surface)',borderBottom:'1px solid var(--border)'}}>
                        {['Token','Status','Market Cap','24h Volume','Total Volume','Holders','KOL Calls','Creator','Launched'].map(h => (
                          <th key={h} style={{padding:'10px 14px',textAlign:'left',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.tokens.length === 0 ? (
                        <tr><td colSpan={9} style={{padding:'40px',textAlign:'center',color:'var(--muted)'}}>No tokens launched yet.</td></tr>
                      ) : overview.tokens.map((t: any) => (
                        <tr key={t.id} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'10px 14px',fontFamily:'Bebas Neue,sans-serif',fontSize:'16px',letterSpacing:'0.5px'}}>${t.ticker}</td>
                          <td style={{padding:'10px 14px'}}>
                            <span style={{fontSize:'11px',fontWeight:700,color: t.status==='graduated' ? 'var(--green)' : t.status==='bonding' ? 'var(--accent3)' : 'var(--muted)'}}>
                              {t.status?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{padding:'10px 14px'}}>${(t.market_cap_usd||0).toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                          <td style={{padding:'10px 14px'}}>${(t.volume_24h_usd||0).toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                          <td style={{padding:'10px 14px'}}>${(t.volume_total_usd||0).toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                          <td style={{padding:'10px 14px'}}>{(t.holder_count||0).toLocaleString()}</td>
                          <td style={{padding:'10px 14px'}}>{t.kol_call_count||0}</td>
                          <td style={{padding:'10px 14px',fontFamily:'Courier New,monospace',fontSize:'11px',color:'var(--muted)'}}>{truncateWallet(t.creator_wallet||'',4)}</td>
                          <td style={{padding:'10px 14px',color:'var(--muted)',fontSize:'12px'}}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {tab==='overview' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px'}}>
            {[['Total Launchers',total,'var(--accent)'],['Verified Twitter',launchers.filter(l=>l.twitter_handle).length,'#3b82f6'],['Banned',launchers.filter(l=>l.is_banned).length,'var(--accent2)']].map(([label,value,color]) => (
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
                  {['Wallet','Twitter','Badges','Followers','Status','Actions'].map(h => (
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {launchers.map(l => (
                  <tr key={l.id} style={{borderBottom:'1px solid var(--border)',background:l.is_banned?'rgba(255,61,107,0.04)':'transparent'}}>
                    <td style={{padding:'10px 14px',fontFamily:'Courier New,monospace',fontSize:'11px',color:'var(--muted)'}}>{truncateWallet(l.wallet_address,5)}</td>
                    <td style={{padding:'10px 14px',fontFamily:'Barlow Condensed,sans-serif',fontWeight:700}}>{l.twitter_handle?`@${l.twitter_handle}`:'—'}</td>
                    <td style={{padding:'10px 14px'}}>
                      {(l.badges || []).length === 0 ? <span style={{color:'var(--muted)',fontSize:'12px'}}>none</span> : (
                        <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                          {l.badges.map((b:string) => (
                            <span key={b} className={`badge badge-${b}`}>{BADGE_ICONS[b]} {BADGE_LABELS[b]}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{padding:'10px 14px',fontFamily:'Bebas Neue,sans-serif',fontSize:'18px',letterSpacing:'0.5px'}}>{l.follower_count?.toLocaleString()||'0'}</td>
                    <td style={{padding:'10px 14px'}}><span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'12px',fontWeight:700,color:l.is_banned?'var(--accent2)':'var(--green)'}}>{l.is_banned?'BANNED':'ACTIVE'}</span></td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:'4px'}}>
                        {l.is_banned
                          ? <button onClick={()=>doAction(l.id,l.wallet_address,'unban')} style={{padding:'4px 8px',background:'transparent',border:'1px solid rgba(0,229,160,0.3)',borderRadius:'2px',cursor:'pointer',color:'var(--green)',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'1px'}}>UNBAN</button>
                          : <button onClick={()=>doAction(l.id,l.wallet_address,'ban')} style={{padding:'4px 8px',background:'transparent',border:'1px solid rgba(255,61,107,0.3)',borderRadius:'2px',cursor:'pointer',color:'var(--accent2)',fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'1px'}}>BAN</button>
                        }
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
