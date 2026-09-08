import { ethers } from 'hardhat'
import * as fs from 'fs'

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('═══════════════════════════════════════════════════')
  console.log('  OnchainKOL — Contract Deployment')
  console.log('  Chain: Robinhood Chain')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  Deployer:  ${deployer.address}`)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`  Balance:   ${ethers.formatEther(balance)} ETH`)
  console.log('═══════════════════════════════════════════════════\n')

  if (balance < ethers.parseEther('0.01')) {
    throw new Error('Insufficient ETH balance. Need at least 0.01 ETH for deployment.')
  }

  // ── IMPORTANT: Set your wallet addresses here ──────────────
  const PLATFORM_WALLET = process.env.PLATFORM_FEE_WALLET || '0x9649353758F1496c97CdC70bAd4fB5bE44b03d59'
  const KOL_POOL_WALLET = process.env.KOL_POOL_WALLET     || '0xDfAe28f1d849648CA69B6570CeE2ae1C901eC3Cc'

  console.log(`  Platform wallet: ${PLATFORM_WALLET}`)
  console.log(`  KOL pool wallet: ${KOL_POOL_WALLET}\n`)

  // ── Step 1: Deploy KOLToken (implementation only — not directly) ──
  console.log('Step 1: Deploying KOLToken implementation...')

  // ── Step 2: Deploy BondingCurve ───────────────────────────
  console.log('Step 2: Deploying BondingCurve...')
  const BondingCurve = await ethers.getContractFactory('BondingCurve')
  const bondingCurve = await BondingCurve.deploy(PLATFORM_WALLET, KOL_POOL_WALLET)
  await bondingCurve.waitForDeployment()
  const bondingCurveAddress = await bondingCurve.getAddress()
  console.log(`  ✅ BondingCurve: ${bondingCurveAddress}`)

  // ── Step 3: Deploy KOLSwap ────────────────────────────────
  console.log('Step 3: Deploying KOLSwap...')
  const KOLSwap = await ethers.getContractFactory('KOLSwap')
  const kolSwap = await KOLSwap.deploy(bondingCurveAddress, PLATFORM_WALLET, KOL_POOL_WALLET)
  await kolSwap.waitForDeployment()
  const kolSwapAddress = await kolSwap.getAddress()
  console.log(`  ✅ KOLSwap: ${kolSwapAddress}`)

  // ── Step 4: Deploy CommunityVote ─────────────────────────
  console.log('Step 4: Deploying CommunityVote...')
  const CommunityVote = await ethers.getContractFactory('CommunityVote')
  const communityVote = await CommunityVote.deploy(bondingCurveAddress)
  await communityVote.waitForDeployment()
  const communityVoteAddress = await communityVote.getAddress()
  console.log(`  ✅ CommunityVote: ${communityVoteAddress}`)

  // ── Step 5: Deploy KOLPass ────────────────────────────────
  console.log('Step 5: Deploying KOLPass...')
  const KOLPass = await ethers.getContractFactory('KOLPass')
  const kolPass = await KOLPass.deploy(bondingCurveAddress)
  await kolPass.waitForDeployment()
  const kolPassAddress = await kolPass.getAddress()
  console.log(`  ✅ KOLPass: ${kolPassAddress}`)

  // ── Step 6: Wire contracts together ──────────────────────
  console.log('\nStep 6: Wiring contracts together...')

  // Tell BondingCurve where KOLSwap is
  const setKolSwapTx = await bondingCurve.setKolSwap(kolSwapAddress)
  await setKolSwapTx.wait()
  console.log('  ✅ BondingCurve → KOLSwap wired')

  // Tell BondingCurve where KOLPass is
  const setKolPassTx = await bondingCurve.setKolPass(kolPassAddress)
  await setKolPassTx.wait()
  console.log('  ✅ BondingCurve → KOLPass wired')

  // ── Step 7: Save addresses ────────────────────────────────
  const addresses = {
    network:        'Robinhood Chain',
    chainId:        4663,
    deployedAt:     new Date().toISOString(),
    deployer:       deployer.address,
    platformWallet: PLATFORM_WALLET,
    kolPoolWallet:  KOL_POOL_WALLET,
    contracts: {
      BondingCurve:   bondingCurveAddress,
      KOLSwap:        kolSwapAddress,
      CommunityVote:  communityVoteAddress,
      KOLPass:        kolPassAddress,
    }
  }

  fs.writeFileSync('./deployed-addresses.json', JSON.stringify(addresses, null, 2))

  // ── Print Vercel env vars ─────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  ✅ ALL CONTRACTS DEPLOYED SUCCESSFULLY!')
  console.log('═══════════════════════════════════════════════════')
  console.log('\n  Add these to Vercel Environment Variables:\n')
  console.log(`  NEXT_PUBLIC_BONDING_CURVE_ADDRESS=${bondingCurveAddress}`)
  console.log(`  NEXT_PUBLIC_KOLSWAP_ADDRESS=${kolSwapAddress}`)
  console.log(`  NEXT_PUBLIC_COMMUNITY_VOTE_ADDRESS=${communityVoteAddress}`)
  console.log(`  NEXT_PUBLIC_KOLPASS_ADDRESS=${kolPassAddress}`)
  console.log(`  NEXT_PUBLIC_CHAIN_ID=4663`)
  console.log(`  NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com`)
  console.log(`  NEXT_PUBLIC_EXPLORER_URL=https://robinhoodchain.blockscout.com`)
  console.log('\n  Addresses saved to: deployed-addresses.json')
  console.log('\n  View on explorer:')
  console.log(`  https://robinhoodchain.blockscout.com/address/${bondingCurveAddress}`)
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('Deployment failed:', err)
  process.exit(1)
})
