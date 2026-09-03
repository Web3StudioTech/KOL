'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, BADGE_LABELS, BADGE_ICONS, truncateWallet } from '@/lib/auth'

export default function TokenPage() {
  const { mint } = useParams()
  const { address, connected, launcher } = useAppStore()
  const [token, setToken]     = useState<any>(null)
  const [calls, setCalls]     = useState<any[]>([])
  const [tab, setTab]         = useState<'buy'|'sell'>('buy')
  const [amount, setAmount]   = useState('0.1')
  const [thesis, setThesis]   = useState('')
  const [showCall, setShowCall] = useState(false)
  const [msg, setMsg]         = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mint) return
    fetch(`/api/tokens/${mint}`).then(r=>r.json()).then(d=>setToken(d.token))
    fetch(`/api/calls?token_id=${mint}`).then(r=>r.json()).then(d=>setCalls(d.calls||[]))
  }, [mint])

  async function submitCall() {
    if (!connected || !address || !token) return
    setLoading(true)
    try {
      const res = await fetch('/api/calls', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ wallet_address: address, token_id: token.id, thesis }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg('Call submitted!'); setShowCall(false)
      setCalls(prev => [data.call, ...prev])
    } catch(err:any) { setMsg(err.message) } finally { setLoading(false) }
  }

  if (!token) return <><Nav /><div style={{paddingTop:'64px',display:'flex',alignItems:'center',justifyContent:'center',minHeight:'50vh',color:'var(--muted)'}}>Loading...</div></>

  const isKol = launcher?.badge === 'kol'

  return (
    <>
      <Nav />
      <main style={{paddingTop:'64px'}}>
        {/* Header */}
        <div style={{borderBottom:'1px solid var(--border)',padding:'24px 40px',background:'var(--bg2)',display:'flex',alignItems:'center',gap:'20px',flexWrap:'wrap'}}>
          <div style={{width:56,height:56,borderRadius:'8px',background:token.image_url?`url(${token.image_url}) center/cover`:'var(--surface)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue,sans-serif',fontSize:'16px',color:'var(--accent)',flexShrink:0}}>
            {!token.image_url && token.ticker?.slice(0,3)}
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
              <h1 style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'32px',letterSpacing:'1px'}}>${token.ticker}</h1>
              {token.kol_call_count>0 && <span className="badge badge-hot">🔥 {token.kol_call_count} KOL calls</span>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginTop:'4px',flexWrap:'wrap'}}>
              <span className={`badge badge-${token.launcher_badge||'anon'}`}>{BADGE_ICONS[token.launcher_badge||'anon']} {BADGE_LABELS[token.launcher_badge||'anon']}</span>
              <span style={{fontSize:'13px',color:'var(--muted)'}}>{token.launcher_twitter?`@${token.launcher_twitter}`:truncateWallet(token.launcher_wallet||'0x000')}</span>
              {token.website_url && <a href={token.website_url} target="_blank" style={{fontSize:'12px',color:'var(--accent)',textDecoration:'none'}}>🌐</a>}
              {token.twitter_url && <a href={token.twitter_url} target="_blank" style={{fontSize:'12px',color:'var(--accent)',textDecoration:'none'}}>𝕏</a>}
              {token.telegram_url && <a href={token.telegram_url} target="_blank" style={{fontSize:'12px',color:'var(--accent)',textDecoration:'none'}}>✈️</a>}
            </div>
            {token.contract_address && (
              <div style={{fontSize:'11px',color:'var(--muted)',fontFamily:'Courier New,monospace',marginTop:'4px'}}>
                {token.contract_address.slice(0,-6)}<span style={{color:'var(--accent)',fontWeight:700}}>{token.contract_address.slice(-6)}</span>
              </div>
            )}
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'36px',letterSpacing:'1px'}}>{token.price_eth?.toFixed(9)||'0.000000000'} ETH</div>
            <div style={{fontSize:'14px',color:'var(--green)'}}>{formatMktCap(token.market_cap_usd||0)} market cap</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',maxWidth:'1200px',margin:'0 auto',padding:'24px 40px',gap:'24px',alignItems:'start'}}>
          <div>
            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'16px'}}>
              {[['Market Cap',formatMktCap(token.market_cap_usd||0)],['Volume 24h',formatMktCap(token.volume_24h_usd||0)],['Holders',(token.holder_count||0).toLocaleString()],['KOL Calls',token.kol_call_count||0]].map(([k,v]) => (
                <div key={k} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'12px 14px'}}>
                  <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'10px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:'4px'}}>{k}</div>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'22px',letterSpacing:'1px'}}>{v}</div>
                </div>
              ))}
            </div>
            {/* Bonding curve */}
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'16px 20px',marginBottom:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'var(--muted)'}}>Bonding Curve</span>
                <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'20px',color:'var(--accent)',letterSpacing:'1px'}}>{(token.bonding_pct||0).toFixed(0)}% to KOLSwap</span>
              </div>
              <div className="progress" style={{height:'8px'}}><div className="progress-fill" style={{width:`${token.bonding_pct||0}%`}} /></div>
              <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'8px'}}>Graduates to KOLSwap at $69K market cap. Creator earns 0.15% royalty forever after graduation.</p>
            </div>
            {/* KOL Calls */}
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',padding:'16px 20px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
                <div className="section-tag" style={{marginBottom:0}}>KOL Calls</div>
                {isKol && <button className="btn btn-primary btn-sm" onClick={()=>setShowCall(!showCall)}>+ Call This Token</button>}
              </div>
              {showCall && (
                <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'3px',padding:'14px',marginBottom:'14px'}}>
                  <label>Your thesis (why will it pump?)</label>
                  <textarea className="input" style={{minHeight:'60px',marginBottom:'10px'}} placeholder="Write your thesis..." value={thesis} onChange={e=>setThesis(e.target.value)} />
                  <button className="btn btn-primary btn-sm" onClick={submitCall} disabled={loading}>{loading?'Submitting...':'📢 Submit Call'}</button>
                </div>
              )}
              {msg && <div style={{padding:'8px 12px',background:'rgba(0,229,255,0.1)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'3px',color:'var(--accent)',fontSize:'13px',marginBottom:'12px'}}>{msg}</div>}
              {calls.length === 0 ? (
                <p style={{color:'var(--muted)',fontSize:'14px',textAlign:'center',padding:'20px'}}>No KOL calls yet. KOLs with 5,000+ followers can call this token.</p>
              ) : calls.map((call:any) => (
                <div key={call.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'3px',marginBottom:'6px'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
                      <span className="badge badge-kol">💙 @{call.launchers?.twitter_handle||'anon'}</span>
                      <span style={{fontSize:'11px',color:'var(--muted)'}}>called at {formatMktCap(call.mktcap_at_call||0)}</span>
                    </div>
                    {call.thesis && <p style={{fontSize:'13px',color:'var(--muted)'}}>{call.thesis}</p>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'18px',letterSpacing:'1px',color:call.accuracy_status==='hit'?'var(--green)':call.accuracy_status==='miss'?'var(--red)':'var(--muted)'}}>
                      {call.accuracy_status==='hit'?'✓ HIT':call.accuracy_status==='partial'?'~ PARTIAL':call.accuracy_status==='miss'?'✗ MISS':'⏳ PENDING'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade widget */}
          <div style={{position:'sticky',top:'80px'}}>
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'4px',overflow:'hidden'}}>
              <div style={{display:'flex'}}>
                {(['buy','sell'] as const).map(t => (
                  <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'14px',background:tab===t?(t==='buy'?'var(--green)':'var(--red)'):'var(--bg3)',color:tab===t?'#000':'var(--muted)',border:'none',cursor:'pointer',fontFamily:'Bebas Neue,sans-serif',fontSize:'18px',letterSpacing:'2px',transition:'all 0.2s'}}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
              <div style={{padding:'16px'}}>
                <label>Amount ({tab==='buy'?'ETH':token.ticker})</label>
                <input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.0" style={{marginBottom:'10px'}} />
                <div style={{display:'flex',gap:'4px',marginBottom:'14px'}}>
                  {['0.01','0.05','0.1','0.5'].map(q => (
                    <button key={q} onClick={()=>setAmount(q)} style={{flex:1,padding:'6px',fontFamily:'Barlow Condensed,sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'1px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'2px',cursor:'pointer',color:'var(--muted)',transition:'all 0.15s'}}>
                      {q}
                    </button>
                  ))}
                </div>
                {connected ? (
                  <button style={{width:'100%',padding:'14px',background:tab==='buy'?'var(--green)':'var(--red)',color:'#000',border:'none',cursor:'pointer',fontFamily:'Bebas Neue,sans-serif',fontSize:'20px',letterSpacing:'2px',borderRadius:'2px'}}>
                    {tab==='buy'?`Buy $${token.ticker}`:`Sell $${token.ticker}`}
                  </button>
                ) : (
                  <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontFamily:'Bebas Neue,sans-serif',fontSize:'18px',letterSpacing:'2px'}}>Connect Wallet</button>
                )}
                <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                    <span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)'}}>Bonding Curve</span>
                    <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:'16px',color:'var(--accent)',letterSpacing:'1px'}}>{(token.bonding_pct||0).toFixed(0)}%</span>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{width:`${token.bonding_pct||0}%`}} /></div>
                  <p style={{fontSize:'11px',color:'var(--muted)',marginTop:'6px',textAlign:'center'}}>Graduates to KOLSwap at $69K</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
