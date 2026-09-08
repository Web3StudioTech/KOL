'use client'
import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS, CHAIN, ROBINHOOD_CHAIN_CONFIG, BONDING_CURVE_ABI, KOLSWAP_ABI, ERC20_ABI } from './contracts'
import { useAppStore } from './store'

// ── Get ETH price from our API ────────────────────────────────
export async function getEthPriceUsd(): Promise<number> {
  try {
    const res = await fetch('/api/price')
    const data = await res.json()
    return data.price || 3000
  } catch {
    return 3000 // fallback
  }
}

// ── Switch to Robinhood Chain ─────────────────────────────────
export async function switchToRobinhoodChain(): Promise<boolean> {
  const eth = (window as any).ethereum
  if (!eth) return false
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ROBINHOOD_CHAIN_CONFIG.chainId }],
    })
    return true
  } catch (err: any) {
    // Chain not added yet — add it
    if (err.code === 4902) {
      try {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [ROBINHOOD_CHAIN_CONFIG],
        })
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

// ── Get provider and signer ───────────────────────────────────
export function getProvider() {
  const eth = (window as any).ethereum
  if (!eth) throw new Error('No wallet found. Please install MetaMask.')
  return new ethers.BrowserProvider(eth)
}

export async function getSigner() {
  const provider = getProvider()
  return provider.getSigner()
}

// ── Main useWeb3 hook ─────────────────────────────────────────
export function useWeb3() {
  const { address, connected, setAddress, disconnect } = useAppStore()
  const [chainId, setChainId]     = useState<number | null>(null)
  const [isCorrectChain, setIsCorrectChain] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError]         = useState('')

  const checkChain = useCallback(async () => {
    const eth = (window as any).ethereum
    if (!eth) return
    const id = parseInt(await eth.request({ method: 'eth_chainId' }), 16)
    setChainId(id)
    setIsCorrectChain(id === CHAIN.ID)
  }, [])

  useEffect(() => {
    const eth = (window as any).ethereum
    if (!eth) return

    checkChain()

    eth.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) disconnect()
      else setAddress(accounts[0], 'metamask')
    })

    eth.on('chainChanged', () => {
      checkChain()
      window.location.reload()
    })

    return () => {
      eth.removeAllListeners?.('accountsChanged')
      eth.removeAllListeners?.('chainChanged')
    }
  }, [])

  async function connect() {
    setConnecting(true)
    setError('')
    try {
      const eth = (window as any).ethereum
      if (!eth) throw new Error('MetaMask not installed. Please install MetaMask.')

      // Switch to Robinhood Chain first
      const switched = await switchToRobinhoodChain()
      if (!switched) throw new Error('Please switch to Robinhood Chain')

      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      if (!accounts || accounts.length === 0) throw new Error('No accounts found')

      setAddress(accounts[0], 'metamask')
      await checkChain()
    } catch (err: any) {
      setError(err.message || 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  return { address, connected, chainId, isCorrectChain, connecting, error, connect, switchToRobinhoodChain }
}

// ── useTrade hook — buy and sell tokens ──────────────────────
export function useTrade(tokenAddress: string, isGraduated: boolean) {
  const { address } = useAppStore()
  const [loading, setLoading]   = useState(false)
  const [txHash, setTxHash]     = useState('')
  const [error, setError]       = useState('')
  const [quote, setQuote]       = useState<bigint>(BigInt(0))

  async function getQuote(amount: string, isBuy: boolean): Promise<bigint> {
    if (!tokenAddress || !amount || parseFloat(amount) <= 0) return BigInt(0)
    try {
      const provider = getProvider()
      const contractAddr = isGraduated ? CONTRACTS.KOLSWAP : CONTRACTS.BONDING_CURVE
      const abi = isGraduated ? KOLSWAP_ABI : BONDING_CURVE_ABI
      const contract = new ethers.Contract(contractAddr, abi, provider)

      if (isBuy) {
        const ethIn = ethers.parseEther(amount)
        return await contract.quoteTokensOut(tokenAddress, ethIn)
      } else {
        const tokensIn = ethers.parseUnits(amount, 18)
        return await contract.quoteEthOut(tokenAddress, tokensIn)
      }
    } catch (err) {
      console.error('Quote error:', err)
      return BigInt(0)
    }
  }

  async function buy(ethAmount: string, slippagePct: number = 5) {
    if (!address) { setError('Connect wallet first'); return }
    setLoading(true)
    setError('')
    setTxHash('')

    try {
      // Switch chain if needed
      await switchToRobinhoodChain()

      const signer = await getSigner()
      const ethPrice = await getEthPriceUsd()
      const ethIn = ethers.parseEther(ethAmount)

      // Calculate min tokens out with slippage
      const expectedOut = await getQuote(ethAmount, true)
      const minOut = expectedOut * BigInt(100 - slippagePct) / BigInt(100)

      const contractAddr = isGraduated ? CONTRACTS.KOLSWAP : CONTRACTS.BONDING_CURVE
      const abi = isGraduated ? KOLSWAP_ABI : BONDING_CURVE_ABI
      const contract = new ethers.Contract(contractAddr, abi, signer)

      const functionName = isGraduated ? 'swapEthForTokens' : 'buy'

      const tx = await contract[functionName](
        tokenAddress,
        minOut,
        ethers.ZeroAddress, // no referrer
        Math.round(ethPrice),
        { value: ethIn }
      )

      setTxHash(tx.hash)
      await tx.wait()

      return tx.hash
    } catch (err: any) {
      const msg = err?.reason || err?.message || 'Transaction failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function sell(tokenAmount: string, slippagePct: number = 5) {
    if (!address) { setError('Connect wallet first'); return }
    setLoading(true)
    setError('')
    setTxHash('')

    try {
      await switchToRobinhoodChain()

      const signer = await getSigner()
      const ethPrice = await getEthPriceUsd()
      const tokensIn = ethers.parseUnits(tokenAmount, 18)

      // Calculate min ETH out with slippage
      const expectedOut = await getQuote(tokenAmount, false)
      const minOut = expectedOut * BigInt(100 - slippagePct) / BigInt(100)

      const contractAddr = isGraduated ? CONTRACTS.KOLSWAP : CONTRACTS.BONDING_CURVE
      const abi = isGraduated ? KOLSWAP_ABI : BONDING_CURVE_ABI

      // Approve tokens first if selling on KOLSwap
      if (isGraduated) {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
        const allowance = await tokenContract.allowance(address, contractAddr)
        if (allowance < tokensIn) {
          const approveTx = await tokenContract.approve(contractAddr, ethers.MaxUint256)
          await approveTx.wait()
        }
      }

      const contract = new ethers.Contract(contractAddr, abi, signer)
      const functionName = isGraduated ? 'swapTokensForEth' : 'sell'

      const tx = await contract[functionName](
        tokenAddress,
        tokensIn,
        minOut,
        ethers.ZeroAddress,
        Math.round(ethPrice),
      )

      setTxHash(tx.hash)
      await tx.wait()

      return tx.hash
    } catch (err: any) {
      const msg = err?.reason || err?.message || 'Transaction failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { buy, sell, getQuote, loading, txHash, error, quote }
}

// ── useLaunch hook — deploy a token ──────────────────────────
export function useLaunch() {
  const { address } = useAppStore()
  const [loading, setLoading]   = useState(false)
  const [step, setStep]         = useState('')
  const [error, setError]       = useState('')
  const [txHash, setTxHash]     = useState('')

  async function launch(params: {
    name: string
    ticker: string
    uri: string
    onProgress?: (step: string) => void
  }) {
    if (!address) throw new Error('Connect wallet first')
    setLoading(true)
    setError('')

    try {
      // Step 1 — switch chain
      setStep('Switching to Robinhood Chain...')
      params.onProgress?.('Switching to Robinhood Chain...')
      await switchToRobinhoodChain()

      // Step 2 — mine salt in browser
      setStep('Mining your ...kol address...')
      params.onProgress?.('Mining your ...kol address (~2 seconds)...')

      const { mineKolSalt } = await import('./saltMiner')
      const signer = await getSigner()
      const provider = getProvider()

      // Get bytecode hash from contract
      const contract = new ethers.Contract(CONTRACTS.BONDING_CURVE, BONDING_CURVE_ABI, provider)
      const bytecodeHash = ethers.keccak256('0x' + 'ab'.repeat(32)) // replaced with real hash after deployment

      let attempts = 0
      const salt = await mineKolSalt(
        CONTRACTS.BONDING_CURVE,
        bytecodeHash,
        (att) => {
          attempts = att
          params.onProgress?.(`Mining... ${(att/1000).toFixed(0)}K attempts`)
        }
      )

      // Step 3 — deploy
      setStep('Deploying token...')
      params.onProgress?.('MetaMask opening — please confirm...')

      const contractWithSigner = new ethers.Contract(CONTRACTS.BONDING_CURVE, BONDING_CURVE_ABI, signer)
      const LAUNCH_FEE = ethers.parseEther('0.0004')

      const tx = await contractWithSigner.launchToken(
        params.name,
        params.ticker,
        params.uri,
        salt,
        { value: LAUNCH_FEE }
      )

      setStep('Confirming transaction...')
      params.onProgress?.('Confirming on Robinhood Chain...')
      const receipt = await tx.wait()
      setTxHash(tx.hash)

      // Parse token address from event logs
      const iface = new ethers.Interface(BONDING_CURVE_ABI)
      let tokenAddress = ''
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log)
          if (parsed?.name === 'TokenLaunched') {
            tokenAddress = parsed.args.token
            break
          }
        } catch {}
      }

      setStep('Token deployed!')
      return { txHash: tx.hash, tokenAddress }

    } catch (err: any) {
      const msg = err?.reason || err?.message || 'Launch failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  return { launch, loading, step, error, txHash }
}

// ── useKolCall hook — submit onchain call ─────────────────────
export function useKolCall(tokenAddress: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [txHash, setTxHash]   = useState('')

  async function submitCall(thesis: string, isGraduated: boolean) {
    setLoading(true)
    setError('')
    try {
      await switchToRobinhoodChain()
      const signer = await getSigner()
      const contract = new ethers.Contract(CONTRACTS.BONDING_CURVE, BONDING_CURVE_ABI, signer)

      const tx = await contract.submitKolCall(tokenAddress, thesis, isGraduated)
      const receipt = await tx.wait()
      setTxHash(tx.hash)

      // Extract callId from event
      const iface = new ethers.Interface(BONDING_CURVE_ABI)
      let callId = ''
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log)
          if (parsed?.name === 'KolCallSubmitted') {
            callId = parsed.args.callId
            break
          }
        } catch {}
      }

      return { txHash: tx.hash, callId }
    } catch (err: any) {
      setError(err?.reason || err?.message || 'Call submission failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { submitCall, loading, error, txHash }
}

// ── useTokenBalance hook ──────────────────────────────────────
export function useTokenBalance(tokenAddress: string, walletAddress: string) {
  const [balance, setBalance] = useState<bigint>(BigInt(0))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tokenAddress || !walletAddress) return
    async function load() {
      setLoading(true)
      try {
        const provider = getProvider()
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
        const bal = await contract.balanceOf(walletAddress)
        setBalance(bal)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [tokenAddress, walletAddress])

  return { balance, loading, formatted: ethers.formatUnits(balance, 18) }
}
