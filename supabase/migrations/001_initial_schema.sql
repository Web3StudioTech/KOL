-- ============================================================
-- OnchainKOL — Complete Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- LAUNCHERS TABLE
-- Anyone who deploys a token. May or may not have Twitter.
-- ============================================================
CREATE TABLE launchers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address      TEXT UNIQUE NOT NULL,

  -- Twitter identity (nullable — anon launchers have none)
  twitter_handle      TEXT UNIQUE,
  twitter_id          TEXT UNIQUE,          -- numeric, stable even if handle changes
  twitter_avatar_url  TEXT,
  follower_count      INTEGER DEFAULT 0,

  -- Badge: anon | twitter_verified | kol
  badge               TEXT NOT NULL DEFAULT 'anon'
                      CHECK (badge IN ('anon','twitter_verified','kol')),

  -- Verification proof (hidden from public)
  verified_at         TIMESTAMPTZ,
  verification_tweet  TEXT,                -- proof tweet URL

  -- Admin
  is_banned           BOOLEAN NOT NULL DEFAULT false,
  ban_reason          TEXT,
  ban_at              TIMESTAMPTZ,

  -- Earnings (hidden from public, visible to self)
  earnings_sol        NUMERIC(18,9) DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TOKENS TABLE
-- Every token launched on the platform
-- ============================================================
CREATE TABLE tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  launcher_id     UUID NOT NULL REFERENCES launchers(id),

  -- Token identity
  name            TEXT NOT NULL,
  ticker          TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,

  -- Solana
  mint_address    TEXT UNIQUE,             -- set after on-chain deploy
  tx_signature    TEXT,                    -- launch transaction

  -- Bonding curve state
  status          TEXT NOT NULL DEFAULT 'bonding'
                  CHECK (status IN ('bonding','graduated','dead')),
  market_cap_usd  NUMERIC(18,2) DEFAULT 0,
  price_sol       NUMERIC(18,9) DEFAULT 0,
  volume_24h_usd  NUMERIC(18,2) DEFAULT 0,
  holder_count    INTEGER DEFAULT 0,
  bonding_pct     NUMERIC(5,2) DEFAULT 0,  -- 0-100

  -- KOL call count (denormalized for speed)
  kol_call_count  INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KOL_CALLS TABLE
-- Every call a KOL makes on a token
-- ============================================================
CREATE TABLE kol_calls (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  launcher_id       UUID NOT NULL REFERENCES launchers(id),  -- the KOL
  token_id          UUID NOT NULL REFERENCES tokens(id),

  -- Call content
  thesis            TEXT,                   -- why they're calling it
  mktcap_at_call    NUMERIC(18,2),          -- snapshot at T=0
  price_at_call     NUMERIC(18,9),

  -- Proof
  wallet_signature  TEXT NOT NULL,          -- cryptographic proof
  tweet_url         TEXT,                   -- public proof tweet
  onchain_tx        TEXT,                   -- optional Solana tx

  -- Accuracy (computed 24h later by cron)
  accuracy_status   TEXT NOT NULL DEFAULT 'pending'
                    CHECK (accuracy_status IN ('pending','hit','partial','miss')),
  price_24h_after   NUMERIC(18,9),
  multiplier        NUMERIC(8,2),           -- price_24h / price_at_call

  -- Reward
  reward_sol        NUMERIC(18,9) DEFAULT 0,
  reward_paid_at    TIMESTAMPTZ,

  called_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NONCES TABLE (verification handshake)
-- Short-lived — cleared after use or expiry
-- ============================================================
CREATE TABLE nonces (
  wallet_address  TEXT PRIMARY KEY,
  nonce           TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLATFORM_STATS TABLE (materialized for dashboard)
-- ============================================================
CREATE TABLE platform_stats (
  id              SERIAL PRIMARY KEY,
  stat_date       DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  volume_usd      NUMERIC(18,2) DEFAULT 0,
  tokens_launched INTEGER DEFAULT 0,
  kol_calls       INTEGER DEFAULT 0,
  fees_earned_sol NUMERIC(18,9) DEFAULT 0,
  kol_rewards_sol NUMERIC(18,9) DEFAULT 0
);

-- ============================================================
-- PUBLIC VIEW — safe columns only, no banned accounts
-- Frontend always queries this, never the raw table
-- ============================================================
CREATE VIEW launchers_public AS
SELECT
  id,
  wallet_address,
  twitter_handle,
  twitter_avatar_url,
  follower_count,
  badge,
  verified_at,
  created_at
FROM launchers
WHERE is_banned = false;

CREATE VIEW tokens_with_launcher AS
SELECT
  t.*,
  lp.twitter_handle,
  lp.twitter_avatar_url,
  lp.follower_count,
  lp.badge,
  lp.wallet_address AS launcher_wallet
FROM tokens t
JOIN launchers_public lp ON lp.id = t.launcher_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE launchers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kol_calls    ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonces       ENABLE ROW LEVEL SECURITY;

-- Launchers: public can read non-sensitive columns via the view
-- The view itself handles filtering banned accounts
CREATE POLICY "public_read_launchers"
  ON launchers FOR SELECT
  USING (true);  -- view does the column filtering

-- Launchers: only self can update own row
CREATE POLICY "self_update_launcher"
  ON launchers FOR UPDATE
  USING (wallet_address = current_setting('app.wallet', true));

-- Launchers: anyone can insert (wallet connects = creates row)
CREATE POLICY "insert_launcher"
  ON launchers FOR INSERT
  WITH CHECK (true);

-- Tokens: public read all
CREATE POLICY "public_read_tokens"
  ON tokens FOR SELECT
  USING (true);

-- Tokens: only launcher can insert their own
CREATE POLICY "launcher_insert_token"
  ON tokens FOR INSERT
  WITH CHECK (
    launcher_id = (
      SELECT id FROM launchers
      WHERE wallet_address = current_setting('app.wallet', true)
    )
  );

-- KOL calls: public read
CREATE POLICY "public_read_calls"
  ON kol_calls FOR SELECT
  USING (true);

-- KOL calls: only the caller can insert
CREATE POLICY "kol_insert_call"
  ON kol_calls FOR INSERT
  WITH CHECK (
    launcher_id = (
      SELECT id FROM launchers
      WHERE wallet_address = current_setting('app.wallet', true)
    )
  );

-- Nonces: only service role touches these
CREATE POLICY "service_only_nonces"
  ON nonces FOR ALL
  USING (false);  -- blocked for all anon/user roles; service role bypasses

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_tokens_launcher     ON tokens(launcher_id);
CREATE INDEX idx_tokens_status       ON tokens(status);
CREATE INDEX idx_tokens_created      ON tokens(created_at DESC);
CREATE INDEX idx_tokens_mktcap       ON tokens(market_cap_usd DESC);
CREATE INDEX idx_kol_calls_token     ON kol_calls(token_id);
CREATE INDEX idx_kol_calls_launcher  ON kol_calls(launcher_id);
CREATE INDEX idx_kol_calls_called_at ON kol_calls(called_at DESC);
CREATE INDEX idx_launchers_badge     ON launchers(badge);
CREATE INDEX idx_launchers_wallet    ON launchers(wallet_address);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_launchers_updated
  BEFORE UPDATE ON launchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tokens_updated
  BEFORE UPDATE ON tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGERS: auto-assign badge based on follower count
-- ============================================================
CREATE OR REPLACE FUNCTION assign_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.twitter_handle IS NULL THEN
    NEW.badge = 'anon';
  ELSIF NEW.follower_count >= 1000 THEN
    NEW.badge = 'kol';
  ELSE
    NEW.badge = 'twitter_verified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assign_badge
  BEFORE INSERT OR UPDATE OF twitter_handle, follower_count
  ON launchers
  FOR EACH ROW EXECUTE FUNCTION assign_badge();

-- ============================================================
-- TRIGGERS: increment kol_call_count on token
-- ============================================================
CREATE OR REPLACE FUNCTION increment_call_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tokens SET kol_call_count = kol_call_count + 1
  WHERE id = NEW.token_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_call_count
  AFTER INSERT ON kol_calls
  FOR EACH ROW EXECUTE FUNCTION increment_call_count();
