import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Tier = 'veteran' | 'regular' | 'first-night' | null

// Where the rungs of the ladder sit. A threshold that cannot move is a
// threshold that will be wrong in six months, so it is configuration rather
// than a constant buried in the code.

export interface BadgeConfig {
  regularAt: number
  veteranAt: number
  firstNight: boolean // label people who have joined but not turned up yet
  // The host names their own ladder. "Shelf veteran" beats "Veteran", and
  // only the person running the room can write it.
  names: Record<Exclude<Tier, null>, string>
}

const DEFAULTS: BadgeConfig = {
  regularAt: 8,
  veteranAt: 20,
  firstNight: true,
  names: { veteran: 'Old hand', regular: 'Regular', 'first-night': 'New face' },
}

interface BadgesValue {
  config: BadgeConfig
  dirty: boolean
  set: <K extends keyof BadgeConfig>(key: K, value: BadgeConfig[K]) => void
  revert: () => void
  save: () => void
}

const BadgesContext = createContext<BadgesValue | null>(null)

export function BadgesProvider({ communityId, children }: { communityId: string; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, BadgeConfig>>({})
  const [saved, setSaved] = useState<Record<string, BadgeConfig>>({})

  const committed = saved[communityId] ?? DEFAULTS
  const config = drafts[communityId] ?? committed

  const value = useMemo<BadgesValue>(
    () => ({
      config,
      dirty: JSON.stringify(config) !== JSON.stringify(committed),
      set: (key, v) => setDrafts((d) => ({ ...d, [communityId]: { ...config, [key]: v } })),
      revert: () => setDrafts((d) => ({ ...d, [communityId]: committed })),
      save: () => {
        setSaved((s) => ({ ...s, [communityId]: config }))
        setDrafts((d) => ({ ...d, [communityId]: config }))
      },
    }),
    [config, committed, communityId],
  )

  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>
}

export function useBadges(): BadgesValue {
  const ctx = useContext(BadgesContext)
  if (!ctx) throw new Error('useBadges must be used inside BadgesProvider')
  return ctx
}



export function tierOf(attended: number, c: BadgeConfig): Tier {
  if (attended >= c.veteranAt) return 'veteran'
  if (attended >= c.regularAt) return 'regular'
  if (attended === 0 && c.firstNight) return 'first-night'
  return null
}

// What each rung is for, so the editor can say it without the host guessing.
export const TIER_MEANING: Record<Exclude<Tier, null>, string> = {
  veteran: 'Been here longer than most of the shelf',
  regular: 'Knows the room',
  'first-night': 'Joined, has not turned up yet',
}
