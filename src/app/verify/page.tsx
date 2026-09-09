'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/layout/Nav'
import { useAppStore } from '@/lib/store'
import { truncateWallet } from '@/lib/auth'
import BadgeImage from '@/components/ui/BadgeImage'

type Step = 'connect' | 'nonce' | 'tweet' | 'verify' | 'pending' | 'done'

export default function VerifyPage() {
  const { address, connected, launcher } = useAppStore()
  const [step, setStep]         = useState<Step>('connect')
  const [nonce, setNonce]       = useState('')
  const [tweetUrl, setTweetUrl] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [handle, setHandle]     = useState('')

  // Auto-advance if already connected
  useEffect(() => {
    if (connected && address && step === 'connect') {
      setStep('nonce')
    }
  }, [connected, address])

  // Already verified
  const isKol      = launcher?.badge === 'kol' || launcher?.badge === 'kol_crown'
  const isCrown    = launcher?.badge === 'kol_crown'

  async function connectWallet() {
    const eth = (window as any).ethereum
    if (!eth) { setError('Please install MetaMask'); return }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      useAppStore.getState().setAddress(accounts[0], 'metamask')
      setStep('nonce')
    } catch (e: any) { setError(e.message) }
  }

  async function generateNonce() {
    if (!address) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/nonce', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet_address: address })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNonce(data.nonce)
      setStep('tweet')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function verifyTweet() {
    if (!tweetUrl.trim()) { setError('Please enter your tweet URL'); return }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/verify-twitter', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tweet_url: tweetUrl.trim(), wallet_address: address })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHandle(data.twitter_handle)
      setStep('pending')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tweetTemplate = `Verifying my wallet on @OnchainKOL 🚀\n\nokl-verify:${address}:${nonce}\n\nhttps://onchainkol.com`
  const tweetLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetTemplate)}`

  return (
    <>
      <Nav />
      <main style={{ paddingTop:'64px', minHeight:'100vh' }}>

        {/* Hero */}
        <div style={{ padding:'60px 40px 40px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%,black,transparent)', pointerEvents:'none' }} />
          <div style={{ maxWidth:'640px', margin:'0 auto', position:'relative', zIndex:1, textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', gap:'12px', marginBottom:'20px' }}>
              <BadgeImage badge="kol" size={48} />
              <BadgeImage badge="kol_crown" size={48} />
            </div>
            <div className="section-tag" style={{ display:'block', textAlign:'center', marginBottom:'12px' }}>KOL Verification</div>
            <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'clamp(36px,6vw,64px)', lineHeight:1, marginBottom:'12px' }}>
              VERIFY YOUR <span style={{ color:'var(--accent)' }}>KOL STATUS</span>
            </h1>
            <p style={{ color:'var(--muted)', fontSize:'16px', lineHeight:1.6 }}>
              Connect your Twitter account to earn a KOL badge and start calling tokens. Completely free — only gas (~$0.001) to submit calls.
            </p>
          </div>
        </div>

        <div style={{ maxWidth:'640px', margin:'0 auto', padding:'40px' }}>

          {/* Already verified */}
          {isKol && (
            <div style={{ textAlign:'center', padding:'3rem', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px' }}>
              <BadgeImage badge={launcher?.badge || 'kol'} size={64} />
              <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'36px', letterSpacing:'2px', marginTop:'16px', marginBottom:'8px', color: isCrown ? '#ec4899' : '#3b82f6' }}>
                {isCrown ? 'KOL CROWN VERIFIED!' : 'KOL VERIFIED!'}
              </div>
              <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'20px' }}>
                @{launcher?.twitter_handle} · {launcher?.follower_count?.toLocaleString()} followers
              </p>
              <a href="/kol" className="btn btn-primary">Go to KOL Zone →</a>
            </div>
          )}

          {!isKol && (
            <>
              {/* Step indicator */}
              <div style={{ display:'flex', alignItems:'center', marginBottom:'32px' }}>
                {[
                  { num:1, label:'Connect Wallet',  key:'connect' },
                  { num:2, label:'Get Code',         key:'nonce'   },
                  { num:3, label:'Post Tweet',       key:'tweet'   },
                  { num:4, label:'Verify',           key:'verify'  },
                ].map((s, i) => {
                  const stepOrder = ['connect','nonce','tweet','verify','pending','done']
                  const current   = stepOrder.indexOf(step)
                  const thisStep  = stepOrder.indexOf(s.key)
                  const done      = current > thisStep
                  const active    = current === thisStep

                  return (
                    <div key={s.key} style={{ display:'flex', alignItems:'center', flex: i < 3 ? 1 : 0 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                        <div style={{
                          width:32, height:32, borderRadius:'50%',
                          background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--bg3)',
                          border: `2px solid ${done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--border)'}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontFamily:'Bebas Neue,sans-serif', fontSize:'16px',
                          color: done || active ? '#000' : 'var(--muted)',
                          transition:'all 0.3s',
                        }}>
                          {done ? '✓' : s.num}
                        </div>
                        <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'10px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--muted)', whiteSpace:'nowrap' }}>
                          {s.label}
                        </div>
                      </div>
                      {i < 3 && (
                        <div style={{ flex:1, height:'2px', background: done ? 'var(--green)' : 'var(--border)', margin:'0 8px 20px', transition:'background 0.3s' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Step 1 — Connect Wallet */}
              {step === 'connect' && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'32px', textAlign:'center' }}>
                  <div style={{ fontSize:'48px', marginBottom:'16px' }}>👛</div>
                  <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', letterSpacing:'1px', marginBottom:'12px' }}>Connect Your Wallet</h2>
                  <p style={{ color:'var(--muted)', fontSize:'14px', lineHeight:1.6, marginBottom:'24px', maxWidth:'400px', margin:'0 auto 24px' }}>
                    First connect your MetaMask wallet. This wallet will be linked to your Twitter account and used to submit KOL calls.
                  </p>
                  {error && <div style={{ padding:'8px 12px', background:'rgba(255,61,107,0.1)', border:'1px solid rgba(255,61,107,0.2)', borderRadius:'3px', color:'var(--accent2)', fontSize:'13px', marginBottom:'16px' }}>{error}</div>}
                  <button className="btn btn-primary btn-lg" onClick={connectWallet}>
                    Connect MetaMask
                  </button>
                </div>
              )}

              {/* Step 2 — Generate nonce */}
              {step === 'nonce' && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'32px', textAlign:'center' }}>
                  <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔑</div>
                  <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', letterSpacing:'1px', marginBottom:'12px' }}>Get Verification Code</h2>
                  <div style={{ padding:'10px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px', marginBottom:'16px', fontFamily:'Courier New,monospace', fontSize:'13px', color:'var(--muted)' }}>
                    Wallet: {truncateWallet(address || '', 6)}
                  </div>
                  <p style={{ color:'var(--muted)', fontSize:'14px', lineHeight:1.6, marginBottom:'24px' }}>
                    We'll generate a unique code for you to include in a tweet. This proves you own both the wallet and the Twitter account.
                  </p>
                  {error && <div style={{ padding:'8px 12px', background:'rgba(255,61,107,0.1)', border:'1px solid rgba(255,61,107,0.2)', borderRadius:'3px', color:'var(--accent2)', fontSize:'13px', marginBottom:'16px' }}>{error}</div>}
                  <button className="btn btn-primary btn-lg" onClick={generateNonce} disabled={loading}>
                    {loading ? 'Generating...' : 'Generate My Code'}
                  </button>
                </div>
              )}

              {/* Step 3 — Post tweet */}
              {step === 'tweet' && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'32px' }}>
                  <div style={{ textAlign:'center', marginBottom:'24px' }}>
                    <div style={{ fontSize:'48px', marginBottom:'12px' }}>🐦</div>
                    <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', letterSpacing:'1px', marginBottom:'8px' }}>Post Verification Tweet</h2>
                    <p style={{ color:'var(--muted)', fontSize:'14px', lineHeight:1.6 }}>
                      Post this exact tweet from your Twitter account. Your account must be public.
                    </p>
                  </div>

                  {/* Tweet template */}
                  <div style={{ background:'var(--bg3)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'4px', padding:'16px', marginBottom:'16px' }}>
                    <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--accent)', marginBottom:'8px' }}>Tweet Template:</div>
                    <pre style={{ fontFamily:'Barlow,sans-serif', fontSize:'13px', color:'var(--text)', lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-all', margin:0 }}>
{`Verifying my wallet on @OnchainKOL 🚀

okl-verify:${address}:${nonce}

https://onchainkol.com`}
                    </pre>
                  </div>

                  {/* Copy button */}
                  <button
                    className="btn btn-secondary"
                    style={{ width:'100%', justifyContent:'center', marginBottom:'10px' }}
                    onClick={() => navigator.clipboard.writeText(tweetTemplate)}
                  >
                    📋 Copy Tweet Text
                  </button>

                  {/* Open Twitter button */}
                  <a
                    href={tweetLink}
                    target="_blank"
                    className="btn btn-primary"
                    style={{ width:'100%', justifyContent:'center', display:'flex', marginBottom:'24px' }}
                  >
                    🐦 Open Twitter to Post
                  </a>

                  {/* Privacy notice */}
                  <div style={{ padding:'12px 14px', background:'rgba(255,215,0,0.05)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:'3px', marginBottom:'20px' }}>
                    <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', color:'var(--accent3)', marginBottom:'4px' }}>⚠️ Privacy Notice</div>
                    <p style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.6, margin:0 }}>
                      By posting this tweet you are publicly linking your wallet address to your Twitter identity. This link will be visible to all OnchainKOL users. Only verify if you are comfortable with this public association.
                    </p>
                  </div>

                  {/* After posting */}
                  <div style={{ borderTop:'1px solid var(--border)', paddingTop:'20px' }}>
                    <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)', marginBottom:'8px' }}>
                      After posting the tweet:
                    </div>
                    <p style={{ fontSize:'13px', color:'var(--muted)', lineHeight:1.6, marginBottom:'12px' }}>
                      Copy the URL of your tweet from the browser and paste it below.
                    </p>
                    <input
                      className="input"
                      placeholder="https://twitter.com/yourhandle/status/123456789"
                      value={tweetUrl}
                      onChange={e => setTweetUrl(e.target.value)}
                      style={{ marginBottom:'10px' }}
                    />
                    {error && <div style={{ padding:'8px 12px', background:'rgba(255,61,107,0.1)', border:'1px solid rgba(255,61,107,0.2)', borderRadius:'3px', color:'var(--accent2)', fontSize:'13px', marginBottom:'10px' }}>{error}</div>}
                    <button
                      className="btn btn-primary"
                      style={{ width:'100%', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:'20px', letterSpacing:'2px' }}
                      onClick={() => { setStep('verify'); verifyTweet() }}
                      disabled={loading || !tweetUrl.trim()}
                    >
                      {loading ? 'Verifying...' : '✓ Verify My Tweet'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 — Verifying */}
              {step === 'verify' && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'32px', textAlign:'center' }}>
                  <div style={{ width:48, height:48, border:'4px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
                  <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', letterSpacing:'1px', marginBottom:'8px' }}>Verifying...</h2>
                  <p style={{ color:'var(--muted)', fontSize:'14px' }}>Reading your tweet and verifying your wallet address...</p>
                </div>
              )}

              {/* Step 5 — Pending admin approval */}
              {step === 'pending' && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'32px', textAlign:'center' }}>
                  <div style={{ fontSize:'48px', marginBottom:'16px' }}>⏳</div>
                  <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'28px', letterSpacing:'1px', marginBottom:'12px', color:'var(--accent3)' }}>
                    VERIFICATION SUBMITTED!
                  </h2>
                  <div style={{ padding:'14px 16px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'4px', marginBottom:'20px', textAlign:'left' }}>
                    {[
                      ['Twitter Handle', `@${handle}`],
                      ['Wallet',         truncateWallet(address || '', 6)],
                      ['Status',         'Pending Admin Review'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:'13px' }}>
                        <span style={{ color:'var(--muted)' }}>{k}</span>
                        <span style={{ fontFamily:'Barlow Condensed,sans-serif', fontWeight:700, letterSpacing:'0.5px', color: k === 'Status' ? 'var(--accent3)' : 'var(--text)' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding:'14px 16px', background:'rgba(0,229,255,0.05)', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'3px', marginBottom:'20px', textAlign:'left' }}>
                    <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'12px', fontWeight:700, letterSpacing:'1px', color:'var(--accent)', marginBottom:'8px' }}>What happens next:</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px', fontSize:'13px', color:'var(--muted)' }}>
                      <div>1. Admin reviews your Twitter follower count</div>
                      <div>2. 2,000+ followers → KOL Badge assigned</div>
                      <div>3. 5,000+ followers → KOL Crown Badge assigned</div>
                      <div>4. Badge limits apply (FCFS — 700 KOL, 300 Crown)</div>
                      <div>5. You'll be able to submit calls once approved</div>
                    </div>
                  </div>

                  <p style={{ fontSize:'13px', color:'var(--muted)', lineHeight:1.6, marginBottom:'20px' }}>
                    Review typically takes a few hours. Check your profile badge status or visit the KOL Zone to see if your badge has been assigned.
                  </p>

                  <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
                    <a href="/kol" className="btn btn-primary">Go to KOL Zone</a>
                    <a href="/" className="btn btn-secondary">Back to Explore</a>
                  </div>
                </div>
              )}

              {/* Badge requirements */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'24px', marginTop:'20px' }}>
                <div className="section-tag" style={{ marginBottom:'16px' }}>KOL Badge Requirements</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[
                    { badge:'kol',       label:'KOL Badge',       req:'2,000+ Twitter followers', limit:'700',  color:'#3b82f6' },
                    { badge:'kol_crown', label:'KOL Crown Badge',  req:'5,000+ Twitter followers', limit:'300',  color:'#ec4899' },
                  ].map(b => (
                    <div key={b.badge} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'3px' }}>
                      <BadgeImage badge={b.badge} size={40} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'15px', fontWeight:700, letterSpacing:'1px', color:b.color, marginBottom:'2px' }}>{b.label}</div>
                        <div style={{ fontSize:'12px', color:'var(--muted)' }}>{b.req} · FCFS limit: {b.limit}</div>
                      </div>
                      <div style={{ textAlign:'right', fontSize:'12px', color:'var(--muted)' }}>
                        <div style={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700, letterSpacing:'0.5px', color:'var(--accent)' }}>Earns</div>
                        <div>0.05% pool</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop:'14px', padding:'10px 12px', background:'rgba(255,215,0,0.05)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:'3px', fontSize:'12px', color:'var(--muted)', lineHeight:1.6 }}>
                  ⚠️ By verifying, you publicly link your wallet to your Twitter identity. This is visible to all users. KOL calls are free (~$0.001 gas). Earn 0.05% from the KOL reward pool based on call accuracy.
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
