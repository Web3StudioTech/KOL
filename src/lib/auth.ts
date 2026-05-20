import { v4 as uuidv4 } from 'uuid'

export function generateNonce(): string {
  return `okl_${uuidv4().replace(/-/g, '').slice(0, 16)}`
}

export function buildSignMessage(wallet: string, nonce: string, action: string): string {
  return [
    `OnchainKOL — ${action}`,
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    ``,
    `This request will not trigger a blockchain transaction or cost any gas fees.`
  ].join('\n')
}

export function buildVerifyTweetUrl(wallet: string, nonce: string, signature: string): string {
  const proof = `okl-verify:${wallet}:${nonce}:${signature}`
  const text = `Verifying my identity on @onchainkol\n\n${proof}\n\nonchainkol.com`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

export function buildCallTweetUrl(ticker: string, mktcap: number, callId: string, thesis?: string): string {
  const mc = mktcap >= 1000000
    ? `$${(mktcap / 1000000).toFixed(1)}M`
    : `$${(mktcap / 1000).toFixed(0)}K`
  const text = `Calling ${ticker} at ${mc} mkt cap on @onchainkol${thesis ? `\n\n${thesis}` : ''}\n\nVerified onchain call 👇\nonchainkol.com/call/${callId}`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

export function truncateWallet(address: string, chars = 4): string {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`
}

export function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toString()
}

export function formatMktCap(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`
  return `$${usd.toFixed(0)}`
}

export function formatSOL(lamports: number): string {
  return `${(lamports / 1e9).toFixed(4)} SOL`
}

export const BADGE_LABELS: Record<string, string> = {
  anon: 'Anon',
  verified: 'Verified',
  kol: 'KOL',
  pro_kol: 'Pro KOL',
  gold_kol: 'Gold KOL'
}

export const BADGE_ICONS: Record<string, string> = {
  anon: '👤',
  verified: '✓',
  kol: '💙',
  pro_kol: '💜',
  gold_kol: '🥇'
}
