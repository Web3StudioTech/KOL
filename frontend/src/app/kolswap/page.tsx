'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, truncateWallet } from '@/lib/auth'
import BadgeImage from '@/components/ui/BadgeImage'

export default function KOLSwapPage() {
  const { address, connected } = useAppStore()
  const [pools, setPools]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState('volume')

  useEffect(() => {
    fetch('/api/tokens?sort=grad&limit=20')
      .then(r => r.json())
      .then(d => { setPools(d.tokens || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sort])

  const filtered = pools.filter(p =>
    p.ticker?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Nav />
      <main style={{ paddingTop:'64px' }}>

        {/* Hero */}
        <div style={{ padding:'60px 40px 40px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%,black,transparent)', pointerEvents:'none' }} />
          <div style={{ maxWidth:'1200px', margin:'0 auto', position:'relative', zIndex:1 }}>
            <div className="section-tag">KOLSwap</div>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(40px,7vw,80px)', lineHeight:1, marginBottom:'12px' }}>
              GRADUATED <span style={{ color:'var(--accent)' }}>TOKENS.</span>
            </h1>
            <p style={{ color:'var(--muted)', fontSize:'16px', maxWidth:'560px', lineHeight:1.6, marginBottom:'24px' }}>
              Tokens that reached $69K market cap graduate to KOLSwap — our native AMM DEX. Creators continue earning 0.70% royalty on every trade forever.
            </p>

            {/* Stats */}
            <div style={{ display:'flex', gap:'40px', flexWrap:'wrap' }}>
              {[
                ['Graduated Tokens', pools.length.toString()],
                ['Total Liquidity',  formatMktCap(pools.reduce((s,p) => s + (p.market_cap_usd||0), 0))],
                ['24h Volume',       formatMktCap(pools.reduce((s,p) => s + (p.volume_24h_usd||0), 0))],
                ['Creator Earnings', '0.70% per trade'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', color:'var(--accent)', letterSpacing:'1px' }}>{value}</div>
                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)', marginTop:'2px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How KOLSwap works */}
        <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'24px 40px' }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'2px', background:'var(--border)', borderRadius:'4px', overflow:'hidden' }}>
            {[
              { icon:'⚡', title:'Automatic Graduation', desc:'When a token hits $69K market cap on the bonding curve it automatically moves to KOLSwap. No manual action needed.' },
              { icon:'💰', title:'Creator Earns Forever', desc:'Creators keep earning 0.70% of every trade even after graduation. The royalty never stops — it is hardcoded in the contract.' },
              { icon:'📊', title:'x*y=k AMM', desc:'KOLSwap uses the constant product formula — the same model as Uniswap. Deep liquidity, minimal slippage, fair pricing.' },
            ].map(s => (
              <div key={s.title} style={{ background:'var(--bg2)', padding:'20px 24px', display:'flex', gap:'14px', alignItems:'flex-start' }}>
                <span style={{ fontSize:'24px', flexShrink:0 }}>{s.icon}</span>
                <div>
                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:'6px' }}>{s.title}</div>
                  <p style={{ fontSize:'13px', color:'var(--muted)', lineHeight:1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pool list */}
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'32px 40px' }}>
          {/* Search + sort */}
          <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
            <input
              className="input"
              placeholder="Search graduated tokens..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex:1, minWidth:'200px' }}
            />
            <div style={{ display:'flex', gap:'6px' }}>
              {[
                { key:'volume', label:'📊 Volume' },
                { key:'new',    label:'🆕 Newest' },
                { key:'mcap',   label:'💎 Market Cap' },
              ].map(s => (
                <button key={s.key} className={`btn btn-sm ${sort===s.key?'btn-primary':'btn-secondary'}`} onClick={() => setSort(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 100px', gap:'12px', padding:'8px 16px', marginBottom:'4px' }}>
            {['Token','Price','Market Cap','24h Volume','KOL Calls','Trade'].map(h => (
              <div key={h} style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {[...Array(5)].map((_,i) => (
                <div key={i} style={{ height:'64px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', opacity:0.4 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'6rem 2rem', color:'var(--muted)' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'48px', color:'var(--border)', marginBottom:'16px' }}>
                {search ? 'NO RESULTS' : 'NO GRADUATED TOKENS YET'}
              </div>
              <p style={{ marginBottom:'24px' }}>
                {search ? `No tokens matching "${search}"` : 'Tokens graduate to KOLSwap when they hit $69K market cap.'}
              </p>
              {!search && <Link href="/" className="btn btn-primary">Browse Bonding Curve Tokens</Link>}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {filtered.map((pool: any, i) => (
                <div key={pool.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 100px', gap:'12px', padding:'14px 16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', alignItems:'center', transition:'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>

                  {/* Token info */}
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:36, height:36, borderRadius:'6px', background: pool.image_url ? `url(${pool.image_url}) center/cover` : 'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'11px', color:'var(--accent)', flexShrink:0 }}>
                      {!pool.image_url && pool.ticker?.slice(0,3)}
                    </div>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'1px' }}>${pool.ticker}</span>
                        <span style={{ padding:'2px 6px', borderRadius:'2px', fontFamily:'Barlow Condensed,sans-serif', fontSize:'9px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', background:'rgba(255,215,0,0.12)', color:'var(--accent3)', border:'1px solid rgba(255,215,0,0.2)' }}>⚡ KOLSWAP</span>
                      </div>
                      <div style={{ fontSize:'11px', color:'var(--muted)' }}>{pool.name}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700 }}>{pool.price_eth?.toFixed(8) || '0.00000000'} ETH</div>
                  </div>

                  {/* Market Cap */}
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'0.5px' }}>
                    {formatMktCap(pool.market_cap_usd || 0)}
                  </div>

                  {/* 24h Volume */}
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'0.5px', color:'var(--accent)' }}>
                    {formatMktCap(pool.volume_24h_usd || 0)}
                  </div>

                  {/* KOL Calls */}
                  <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    {pool.kol_call_count > 0 && <span style={{ color:'var(--accent2)', fontSize:'12px' }}>🔥</span>}
                    <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'0.5px' }}>{pool.kol_call_count || 0}</span>
                  </div>

                  {/* Trade button */}
                  <Link href={`/token/${pool.id}`} className="btn btn-primary btn-sm" style={{ justifyContent:'center', fontSize:'12px' }}>
                    Trade
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee breakdown footer */}
        <div style={{ background:'var(--bg2)', borderTop:'1px solid var(--border)', padding:'32px 40px' }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
            <div className="section-tag" style={{ marginBottom:'16px' }}>KOLSwap Fee Structure</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
              {[
                { pct:'0.70%', label:'Creator Royalty', desc:'Goes to token creator wallet forever', color:'var(--green)' },
                { pct:'0.25%', label:'Platform Fee',    desc:'Goes to OnchainKOL platform wallet', color:'var(--accent)' },
                { pct:'0.05%', label:'KOL Pool',        desc:'Distributed to KOLs for accurate calls', color:'var(--accent4)' },
                { pct:'1.00%', label:'Total Fee',       desc:'Per trade — competitive and fair', color:'var(--accent3)' },
              ].map(f => (
                <div key={f.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'4px', padding:'16px 20px' }}>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'36px', color:f.color, letterSpacing:'1px', marginBottom:'4px' }}>{f.pct}</div>
                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:'6px' }}>{f.label}</div>
                  <p style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.5 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
