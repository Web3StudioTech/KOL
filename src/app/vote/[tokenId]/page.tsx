'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { formatMktCap, truncateWallet } from '@/lib/auth'
import BadgeImage from '@/components/ui/BadgeImage'

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${h}h ${m}m ${s}s`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  return <span>{remaining}</span>
}

export default function VotePage() {
  const { tokenId } = useParams()
  const { address, connected } = useAppStore()

  const [vote, setVote]         = useState<any>(null)
  const [token, setToken]       = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [voting, setVoting]     = useState(false)
  const [voted, setVoted]       = useState(false)
  const [userVote, setUserVote] = useState<'yes'|'no'|null>(null)
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    if (!tokenId) return
    Promise.all([
      fetch(`/api/tokens/${tokenId}`).then(r => r.json()),
      fetch(`/api/votes?token_id=${tokenId}`).then(r => r.json()),
    ]).then(([tokenData, voteData]) => {
      setToken(tokenData.token)
      setVote(voteData.vote)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [tokenId])

  async function submitVote(choice: 'yes' | 'no') {
    if (!connected || !address) { setMsg('Connect wallet to vote'); return }
    setVoting(true)
    setMsg('')
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenId, wallet_address: address, vote: choice })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVoted(true)
      setUserVote(choice)
      setVote(data.vote)
      setMsg(`✅ Vote cast: ${choice.toUpperCase()}`)
    } catch (err: any) {
      setMsg(`❌ ${err.message}`)
    } finally {
      setVoting(false)
    }
  }

  if (loading) return (
    <>
      <Nav />
      <div style={{ paddingTop:'64px', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', color:'var(--muted)' }}>
        Loading vote...
      </div>
    </>
  )

  if (!vote || !token) return (
    <>
      <Nav />
      <div style={{ paddingTop:'64px', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh' }}>
        <div style={{ textAlign:'center', color:'var(--muted)' }}>
          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'48px', color:'var(--border)', marginBottom:'16px' }}>NO ACTIVE VOTE</div>
          <p>No community vote is currently open for this token.</p>
        </div>
      </div>
    </>
  )

  const totalVotes    = (vote.yes_count || 0) + (vote.no_count || 0)
  const yesPct        = totalVotes > 0 ? Math.round((vote.yes_count || 0) / totalVotes * 100) : 0
  const noPct         = totalVotes > 0 ? Math.round((vote.no_count  || 0) / totalVotes * 100) : 0
  const quorumPct     = Math.min(100, Math.round(((vote.unique_voters || 0) / (token.holder_count || 1)) * 100))
  const quorumReached = quorumPct >= 10
  const isExpired     = new Date(vote.expires_at) < new Date()
  const isActive      = vote.status === 'active' && !isExpired

  return (
    <>
      <Nav />
      <main style={{ paddingTop:'64px' }}>

        {/* Warning banner */}
        <div style={{ background:'rgba(255,61,107,0.1)', borderBottom:'1px solid rgba(255,61,107,0.3)', padding:'12px 40px', display:'flex', alignItems:'center', gap:'12px' }}>
          <span style={{ fontSize:'20px' }}>⚠️</span>
          <div>
            <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--accent2)' }}>
              Community Rug Vote Active
            </span>
            <span style={{ fontSize:'13px', color:'var(--muted)', marginLeft:'12px' }}>
              The creator of ${token.ticker} was flagged for suspicious selling activity. Token holders vote to confirm or dismiss.
            </span>
          </div>
        </div>

        <div style={{ maxWidth:'900px', margin:'0 auto', padding:'40px' }}>
          {/* Token header */}
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'32px', padding:'20px 24px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px' }}>
            <div style={{ width:52, height:52, borderRadius:'8px', background: token.image_url ? `url(${token.image_url}) center/cover` : 'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'14px', color:'var(--accent)', flexShrink:0 }}>
              {!token.image_url && token.ticker?.slice(0,3)}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', letterSpacing:'1px' }}>${token.ticker}</h1>
                <span style={{ padding:'3px 8px', borderRadius:'2px', fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', background:'rgba(255,61,107,0.15)', color:'var(--accent2)', border:'1px solid rgba(255,61,107,0.3)' }}>
                  🚨 RUG SUSPECTED
                </span>
              </div>
              <div style={{ display:'flex', gap:'16px', fontSize:'13px', color:'var(--muted)' }}>
                <span>Creator: {token.launcher_twitter ? `@${token.launcher_twitter}` : truncateWallet(token.creator_wallet || '0x000')}</span>
                <span>Trigger: {vote.rug_trigger || 'CreatorMassSell'}</span>
                <span>Market Cap: {formatMktCap(token.market_cap_usd || 0)}</span>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'14px', letterSpacing:'1px', color: isActive ? 'var(--accent2)' : 'var(--muted)' }}>
                {isActive ? '🔴 VOTE ACTIVE' : '⚫ VOTE CLOSED'}
              </div>
              {isActive && (
                <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'20px', fontWeight:700, color:'var(--accent2)', marginTop:'4px' }}>
                  <TimeRemaining expiresAt={vote.expires_at} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
            {/* LEFT — Vote */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* What is this vote */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'20px 24px' }}>
                <div className="section-tag" style={{ marginBottom:'12px' }}>What Are You Voting On?</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[
                    { icon:'✅', label:'Vote YES — Confirm Rug', desc:'You believe the creator intentionally rugged. Token trading will be frozen and creator reputation permanently damaged onchain.' },
                    { icon:'❌', label:'Vote NO — Dismiss', desc:'You believe this was normal trading activity. The flag will be removed and token continues normally.' },
                  ].map(v => (
                    <div key={v.label} style={{ padding:'12px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px' }}>
                      <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'0.5px', marginBottom:'4px' }}>{v.icon} {v.label}</div>
                      <p style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.5 }}>{v.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vote buttons */}
              {isActive && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'20px 24px' }}>
                  <div className="section-tag" style={{ marginBottom:'16px' }}>Cast Your Vote</div>

                  {msg && (
                    <div style={{ padding:'8px 12px', background: msg.startsWith('✅') ? 'rgba(0,229,160,0.1)' : 'rgba(255,61,107,0.1)', border:`1px solid ${msg.startsWith('✅') ? 'rgba(0,229,160,0.2)' : 'rgba(255,61,107,0.2)'}`, borderRadius:'3px', fontSize:'13px', marginBottom:'12px', color: msg.startsWith('✅') ? 'var(--green)' : 'var(--accent2)' }}>
                      {msg}
                    </div>
                  )}

                  {!connected ? (
                    <div style={{ textAlign:'center', padding:'16px', color:'var(--muted)', fontSize:'14px', border:'1px solid var(--border)', borderRadius:'3px' }}>
                      Connect wallet to vote. Only token holders can vote.
                    </div>
                  ) : voted ? (
                    <div style={{ textAlign:'center', padding:'16px', background: userVote === 'yes' ? 'rgba(255,61,107,0.08)' : 'rgba(0,229,160,0.08)', border:`1px solid ${userVote === 'yes' ? 'rgba(255,61,107,0.2)' : 'rgba(0,229,160,0.2)'}`, borderRadius:'3px' }}>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'24px', letterSpacing:'1px', color: userVote === 'yes' ? 'var(--accent2)' : 'var(--green)' }}>
                        You voted {userVote?.toUpperCase()}
                      </div>
                      <p style={{ fontSize:'13px', color:'var(--muted)', marginTop:'4px' }}>Your vote has been recorded.</p>
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                      <button
                        onClick={() => submitVote('yes')}
                        disabled={voting}
                        style={{ padding:'16px', background:'rgba(255,61,107,0.1)', border:'2px solid rgba(255,61,107,0.4)', borderRadius:'4px', cursor:'pointer', color:'var(--accent2)', fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'2px', transition:'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,61,107,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,61,107,0.1)')}
                      >
                        ✅ YES — RUG
                      </button>
                      <button
                        onClick={() => submitVote('no')}
                        disabled={voting}
                        style={{ padding:'16px', background:'rgba(0,229,160,0.1)', border:'2px solid rgba(0,229,160,0.4)', borderRadius:'4px', cursor:'pointer', color:'var(--green)', fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'2px', transition:'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,160,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,229,160,0.1)')}
                      >
                        ❌ NO — LEGIT
                      </button>
                    </div>
                  )}

                  <p style={{ fontSize:'11px', color:'var(--muted)', textAlign:'center', marginTop:'10px', lineHeight:1.5, fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'0.5px' }}>
                    ONLY TOKEN HOLDERS CAN VOTE · ONE VOTE PER WALLET · RECORDED ONCHAIN
                  </p>
                </div>
              )}

              {/* Vote rules */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'20px 24px' }}>
                <div className="section-tag" style={{ marginBottom:'12px' }}>Vote Rules</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[
                    ['Vote window',   '72 hours from detection'],
                    ['Quorum needed', '10% of token holders'],
                    ['If rug confirmed', 'Trading frozen, creator flagged'],
                    ['If dismissed',  'Token continues normally'],
                    ['If no quorum',  'Flag auto-removed after 72h'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'5px 0', borderBottom:'1px solid rgba(30,45,61,0.5)' }}>
                      <span style={{ color:'var(--muted)' }}>{k}</span>
                      <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, letterSpacing:'0.5px' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Results */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* Live results */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'20px 24px' }}>
                <div className="section-tag" style={{ marginBottom:'16px' }}>Live Results</div>

                {/* YES bar */}
                <div style={{ marginBottom:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'1px', color:'var(--accent2)' }}>✅ YES — Confirm Rug</span>
                    <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', color:'var(--accent2)', letterSpacing:'1px' }}>{yesPct}%</span>
                  </div>
                  <div style={{ height:'12px', background:'var(--border)', borderRadius:'6px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${yesPct}%`, background:'var(--accent2)', borderRadius:'6px', transition:'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'4px' }}>{vote.yes_count || 0} votes</div>
                </div>

                {/* NO bar */}
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'1px', color:'var(--green)' }}>❌ NO — Dismiss</span>
                    <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', color:'var(--green)', letterSpacing:'1px' }}>{noPct}%</span>
                  </div>
                  <div style={{ height:'12px', background:'var(--border)', borderRadius:'6px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${noPct}%`, background:'var(--green)', borderRadius:'6px', transition:'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'4px' }}>{vote.no_count || 0} votes</div>
                </div>

                {/* Quorum progress */}
                <div style={{ padding:'14px', background:'var(--bg3)', border:`1px solid ${quorumReached ? 'rgba(0,229,160,0.3)' : 'var(--border)'}`, borderRadius:'3px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                    <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)' }}>Quorum Progress</span>
                    <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'18px', letterSpacing:'1px', color: quorumReached ? 'var(--green)' : 'var(--muted)' }}>
                      {quorumPct}% {quorumReached ? '✓' : ''}
                    </span>
                  </div>
                  <div style={{ height:'8px', background:'var(--border)', borderRadius:'4px', overflow:'hidden', marginBottom:'8px' }}>
                    <div style={{ height:'100%', width:`${Math.min(100, quorumPct)}%`, background: quorumReached ? 'var(--green)' : 'var(--accent4)', borderRadius:'4px', transition:'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.5 }}>
                    {vote.unique_voters || 0} of {token.holder_count || 0} holders voted.
                    Need 10% ({Math.ceil((token.holder_count || 0) * 0.1)} wallets) for quorum.
                    {quorumReached
                      ? ' ✅ Quorum reached!'
                      : ` Need ${Math.max(0, Math.ceil((token.holder_count||0)*0.1) - (vote.unique_voters||0))} more votes.`
                    }
                  </div>
                </div>
              </div>

              {/* Current status */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'20px 24px' }}>
                <div className="section-tag" style={{ marginBottom:'12px' }}>Current Outcome</div>
                <div style={{ textAlign:'center', padding:'20px' }}>
                  {!isActive ? (
                    vote.status === 'confirmed_rug' ? (
                      <>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'40px', color:'var(--accent2)', letterSpacing:'2px', marginBottom:'8px' }}>🚨 RUG CONFIRMED</div>
                        <p style={{ color:'var(--muted)', fontSize:'14px' }}>Community voted to confirm rug. Token trading frozen.</p>
                      </>
                    ) : (
                      <>
                        <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'40px', color:'var(--green)', letterSpacing:'2px', marginBottom:'8px' }}>✅ DISMISSED</div>
                        <p style={{ color:'var(--muted)', fontSize:'14px' }}>Flag dismissed. Token continues normally.</p>
                      </>
                    )
                  ) : !quorumReached ? (
                    <>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'32px', color:'var(--muted)', letterSpacing:'2px', marginBottom:'8px' }}>⏳ PENDING QUORUM</div>
                      <p style={{ color:'var(--muted)', fontSize:'14px' }}>Vote is active. Waiting for 10% of holders to vote. If quorum not reached, flag auto-removes at expiry.</p>
                    </>
                  ) : yesPct > noPct ? (
                    <>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'32px', color:'var(--accent2)', letterSpacing:'2px', marginBottom:'8px' }}>🚨 LEANING RUG</div>
                      <p style={{ color:'var(--muted)', fontSize:'14px' }}>YES is winning. Vote still active — outcome can change.</p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'32px', color:'var(--green)', letterSpacing:'2px', marginBottom:'8px' }}>✅ LEANING LEGIT</div>
                      <p style={{ color:'var(--muted)', fontSize:'14px' }}>NO is winning. Vote still active — outcome can change.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Voter list */}
              {(vote.recent_voters || []).length > 0 && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'20px 24px' }}>
                  <div className="section-tag" style={{ marginBottom:'12px' }}>Recent Voters</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {vote.recent_voters.slice(0,5).map((v: any) => (
                      <div key={v.wallet} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'12px', padding:'6px 0', borderBottom:'1px solid rgba(30,45,61,0.5)' }}>
                        <span style={{ fontFamily:'Courier New,monospace', color:'var(--muted)' }}>{truncateWallet(v.wallet, 6)}</span>
                        <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, letterSpacing:'1px', color: v.vote === 'yes' ? 'var(--accent2)' : 'var(--green)' }}>
                          {v.vote === 'yes' ? '✅ YES' : '❌ NO'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
