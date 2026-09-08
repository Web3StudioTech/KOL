import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import * as dotenv from 'dotenv'
dotenv.config()

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0x' + '0'.repeat(64)

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    }
  },
  networks: {
    // Robinhood Chain Mainnet
    robinhoodMainnet: {
      url:      'https://rpc.mainnet.chain.robinhood.com',
      chainId:  4663,
      accounts: [PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Robinhood Chain Testnet
    robinhoodTestnet: {
      url:      'https://rpc.testnet.chain.robinhood.com',
      chainId:  46630,
      accounts: [PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Local dev
    hardhat: {
      chainId: 31337,
    }
  },
  etherscan: {
    apiKey: {
      robinhoodMainnet: 'no-api-key-needed',
    },
    customChains: [
      {
        network:  'robinhoodMainnet',
        chainId:  4663,
        urls: {
          apiURL:      'https://robinhoodchain.blockscout.com/api',
          browserURL:  'https://robinhoodchain.blockscout.com',
        }
      }
    ]
  },
  paths: {
    sources:   './contracts',
    tests:     './test',
    cache:     './cache',
    artifacts: './artifacts',
  }
}

export default config
