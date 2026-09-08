'use client'
import type React from 'react'

const BADGE_IMAGES: Record<string, string> = {
  anon:   '/badges/anon-badge.png',
  kol:    '/badges/kol-badge.png',
  trader: '/badges/trader-badge.png',
}

const BADGE_LABELS: Record<string, string> = {
  anon:   'Anon',
  kol:    'KOL',
  trader: 'Trader',
}

interface BadgeImageProps {
  badge: string
  size?: number        // px size, default 24
  showLabel?: boolean  // show text label next to badge
  className?: string
}

export default function BadgeImage({
  badge,
  size = 24,
  showLabel = false,
  className = ''
}: BadgeImageProps) {
  const src = BADGE_IMAGES[badge] || BADGE_IMAGES.anon
  const label = BADGE_LABELS[badge] || 'Anon'

  // Badge wrapper — always dark pill so badge looks correct on both themes
  // The badges have white/light backgrounds so we wrap them in a dark rounded container
  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: showLabel ? '6px' : '0',
    background: '#080b0f',
    borderRadius: size * 0.5 + 'px',
    padding: showLabel ? '2px 8px 2px 2px' : '2px',
    border: badge === 'kol'
      ? '1px solid rgba(59,130,246,0.4)'
      : badge === 'trader'
        ? '1px solid rgba(0,229,255,0.4)'
        : '1px solid rgba(255,255,255,0.1)',
  }

  const imgStyle: React.CSSProperties = {
    width: size,
    height: size,
    objectFit: 'contain',
    flexShrink: 0,
    borderRadius: size * 0.4 + 'px',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Barlow Condensed, sans-serif',
    fontSize: Math.max(10, size * 0.5) + 'px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: badge === 'kol'
      ? '#3b82f6'
      : badge === 'trader'
        ? '#00e5ff'
        : '#6b8a9e',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={wrapperStyle} className={className} title={label}>
      <img
        src={src}
        alt={label + ' badge'}
        style={imgStyle}
      />
      {showLabel && (
        <span style={labelStyle}>{label}</span>
      )}
    </div>
  )
}
