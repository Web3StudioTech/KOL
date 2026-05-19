-- ============================================================
-- OnchainKOL — Complete Database Schema v2
-- Includes: launchers, tokens, calls, points, votes, KOL pass
-- Run in Supabase SQL editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- LAUNCHERS
-- ============================================================
CREATE TABLE launchers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address      TEXT UNIQUE NOT NULL,

  -- Twitter identity
  twitter_handle      TEXT UNIQUE,
  twitter_id          TEXT UNIQUE,
  twitter_avatar_url  TEXT,
  follower_count      INTEGER DEFAULT 0,

  -- Badge: anon | verified | kol | pro_kol | gold_kol
  badge               TEXT NOT NULL DEFAULT 'anon'
                      CHECK (badge IN ('anon','verified','kol','pro_kol','gold_kol')),

  -- Gold KOL manual approval
  gold_kol_applied_at  TIMESTAMPTZ,
  gold_kol_approved_at TIMESTAMPTZ,
  gold_kol_approved_by TEXT,
  gold_kol_rejected_at TIMESTAMPTZ,
  gold_kol_reject_reason TEXT,

  -- Verification
  verified_at         TIMESTAMPTZ,
  verification_tweet  TEXT,

  -- Admin
  is_banned           BOOLEAN NOT NULL DEFAULT false,
  ban_reason          TEXT,
  ban_at              TIMESTAMPTZ,

  -- Earnings (hidden from public)
  earnings_sol        NUMERIC(18,9) DEFAULT 0,

  -- Referral
  referral_code       TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  referred_by         TEXT REFERENCES launchers(wallet_address),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TOKENS
-- ============================================================
CREATE TABLE tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  launcher_id     UUID NOT NULL REFERENCES launchers(id),

  -- Identity
  name            TEXT NOT NULL,
  ticker          TEXT NOT NULL,
  tagline         TEXT,
  description     TEXT,
  category        TEXT CHECK (category IN (
                    'meme','ai','gaming','music','sports',
                    'political','animal','defi','art','other'
                  )),

  -- Media
  image_url       TEXT,
  banner_url      TEXT,

  -- Social links
  website_url     TEXT,
  twitter_url     TEXT,
  telegram_url    TEXT,
  discord_url     TEXT,
  youtube_url     TEXT,
  tiktok_url      TEXT,
  github_url      TEXT,

  -- Solana
  mint_address    TEXT UNIQUE,
  tx_signature    TEXT,

  -- Status
  status          TEXT NOT NULL DEFAULT 'bonding'
                  CHECK (status IN ('bonding','graduated','dead')),

  -- Market data
  market_cap_usd  NUMERIC(18,2) DEFAULT 0,
  price_sol       NUMERIC(18,9) DEFAULT 0,
  volume_24h_usd  NUMERIC(18,2) DEFAULT 0,
  volume_total_usd NUMERIC(18,2) DEFAULT 0,
  holder_count    INTEGER DEFAULT 0,
  bonding_pct     NUMERIC(5,2) DEFAULT 0,
  kol_call_count  INTEGER DEFAULT 0,

  -- KOL Pass
  kol_pass_earned      BOOLEAN DEFAULT false,
  kol_pass_earned_at   TIMESTAMPTZ,
  kol_pass_number      INTEGER UNIQUE,
  kol_pass_status      TEXT DEFAULT 'none'
                       CHECK (kol_pass_status IN ('none','active','frozen','burned','community')),

  -- Rug detection
  rug_detected_at      TIMESTAMPTZ,
  rug_trigger          TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KOL CALLS
-- ============================================================
CREATE TABLE kol_calls (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  launcher_id       UUID NOT NULL REFERENCES launchers(id),
  token_id          UUID NOT NULL REFERENCES tokens(id),

  thesis            TEXT,
  mktcap_at_call    NUMERIC(18,2),
  price_at_call     NUMERIC(18,9),

  -- Proof
  wallet_signature  TEXT NOT NULL,
  tweet_url         TEXT,
  onchain_tx        TEXT,

  -- Accuracy
  accuracy_status   TEXT NOT NULL DEFAULT 'pending'
                    CHECK (accuracy_status IN ('pending','hit','partial','miss')),
  price_24h_after   NUMERIC(18,9),
  multiplier        NUMERIC(8,2),

  -- Reward
  reward_sol        NUMERIC(18,9) DEFAULT 0,
  reward_paid_at    TIMESTAMPTZ,

  called_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMMUNITY VOTES (rug detection)
-- ============================================================
CREATE TABLE community_votes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id          UUID NOT NULL REFERENCES tokens(id),

  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','completed','failed_quorum')),

  -- Snapshot
  snapshot_block    TEXT,
  snapshot_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_eligible_wallets INTEGER DEFAULT 0,
  total_eligible_tokens  NUMERIC(18,9) DEFAULT 0,

  -- Results
  burn_votes        NUMERIC(18,9) DEFAULT 0,
  community_votes   NUMERIC(18,9) DEFAULT 0,
  burn_wallet_count INTEGER DEFAULT 0,
  community_wallet_count INTEGER DEFAULT 0,

  -- Quorum (10% of unique holders)
  quorum_required   INTEGER DEFAULT 0,
  quorum_reached    BOOLEAN DEFAULT false,

  -- Outcome
  outcome           TEXT CHECK (outcome IN ('burn','community','quorum_failed')),
  executed_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual vote records
CREATE TABLE vote_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vote_id           UUID NOT NULL REFERENCES community_votes(id),
  wallet_address    TEXT NOT NULL,
  token_balance     NUMERIC(18,9) NOT NULL,
  vote_choice       TEXT NOT NULL CHECK (vote_choice IN ('burn','community')),
  wallet_signature  TEXT NOT NULL,
  voted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vote_id, wallet_address)
);

-- ============================================================
-- POINTS CONFIGURATION (versioned, admin-editable)
-- ============================================================
CREATE TABLE points_config (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version           INTEGER NOT NULL UNIQUE,
  is_active         BOOLEAN DEFAULT false,

  -- Weights (sum to 100)
  volume_weight     NUMERIC DEFAULT 70,
  social_weight     NUMERIC DEFAULT 20,
  age_weight        NUMERIC DEFAULT 5,
  active_weight     NUMERIC DEFAULT 5,

  -- Volume rates
  points_per_sol              NUMERIC DEFAULT 100,
  bonding_curve_multiplier    NUMERIC DEFAULT 1.0,
  kolswap_multiplier          NUMERIC DEFAULT 1.2,
  early_buyer_multiplier      NUMERIC DEFAULT 1.5,
  gold_token_multiplier       NUMERIC DEFAULT 1.3,
  trading_streak_multiplier   NUMERIC DEFAULT 2.0,

  -- Trader tier thresholds (SOL)
  silver_threshold_sol        NUMERIC DEFAULT 10,
  gold_threshold_sol          NUMERIC DEFAULT 100,
  diamond_threshold_sol       NUMERIC DEFAULT 1000,

  -- Trader tier bonuses (%)
  silver_bonus_pct            NUMERIC DEFAULT 10,
  gold_bonus_pct              NUMERIC DEFAULT 25,
  diamond_bonus_pct           NUMERIC DEFAULT 50,

  -- Social points
  pts_launch_token            NUMERIC DEFAULT 500,
  pts_token_graduates         NUMERIC DEFAULT 1000,
  pts_token_hits_1m           NUMERIC DEFAULT 5000,
  pts_verified_badge          NUMERIC DEFAULT 200,
  pts_kol_badge               NUMERIC DEFAULT 500,
  pts_pro_kol_badge           NUMERIC DEFAULT 1000,
  pts_gold_kol_badge          NUMERIC DEFAULT 5000,
  pts_call_submitted          NUMERIC DEFAULT 50,
  pts_call_hit                NUMERIC DEFAULT 200,
  pts_call_partial            NUMERIC DEFAULT 100,
  pts_referral_joined         NUMERIC DEFAULT 300,
  pts_referral_traded         NUMERIC DEFAULT 500,
  pts_hold_kol_pass_daily     NUMERIC DEFAULT 100,
  pts_vote_cast               NUMERIC DEFAULT 50,
  pts_vote_winner             NUMERIC DEFAULT 25,
  pts_streak_5_hits           NUMERIC DEFAULT 500,
  pts_streak_10_hits          NUMERIC DEFAULT 2000,

  -- Age points per day
  pts_age_day_1_30            NUMERIC DEFAULT 10,
  pts_age_day_31_90           NUMERIC DEFAULT 20,
  pts_age_day_91_180          NUMERIC DEFAULT 35,
  pts_age_day_181_365         NUMERIC DEFAULT 50,
  pts_age_day_365_plus        NUMERIC DEFAULT 75,

  -- Active streak points per day
  pts_active_day_1_30         NUMERIC DEFAULT 5,
  pts_active_day_31_60        NUMERIC DEFAULT 10,
  pts_active_day_61_90        NUMERIC DEFAULT 15,
  pts_active_day_91_plus      NUMERIC DEFAULT 20,

  -- Active streak bonuses
  pts_streak_7_days           NUMERIC DEFAULT 50,
  pts_streak_30_days          NUMERIC DEFAULT 300,
  pts_streak_100_days         NUMERIC DEFAULT 1500,
  pts_streak_365_days         NUMERIC DEFAULT 10000,

  -- Anti-gaming
  min_trade_sol               NUMERIC DEFAULT 0.01,
  inactivity_decay_days       INTEGER DEFAULT 90,
  inactivity_decay_pct        NUMERIC DEFAULT 10,
  wallet_min_age_days         INTEGER DEFAULT 7,

  -- KOL badge thresholds
  kol_follower_threshold      INTEGER DEFAULT 1000,
  pro_kol_follower_threshold  INTEGER DEFAULT 10000,
  gold_kol_follower_threshold INTEGER DEFAULT 50000,

  -- Rug detection thresholds
  rug_creator_sell_pct        NUMERIC DEFAULT 50,
  rug_liquidity_pull_pct      NUMERIC DEFAULT 50,
  rug_coordinated_wallets     INTEGER DEFAULT 3,
  rug_coordinated_hours       INTEGER DEFAULT 1,

  -- Vote settings
  vote_duration_hours         INTEGER DEFAULT 72,
  vote_quorum_pct             NUMERIC DEFAULT 10,

  -- KOL Pass
  kol_pass_volume_threshold   NUMERIC DEFAULT 1000000,
  kol_pass_max_supply         INTEGER DEFAULT 10000,

  -- Graduation
  graduation_market_cap_usd   NUMERIC DEFAULT 69000,

  -- Metadata
  notes                       TEXT,
  created_by                  TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  activated_at                TIMESTAMPTZ,
  superseded_at               TIMESTAMPTZ
);

-- ============================================================
-- POINTS TABLES
-- ============================================================

-- Master points balance
CREATE TABLE wallet_points (
  wallet_address      TEXT PRIMARY KEY,
  volume_points_raw   NUMERIC DEFAULT 0,
  social_points_raw   NUMERIC DEFAULT 0,
  age_points_raw      NUMERIC DEFAULT 0,
  active_points_raw   NUMERIC DEFAULT 0,
  total_points        NUMERIC DEFAULT 0,
  trader_tier         TEXT DEFAULT 'none'
                      CHECK (trader_tier IN ('none','bronze','silver','gold','diamond')),
  total_sol_traded    NUMERIC DEFAULT 0,
  current_streak      INTEGER DEFAULT 0,
  longest_streak      INTEGER DEFAULT 0,
  consecutive_hits    INTEGER DEFAULT 0,
  is_flagged          BOOLEAN DEFAULT false,
  flag_reason         TEXT,
  last_calculated     TIMESTAMPTZ,
  config_version      INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Every points event (raw data — never deleted)
CREATE TABLE points_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address    TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  event_category    TEXT NOT NULL
                    CHECK (event_category IN ('volume','social','age','active')),
  points_raw        NUMERIC NOT NULL,
  multiplier        NUMERIC DEFAULT 1.0,
  reference_id      TEXT,
  reference_type    TEXT,
  metadata          JSONB,
  config_version    INTEGER,
  earned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily active tracking
CREATE TABLE wallet_active_days (
  wallet_address    TEXT NOT NULL,
  active_date       DATE NOT NULL,
  streak_day        INTEGER DEFAULT 1,
  points_earned     NUMERIC DEFAULT 0,
  PRIMARY KEY (wallet_address, active_date)
);

-- Wallet activity days (for age calculation)
CREATE TABLE wallet_activity_days (
  wallet_address    TEXT NOT NULL,
  active_date       DATE NOT NULL,
  tx_count          INTEGER DEFAULT 0,
  volume_sol        NUMERIC DEFAULT 0,
  PRIMARY KEY (wallet_address, active_date)
);

-- Airdrop snapshots
CREATE TABLE airdrop_snapshots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_name     TEXT NOT NULL,
  snapshot_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  config_version    INTEGER NOT NULL,
  total_wallets     INTEGER DEFAULT 0,
  total_points      NUMERIC DEFAULT 0,
  top_wallet        TEXT,
  top_wallet_points NUMERIC DEFAULT 0,
  data              JSONB,
  created_by        TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Points config recalculation log
CREATE TABLE points_recalculations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_version      INTEGER,
  to_version        INTEGER NOT NULL,
  wallets_processed INTEGER DEFAULT 0,
  events_processed  INTEGER DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  triggered_by      TEXT,
  status            TEXT DEFAULT 'running'
                    CHECK (status IN ('running','completed','failed'))
);

-- ============================================================
-- PLATFORM STATS
-- ============================================================
CREATE TABLE platform_stats (
  id                SERIAL PRIMARY KEY,
  stat_date         DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  volume_usd        NUMERIC(18,2) DEFAULT 0,
  volume_sol        NUMERIC(18,9) DEFAULT 0,
  tokens_launched   INTEGER DEFAULT 0,
  tokens_graduated  INTEGER DEFAULT 0,
  kol_calls         INTEGER DEFAULT 0,
  fees_earned_sol   NUMERIC(18,9) DEFAULT 0,
  kol_rewards_sol   NUMERIC(18,9) DEFAULT 0,
  new_wallets       INTEGER DEFAULT 0,
  active_wallets    INTEGER DEFAULT 0,
  kol_passes_issued INTEGER DEFAULT 0
);

-- ============================================================
-- NONCES (temporary, used for wallet verification)
-- ============================================================
CREATE TABLE nonces (
  wallet_address  TEXT PRIMARY KEY,
  nonce           TEXT NOT NULL,
  action          TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PUBLIC VIEWS (safe columns only)
-- ============================================================
CREATE VIEW launchers_public AS
SELECT
  id, wallet_address, twitter_handle,
  twitter_avatar_url, follower_count,
  badge, verified_at, referral_code,
  created_at
FROM launchers
WHERE is_banned = false;

CREATE VIEW tokens_public AS
SELECT
  t.id, t.launcher_id, t.name, t.ticker,
  t.tagline, t.description, t.category,
  t.image_url, t.banner_url,
  t.website_url, t.twitter_url, t.telegram_url,
  t.discord_url, t.youtube_url, t.tiktok_url,
  t.github_url, t.mint_address, t.status,
  t.market_cap_usd, t.price_sol,
  t.volume_24h_usd, t.volume_total_usd,
  t.holder_count, t.bonding_pct,
  t.kol_call_count, t.kol_pass_earned,
  t.kol_pass_number, t.kol_pass_status,
  t.created_at, t.updated_at,
  -- Launcher info
  l.twitter_handle AS launcher_twitter,
  l.twitter_avatar_url AS launcher_avatar,
  l.follower_count AS launcher_followers,
  l.badge AS launcher_badge,
  l.wallet_address AS launcher_wallet
FROM tokens t
JOIN launchers_public l ON l.id = t.launcher_id
WHERE t.status != 'dead';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE launchers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE kol_calls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_votes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_points     ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonces            ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "public_read_launchers"  ON launchers        FOR SELECT USING (true);
CREATE POLICY "public_read_tokens"     ON tokens           FOR SELECT USING (true);
CREATE POLICY "public_read_calls"      ON kol_calls        FOR SELECT USING (true);
CREATE POLICY "public_read_votes"      ON community_votes  FOR SELECT USING (true);
CREATE POLICY "public_read_vote_rec"   ON vote_records     FOR SELECT USING (true);

-- Points hidden from public (admin only via service key)
CREATE POLICY "no_public_points"  ON wallet_points  FOR SELECT USING (false);
CREATE POLICY "no_public_events"  ON points_events  FOR SELECT USING (false);
CREATE POLICY "no_public_nonces"  ON nonces         FOR ALL    USING (false);

-- Insert policies
CREATE POLICY "insert_launcher"   ON launchers    FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_token"      ON tokens       FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_call"       ON kol_calls    FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_vote_rec"   ON vote_records FOR INSERT WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tokens_launcher      ON tokens(launcher_id);
CREATE INDEX idx_tokens_status        ON tokens(status);
CREATE INDEX idx_tokens_created       ON tokens(created_at DESC);
CREATE INDEX idx_tokens_mktcap        ON tokens(market_cap_usd DESC);
CREATE INDEX idx_tokens_volume        ON tokens(volume_total_usd DESC);
CREATE INDEX idx_tokens_kol_pass      ON tokens(kol_pass_status);
CREATE INDEX idx_kol_calls_token      ON kol_calls(token_id);
CREATE INDEX idx_kol_calls_launcher   ON kol_calls(launcher_id);
CREATE INDEX idx_kol_calls_called_at  ON kol_calls(called_at DESC);
CREATE INDEX idx_kol_calls_accuracy   ON kol_calls(accuracy_status);
CREATE INDEX idx_launchers_badge      ON launchers(badge);
CREATE INDEX idx_launchers_wallet     ON launchers(wallet_address);
CREATE INDEX idx_launchers_twitter    ON launchers(twitter_id);
CREATE INDEX idx_points_wallet        ON wallet_points(wallet_address);
CREATE INDEX idx_points_total         ON wallet_points(total_points DESC);
CREATE INDEX idx_points_events_wallet ON points_events(wallet_address);
CREATE INDEX idx_points_events_type   ON points_events(event_type);
CREATE INDEX idx_points_events_date   ON points_events(earned_at DESC);
CREATE INDEX idx_active_days_wallet   ON wallet_active_days(wallet_address, active_date);
CREATE INDEX idx_activity_days_wallet ON wallet_activity_days(wallet_address, active_date);
CREATE INDEX idx_votes_token          ON community_votes(token_id);
CREATE INDEX idx_vote_records_vote    ON vote_records(vote_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_launchers_updated
  BEFORE UPDATE ON launchers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tokens_updated
  BEFORE UPDATE ON tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_wallet_points_updated
  BEFORE UPDATE ON wallet_points FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto assign badge based on follower count
CREATE OR REPLACE FUNCTION assign_badge()
RETURNS TRIGGER AS $$
DECLARE cfg points_config%ROWTYPE;
BEGIN
  SELECT * INTO cfg FROM points_config WHERE is_active = true LIMIT 1;
  IF NEW.twitter_handle IS NULL THEN
    NEW.badge = 'anon';
  ELSIF NEW.badge = 'gold_kol' AND NEW.gold_kol_approved_at IS NOT NULL THEN
    NEW.badge = 'gold_kol'; -- preserve manual gold
  ELSIF NEW.follower_count >= COALESCE(cfg.gold_kol_follower_threshold, 50000)
    AND NEW.gold_kol_approved_at IS NOT NULL THEN
    NEW.badge = 'gold_kol';
  ELSIF NEW.follower_count >= COALESCE(cfg.pro_kol_follower_threshold, 10000) THEN
    NEW.badge = 'pro_kol';
  ELSIF NEW.follower_count >= COALESCE(cfg.kol_follower_threshold, 1000) THEN
    NEW.badge = 'kol';
  ELSE
    NEW.badge = 'verified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assign_badge
  BEFORE INSERT OR UPDATE OF twitter_handle, follower_count, gold_kol_approved_at
  ON launchers FOR EACH ROW EXECUTE FUNCTION assign_badge();

-- Auto increment kol_call_count on token
CREATE OR REPLACE FUNCTION increment_call_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tokens SET kol_call_count = kol_call_count + 1 WHERE id = NEW.token_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_call_count
  AFTER INSERT ON kol_calls FOR EACH ROW EXECUTE FUNCTION increment_call_count();

-- Auto check KOL Pass milestone when volume updates
CREATE OR REPLACE FUNCTION check_kol_pass_milestone()
RETURNS TRIGGER AS $$
DECLARE
  cfg points_config%ROWTYPE;
  pass_count INTEGER;
BEGIN
  SELECT * INTO cfg FROM points_config WHERE is_active = true LIMIT 1;
  -- Only check if not already earned and volume crossed threshold
  IF NEW.kol_pass_earned = false
    AND NEW.volume_total_usd >= COALESCE(cfg.kol_pass_volume_threshold, 1000000) THEN
    -- Check supply not exhausted
    SELECT COUNT(*) INTO pass_count FROM tokens WHERE kol_pass_earned = true;
    IF pass_count < COALESCE(cfg.kol_pass_max_supply, 10000) THEN
      NEW.kol_pass_earned = true;
      NEW.kol_pass_earned_at = NOW();
      NEW.kol_pass_number = pass_count + 1;
      NEW.kol_pass_status = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_kol_pass
  BEFORE UPDATE OF volume_total_usd ON tokens
  FOR EACH ROW EXECUTE FUNCTION check_kol_pass_milestone();

-- ============================================================
-- SEED: Insert initial points config (Version 1)
-- ============================================================
INSERT INTO points_config (
  version, is_active, notes, created_by, activated_at
) VALUES (
  1, true,
  'Initial launch configuration — OnchainKOL v1',
  'platform',
  NOW()
);
