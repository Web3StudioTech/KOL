# OnchainKOL

Token launchpad where KOLs discover gems and anyone can launch. Verified identity. Fair launches. Real alpha.

**onchainkol.com**

---

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL + Realtime + RLS)
- **Cache**: Upstash Redis (nonces, live feed)
- **Blockchain**: Solana (Phantom wallet, NaCl signatures)
- **Hosting**: Vercel (free tier)
- **Cost**: ~$5/month (Railway backend only)

---

## Setup — step by step

### 1. Clone and install

```bash
git clone https://github.com/yourhandle/onchainkol
cd onchainkol
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Go to SQL Editor → paste the contents of `supabase/migrations/001_initial_schema.sql` → Run
3. Go to Project Settings → API → copy your URL, anon key, and service role key

### 3. Configure environment

```bash
cp .env.example .env.local
# Fill in your Supabase credentials and ADMIN_SECRET_KEY
```

### 4. Run locally

```bash
npm run dev
# Opens at http://localhost:3000
```

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
# Add environment variables in Vercel dashboard
```

---

## Architecture

```
onchainkol/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Explore / homepage
│   │   ├── ExploreClient.tsx     # Live token feed
│   │   ├── launch/page.tsx       # Token launch form
│   │   ├── admin/page.tsx        # Admin dashboard
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── nonce/        # Generate verification nonce
│   │       │   └── verify-twitter/ # Verify Twitter via tweet
│   │       ├── tokens/           # Launch + list tokens
│   │       ├── calls/            # KOL calls
│   │       └── admin/launchers/  # Admin API
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Nav.tsx           # Top navigation
│   │   │   └── WalletModal.tsx   # Wallet connect + Twitter verify
│   │   └── token/
│   │       └── TokenCard.tsx     # Token display card
│   ├── lib/
│   │   ├── supabase.ts           # DB clients (browser + admin)
│   │   ├── auth.ts               # Signature verification, tweet URLs
│   │   └── store.ts              # Zustand wallet state
│   └── types/index.ts            # All TypeScript types
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Full DB schema + RLS
```

---

## How Twitter verification works

1. KOL connects Phantom wallet → backend issues nonce (expires 10 min)
2. Phantom signs a message containing the nonce → produces wallet signature
3. Platform builds pre-filled tweet: `okl-verify:{wallet}:{nonce}:{signature}`
4. KOL posts tweet from their own Twitter (1 click, no API needed)
5. KOL pastes tweet URL back → backend fetches via free oEmbed API
6. Backend verifies: nonce ✓, signature ✓, tweet author ✓ → deletes nonce
7. Launcher row updated: twitter_handle, badge assigned, permanent link made

**Cost: $0. No X API key needed.**

---

## Revenue model

| Source | Rate | At $1M daily volume |
|--------|------|---------------------|
| Platform fee | 1% of all trades | $10,000/day |
| Launch fee | 0.02 SOL per token | ~$3/launch |
| KOL boost fee | 0.5 SOL | ~$80/submission |

---

## Badge system

| Badge | Requirement | What buyers see |
|-------|-------------|-----------------|
| 👤 Anon | No Twitter linked | Wallet address |
| ✓ Verified | Twitter linked, any followers | @handle + count |
| 👑 KOL | Twitter linked, 1,000+ followers | Full KOL profile |

Badges auto-upgrade when follower count grows. Verification done once, valid forever.

---

## Admin dashboard

Access at `/admin` — requires `ADMIN_SECRET_KEY` header.

Features:
- View all launchers with full data (twitter_id, earnings, ban status, proof tweets)
- Search by handle or wallet
- Filter by badge
- Ban/unban with reason
- Paginated table

---

## Roadmap

- [ ] Solana Anchor program for onchain call signing
- [ ] Raydium graduation automation
- [ ] KOL accuracy score cron job (24h price check)
- [ ] Supabase Realtime live feed
- [ ] Token page with price chart
- [ ] KOL leaderboard page
- [ ] Mobile responsive polish
- [ ] Collab launches (two KOLs, one token)
