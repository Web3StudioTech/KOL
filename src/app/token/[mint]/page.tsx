'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ethers } from 'ethers'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, BADGE_LABELS, BADGE_ICONS, truncateWallet } from '@/lib/auth'
import { useTrade, useKolCall, useTokenBalance, switchToRobinhoodChain, getEthPriceUsd } from '@/lib/web3'
import BadgeImage from '@/components/ui/BadgeImage'
import PriceChart from '@/components/token/PriceChart'

const QUICK_AMOUNTS = ['0.01', '0.05', '0.1', '0.5']
const SLIPPAGE = 5 // 5%

export default function TokenPage() {
  const { mint } = useParams()
  const { address, connected, launcher } = useAppStore()

  const [token, setToken]       = useState<any>(null)
  const [calls, setCalls]       = useState<any[]>([])
  const [tab, setTab]           = useState<'buy'|'sell'>('buy')
  const [amount, setAmount]     = useState('0.1')
  const [thesis, setThesis]     = useState('')
  const [showCall, setShowCall] = useState(false)
  const [quote, setQuote]       = useState('')
  const [quoting, setQuoting]   = useState(false)
  const [txMsg, setTxMsg]       = useState('')
  const [ethPrice, setEthPrice] = useState(3000)

  const isGraduated = token?.status === 'graduated'
  const tokenAddr   = token?.contract_address || ''
  const isKol       = launcher?.badge === 'kol'

  const { buy, sell, loading: tradeLoading, txHash, error: tradeError, getQuote } = useTrade(tokenAddr, isGraduated)
  const { submitCall, loading: callLoading, error: callError } = useKolCall(tokenAddr)
  const { balance: tokenBalance, formatted: tokenBalanceFormatted } = useTokenBalance(tokenAddr, address || '')

  // Load token data
  useEffect(() => {
    if (!mint) return
    const id = mint as string
    fetch(`/api/tokens/${id}`).then(r => r.json()).then(d => setToken(d.token))
    fetch(`/api/calls?token_id=${id}`).then(r => r.json()).then(d => setCalls(d.calls || []))
  }, [mint])

  // Load ETH price
  useEffect(() => {
    getEthPriceUsd().then(setEthPrice)
  }, [])

  // Real-time price polling every 15 seconds
  useEffect(() => {
    if (!mint) return
    const id = mint as string
    const poll = setInterval(() => {
      fetch(`/api/tokens/${id}`)
        .then(r => r.json())
        .then(d => { if (d.token) setToken(d.token) })
        .catch(() => {})
    }, 15000)
    return () => clearInterval(poll)
  }, [mint])

  // Get quote when amount changes
  useEffect(() => {
    if (!tokenAddr || !amount || parseFloat(amount) <= 0) { setQuote(''); return }
    setQuoting(true)
    const timer = setTimeout(async () => {
      try {
        const q = await getQuote(amount, tab === 'buy')
        if (tab === 'buy') {
          setQuote(`≈ ${parseFloat(ethers.formatUnits(q, 18)).toLocaleString()} $${token?.ticker}`)
        } else {
          setQuote(`≈ ${parseFloat(ethers.formatEther(q)).toFixed(6)} ETH`)
        }
      } catch { setQuote('') }
      finally { setQuoting(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [amount, tab, tokenAddr])

  async function handleTrade() {
    setTxMsg('')
    try {
      await switchToRobinhoodChain()
      if (tab === 'buy') {
        const hash = await buy(amount, SLIPPAGE)
        setTxMsg(`✅ Bought! Tx: ${hash?.slice(0,10)}...`)
      } else {
        const hash = await sell(amount, SLIPPAGE)
        setTxMsg(`✅ Sold! Tx: ${hash?.slice(0,10)}...`)
      }
      // Refresh token data
      if (mint) {
        fetch(`/api/tokens/${mint}`).then(r => r.json()).then(d => setToken(d.token))
      }
    } catch (err: any) {
      setTxMsg(`❌ ${err.message || 'Transaction failed'}`)
    }
  }

  async function handleKolCall() {
    setTxMsg('')
    try {
      const { txHash: hash, callId } = await submitCall(thesis, isGraduated)

      // Save to database
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address:  address,
          token_id:        token.id,
          thesis,
          onchain_call_id: callId,
          tx_hash:         hash,
        })
      })

      setTxMsg('✅ Call submitted onchain!')
      setShowCall(false)
      setThesis('')

      // Refresh calls
      if (mint) {
        fetch(`/api/calls?token_id=${mint}`).then(r => r.json()).then(d => setCalls(d.calls || []))
      }
    } catch (err: any) {
      setTxMsg(`❌ ${callError || err.message}`)
    }
  }

  if (!token) return (
    <>
      <Nav />
      <div style={{ paddingTop:'64px', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', color:'var(--muted)' }}>
        Loading...
      </div>
    </>
  )

  return (
    <>
      <Nav />
      <main style={{ paddingTop:'64px' }}>
        {/* Token header */}
        <div style={{ borderBottom:'1px solid var(--border)', padding:'24px 40px', background:'var(--bg2)', display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap' }}>
          <div style={{ width:56, height:56, borderRadius:'8px', background:token.image_url?`url(${token.image_url}) center/cover`:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', color:'var(--accent)', flexShrink:0 }}>
            {!token.image_url && token.ticker?.slice(0,3)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'32px', letterSpacing:'1px' }}>${token.ticker}</h1>
              {token.kol_call_count > 0 && <span className="badge badge-hot">🔥 {token.kol_call_count} KOL calls</span>}
              {isGraduated && <span className="badge badge-grad">⚡ Graduated to KOLSwap</span>}
              {token.creator_badge_number != null && <span style={{ padding:'2px 8px', borderRadius:'2px', fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', background:'rgba(255,215,0,0.15)', color:'var(--accent3)', border:'1px solid rgba(255,215,0,0.3)' }}>🏆 Creator Badge #{token.creator_badge_number}</span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginTop:'4px', flexWrap:'wrap' }}>
              <BadgeImage badge={token.launcher_badge||'anon'} size={18} showLabel />
              <span style={{ fontSize:'13px', color:'var(--muted)' }}>{token.launcher_twitter ? `@${token.launcher_twitter}` : truncateWallet(token.launcher_wallet||'0x000')}</span>
              {token.contract_address && (
                <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${token.contract_address}`} target="_blank" style={{ fontSize:'11px', color:'var(--accent)', textDecoration:'none', fontFamily:'Courier New,monospace' }}>
                  {token.contract_address.slice(0,-6)}<strong>{token.contract_address.slice(-6)}</strong> ↗
                </a>
              )}
              {token.website_url   && <a href={token.website_url}   target="_blank" style={{ fontSize:'12px', color:'var(--accent)', textDecoration:'none' }}>🌐</a>}
              {token.twitter_url   && <a href={token.twitter_url}   target="_blank" style={{ fontSize:'12px', color:'var(--accent)', textDecoration:'none' }}>𝕏</a>}
              {token.telegram_url  && <a href={token.telegram_url}  target="_blank" style={{ fontSize:'12px', color:'var(--accent)', textDecoration:'none' }}>✈️</a>}
              {token.discord_url   && <a href={token.discord_url}   target="_blank" style={{ fontSize:'12px', color:'var(--accent)', textDecoration:'none' }}>💬</a>}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'32px', letterSpacing:'1px' }}>
              {token.price_eth?.toFixed(9) || '0.000000000'} ETH
            </div>
            <div style={{ fontSize:'14px', color:'var(--green)' }}>
              ${(token.price_eth * ethPrice).toFixed(6)} · {formatMktCap(token.market_cap_usd || 0)} mkt cap
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', maxWidth:'1200px', margin:'0 auto', padding:'24px 40px', gap:'24px', alignItems:'start' }}>
          {/* LEFT */}
          <div>
            {/* Price Chart */}
            {token.contract_address && (
              <PriceChart
                tokenId={token.id}
                ticker={token.ticker}
                priceEth={token.price_eth || 0}
              />
            )}

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'16px' }}>
              {[
                ['Market Cap',  formatMktCap(token.market_cap_usd  || 0)],
                ['Volume 24h',  formatMktCap(token.volume_24h_usd  || 0)],
                ['Holders',     (token.holder_count || 0).toLocaleString()],
                ['KOL Calls',   token.kol_call_count || 0],
              ].map(([k,v]) => (
                <div key={k} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'12px 14px' }}>
                  <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', marginBottom:'4px' }}>{k}</div>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'22px', letterSpacing:'1px' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Bonding curve progress */}
            {!isGraduated && (
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'16px 20px', marginBottom:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                  <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)' }}>Bonding Curve Progress</span>
                  <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', color:'var(--accent)', letterSpacing:'1px' }}>{(token.bonding_pct || 0).toFixed(0)}% to KOLSwap</span>
                </div>
                <div style={{ height:'8px', background:'var(--border)', borderRadius:'4px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${token.bonding_pct || 0}%`, background:'linear-gradient(90deg,var(--accent),var(--accent4))', borderRadius:'4px', transition:'width 0.5s ease' }} />
                </div>
                <p style={{ fontSize:'12px', color:'var(--muted)', marginTop:'8px' }}>
                  Graduates to KOLSwap at $69K market cap. Creator earns 0.70% royalty forever.
                </p>
              </div>
            )}

            {/* Description */}
            {token.description && (
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'16px 20px', marginBottom:'16px' }}>
                <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'3px', textTransform:'uppercase', color:'var(--accent)', marginBottom:'8px', borderLeft:'3px solid var(--accent)', paddingLeft:'12px' }}>About</div>
                <p style={{ color:'var(--muted)', lineHeight:1.7 }}>{token.description}</p>
              </div>
            )}

            {/* KOL Calls */}
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
                <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'3px', textTransform:'uppercase', color:'var(--accent)', borderLeft:'3px solid var(--accent)', paddingLeft:'12px' }}>KOL Calls</div>
                {isKol && token.creator_wallet?.toLowerCase() !== address?.toLowerCase() && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCall(!showCall)}>
                    + Call This Token
                  </button>
                )}
              </div>

              {/* Call form */}
              {showCall && (
                <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', padding:'14px', marginBottom:'14px' }}>
                  <label>Your thesis (why will it pump?)</label>
                  <textarea
                    className="input"
                    style={{ minHeight:'60px', marginBottom:'10px' }}
                    placeholder="Write your thesis... (recorded permanently onchain)"
                    value={thesis}
                    onChange={e => setThesis(e.target.value)}
                    maxLength={280}
                  />
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleKolCall} disabled={callLoading || !thesis.trim()}>
                      {callLoading ? '⏳ Submitting...' : '📢 Submit Call Onchain'}
                    </button>
                    <span style={{ fontSize:'11px', color:'var(--muted)' }}>Costs ~$0.001 in gas. Recorded permanently.</span>
                  </div>
                </div>
              )}

              {txMsg && (
                <div style={{ padding:'8px 12px', background: txMsg.startsWith('✅') ? 'rgba(0,229,255,0.08)' : 'rgba(255,61,107,0.08)', border:`1px solid ${txMsg.startsWith('✅') ? 'rgba(0,229,255,0.2)' : 'rgba(255,61,107,0.2)'}`, borderRadius:'3px', color: txMsg.startsWith('✅') ? 'var(--accent)' : 'var(--accent2)', fontSize:'13px', marginBottom:'12px' }}>
                  {txMsg}
                </div>
              )}

              {calls.length === 0 ? (
                <p style={{ color:'var(--muted)', fontSize:'14px', textAlign:'center', padding:'20px' }}>
                  No KOL calls yet. KOLs with 2,000+ followers (KOL Badge) or 5,000+ followers (KOL Crown Badge) can call this token.
                </p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {calls.map((call: any) => (
                    <div key={call.id} style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px' }}>
                      <BadgeImage badge={call.launchers?.badge || 'kol'} size={28} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap' }}>
                          <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'14px', fontWeight:700 }}>
                            @{call.launchers?.twitter_handle || 'anonymous'}
                          </span>
                          <span style={{ fontSize:'11px', color:'var(--muted)' }}>called at {formatMktCap(call.mktcap_at_call || 0)}</span>
                          {call.onchain_call_id && (
                            <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${call.tx_hash}`} target="_blank" style={{ fontSize:'10px', color:'var(--accent)', textDecoration:'none', fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, letterSpacing:'1px' }}>
                              ONCHAIN ↗
                            </a>
                          )}
                        </div>
                        {call.thesis && <p style={{ fontSize:'13px', color:'var(--muted)', lineHeight:1.5 }}>{call.thesis}</p>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{
                          fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'1px',
                          color: call.accuracy_status === 'hit' ? 'var(--green)' : call.accuracy_status === 'miss' ? 'var(--red)' : 'var(--muted)'
                        }}>
                          {call.accuracy_status === 'hit' ? '✓ HIT' : call.accuracy_status === 'partial' ? '~ PARTIAL' : call.accuracy_status === 'miss' ? '✗ MISS' : '⏳ PENDING'}
                        </div>
                        {call.reward_eth > 0 && (
                          <div style={{ fontSize:'11px', color:'var(--accent3)', fontFamily:'Barlow Condensed,sans-serif', fontWeight:700 }}>
                            +{call.reward_eth.toFixed(4)} ETH
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Trade widget */}
          <div style={{ position:'sticky', top:'80px' }}>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden' }}>
              {/* Tabs */}
              <div style={{ display:'flex' }}>
                {(['buy','sell'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    flex:1, padding:'14px',
                    background: tab === t ? (t==='buy' ? 'var(--green)' : 'var(--red)') : 'var(--bg3)',
                    color: tab === t ? '#000' : 'var(--muted)',
                    border:'none', cursor:'pointer',
                    fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'2px',
                    transition:'all 0.2s'
                  }}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ padding:'16px' }}>
                {/* Balance */}
                {connected && address && tab === 'sell' && (
                  <div style={{ padding:'8px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', marginBottom:'10px', fontSize:'12px' }}>
                    <span style={{ color:'var(--muted)' }}>Your balance: </span>
                    <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontWeight:700 }}>
                      {parseFloat(tokenBalanceFormatted).toLocaleString()} ${token.ticker}
                    </span>
                  </div>
                )}

                {/* Amount input */}
                <label>{tab === 'buy' ? 'Amount (ETH)' : `Amount ($${token.ticker})`}</label>
                <div style={{ position:'relative', marginBottom:'10px' }}>
                  <input
                    className="input"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step={tab === 'buy' ? '0.01' : '1000'}
                  />
                  <span style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', color:'var(--muted)' }}>
                    {tab === 'buy' ? 'ETH' : token.ticker}
                  </span>
                </div>

                {/* Quick amounts */}
                {tab === 'buy' && (
                  <div style={{ display:'flex', gap:'4px', marginBottom:'10px' }}>
                    {QUICK_AMOUNTS.map(q => (
                      <button key={q} onClick={() => setAmount(q)} style={{ flex:1, padding:'6px', fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'2px', cursor:'pointer', color:'var(--muted)', transition:'all 0.15s' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quote */}
                {quote && (
                  <div style={{ padding:'8px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', marginBottom:'10px', fontSize:'13px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ color:'var(--muted)' }}>You receive</span>
                      <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, color:'var(--text)' }}>
                        {quoting ? '...' : quote}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                      <span style={{ color:'var(--muted)' }}>Slippage</span>
                      <span style={{ color:'var(--muted)', fontSize:'12px' }}>{SLIPPAGE}%</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                      <span style={{ color:'var(--muted)' }}>Fee (1%)</span>
                      <span style={{ color:'var(--muted)', fontSize:'12px' }}>
                        {tab === 'buy' ? `${(parseFloat(amount||'0') * 0.01).toFixed(4)} ETH` : '1%'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Trade error */}
                {tradeError && (
                  <div style={{ padding:'8px 12px', background:'rgba(255,61,107,0.1)', border:'1px solid rgba(255,61,107,0.2)', borderRadius:'3px', color:'var(--accent2)', fontSize:'12px', marginBottom:'10px' }}>
                    {tradeError}
                  </div>
                )}

                {/* Trade button */}
                {connected ? (
                  <button
                    onClick={handleTrade}
                    disabled={tradeLoading || !amount || parseFloat(amount) <= 0}
                    style={{
                      width:'100%', padding:'14px',
                      background: tab === 'buy' ? 'var(--green)' : 'var(--red)',
                      color:'#000', border:'none', cursor:'pointer',
                      fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'2px',
                      borderRadius:'2px',
                      opacity: tradeLoading ? 0.7 : 1,
                    }}
                  >
                    {tradeLoading
                      ? '⏳ Confirming...'
                      : tab === 'buy'
                        ? `Buy $${token.ticker}`
                        : `Sell $${token.ticker}`
                    }
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
                    Connect Wallet to Trade
                  </button>
                )}

                {/* Tx hash */}
                {txHash && (
                  <div style={{ marginTop:'10px', textAlign:'center' }}>
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txHash}`}
                      target="_blank"
                      style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', color:'var(--accent)', textDecoration:'none' }}
                    >
                      View on Robinhood Chain Explorer ↗
                    </a>
                  </div>
                )}

                {/* Bonding curve mini */}
                {!isGraduated && (
                  <div style={{ marginTop:'16px', paddingTop:'16px', borderTop:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)' }}>To Graduation</span>
                      <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'16px', color:'var(--accent)', letterSpacing:'1px' }}>{(token.bonding_pct||0).toFixed(0)}%</span>
                    </div>
                    <div style={{ height:'4px', background:'var(--border)', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${token.bonding_pct||0}%`, background:'linear-gradient(90deg,var(--accent),var(--accent4))', borderRadius:'2px' }} />
                    </div>
                    <p style={{ fontSize:'11px', color:'var(--muted)', marginTop:'6px', textAlign:'center' }}>
                      Graduates to KOLSwap at $69K
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
