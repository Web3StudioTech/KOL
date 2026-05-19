import { create } from 'zustand'
import { Launcher } from '@/types'

interface WalletStore {
  // Wallet state
  address: string | null
  connected: boolean
  connecting: boolean

  // Launcher profile
  launcher: Launcher | null
  launcherLoading: boolean

  // Actions
  setAddress: (address: string | null) => void
  setConnecting: (v: boolean) => void
  setLauncher: (launcher: Launcher | null) => void
  setLauncherLoading: (v: boolean) => void
  disconnect: () => void
}

export const useWalletStore = create<WalletStore>((set) => ({
  address: null,
  connected: false,
  connecting: false,
  launcher: null,
  launcherLoading: false,

  setAddress: (address) => set({ address, connected: !!address }),
  setConnecting: (connecting) => set({ connecting }),
  setLauncher: (launcher) => set({ launcher }),
  setLauncherLoading: (launcherLoading) => set({ launcherLoading }),
  disconnect: () => set({
    address: null,
    connected: false,
    launcher: null
  })
}))
