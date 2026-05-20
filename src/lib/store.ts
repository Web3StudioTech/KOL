import { create } from 'zustand'

export type WalletType = 'phantom' | 'metamask' | 'okx' | null
export type Theme = 'dark' | 'light'
export type Badge = 'anon' | 'verified' | 'kol' | 'pro_kol' | 'gold_kol'

export interface Launcher {
  id: string
  wallet_address: string
  twitter_handle: string | null
  twitter_avatar_url: string | null
  follower_count: number
  badge: Badge
  verified_at: string | null
  earnings_sol: number
  created_at: string
}

interface AppStore {
  // Wallet
  address: string | null
  walletType: WalletType
  connected: boolean
  connecting: boolean
  launcher: Launcher | null

  // Theme
  theme: Theme

  // Platform feature toggles (admin-controlled)
  showLeaderboard: boolean

  // Actions
  setAddress: (address: string | null, type?: WalletType) => void
  setConnecting: (v: boolean) => void
  setLauncher: (launcher: Launcher | null) => void
  disconnect: () => void
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  setShowLeaderboard: (v: boolean) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  address: null,
  walletType: null,
  connected: false,
  connecting: false,
  launcher: null,
  theme: 'dark',
  showLeaderboard: false,

  setAddress: (address, type = null) => set({
    address,
    walletType: type,
    connected: !!address
  }),

  setConnecting: (connecting) => set({ connecting }),

  setLauncher: (launcher) => set({ launcher }),

  disconnect: () => set({
    address: null,
    walletType: null,
    connected: false,
    launcher: null
  }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('okl-theme', next)
    set({ theme: next })
  },

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('okl-theme', theme)
    set({ theme })
  },

  setShowLeaderboard: (showLeaderboard) => set({ showLeaderboard }),
}))
