'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, formatFollowers, truncateWallet, BADGE_LABELS, BADGE_ICONS, buildCallTweetUrl } from '@/lib/auth'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TokenPage() {
  const { mint } = useParams()
  const { address, connected, launcher } = useAppStore()
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('0.5')
  const [callThesis, setCallThesis] = useState('')
  const [showCallForm, setShowCallForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const { data: tokenData } = useSWR(`/api/tokens/${mint}`, fetcher, { refreshInterval: 15000 })
  const { data: callsData } = useSWR(`/api/calls?token_id=${mint}`, fetcher)

  const token = tokenData?.token
  const calls = callsData?.calls || []

  const QUICK_AMOUNTS = ['0.1', '0.5', '1', '5']

  async function submitCall() {
    if (!connected || !address || !token) return
    setLoading(true)
    try {
      const nonceRes = await fetch('/api/auth/nonce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet_address: address }) })
      const { nonce } = await nonceRes.json()
      const { buildSignMessage } = await import('@/lib/auth')
      const message = buildSignMessage(address, nonce, 'Submit KOL Call')
      const messageBytes = new TextEncoder().encode(message)
      const phantom = (window as any).phantom?.solana
      const { signature } = await phantom.signMessage(messageBytes, 'utf8')
      const { default: bs58 } = await import('bs58')
      const sigBase58 = bs58.encode(signature)

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address, wallet_signature: sigBase58, nonce, token_id: token.id, thesis: callThesis })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Open tweet
      const tweetUrl = buildCallTweetUrl(`$${token.ticker}`, token.market_cap_usd, data.call.id, callThesis)
      window.open(tweetUrl, '_blank')
      setMsg('Call submitted! Share it on Twitter.')
      setShowCallForm(false)
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <>
      <Nav />
      <div style={{ paddingTop: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--muted)' }}>
        Loading...
      </div>
    </>
  )

  return (
    <>
      <Nav />
      <main style={{ paddingTop: '64px' }}>
        {/* Token header */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '24px 40px', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '8px',
            background: token.image_url ? `url(${token.image_url}) center/cover` : 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '16px', color: 'var(--accent)',
            flexShrink: 0
          }}>
            {!token.image_url && token.ticker?.slice(0, 3)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '32px', letterSpacing: '1px' }}>${token.ticker}</h1>
              {token.kol_call_count > 0 && <span className="badge badge-hot">🔥 {token.kol_call_count} KOL calls</span>}
              {token.kol_pass_earned && <span className="badge" style={{ background: 'rgba(255,215,0,0.15)', color: 'var(--accent3)', border: '1px solid rgba(255,215,0,0.3)' }}>🎫 KOL Pass #{token.kol_pass_number}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span className={`badge badge-${token.launcher_badge}`}>{BADGE_ICONS[token.launcher_badge]} {BADGE_LABELS[token.launcher_badge]}</span>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                {token.launcher_twitter ? `@${token.launcher_twitter}` : truncateWallet(token.launcher_wallet || '')}
              </span>
              {/* Social links */}
              {token.website_url && <a href={token.website_url} target="_blank" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>🌐 Website</a>}
              {token.twitter_url && <a href={token.twitter_url} target="_blank" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>𝕏 Twitter</a>}
              {token.telegram_url && <a href={token.telegram_url} target="_blank" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>✈️ Telegram</a>}
              {token.discord_url && <a href={token.discord_url} target="_blank" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>💬 Discord</a>}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '36px', letterSpacing: '1px', color: 'var(--text)' }}>
              {token.price_sol?.toFixed(9)} SOL
            </div>
            <div style={{ fontSize: '14px', color: 'var(--green)' }}>
              {formatMktCap(token.market_cap_usd)} market cap
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', maxWidth: '1200px', margin: '0 auto', padding: '24px 40px', gap: '24px', alignItems: 'start' }}>
          {/* LEFT: Chart + info */}
          <div>
            {/* Chart placeholder */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {['1H','4H','1D','1W','ALL'].map(t => (
                  <button key={t} className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '4px 10px' }}>{t}</button>
                ))}
              </div>
              <div style={{
                height: '240px', background: 'var(--bg3)', borderRadius: '3px',
                position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,220 L60,200 L120,190 L160,200 L220,160 L280,120 L340,80 L380,100 L440,50 L500,25 L560,30 L600,20 L600,240 L0,240 Z" fill="url(#chartGrad)" />
                  <path d="M0,220 L60,200 L120,190 L160,200 L220,160 L280,120 L340,80 L380,100 L440,50 L500,25 L560,30 L600,20" fill="none" stroke="#00e5ff" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Market Cap', value: formatMktCap(token.market_cap_usd) },
                { label: 'Volume 24h', value: formatMktCap(token.volume_24h_usd) },
                { label: 'Holders', value: token.holder_count?.toLocaleString() },
                { label: 'KOL Calls', value: token.kol_call_count },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '1px' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {token.description && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '16px 20px', marginBottom: '16px' }}>
                <div className="section-tag" style={{ marginBottom: '8px' }}>About</div>
                <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>{token.description}</p>
              </div>
            )}

            {/* Bonding curve */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '16px 20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className="section-tag" style={{ marginBottom: 0 }}>Bonding Curve</div>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', color: 'var(--accent)', letterSpacing: '1px' }}>
                  {token.bonding_pct?.toFixed(0)}% to KOLSwap
                </span>
              </div>
              <div className="progress" style={{ height: '8px' }}>
                <div className="progress-fill" style={{ width: `${token.bonding_pct}%` }} />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                Graduates to KOLSwap at $69K market cap. Creator earns 0.15% royalty forever after graduation.
              </p>
            </div>

            {/* KOL Calls */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="section-tag" style={{ marginBottom: 0 }}>KOL Calls</div>
                {launcher?.badge && ['kol','pro_kol','gold_kol'].includes(launcher.badge) && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCallForm(!showCallForm)}>
                    + Submit Call
                  </button>
                )}
              </div>

              {showCallForm && (
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '14px', marginBottom: '14px' }}>
                  <label>Your thesis (why will it pump?)</label>
                  <textarea className="input" style={{ minHeight: '60px', marginBottom: '10px' }} placeholder="Write your thesis..." value={callThesis} onChange={e => setCallThesis(e.target.value)} />
                  <button className="btn btn-primary btn-sm" onClick={submitCall} disabled={loading}>
                    {loading ? <span className="spin">◌</span> : '📢'} Submit & Tweet Call
                  </button>
                </div>
              )}

              {msg && <div style={{ padding: '8px 12px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '3px', color: 'var(--accent)', fontSize: '13px', marginBottom: '12px' }}>{msg}</div>}

              {calls.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                  No KOL calls yet. Be the first to call this token.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {calls.map((call: any) => (
                    <div key={call.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span className={`badge badge-${call.launchers_public?.badge}`}>{BADGE_ICONS[call.launchers_public?.badge]} @{call.launchers_public?.twitter_handle || 'anon'}</span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>called at {formatMktCap(call.mktcap_at_call)}</span>
                        </div>
                        {call.thesis && <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{call.thesis}</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '1px',
                          color: call.accuracy_status === 'hit' ? 'var(--green)' : call.accuracy_status === 'miss' ? 'var(--red)' : 'var(--muted)'
                        }}>
                          {call.accuracy_status === 'hit' ? '✓ HIT' : call.accuracy_status === 'partial' ? '~ PARTIAL' : call.accuracy_status === 'miss' ? '✗ MISS' : 'PENDING'}
                        </div>
                        {call.multiplier && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{call.multiplier?.toFixed(2)}x</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Trade widget */}
          <div style={{ position: 'sticky', top: '80px' }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              {/* Trade tabs */}
              <div style={{ display: 'flex' }}>
                {(['buy', 'sell'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTradeTab(tab)}
                    style={{
                      flex: 1, padding: '14px',
                      background: tradeTab === tab ? (tab === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--bg3)',
                      color: tradeTab === tab ? '#000' : 'var(--muted)',
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '2px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ padding: '16px' }}>
                {/* Amount input */}
                <label>{tradeTab === 'buy' ? 'Amount (SOL)' : 'Amount (tokens)'}</label>
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <input
                    className="input"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.0"
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: 'var(--muted)' }}>
                    {tradeTab === 'buy' ? 'SOL' : token.ticker}
                  </span>
                </div>

                {/* Quick amounts */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                  {QUICK_AMOUNTS.map(q => (
                    <button
                      key={q}
                      onClick={() => setAmount(q)}
                      style={{
                        flex: 1, padding: '6px', textAlign: 'center',
                        fontFamily: 'Barlow Condensed, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
                        background: 'var(--bg3)', border: '1px solid var(--border)',
                        borderRadius: '2px', cursor: 'pointer', color: 'var(--muted)',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div style={{ padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '3px', marginBottom: '14px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--muted)' }}>You receive</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.5px' }}>
                      {tradeTab === 'buy' ? `~${(parseFloat(amount || '0') * 2336448).toLocaleString()} $${token.ticker}` : `~${(parseFloat(amount || '0') * 0.00000043).toFixed(6)} SOL`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Fee (1.25%)</span>
                    <span style={{ color: 'var(--muted)' }}>{(parseFloat(amount || '0') * 0.0125).toFixed(4)} SOL</span>
                  </div>
                </div>

                {connected ? (
                  <button
                    className="btn"
                    style={{
                      width: '100%', justifyContent: 'center',
                      background: tradeTab === 'buy' ? 'var(--green)' : 'var(--red)',
                      color: '#000', padding: '14px',
                      fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '2px',
                      boxShadow: tradeTab === 'buy' ? '0 0 24px rgba(0,229,255,0.3)' : '0 0 24px rgba(255,61,107,0.3)',
                      borderRadius: '2px', border: 'none', cursor: 'pointer'
                    }}
                  >
                    {tradeTab === 'buy' ? `Buy $${token.ticker}` : `Sell $${token.ticker}`}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', letterSpacing: '2px' }}
                    onClick={() => document.querySelector<HTMLButtonElement>('[data-wallet-btn]')?.click()}
                  >
                    Connect Wallet to Trade
                  </button>
                )}

                {/* Bonding curve progress */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>Bonding Curve</span>
                    <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '16px', color: 'var(--accent)', letterSpacing: '1px' }}>{token.bonding_pct?.toFixed(0)}%</span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${token.bonding_pct}%` }} />
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', textAlign: 'center' }}>
                    Graduates to KOLSwap at $69K
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
