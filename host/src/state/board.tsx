import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// Whether the room has a competition table at all, and what a placing is
// worth. Some communities are a table you sit at; some are a thing you get
// good at. This is the switch between those two.

export interface BoardConfig {
  enabled: boolean
  title: string
  showEntered: boolean // how many competitions somebody has actually entered
  listLength: number
  opensOn: 'latest' | 'all' // which table members land on
  allowAllTime: boolean // whether the season table is reachable at all
  win: number
  second: number
  third: number
  entering: number
}

const DEFAULTS: BoardConfig = {
  enabled: true,
  title: 'The table',
  showEntered: true,
  listLength: 20,
  opensOn: 'latest',
  allowAllTime: true,
  win: 10,
  second: 7,
  third: 5,
  entering: 1,
}

interface BoardValue {
  config: BoardConfig
  dirty: boolean
  set: <K extends keyof BoardConfig>(key: K, value: BoardConfig[K]) => void
  revert: () => void
  save: () => void
}

const BoardContext = createContext<BoardValue | null>(null)

export function BoardProvider({ communityId, children }: { communityId: string; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, BoardConfig>>({})
  const [saved, setSaved] = useState<Record<string, BoardConfig>>({})

  const committed = saved[communityId] ?? DEFAULTS
  const config = drafts[communityId] ?? committed

  const value = useMemo<BoardValue>(
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

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard(): BoardValue {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoard must be used inside BoardProvider')
  return ctx
}
