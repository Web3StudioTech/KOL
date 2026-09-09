import { v4 as uuidv4 } from 'uuid'

// ── Badge types ───────────────────────────────────────────────
export type BadgeType = 'anon' | 'trader' | 'kol' | 'creator' | 'builder' | 'kol_crown'

// ── Badge labels ──────────────────────────────────────────────
export const BADGE_LABELS: Record<string, string> = {
  anon:      'Anon',
  trader:    'Trader',
  kol:       'KOL',
  creator:   'Creator',
  builder:   'Builder',
  kol_crown: 'KOL Crown',
}

// ── Badge emoji fallbacks ─────────────────────────────────────
export const BADGE_ICONS: Record<string, string> = {
  anon:      '👤',
  trader:    '💎',
  kol:       '💙',
  creator:   '🏆',
  builder:   '🏗️',
  kol_crown: '👑',
}

// ── Badge image paths ─────────────────────────────────────────
export const BADGE_IMAGES: Record<string, string> = {
  anon:      '/badges/anon-badge.png',
  trader:    '/badges/trader-badge.png',
  kol:       '/badges/kol-badge.png',
  creator:   '/badges/creator-badge.png',
  builder:   '/badges/builder-badge.png',
  kol_crown: '/badges/kol-crown-badge.png',
}

// ── Badge requirements ────────────────────────────────────────
export const BADGE_REQUIREMENTS: Record<string, string> = {
  anon:      '$10K trading volume · Limit 5,000',
  trader:    '$50K trading volume · Limit 2,500',
  kol:       '2,000+ Twitter followers · Limit 700',
  creator:   '$10M market cap · Limit 1,000',
  builder:   '$50M market cap · Limit 500',
  kol_crown: '5,000+ Twitter followers · Limit 300',
}

// ── Badge limits ──────────────────────────────────────────────
export const BADGE_LIMITS: Record<string, number> = {
  anon:      5000,
  trader:    2500,
  kol:       700,
  creator:   1000,
  builder:   500,
  kol_crown: 300,
}

// ── Badge colors ──────────────────────────────────────────────
export const BADGE_COLORS: Record<string, string> = {
  anon:      '#7c3aed',
  trader:    '#06b6d4',
  kol:       '#3b82f6',
  creator:   '#f59e0b',
  builder:   '#10b981',
  kol_crown: '#ec4899',
}

// ── Badge display order (highest to lowest) ───────────────────
export const BADGE_ORDER = ['kol_crown', 'builder', 'creator', 'kol', 'trader', 'anon']

// ── Helpers ───────────────────────────────────────────────────
export function generateNonce(): string { return `okl_${uuidv4().replace(/-/g,'').slice(0,16)}` }

export function truncateWallet(a: string, c = 4): string {
  if (!a || a.length < 10) return a
  return `${a.slice(0,c+2)}…${a.slice(-c)}`
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`
  return n.toString()
}

export function formatMktCap(usd: number): string {
  if (!usd || usd <= 0) return '$0'
  if (usd >= 1_000_000_000) return `$${(usd/1_000_000_000).toFixed(2)}B`
  if (usd >= 1_000_000) return `$${(usd/1_000_000).toFixed(2)}M`
  if (usd >= 1_000)     return `$${(usd/1_000).toFixed(1)}K`
  return `$${usd.toFixed(0)}`
}

export function buildSignMessage(wallet: string, nonce: string, action: string): string {
  return `OnchainKOL — ${action}\nWallet: ${wallet}\nNonce: ${nonce}\n\nThis will not trigger a blockchain transaction.`
}

export function formatKolAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0,8)}...${address.slice(-6)}`
}

// ── Get highest badge a user holds ───────────────────────────
export function getHighestBadge(badges: string[]): string {
  for (const badge of BADGE_ORDER) {
    if (badges.includes(badge)) return badge
  }
  return 'anon'
}
