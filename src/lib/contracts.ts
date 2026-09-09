// Contract addresses — filled after deployment
// Platform wallet: 0x9649353758F1496c97CdC70bAd4fB5bE44b03d59
// KOL pool wallet: 0xDfAe28f1d849648CA69B6570CeE2ae1C901eC3Cc
// Add these to Vercel environment variables after deploying contracts

export const CONTRACTS = {
  BONDING_CURVE:   process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS  as string,
  KOLSWAP:         process.env.NEXT_PUBLIC_KOLSWAP_ADDRESS         as string,
  COMMUNITY_VOTE:  process.env.NEXT_PUBLIC_COMMUNITY_VOTE_ADDRESS  as string,
  KOL_PASS:        process.env.NEXT_PUBLIC_KOLPASS_ADDRESS          as string,
}

export const CHAIN = {
  ID:          parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '4663'),
  RPC:         process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com',
  EXPLORER:    process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://robinhoodchain.blockscout.com',
  NAME:        'Robinhood Chain',
  CURRENCY:    'ETH',
}

// Robinhood Chain network config for MetaMask
export const ROBINHOOD_CHAIN_CONFIG = {
  chainId:            `0x${CHAIN.ID.toString(16)}`, // 0x1237
  chainName:          CHAIN.NAME,
  nativeCurrency:     { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls:            [CHAIN.RPC],
  blockExplorerUrls:  [CHAIN.EXPLORER],
}

// ── BondingCurve ABI ─────────────────────────────────────────
export const BONDING_CURVE_ABI = [
  // Read
  {
    name: 'getCurve',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'token',          type: 'address' },
        { name: 'creator',        type: 'address' },
        { name: 'virtualEth',     type: 'uint256' },
        { name: 'virtualTokens',  type: 'uint256' },
        { name: 'realEth',        type: 'uint256' },
        { name: 'realTokens',     type: 'uint256' },
        { name: 'totalVolumeUsd', type: 'uint256' },
        { name: 'isGraduated',    type: 'bool'    },
        { name: 'isRugFlagged',   type: 'bool'    },
        { name: 'kolPassEarned',  type: 'bool'    },
        { name: 'kolPassNumber',  type: 'uint256' },
        { name: 'createdAt',      type: 'uint256' },
      ]
    }]
  },
  {
    name: 'quoteTokensOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }, { name: 'ethIn', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'quoteEthOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }, { name: 'tokensIn', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getRemainingCallsToday',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  // Write
  {
    name: 'launchToken',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'name',   type: 'string'  },
      { name: 'ticker', type: 'string'  },
      { name: 'uri',    type: 'string'  },
      { name: 'salt',   type: 'bytes32' },
    ],
    outputs: [{ name: 'tokenAddr', type: 'address' }]
  },
  {
    name: 'buy',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'token',        type: 'address' },
      { name: 'minTokensOut', type: 'uint256' },
      { name: 'referrer',     type: 'address' },
      { name: 'ethPriceUsd',  type: 'uint256' },
    ],
    outputs: []
  },
  {
    name: 'sell',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',       type: 'address' },
      { name: 'tokensIn',    type: 'uint256' },
      { name: 'minEthOut',   type: 'uint256' },
      { name: 'referrer',    type: 'address' },
      { name: 'ethPriceUsd', type: 'uint256' },
    ],
    outputs: []
  },
  {
    name: 'submitKolCall',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',           type: 'address' },
      { name: 'thesis',          type: 'string'  },
      { name: 'isGraduatedCall', type: 'bool'    },
    ],
    outputs: [{ name: 'callId', type: 'bytes32' }]
  },
  // Events
  {
    name: 'TokenLaunched',
    type: 'event',
    inputs: [
      { name: 'token',     type: 'address', indexed: true  },
      { name: 'creator',   type: 'address', indexed: true  },
      { name: 'name',      type: 'string',  indexed: false },
      { name: 'ticker',    type: 'string',  indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'TokensBought',
    type: 'event',
    inputs: [
      { name: 'token',     type: 'address', indexed: true  },
      { name: 'buyer',     type: 'address', indexed: true  },
      { name: 'ethIn',     type: 'uint256', indexed: false },
      { name: 'tokensOut', type: 'uint256', indexed: false },
      { name: 'newPrice',  type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'TokensSold',
    type: 'event',
    inputs: [
      { name: 'token',       type: 'address', indexed: true  },
      { name: 'seller',      type: 'address', indexed: true  },
      { name: 'tokensIn',    type: 'uint256', indexed: false },
      { name: 'ethOut',      type: 'uint256', indexed: false },
      { name: 'newPrice',    type: 'uint256', indexed: false },
      { name: 'timestamp',   type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'TokenGraduated',
    type: 'event',
    inputs: [
      { name: 'token',          type: 'address', indexed: true  },
      { name: 'totalEth',       type: 'uint256', indexed: false },
      { name: 'totalVolumeUsd', type: 'uint256', indexed: false },
      { name: 'timestamp',      type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'TraderBadgeEarned',
    type: 'event',
    inputs: [
      { name: 'trader',        type: 'address', indexed: true  },
      { name: 'totalVolumeUsd',type: 'uint256', indexed: false },
      { name: 'timestamp',     type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'RugDetected',
    type: 'event',
    inputs: [
      { name: 'token',     type: 'address', indexed: true  },
      { name: 'creator',   type: 'address', indexed: true  },
      { name: 'trigger',   type: 'string',  indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'KolPassEarned',
    type: 'event',
    inputs: [
      { name: 'token',        type: 'address', indexed: true  },
      { name: 'creator',      type: 'address', indexed: true  },
      { name: 'passNumber',   type: 'uint256', indexed: false },
      { name: 'marketCapUsd', type: 'uint256', indexed: false },
      { name: 'timestamp',    type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'KolCallSubmitted',
    type: 'event',
    inputs: [
      { name: 'callId',      type: 'bytes32', indexed: true  },
      { name: 'kol',         type: 'address', indexed: true  },
      { name: 'token',       type: 'address', indexed: true  },
      { name: 'priceAtCall', type: 'uint256', indexed: false },
      { name: 'thesis',      type: 'string',  indexed: false },
      { name: 'timestamp',   type: 'uint256', indexed: false },
    ]
  },
]

// ── KOLSwap ABI ──────────────────────────────────────────────
export const KOLSWAP_ABI = [
  {
    name: 'swapEthForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'token',        type: 'address' },
      { name: 'minTokensOut', type: 'uint256' },
      { name: 'referrer',     type: 'address' },
      { name: 'ethPriceUsd',  type: 'uint256' },
    ],
    outputs: []
  },
  {
    name: 'swapTokensForEth',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',       type: 'address' },
      { name: 'tokensIn',    type: 'uint256' },
      { name: 'minEthOut',   type: 'uint256' },
      { name: 'referrer',    type: 'address' },
      { name: 'ethPriceUsd', type: 'uint256' },
    ],
    outputs: []
  },
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'token',          type: 'address' },
        { name: 'creator',        type: 'address' },
        { name: 'ethReserve',     type: 'uint256' },
        { name: 'tokenReserve',   type: 'uint256' },
        { name: 'totalVolumeUsd', type: 'uint256' },
        { name: 'totalFeesEth',   type: 'uint256' },
        { name: 'isActive',       type: 'bool'    },
        { name: 'createdAt',      type: 'uint256' },
      ]
    }]
  },
  {
    name: 'quoteTokensOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }, { name: 'ethIn', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'quoteEthOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }, { name: 'tokensIn', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
]

// ── ERC20 ABI (for token approval) ───────────────────────────
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
]
