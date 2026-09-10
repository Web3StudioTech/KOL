import { ethers } from 'ethers'

const KOL_SUFFIX = 0x6b6f6c

/**
 * Mines a CREATE2 salt that produces an address ending in ...kol.
 *
 * Runs across multiple Web Workers in parallel (one per CPU core, up to 8)
 * so the page never freezes and the average wait time is divided roughly
 * by the number of workers, instead of running single-threaded on the
 * main thread. Falls back to a single-threaded loop if Web Workers
 * aren't available in the current environment.
 */
export async function mineKolSalt(
  factoryAddress: string,
  bytecodeHash: string,
  onProgress?: (attempts: number) => void
): Promise<string> {
  if (typeof Worker === 'undefined') {
    return mineKolSaltFallback(factoryAddress, bytecodeHash, onProgress)
  }

  const workerCount = Math.min(navigator.hardwareConcurrency || 4, 8)
  const workers: Worker[] = []
  const attemptsByWorker = new Array(workerCount).fill(0)

  function reportProgress() {
    if (onProgress) {
      onProgress(attemptsByWorker.reduce((a, b) => a + b, 0))
    }
  }

  try {
    return await new Promise<string>((resolve, reject) => {
      for (let i = 0; i < workerCount; i++) {
        const worker = new Worker(new URL('./saltMiner.worker.ts', import.meta.url))
        workers.push(worker)

        worker.onmessage = (e: MessageEvent) => {
          if (e.data.type === 'progress') {
            attemptsByWorker[i] = e.data.attempts
            reportProgress()
          } else if (e.data.type === 'found') {
            attemptsByWorker[i] = e.data.attempts
            console.log(`[KOL Miner] Found via worker ${i} in ${e.data.attempts} attempts (${(e.data.elapsedMs / 1000).toFixed(2)}s): ${e.data.address}`)
            resolve(e.data.salt)
          }
        }

        worker.onerror = (err) => {
          console.error(`[KOL Miner] Worker ${i} error:`, err)
        }

        worker.postMessage({ type: 'start', factoryAddress, bytecodeHash })
      }
    })
  } finally {
    // Whoever won or if we bail out, stop every worker immediately —
    // no point burning battery/CPU on threads that lost the race.
    workers.forEach(w => w.terminate())
  }
}

// Single-threaded fallback, used only if Web Workers are unavailable
// (very old browsers, or non-browser environments).
async function mineKolSaltFallback(
  factoryAddress: string,
  bytecodeHash: string,
  onProgress?: (attempts: number) => void
): Promise<string> {
  let attempts = 0
  const start = Date.now()
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
