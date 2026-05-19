// ============================================================
// OnchainKOL — TypeScript Types
// ============================================================

export type Badge = 'anon' | 'twitter_verified' | 'kol'
export type TokenStatus = 'bonding' | 'graduated' | 'dead'
export type AccuracyStatus = 'pending' | 'hit' | 'partial' | 'miss'

// ── Database row types ────────────────────────────────────────

export interface Launcher {
  id: string
  wallet_address: string
  twitter_handle: string | null
  twitter_id: string | null
  twitter_avatar_url: string | null
  follower_count: number
  badge: Badge
  verified_at: string | null
  verification_tweet: string | null
  is_banned: boolean
  ban_reason: string | null
  earnings_sol: number
  created_at: string
  updated_at: string
}

export interface LauncherPublic {
  id: string
  wallet_address: string
  twitter_handle: string | null
  twitter_avatar_url: string | null
  follower_count: number
  badge: Badge
  verified_at: string | null
  created_at: string
}

export interface Token {
  id: string
  launcher_id: string
  name: string
  ticker: string
  description: string | null
  image_url: string | null
  mint_address: string | null
  tx_signature: string | null
  status: TokenStatus
  market_cap_usd: number
  price_sol: number
  volume_24h_usd: number
  holder_count: number
  bonding_pct: number
  kol_call_count: number
  created_at: string
  updated_at: string
}

export interface TokenWithLauncher extends Token {
  twitter_handle: string | null
  twitter_avatar_url: string | null
  follower_count: number
  badge: Badge
  launcher_wallet: string
}

export interface KolCall {
  id: string
  launcher_id: string
  token_id: string
  thesis: string | null
  mktcap_at_call: number
  price_at_call: number
  wallet_signature: string
  tweet_url: string | null
  onchain_tx: string | null
  accuracy_status: AccuracyStatus
  price_24h_after: number | null
  multiplier: number | null
  reward_sol: number
  reward_paid_at: string | null
  called_at: string
}

export interface Nonce {
  wallet_address: string
  nonce: string
  expires_at: string
  created_at: string
}

// ── API request/response types ────────────────────────────────

export interface LaunchTokenRequest {
  name: string
  ticker: string
  description?: string
  image_url?: string
  initial_buy_sol?: number
}

export interface VerifyTwitterRequest {
  tweet_url: string
  wallet_address: string
}

export interface SubmitCallRequest {
  token_id: string
  thesis?: string
  wallet_signature: string
  tweet_url?: string
}

export interface SignMessagePayload {
  wallet: string
  nonce: string
  timestamp: string
  action: 'verify_twitter' | 'submit_call' | 'launch_token'
}

// ── UI state types ────────────────────────────────────────────

export interface WalletState {
  address: string | null
  connected: boolean
  connecting: boolean
}

export interface LauncherSession {
  launcher: Launcher | null
  loading: boolean
}

// ── Filter types ──────────────────────────────────────────────

export type TokenSortBy = 'trending' | 'new' | 'kol_called' | 'graduating'
export type BadgeFilter = 'all' | Badge
