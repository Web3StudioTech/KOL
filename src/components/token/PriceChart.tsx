'use client'
import { useEffect, useRef, useState } from 'react'

interface PricePoint {
  time:  number
  open:  number
  high:  number
  low:   number
  close: number
}

interface PriceChartProps {
  tokenId:  string
  ticker:   string
  priceEth: number
}

const INTERVALS = [
  { label: '1H',  value: '1h'  },
  { label: '4H',  value: '4h'  },
  { label: '1D',  value: '1d'  },
  { label: '1W',  value: '1w'  },
]

export default function PriceChart({ tokenId, ticker, priceEth }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [interval, setInterval]   = useState('1h')
  const [loading, setLoading]     = useState(true)
  const [noData, setNoData]       = useState(false)
  const [currentPrice, setPrice]  = useState(priceEth)
  const [priceChange, setChange]  = useState(0)

  useEffect(() => {
    setLoading(true)

    // Fetch trade history for chart
    fetch(`/api/tokens/${tokenId}/trades?interval=${interval}`)
      .then(r => r.json())
      .then(data => {
        const candles: PricePoint[] = data.candles || []

        if (candles.length === 0) {
          setNoData(true)
          setLoading(false)
          return
        }

        setNoData(false)

        // Calculate price change
        const first = candles[0]?.close || 0
        const last  = candles[candles.length - 1]?.close || 0
        const pct   = first > 0 ? ((last - first) / first) * 100 : 0
        setChange(pct)
        setPrice(last)

        renderChart(candles)
        setLoading(false)
      })
      .catch(() => {
        setNoData(true)
        setLoading(false)
      })
  }, [tokenId, interval])

  function renderChart(candles: PricePoint[]) {
    if (!containerRef.current) return

    // Clear previous chart
    containerRef.current.innerHTML = ''

    // Simple SVG candlestick chart (no external library needed)
    const W = containerRef.current.clientWidth || 600
    const H = 240
    const PAD = { top: 20, right: 60, bottom: 30, left: 10 }
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    const prices = candles.flatMap(c => [c.high, c.low])
    const minP   = Math.min(...prices)
    const maxP   = Math.max(...prices)
    const range  = maxP - minP || 1

    const scaleY = (p: number) => PAD.top + chartH - ((p - minP) / range) * chartH
    const candleW = Math.max(2, Math.floor(chartW / candles.length) - 2)
    const stepX   = chartW / candles.length

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width',  '100%')
    svg.setAttribute('height', H.toString())
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (chartH / 4) * i
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', PAD.left.toString())
      line.setAttribute('x2', (W - PAD.right).toString())
      line.setAttribute('y1', y.toString())
      line.setAttribute('y2', y.toString())
      line.setAttribute('stroke', '#1e2d3d')
      line.setAttribute('stroke-width', '1')
      svg.appendChild(line)

      // Price label
      const price = maxP - (range / 4) * i
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', (W - PAD.right + 4).toString())
      text.setAttribute('y', (y + 4).toString())
      text.setAttribute('fill', '#6b8a9e')
      text.setAttribute('font-size', '9')
      text.setAttribute('font-family', 'Courier New, monospace')
      text.textContent = price.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')
      svg.appendChild(text)
    }

    // Candles
    candles.forEach((c, i) => {
      const x = PAD.left + i * stepX + stepX / 2
      const isGreen = c.close >= c.open
      const color   = isGreen ? '#00e5a0' : '#ff3d6b'

      // Wick
      const wick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      wick.setAttribute('x1', x.toString())
      wick.setAttribute('x2', x.toString())
      wick.setAttribute('y1', scaleY(c.high).toString())
      wick.setAttribute('y2', scaleY(c.low).toString())
      wick.setAttribute('stroke', color)
      wick.setAttribute('stroke-width', '1')
      svg.appendChild(wick)

      // Body
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      const bodyTop = scaleY(Math.max(c.open, c.close))
      const bodyH   = Math.max(1, Math.abs(scaleY(c.open) - scaleY(c.close)))
      body.setAttribute('x', (x - candleW / 2).toString())
      body.setAttribute('y', bodyTop.toString())
      body.setAttribute('width', candleW.toString())
      body.setAttribute('height', bodyH.toString())
      body.setAttribute('fill', color)
      body.setAttribute('rx', '1')
      svg.appendChild(body)
    })

    containerRef.current.appendChild(svg)
  }

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'4px', padding:'16px 20px', marginBottom:'16px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'baseline', gap:'10px' }}>
            <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'24px', letterSpacing:'1px' }}>
              {currentPrice.toFixed(9)} ETH
            </span>
            <span style={{
              fontFamily:'Barlow Condensed,sans-serif', fontSize:'13px', fontWeight:700,
              color: priceChange >= 0 ? 'var(--green)' : 'var(--red)'
            }}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
          <div style={{ fontSize:'11px', color:'var(--muted)', fontFamily:'Barlow Condensed,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>
            ${ticker} Price
          </div>
        </div>

        {/* Interval selector */}
        <div style={{ display:'flex', gap:'4px' }}>
          {INTERVALS.map(iv => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              style={{
                padding:'4px 10px',
                fontFamily:'Barlow Condensed,sans-serif',
                fontSize:'11px',
                fontWeight:700,
                letterSpacing:'1px',
                background: interval === iv.value ? 'var(--accent)' : 'var(--bg3)',
                color: interval === iv.value ? '#000' : 'var(--muted)',
                border: `1px solid ${interval === iv.value ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius:'2px',
                cursor:'pointer',
              }}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div style={{ height:'240px', position:'relative' }}>
        {loading && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:24, height:24, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && noData && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'32px', color:'var(--border)', marginBottom:'8px' }}>NO TRADES YET</div>
            <p style={{ fontSize:'13px' }}>Chart will appear once trading begins.</p>
          </div>
        )}

        <div ref={containerRef} style={{ width:'100%', height:'100%' }} />
      </div>
    </div>
  )
}
