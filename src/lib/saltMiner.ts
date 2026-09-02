/**
 * OnchainKOL — Browser Salt Miner
 * Mines a CREATE2 salt that produces a token address ending in ...kol (0x6b6f6c)
 * Runs entirely in the user's browser — zero server cost
 *
 * How it works:
 * 1. Called when user clicks "Launch Token"
 * 2. Tries random salts until address ends in 0x6b6f6c
 * 3. Takes ~1-3 seconds on modern CPU
 * 4. Returns the salt to use in the contract call
 */

import { ethers } from 'ethers'
import KOLTokenABI from './KOLToken.json'

// "kol" in hex = 6b6f6c
const KOL_SUFFIX = 0x6b6f6c

/**
 * Mine a salt that produces a token address ending in ...kol
 * @param factoryAddress  The BondingCurve contract address
 * @param name            Token name
 * @param ticker          Token ticker
 * @param uri             Metadata URI
 * @param totalSupply     Token total supply
 * @param onProgress      Optional callback showing progress to user
 */
export async function mineKolSalt(
  factoryAddress: string,
  name: string,
  ticker: string,
  uri: string,
  totalSupply: bigint,
  onProgress?: (attempts: number) => void
): Promise<string> {

  // Build the token bytecode that will be deployed
  const KOLTokenFactory = new ethers.ContractFactory(
    KOLTokenABI.abi,
    KOLTokenABI.bytecode
  )

  const deployTx = KOLTokenFactory.getDeployTransaction(
    name,
    ticker,
    uri,
    factoryAddress,
    totalSupply
  )

  const bytecode     = deployTx.data as string
  const bytecodeHash = ethers.keccak256(bytecode)

  let attempts = 0
  const startTime = Date.now()

  // Try random salts until we find one that gives ...kol address
  while (true) {
    attempts++

    // Generate a random salt using crypto.getRandomValues (browser native, fast)
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const salt = ethers.hexlify(randomBytes)

    // Compute CREATE2 address
    const addr = ethers.getCreate2Address(factoryAddress, salt, bytecodeHash)

    // Check if last 3 bytes = 6b6f6c ("kol")
    const last3bytes = parseInt(addr.slice(-6), 16)

    if (last3bytes === KOL_SUFFIX) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`[KOL Miner] Found salt in ${attempts} attempts (${elapsed}s)`)
      console.log(`[KOL Miner] Token address: ${addr}`)
      return salt
    }

    // Progress callback every 10,000 attempts
    if (attempts % 10000 === 0 && onProgress) {
      onProgress(attempts)
      // Yield to browser event loop so UI stays responsive
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    // Safety limit — should never hit this (expected ~16M attempts max)
    if (attempts > 50_000_000) {
      throw new Error('Salt mining failed after 50M attempts')
    }
  }
}

/**
 * Verify that a salt produces a ...kol address
 * Used to double-check before sending the transaction
 */
export function verifySalt(
  factoryAddress: string,
  bytecodeHash: string,
  salt: string
): { valid: boolean; address: string } {
  const addr      = ethers.getCreate2Address(factoryAddress, salt, bytecodeHash)
  const last3     = parseInt(addr.slice(-6), 16)
  const valid     = last3 === KOL_SUFFIX
  return { valid, address: addr }
}

/**
 * Format address for display
 * e.g. 0x1234...6b6f6c → 0x1234...kol
 */
export function formatKolAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}
