import { ethers } from 'ethers'

const KOL_SUFFIX = 0x6b6f6c

interface StartMsg {
  type: 'start'
  factoryAddress: string
  bytecodeHash: string
}

self.onmessage = (e: MessageEvent<StartMsg>) => {
  if (e.data.type !== 'start') return
  const { factoryAddress, bytecodeHash } = e.data

  let attempts = 0
  const start = Date.now()

  // Runs until a match is found or the main thread terminates this worker
  // (which happens the instant any other worker finds one first).
  while (true) {
    attempts++
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const salt = ethers.hexlify(randomBytes)
    const addr = ethers.getCreate2Address(factoryAddress, salt, bytecodeHash)
    const last3 = parseInt(addr.slice(-6), 16)

    if (last3 === KOL_SUFFIX) {
      ;(self as any).postMessage({
        type: 'found',
        salt,
        address: addr,
        attempts,
        elapsedMs: Date.now() - start,
      })
      return
    }

    if (attempts % 5000 === 0) {
      ;(self as any).postMessage({ type: 'progress', attempts })
    }
  }
}
