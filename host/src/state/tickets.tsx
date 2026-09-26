import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// How tickets behave for this community. Not what is on sale — that writes
// itself from Plans — but whether a pass is scannable, what it carries, and
// what the list shows.

export interface TicketSettings {
  entryQr: boolean
  passNote: boolean
  passNoteText: string // a standing line on every pass, in the host's words
  passEntrance: boolean
  showPast: boolean
  showSoldOut: boolean
}

const DEFAULTS: TicketSettings = {
  entryQr: true,
  passNote: true,
  passNoteText: 'Doors open fifteen minutes before. Come find us rather than waiting outside.',
  passEntrance: true,
  showPast: true,
  showSoldOut: true,
}

interface TicketsValue {
  settings: TicketSettings
  dirty: boolean
  set: <K extends keyof TicketSettings>(key: K, value: TicketSettings[K]) => void
  revert: () => void
  save: () => void
}

const TicketsContext = createContext<TicketsValue | null>(null)

export function TicketsProvider({ communityId, children }: { communityId: string; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, TicketSettings>>({})
  const [saved, setSaved] = useState<Record<string, TicketSettings>>({})

  const committed = saved[communityId] ?? DEFAULTS
  const settings = drafts[communityId] ?? committed

  const value = useMemo<TicketsValue>(
    () => ({
      settings,
      dirty: JSON.stringify(settings) !== JSON.stringify(committed),
      set: (key, v) => setDrafts((d) => ({ ...d, [communityId]: { ...settings, [key]: v } })),
      revert: () => setDrafts((d) => ({ ...d, [communityId]: committed })),
      save: () => {
        setSaved((s) => ({ ...s, [communityId]: settings }))
        setDrafts((d) => ({ ...d, [communityId]: settings }))
      },
    }),
    [settings, committed, communityId],
  )

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>
}

export function useTickets(): TicketsValue {
  const ctx = useContext(TicketsContext)
  if (!ctx) throw new Error('useTickets must be used inside TicketsProvider')
  return ctx
}
