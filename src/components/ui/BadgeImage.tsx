'use client'
import type React from 'react'
import { BADGE_IMAGES, BADGE_LABELS, BADGE_COLORS } from '@/lib/auth'

interface BadgeImageProps {
  badge: string
  size?: number
  showLabel?: boolean
  className?: string
}

export default function BadgeImage({
  badge,
  size = 24,
  showLabel = false,
  className = ''
}: BadgeImageProps) {
  const src   = BADGE_IMAGES[badge] || BADGE_IMAGES.anon
  const label = BADGE_LABELS[badge] || 'Anon'
  const color = BADGE_COLORS[badge] || '#6b8a9e'

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: showLabel ? '6px' : '0',
    background: '#080b0f',
    borderRadius: size * 0.5 + 'px',
    padding: showLabel ? '2px 8px 2px 2px' : '2px',
    border: `1px solid ${color}40`,
    flexShrink: 0,
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
    color,
    whiteSpace: 'nowrap',
  }

  return (
    <div style={wrapperStyle} className={className} title={label}>
      <img src={src} alt={label + ' badge'} style={imgStyle} />
      {showLabel && <span style={labelStyle}>{label}</span>}
    </div>
  )
}
