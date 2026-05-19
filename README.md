# OnchainKOL — Complete Platform v2

The full Web3 token launchpad. KOL discovery layer. Community governance. Points system. Own DEX.

**onchainkol.com**

---

## What's built

### Smart Contracts (Anchor/Rust — Solana)

| Program | File | What it does |
|---|---|---|
| BondingCurve | `contracts/programs/bonding-curve/src/lib.rs` | Token launches, pre-graduation trading, fee splits, KOL calls onchain |
| KOLSwap AMM | `contracts/programs/kolswap/src/lib.rs` | Post-graduation DEX, x*y=k pools, creator + KOL fees forever |
| CommunityVote | `contracts/programs/reward-pool/src/lib.rs` | Rug detection, 72h community vote, burn or community outcome |

### Backend

| File | What it does |
|---|---|
| `backend/src/points/engine.ts` | Configurable points calculation, recalculation, snapshots |
| `backend/src/cron/jobs.ts` | Hourly/daily/weekly automation |

### Frontend (Next.js)

| Route | What it shows |
|---|---|
| `/` | Explore tokens — live feed, sort/filter |
| `/launch` | Launch token form with all fields |
| `/kol` | KOL discovery zone |
| `/leaderboard` | Points + KOL leaderboard |
| `/admin` | Full admin dashboard |
| `/admin/points` | Points control panel |

### Database

`supabase/migrations/001_complete_schema.sql` — paste into Supabase SQL editor

---

## Hardcoded wallet addresses

```
Platform fee wallet: 9peNy7uVBNGvTQVAtr5WaWwpNPAgAVTWSZxQvaG9XjX8
KOL reward pool:     FMF6jcpiA72PFqcTiLESL2R6SKVYo23duQ2rRx8CQSpN
```

---

## Fee structure

```
Total per trade: 1.25%
→ 0.90% Platform fee wallet (your revenue)
→ 0.15% Creator wallet (creator royalty forever)
→ 0.15% KOL pool wallet (distributed to accurate callers)
→ 0.05% Referral wallet
```

---

## Badge system

| Badge | Followers | Color | How |
|---|---|---|---|
| 👤 Anon | None | Grey | Default |
| ✓ Verified | Any | White | Automated Twitter link |
| 💙 KOL | 1,000+ | Blue | Automated |
| 💜 Pro KOL | 10,000+ | Purple | Automated |
| 🥇 Gold KOL | 50,000+ | Gold | Manual team approval |

---

## KOL reward multipliers

```
💙 KOL:     1.0x
💜 Pro KOL: 1.25x
🥇 Gold KOL: 1.5x
```

---

## KOL Pass

```
Supply:    10,000 maximum (FCFS)
Trigger:   $1M cumulative trading volume
Vote:      72h community vote on rug detection
Quorum:    10% of unique holders
Fail:      Auto-burn if quorum not reached
```

---

## Points system

```
Volume:  70% weight
Social:  20% weight  
Age:      5% weight
Active:   5% weight

All weights adjustable from admin dashboard
Changes work backwards — recalculates all wallets automatically
Full version history maintained
One-click rollback
```

---

## Rug detection triggers (any one activates vote)

```
1. Creator sells 50%+ of holdings in 24h
2. Creator wallet goes to zero
3. 50%+ liquidity pulled in one transaction
4. 3+ connected wallets dump 50%+ within 1 hour
```

---

## Setup

### 1. Supabase
```
supabase.com → New project → SQL Editor
Paste: supabase/migrations/001_complete_schema.sql
Run → copy URL + anon key + service role key
```

### 2. Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SECRET_KEY=your-long-random-key
CRON_SECRET=your-cron-secret
NEXT_PUBLIC_APP_URL=https://onchainkol.com
```

### 3. Deploy frontend
```
vercel.com → Import from GitHub → Add env vars → Deploy
```

### 4. Deploy smart contracts (requires Anchor + Rust)
```bash
cd contracts
anchor build
anchor deploy --provider.cluster devnet  # test first
anchor deploy --provider.cluster mainnet  # when ready
```

---

## Admin dashboard

```
/admin          → Full launcher registry, ban/unban, Gold KOL approval
/admin/points   → Points config, wallet points, snapshots, recalculation
```

Admin key = ADMIN_SECRET_KEY environment variable

---

## Points dashboard features

- View all wallet points (volume/social/age/active breakdown)
- Create new config versions with any weights
- Preview impact before activating
- Activate with one click — recalculates all wallets in background
- Full version history with notes
- One-click rollback to any previous version
- Take airdrop snapshots (frozen point-in-time CSV export)

---

## What needs a Solana developer to complete

1. Deploy Anchor programs to devnet → test
2. Deploy to mainnet after audit
3. Connect Helius webhooks for real-time trade event processing
4. Implement SOL/USD price oracle (Pyth) for accurate market cap
5. Wire KOL Pass NFT minting to Metaplex
6. Connect reward pool payment instructions to cron job

---

## Monthly costs

```
Vercel (frontend + cron):  Free → $20 at scale
Supabase (database):       Free → $25 at scale
Helius (Solana RPC):       Free → $49 at scale
Domain renewal:            ~$12/year

Total at launch: ~$0–5/month
```
