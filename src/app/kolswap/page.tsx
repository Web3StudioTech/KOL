'use client'
import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap } from '@/lib/auth'
import { useTrade, switchToRobinhoodChain, getEthPriceUsd } from '@/lib/web3'

const SLIPPAGE = 5
const QUICK_AMOUNTS = ['0.01', '0.05', '0.1', '0.5']

export default function KOLSwapPage() {
  const { address, connected } = useAppStore()
  const [pools, setPools]           = useState<any[]>([])
  const [selectedToken, setSelected]= useState<any>(null)
  const [tab, setTab]               = useState<'buy'|'sell'>('buy')
  const [amount, setAmount]         = useState('0.1')
  const [quote, setQuote]           = useState('')
  const [quoting, setQuoting]       = useState(false)
  const [ethPrice, setEthPrice]     = useState(3000)
  const [txMsg, setTxMsg]           = useState('')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)

  const isGraduated = true // KOLSwap only shows graduated tokens
  const tokenAddr   = selectedToken?.contract_address || ''

  const { buy, sell, loading: tradeLoading, txHash, error: tradeError, getQuote } = useTrade(tokenAddr, isGraduated)

  useEffect(() => {
    fetch('/api/tokens?sort=grad&limit=50')
      .then(r => r.json())
      .then(d => { setPools(d.tokens || []); setLoading(false) })
      .catch(() => setLoading(false))
    getEthPriceUsd().then(setEthPrice)
  }, [])

  // Auto-select first token
  useEffect(() => {
    if (pools.length > 0 && !selectedToken) setSelected(pools[0])
  }, [pools])

  // Get quote when amount or token changes
  useEffect(() => {
    if (!tokenAddr || !amount || parseFloat(amount) <= 0) { setQuote(''); return }
    setQuoting(true)
    const timer = setTimeout(async () => {
      try {
        const q = await getQuote(amount, tab === 'buy')
        if (tab === 'buy') {
          setQuote(`≈ ${parseFloat(ethers.formatUnits(q, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} $${selectedToken?.ticker}`)
        } else {
          setQuote(`≈ ${parseFloat(ethers.formatEther(q)).toFixed(6)} ETH`)
        }
      } catch { setQuote('') }
      finally { setQuoting(false) }
    }, 600)
    return () => clearTimeout(timer)
  }, [amount, tab, tokenAddr])

  async function handleSwap() {
    setTxMsg('')
    try {
      await switchToRobinhoodChain()
      if (tab === 'buy') {
        const hash = await buy(amount, SLIPPAGE)
        setTxMsg(`✅ Swap complete! Tx: ${hash?.slice(0,10)}...`)
      } else {
        const hash = await sell(amount, SLIPPAGE)
        setTxMsg(`✅ Swap complete! Tx: ${hash?.slice(0,10)}...`)
      }
    } catch (err: any) {
      setTxMsg(`❌ ${err.message || 'Swap failed'}`)
    }
  }

  const filtered = pools.filter(p =>
    p.ticker?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Nav />
      <main style={{ paddingTop:'64px' }}>
        {/* Hero */}
        <div style={{ padding:'40px 40px 24px', borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
          <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
            <div className="section-tag">KOLSwap</div>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(36px,6vw,64px)', lineHeight:1, marginBottom:'8px' }}>
              SWAP <span style={{ color:'var(--accent)' }}>GRADUATED</span> TOKENS
            </h1>
            <p style={{ color:'var(--muted)', fontSize:'14px' }}>
              Tokens that reached graduation threshold trade here. Creator earns 0.70% royalty on every swap forever.
            </p>
          </div>
        </div>

        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'24px 40px', display:'grid', gridTemplateColumns:'320px 1fr', gap:'24px', alignItems:'start' }}>

          {/* LEFT — Token list */}
          <div>
            <input
              className="input"
              placeholder="Search graduated tokens..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom:'10px' }}
            />

            <div style={{ display:'flex', flexDirection:'column', gap:'4px', maxHeight:'70vh', overflowY:'auto' }}>
              {loading ? (
                [...Array(5)].map((_,i) => (
                  <div key={i} style={{ height:'60px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', opacity:0.4 }} />
                ))
              ) : filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'2rem', color:'var(--muted)' }}>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', color:'var(--border)', marginBottom:'8px' }}>
                    {search ? 'NO RESULTS' : 'NO GRADUATED TOKENS'}
                  </div>
                  <p style={{ fontSize:'13px' }}>
                    {search ? `No tokens matching "${search}"` : 'Tokens appear here after reaching graduation threshold.'}
                  </p>
                </div>
              ) : filtered.map(token => (
                <div
                  key={token.id}
                  onClick={() => { setSelected(token); setAmount('0.1'); setQuote(''); setTxMsg('') }}
                  style={{
                    display:'flex', alignItems:'center', gap:'10px',
                    padding:'10px 12px',
                    background: selectedToken?.id === token.id ? 'rgba(0,229,255,0.08)' : 'var(--bg2)',
                    border:`1px solid ${selectedToken?.id === token.id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius:'4px', cursor:'pointer', transition:'all 0.15s',
                  }}
                >
                  <div style={{ width:36, height:36, borderRadius:'6px', background: token.image_url ? `url(${token.image_url}) center/cover` : 'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'11px', color:'var(--accent)', flexShrink:0 }}>
                    {!token.image_url && token.ticker?.slice(0,3)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', letterSpacing:'1px' }}>${token.ticker}</div>
                    <div style={{ fontSize:'11px', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{token.name}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'14px', letterSpacing:'0.5px' }}>{formatMktCap(token.market_cap_usd || 0)}</div>
                    <div style={{ fontSize:'10px', color:'var(--muted)' }}>mkt cap</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Swap interface */}
          <div>
            {!selectedToken ? (
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'3rem', textAlign:'center', color:'var(--muted)' }}>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'32px', color:'var(--border)', marginBottom:'8px' }}>SELECT A TOKEN</div>
                <p>Choose a graduated token from the list to start swapping.</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'16px', alignItems:'start' }}>

                {/* Token info */}
                <div>
                  <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'16px 20px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'14px' }}>
                    <div style={{ width:48, height:48, borderRadius:'8px', background: selectedToken.image_url ? `url(${selectedToken.image_url}) center/cover` : 'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'14px', color:'var(--accent)', flexShrink:0 }}>
                      {!selectedToken.image_url && selectedToken.ticker?.slice(0,3)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', letterSpacing:'1px' }}>${selectedToken.ticker}</div>
                      <div style={{ fontSize:'12px', color:'var(--muted)' }}>{selectedToken.name}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'1px' }}>{selectedToken.price_eth?.toFixed(9) || '0.000000000'} ETH</div>
                      <div style={{ fontSize:'12px', color:'var(--green)' }}>{formatMktCap(selectedToken.market_cap_usd || 0)} mkt cap</div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'12px' }}>
                    {[
                      ['24h Volume', formatMktCap(selectedToken.volume_24h_usd || 0)],
                      ['KOL Calls',  selectedToken.kol_call_count || 0],
                      ['Holders',    (selectedToken.holder_count || 0).toLocaleString()],
                    ].map(([k,v]) => (
                      <div key={k} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'10px 14px' }}>
                        <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', marginBottom:'4px' }}>{k}</div>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'0.5px' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Fee breakdown */}
                  <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'14px 16px' }}>
                    <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)', marginBottom:'10px' }}>Fee Breakdown (1% total)</div>
                    {[
                      ['Creator Royalty', '0.70%', 'var(--green)'],
                      ['Platform Fee',    '0.25%', 'var(--accent)'],
                      ['KOL Pool',        '0.05%', 'var(--accent4)'],
                    ].map(([k,v,c]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'4px 0', borderBottom:'1px solid rgba(30,45,61,0.5)' }}>
                        <span style={{ color:'var(--muted)' }}>{k}</span>
                        <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, color:c as string }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Swap widget */}
                <div style={{ position:'sticky', top:'80px' }}>
                  <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden' }}>

                    {/* Tabs */}
                    <div style={{ display:'flex' }}>
                      {(['buy','sell'] as const).map(t => (
                        <button key={t} onClick={() => { setTab(t); setQuote('') }} style={{
                          flex:1, padding:'14px',
                          background: tab===t ? (t==='buy'?'var(--green)':'var(--red)') : 'var(--bg3)',
                          color: tab===t ? '#000' : 'var(--muted)',
                          border:'none', cursor:'pointer',
                          fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'2px',
                          transition:'all 0.2s',
                        }}>{t.toUpperCase()}</button>
                      ))}
                    </div>

                    <div style={{ padding:'16px' }}>
                      {/* You pay */}
                      <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'4px', padding:'14px', marginBottom:'4px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                          <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)' }}>You Pay</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.0"
                            style={{ flex:1, fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', background:'transparent', border:'none', outline:'none', color:'var(--text)', letterSpacing:'1px' }}
                          />
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'3px', padding:'6px 10px', flexShrink:0 }}>
                            {tab === 'buy' ? (
                              <>
                                <div style={{ width:18, height:18, borderRadius:'50%', background:'#627EEA', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  <span style={{ fontSize:'9px', color:'#fff', fontWeight:700 }}>E</span>
                                </div>
                                <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700 }}>ETH</span>
                              </>
                            ) : (
                              <>
                                <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--accent)', opacity:0.8 }} />
                                <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700, color:'var(--accent)' }}>${selectedToken.ticker}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Quick amounts */}
                        {tab === 'buy' && (
                          <div style={{ display:'flex', gap:'4px', marginTop:'8px' }}>
                            {QUICK_AMOUNTS.map(q => (
                              <button key={q} onClick={() => setAmount(q)} style={{ flex:1, padding:'4px', fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'2px', cursor:'pointer', color:'var(--muted)' }}>
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Swap arrow */}
                      <div style={{ display:'flex', justifyContent:'center', margin:'-2px 0', position:'relative', zIndex:1 }}>
                        <button
                          onClick={() => { setTab(tab === 'buy' ? 'sell' : 'buy'); setQuote('') }}
                          style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg2)', border:`3px solid var(--bg)`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'var(--muted)' }}
                        >
                          ⇅
                        </button>
                      </div>

                      {/* You receive */}
                      <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'4px', padding:'14px', marginBottom:'12px' }}>
                        <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)', marginBottom:'8px' }}>You Receive</div>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', justifyContent:'space-between' }}>
                          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'22px', letterSpacing:'1px', color: quoting ? 'var(--muted)' : 'var(--text)' }}>
                            {quoting ? '...' : quote || '—'}
                          </div>
                          <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, color: tab === 'buy' ? 'var(--accent)' : 'var(--muted)' }}>
                            {tab === 'buy' ? `$${selectedToken.ticker}` : 'ETH'}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      {quote && (
                        <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', padding:'10px 12px', marginBottom:'12px', fontSize:'12px' }}>
                          {[
                            ['Slippage',        `${SLIPPAGE}%`],
                            ['Platform fee',    '1% (0.70% → creator)'],
                            ['Price impact',    '< 1%'],
                          ].map(([k,v]) => (
                            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', color:'var(--muted)' }}>
                              <span>{k}</span>
                              <span style={{ color:'var(--text)' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Error */}
                      {tradeError && (
                        <div style={{ padding:'8px 12px', background:'rgba(255,61,107,0.1)', border:'1px solid rgba(255,61,107,0.2)', borderRadius:'3px', color:'var(--accent2)', fontSize:'12px', marginBottom:'10px' }}>
                          {tradeError}
                        </div>
                      )}

                      {/* Tx message */}
                      {txMsg && (
                        <div style={{ padding:'8px 12px', background: txMsg.startsWith('✅') ? 'rgba(0,229,160,0.1)' : 'rgba(255,61,107,0.1)', border:`1px solid ${txMsg.startsWith('✅') ? 'rgba(0,229,160,0.2)' : 'rgba(255,61,107,0.2)'}`, borderRadius:'3px', color: txMsg.startsWith('✅') ? 'var(--green)' : 'var(--accent2)', fontSize:'12px', marginBottom:'10px' }}>
                          {txMsg}
                        </div>
                      )}

                      {/* Swap button */}
                      {connected ? (
                        <button
                          onClick={handleSwap}
                          disabled={tradeLoading || !amount || parseFloat(amount) <= 0 || !tokenAddr}
                          style={{ width:'100%', padding:'14px', background: tab==='buy'?'var(--green)':'var(--red)', color:'#000', border:'none', cursor:'pointer', fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'2px', borderRadius:'2px', opacity: tradeLoading ? 0.7 : 1 }}
                        >
                          {tradeLoading ? '⏳ Swapping...' : `Swap ${tab==='buy'?'ETH → $'+selectedToken.ticker:'$'+selectedToken.ticker+' → ETH'}`}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ width:'100%', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'2px' }}
                          onClick={async () => {
                            await switchToRobinhoodChain()
                            const eth = (window as any).ethereum
                            if (eth) {
                              const accounts = await eth.request({ method: 'eth_requestAccounts' })
                              if (accounts[0]) useAppStore.getState().setAddress(accounts[0], 'metamask')
                            }
                          }}
                        >
                          Connect Wallet
                        </button>
                      )}

                      {/* Explorer link */}
                      {txHash && (
                        <div style={{ textAlign:'center', marginTop:'10px' }}>
                          <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txHash}`} target="_blank" style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', color:'var(--accent)', textDecoration:'none' }}>
                            View on Robinhood Chain Explorer ↗
                          </a>
                        </div>
                      )}

                      <p style={{ fontSize:'10px', color:'var(--muted)', textAlign:'center', marginTop:'10px', lineHeight:1.5, fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'0.5px' }}>
                        POWERED BY KOLSWAP · ROBINHOOD CHAIN · LP LOCKED FOREVER
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
