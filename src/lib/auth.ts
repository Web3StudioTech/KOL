import { v4 as uuidv4 } from 'uuid'
export const BADGE_LABELS: Record<string, string> = { anon: 'Anon', kol: 'KOL', trader: 'Trader' }
export const BADGE_ICONS:  Record<string, string> = { anon: '👤', kol: '💙', trader: '💎' }
export function generateNonce(): string { return `okl_${uuidv4().replace(/-/g,'').slice(0,16)}` }
export function truncateWallet(a: string, c = 4): string { return `${a.slice(0,c+2)}…${a.slice(-c)}` }
export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`
  return n.toString()
}
export function formatMktCap(usd: number): string {
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
