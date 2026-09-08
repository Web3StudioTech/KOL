# OnchainKOL — Deployment Guide

## What's in this package

```
onchainkol-mainnet/
├── contracts/          ← Solidity smart contracts
│   ├── BondingCurve.sol
│   ├── KOLToken.sol
│   ├── KOLSwap.sol
│   ├── CommunityVote.sol
│   └── KOLPass.sol
├── scripts/
│   └── deploy.ts       ← Deploy all contracts in one command
├── frontend/           ← Next.js app (upload to GitHub)
│   └── src/
│       ├── app/        ← All pages
│       ├── lib/
│       │   ├── contracts.ts   ← Contract ABIs + addresses
│       │   ├── web3.ts        ← useWeb3, useTrade, useLaunch hooks
│       │   ├── kolRewards.ts  ← KOL reward math engine
│       │   └── saltMiner.ts   ← Browser CREATE2 salt mining
│       └── hooks/
├── hardhat.config.ts   ← Hardhat config for Robinhood Chain
└── DEPLOY.md           ← This file
```

---

## Step 1 — Install Node.js

Download from https://nodejs.org (v20 LTS recommended)

---

## Step 2 — Install contract dependencies

```bash
cd onchainkol-mainnet
npm install
```

---

## Step 3 — Set your wallet addresses

Create a `.env` file in `onchainkol-mainnet/`:

```env
DEPLOYER_PRIVATE_KEY=0x_your_private_key_here
PLATFORM_FEE_WALLET=0x_your_platform_wallet
KOL_POOL_WALLET=0x_your_kol_pool_wallet
```

⚠️ NEVER commit .env to GitHub. Add it to .gitignore.

---

## Step 4 — Deploy to testnet first

```bash
# Compile contracts
npm run compile

# Deploy to Robinhood Chain testnet
npm run deploy:testnet
```

This will:
- Deploy all 5 contracts
- Wire them together automatically
- Print all addresses to console
- Save addresses to `deployed-addresses.json`

---

## Step 5 — Test on testnet

1. Add Robinhood testnet to MetaMask:
   - Network name: Robinhood Chain Testnet
   - RPC URL: https://rpc.testnet.chain.robinhood.com
   - Chain ID: 46630
   - Currency: ETH

2. Get testnet ETH from faucet

3. Launch a test token on the website
   (update NEXT_PUBLIC_BONDING_CURVE_ADDRESS to testnet address first)

4. Buy and sell the test token

5. Submit a KOL call

6. Verify everything works

---

## Step 6 — Deploy to mainnet

```bash
npm run deploy:mainnet
```

---

## Step 7 — Add addresses to Vercel

After deployment, the console prints:

```
NEXT_PUBLIC_BONDING_CURVE_ADDRESS=0x...
NEXT_PUBLIC_KOLSWAP_ADDRESS=0x...
NEXT_PUBLIC_COMMUNITY_VOTE_ADDRESS=0x...
NEXT_PUBLIC_KOLPASS_ADDRESS=0x...
```

Go to Vercel → Your Project → Settings → Environment Variables
Add each one. Then also add:

```
NEXT_PUBLIC_CHAIN_ID=4663
NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com
NEXT_PUBLIC_EXPLORER_URL=https://robinhoodchain.blockscout.com
NEXT_PUBLIC_APP_URL=https://onchainkol.com
NEXT_PUBLIC_SUPABASE_URL=https://yunaxtkutctazwdyvnne.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_SECRET_KEY=your_strong_random_key
CRON_SECRET=your_strong_random_key
ALCHEMY_API_KEY=your_alchemy_key
ALCHEMY_WEBHOOK_SECRET=your_webhook_secret
```

Trigger a new Vercel deployment after adding variables.

---

## Step 8 — Set up Alchemy webhooks

1. Go to alchemy.com → Sign up
2. Create new app → Select Robinhood Chain
3. Go to Notify → Create Webhook
4. Webhook URL: https://onchainkol.com/api/webhook
5. Event type: Address Activity
6. Contract address: your BondingCurve address
7. Add KOLSwap address too
8. Copy webhook signing key → add to Vercel as ALCHEMY_WEBHOOK_SECRET

---

## Step 9 — Verify contracts on explorer

```bash
npx hardhat verify --network robinhoodMainnet BONDING_CURVE_ADDRESS PLATFORM_WALLET KOL_POOL_WALLET
```

---

## Fee Structure (confirmed)

```
Launch fee:    0.0004 ETH → PLATFORM_FEE_WALLET
Trading fee:   1% total
  → 0.70% → Creator wallet (automatic)
  → 0.25% → PLATFORM_FEE_WALLET (automatic)
  → 0.05% → KOL_POOL_WALLET (automatic)
```

---

## You're live! 🚀

Once all steps complete:
- Token launches are real ERC20 deployments on Robinhood Chain
- Every token address ends in ...kol
- Buy/sell triggers real MetaMask transactions
- Fees flow automatically to your wallets
- KOL calls recorded permanently onchain
- Daily cron resolves accuracy and pays KOLs
- All data verifiable on Robinhood Chain explorer
