'use client'
import { useState, useEffect, useCallback } from 'react'

// Highest to lowest, used only when a UI slot can show just one badge (e.g. nav icon)
export const BADGE_PRIORITY = ['kol_crown', 'builder', 'creator', 'kol', 'trader', 'anon']

export interface HeldBadge {
  badge: string
  badge_number: number
  earned_at: string
}

export function useMyBadges(wallet: string | null | undefined) {
  const [badges, setBadges] = useState<HeldBadge[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!wallet) { setBadges([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/badges/mine?wallet=${wallet.toLowerCase()}`)
      const data = await res.json()
      setBadges(data.badges || [])
    } catch {
      setBadges([])
    } finally {
      setLoading(false)
    }
  }, [wallet])

  useEffect(() => { refresh() }, [refresh])

  const badgeKeys = badges.map(b => b.badge)
  const hasBadge = (badge: string) => badgeKeys.includes(badge)
  const highestBadge = BADGE_PRIORITY.find(b => badgeKeys.includes(b)) || null

  return { badges, badgeKeys, hasBadge, highestBadge, loading, refresh }
}
