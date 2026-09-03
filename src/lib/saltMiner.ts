import { ethers } from 'ethers'
const KOL_SUFFIX = 0x6b6f6c
export async function mineKolSalt(
  factoryAddress: string,
  bytecodeHash: string,
  onProgress?: (attempts: number) => void
): Promise<string> {
  let attempts = 0
  const start  = Date.now()
  while (true) {
    attempts++
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const salt = ethers.hexlify(randomBytes)
    const addr = ethers.getCreate2Address(factoryAddress, salt, bytecodeHash)
    const last3 = parseInt(addr.slice(-6), 16)
    if (last3 === KOL_SUFFIX) {
      console.log(`[KOL Miner] Found in ${attempts} attempts (${((Date.now()-start)/1000).toFixed(2)}s): ${addr}`)
      return salt
    }
    if (attempts % 10000 === 0) {
      if (onProgress) onProgress(attempts)
      await new Promise(r => setTimeout(r, 0))
    }
    if (attempts > 50_000_000) throw new Error('Salt mining failed')
  }
}
