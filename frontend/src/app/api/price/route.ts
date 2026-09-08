import { NextRequest, NextResponse } from 'next/server'

// Chainlink ETH/USD price feed on Robinhood Chain
// Update this address after Chainlink deploys on Robinhood Chain mainnet
const CHAINLINK_ETH_USD = process.env.CHAINLINK_ETH_USD_FEED || ''
const ALCHEMY_RPC       = process.env.ALCHEMY_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com'

// Chainlink aggregator ABI — just the latestRoundData function
const AGGREGATOR_ABI = [{
  name: 'latestRoundData',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [
    { name: 'roundId',         type: 'uint80'  },
    { name: 'answer',          type: 'int256'  },
    { name: 'startedAt',       type: 'uint256' },
    { name: 'updatedAt',       type: 'uint256' },
    { name: 'answeredInRound', type: 'uint80'  },
  ]
}]

let cachedPrice: number | null = null
let cacheTime = 0
const CACHE_DURATION = 30 * 1000 // 30 seconds

export async function GET(req: NextRequest) {
  try {
    const now = Date.now()

    // Return cached price if fresh
    if (cachedPrice && (now - cacheTime) < CACHE_DURATION) {
      return NextResponse.json({ price: cachedPrice, source: 'cache' })
    }

    // Try Chainlink first
    if (CHAINLINK_ETH_USD) {
      try {
        const { ethers } = await import('ethers')
        const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC)
        const feed = new ethers.Contract(CHAINLINK_ETH_USD, AGGREGATOR_ABI, provider)
        const [, answer] = await feed.latestRoundData()
        // Chainlink price has 8 decimals
        const price = Number(answer) / 1e8
        cachedPrice = price
        cacheTime   = now
        return NextResponse.json({ price, source: 'chainlink' })
      } catch (err) {
        console.error('Chainlink price feed error:', err)
      }
    }

    // Fallback — CoinGecko free API
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
        next: { revalidate: 30 }
      })
      const data = await res.json()
      const price = data?.ethereum?.usd || 3000
      cachedPrice = price
      cacheTime   = now
      return NextResponse.json({ price, source: 'coingecko' })
    } catch (err) {
      console.error('CoinGecko error:', err)
    }

    // Final fallback
    return NextResponse.json({ price: 3000, source: 'fallback' })

  } catch (err: any) {
    return NextResponse.json({ price: 3000, error: err.message }, { status: 500 })
  }
}
