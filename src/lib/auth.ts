import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { v4 as uuidv4 } from 'uuid'
import { SignMessagePayload } from '@/types'

// ── Build the message a wallet signs ─────────────────────────
export function buildSignMessage(payload: SignMessagePayload): string {
  return [
    `OnchainKOL verification`,
    `Wallet: ${payload.wallet}`,
    `Nonce: ${payload.nonce}`,
    `Timestamp: ${payload.timestamp}`,
    `Action: ${payload.action}`,
    ``,
    `This signature proves you control this wallet.`,
    `Cost: 0 SOL`
  ].join('\n')
}

// ── Verify a Solana wallet signature ─────────────────────────
export function verifyWalletSignature(
  message: string,
  signatureBase58: string,
  walletAddress: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = bs58.decode(signatureBase58)
    const publicKeyBytes = bs58.decode(walletAddress)
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  } catch {
    return false
  }
}

// ── Generate a one-time nonce ─────────────────────────────────
export function generateNonce(): string {
  return `okl_${uuidv4().replace(/-/g, '').slice(0, 16)}`
}

// ── Build the proof string embedded in the tweet ─────────────
export function buildProofString(
  walletAddress: string,
  nonce: string,
  signature: string
): string {
  return `okl-verify:${walletAddress}:${nonce}:${signature}`
}

// ── Parse a proof string from tweet text ─────────────────────
export function parseProofString(text: string): {
  wallet: string
  nonce: string
  signature: string
} | null {
  const match = text.match(/okl-verify:([A-Za-z0-9]+):([A-Za-z0-9_]+):([A-Za-z0-9]+)/)
  if (!match) return null
  return {
    wallet: match[1],
    nonce: match[2],
    signature: match[3]
  }
}

// ── Build a pre-filled tweet URL (free — no X API) ───────────
export function buildVerifyTweetUrl(
  walletAddress: string,
  nonce: string,
  signature: string
): string {
  const proofString = buildProofString(walletAddress, nonce, signature)
  const text = `Verifying my identity on @onchainkol\n\n${proofString}\n\nonchainkol.com`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

// ── Build a call tweet URL ────────────────────────────────────
export function buildCallTweetUrl(
  ticker: string,
  mktcap: number,
  callId: string,
  thesis?: string
): string {
  const mktcapStr = mktcap >= 1000000
    ? `$${(mktcap / 1000000).toFixed(1)}M`
    : `$${(mktcap / 1000).toFixed(0)}K`

  const text = [
    `Calling ${ticker} at ${mktcapStr} market cap on @onchainkol`,
    thesis ? `\n${thesis}` : '',
    `\n\nVerified onchain call 👇`,
    `onchainkol.com/call/${callId}`
  ].join('')

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

// ── Truncate wallet address for display ──────────────────────
export function truncateWallet(address: string, chars = 4): string {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`
}

// ── Format follower count ─────────────────────────────────────
export function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toString()
}

// ── Format market cap ─────────────────────────────────────────
export function formatMktCap(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`
  return `$${usd.toFixed(0)}`
}
