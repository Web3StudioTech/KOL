'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import { formatMktCap, BADGE_LABELS, BADGE_ICONS, truncateWallet } from '@/lib/auth'

const STATS = [
  { label:'24H Volume', value:'$8.4M', sub:'+31% today' },
  { label:'Tokens Today', value:'1,240', sub:'88 last hour' },
  { label:'KOL Calls', value:'342', sub:'67% of volume' },
  { label:'Fees Earned', value:'$84K', sub:'today' },
]
const FEED = [
  'CryptoKing called $PEPE2 · 2m ago',
  '$MOON launched · 5m ago',
  'SolBull called $WAGMI · 11m ago',
  '$REKT launched anonymously · 14m ago',
  'AlphaWolf called $DEGEN · 22m ago',
]
const SORTS = [
  { key:'trending', label:'🔥 Trending' },
  { key:'new',      label:'🆕 New' },
  { key:'kol',      label:'📢 KOL Called' },
  { key:'grad',     label:'⚡ Graduating' },
]

export default function HomePage() {
  const [sort, setSort]       = useState('trending')
  const [feed, setFeed]       = useState(FEED)
  const [tokens, setTokens]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tokens?sort=${sort}`)
      .then(r => r.json())
      .then(d => { setTokens(d.tokens || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sort])

  useEffect(() => {
    const t = setInterval(() => {
      const items = ['$MOON launched just now','NiquiTrades called $PEPE · just now','$DEGEN launched anonymously · just now']
      setFeed(p => [items[Math.floor(Math.random()*items.length)], ...p.slice(0,5)])
    }, 7000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <Nav />
      <main>
        {/* HERO */}
        <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', overflow:'hidden', padding:'120px 24px 80px' }}>
          <div className="hero-grid" />
          <div style={{ position:'absolute', width:'600px', height:'600px', borderRadius:'50%', filter:'blur(80px)', top:'-100px', left:'50%', transform:'translateX(-50%)', background:'radial-gradient(circle,rgba(0,229,255,0.12),transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:'400px', height:'400px', borderRadius:'50%', filter:'blur(80px)', bottom:0, right:'-100px', background:'radial-gradient(circle,rgba(255,61,107,0.1),transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 16px', border:'1px solid var(--border)', borderRadius:'100px', fontSize:'12px', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'var(--accent)', marginBottom:'32px', background:'rgba(0,229,255,0.05)', animation:'fadeUp 0.8s ease both', fontFamily:'Barlow Condensed,sans-serif' }}>
              <span className="live-dot live-dot-cyan" /> Now Live on Robinhood Chain
            </div>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(64px,12vw,140px)', lineHeight:0.9, letterSpacing:'2px', animation:'fadeUp 0.8s 0.1s ease both', marginBottom:'8px' }}>
              <span style={{ display:'block', color:'var(--text)' }}>LAUNCH WITH</span>
              <span style={{ display:'block', color:'var(--accent)' }}>YOUR KOLS.</span>
              <span style={{ display:'block', WebkitTextStroke:'2px var(--accent2)', color:'transparent' }}>EARN TOGETHER.</span>
            </h1>
            <p style={{ fontSize:'clamp(16px,2.5vw,20px)', color:'var(--muted)', maxWidth:'600px', margin:'24px auto 16px', fontWeight:300, lineHeight:1.6, animation:'fadeUp 0.8s 0.2s ease both' }}>
              The first KOL-powered token launchpad on Robinhood Chain. <strong style={{color:'var(--text)'}}>Anyone launches.</strong> <strong style={{color:'var(--text)'}}>KOLs discover.</strong> Creator royalties forever. Every token address ends in <strong style={{color:'var(--accent)'}}>...kol</strong>.
            </p>
            <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap', animation:'fadeUp 0.8s 0.3s ease both', marginBottom:'64px' }}>
              <Link href="/launch" className="btn btn-primary btn-lg">⚡ Launch a Token</Link>
              <Link href="/kol" className="btn btn-secondary btn-lg">👑 KOL Zone</Link>
            </div>
            <div style={{ display:'flex', gap:'48px', justifyContent:'center', flexWrap:'wrap', animation:'fadeUp 0.8s 0.4s ease both' }}>
              {STATS.map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div className="stat-num">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                  <div style={{ fontSize:'11px', color:'var(--accent)', fontFamily:'Barlow Condensed,sans-serif', fontWeight:600, letterSpacing:'1px', marginTop:'2px' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LIVE FEED */}
        <div style={{ background:'var(--bg2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'10px 40px', display:'flex', alignItems:'center', gap:'16px', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
            <span className="live-dot" />
            <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--accent2)' }}>Live</span>
          </div>
          <div style={{ display:'flex', gap:'32px', overflow:'hidden' }}>
            {feed.map((item, i) => (
              <span key={i} style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', letterSpacing:'0.5px', color:'var(--muted)', whiteSpace:'nowrap' }}>{item}</span>
            ))}
          </div>
        </div>

        {/* TOKEN EXPLORER */}
        <section style={{ padding:'60px 40px', maxWidth:'1200px', margin:'0 auto' }}>
          <div style={{ marginBottom:'32px' }}>
            <div className="section-tag">Token Explorer</div>
            <h2 style={{ fontSize:'clamp(32px,5vw,56px)', lineHeight:1 }}>All Tokens</h2>
          </div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'24px' }}>
            {SORTS.map(s => (
              <button key={s.key} className={`btn btn-sm ${sort === s.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSort(s.key)}>{s.label}</button>
            ))}
          </div>
          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'12px' }}>
              {[...Array(6)].map((_,i) => <div key={i} style={{ height:'280px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', opacity:0.4 }} />)}
            </div>
          ) : tokens.length === 0 ? (
            <div style={{ textAlign:'center', padding:'6rem 2rem', color:'var(--muted)' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'48px', color:'var(--border)', marginBottom:'16px' }}>NO TOKENS YET</div>
              <p style={{ marginBottom:'24px' }}>Be the first to launch on Robinhood Chain.</p>
              <Link href="/launch" className="btn btn-primary">⚡ Launch First Token</Link>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'12px' }}>
              {tokens.map((t: any) => <TokenCard key={t.id} token={t} />)}
            </div>
          )}
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding:'100px 40px', background:'var(--bg2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'72px' }}>
              <div className="section-tag">How It Works</div>
              <h2 style={{ fontSize:'clamp(36px,6vw,72px)', lineHeight:1 }}>Simple. Fair. <span style={{color:'var(--accent)'}}>Onchain.</span></h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'2px', background:'var(--border)' }}>
              {[
                { num:'01', icon:'🚀', color:'cyan', title:'Anyone Launches', desc:'Pay 0.02 ETH. Deploy in 30 seconds. No approval needed. Fair launch only — no pre-sales, no dev allocation. Every token address ends in ...kol.' },
                { num:'02', icon:'👑', color:'red',  title:'KOLs Discover', desc:'Verified KOLs (5,000+ followers) browse new launches. They call tokens they believe in — recorded permanently onchain with exact price and timestamp.' },
                { num:'03', icon:'💰', color:'purple', title:'Everyone Earns', desc:'Creators earn 0.15% royalty forever. KOLs earn from the reward pool for accurate calls. Traders earn by buying early. Platform earns 0.70%.' },
              ].map(s => (
                <div key={s.num} style={{ background:'var(--bg2)', padding:'48px 40px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:'16px', right:'24px', fontFamily:'Bebas Neue,sans-serif', fontSize:'80px', lineHeight:1, color:'var(--border)', letterSpacing:'2px' }}>{s.num}</div>
                  <div style={{ width:'52px', height:'52px', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', marginBottom:'24px', background: s.color==='cyan' ? 'rgba(0,229,255,0.1)' : s.color==='red' ? 'rgba(255,61,107,0.1)' : 'rgba(168,85,247,0.1)', border:`1px solid ${s.color==='cyan' ? 'rgba(0,229,255,0.2)' : s.color==='red' ? 'rgba(255,61,107,0.2)' : 'rgba(168,85,247,0.2)'}` }}>{s.icon}</div>
                  <h3 style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'24px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px' }}>{s.title}</h3>
                  <p style={{ fontSize:'15px', color:'var(--muted)', lineHeight:1.7 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding:'40px', borderTop:'1px solid var(--border)', background:'var(--bg2)' }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px' }}>
            <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'3px', color:'var(--accent)' }}>ONCHAIN<span style={{color:'var(--accent2)'}}>KOL</span></span>
            <div style={{ display:'flex', gap:'24px' }}>
              {['Twitter','Telegram','Discord','Docs'].map(l => (
                <a key={l} href="#" style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', textDecoration:'none' }}>{l}</a>
              ))}
            </div>
            <span style={{ fontSize:'12px', color:'var(--muted)' }}>© 2025 OnchainKOL · Robinhood Chain</span>
          </div>
        </footer>
      </main>
    </>
  )
}

function TokenCard({ token }: { token: any }) {
  return (
    <Link href={`/token/${token.id}`} className="token-card">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:44, height:44, borderRadius:'6px', background: token.image_url ? `url(${token.image_url}) center/cover` : 'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'13px', color:'var(--accent)', flexShrink:0 }}>
            {!token.image_url && token.ticker?.slice(0,3)}
          </div>
          <div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'1px', lineHeight:1 }}>${token.ticker}</div>
            <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'2px' }}>{token.name}</div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px', alignItems:'flex-end' }}>
          {token.kol_call_count > 0 && <span className="badge badge-hot">🔥 {token.kol_call_count} call{token.kol_call_count>1?'s':''}</span>}
          {token.bonding_pct > 85 && <span className="badge badge-grad">⚡ Graduating</span>}
          {(Date.now()-new Date(token.created_at).getTime()) < 3600000 && <span className="badge badge-new">New</span>}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
        {[['Mkt Cap',formatMktCap(token.market_cap_usd)],['Volume 24h',formatMktCap(token.volume_24h_usd)],['Holders',(token.holder_count||0).toLocaleString()],['Calls',token.kol_call_count||0]].map(([k,v]) => (
          <div key={k} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', padding:'6px 10px' }}>
            <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', marginBottom:'2px' }}>{k}</div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', letterSpacing:'0.5px' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom:'10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
          <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)' }}>Bonding Curve</span>
          <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'14px', color:'var(--accent)', letterSpacing:'1px' }}>{(token.bonding_pct||0).toFixed(0)}%</span>
        </div>
        <div className="progress"><div className="progress-fill" style={{ width:`${token.bonding_pct||0}%` }} /></div>
      </div>
      {token.contract_address && (
        <div style={{ fontSize:'10px', color:'var(--muted)', fontFamily:'Courier New,monospace', marginBottom:'8px' }}>
          {token.contract_address.slice(0,-6)}<span style={{color:'var(--accent)',fontWeight:700}}>{token.contract_address.slice(-6)}</span>
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:'6px', paddingTop:'8px', borderTop:'1px solid var(--border)' }}>
        <span className={`badge badge-${token.launcher_badge||'anon'}`}>{BADGE_ICONS[token.launcher_badge||'anon']} {BADGE_LABELS[token.launcher_badge||'anon']}</span>
        <span style={{ fontSize:'11px', color:'var(--muted)' }}>
          {token.launcher_twitter ? `@${token.launcher_twitter}` : truncateWallet(token.launcher_wallet||'0x0000')}
        </span>
      </div>
    </Link>
  )
}
