import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { membersOf, roster } from '@shared/roster'
import type { Member } from '@shared/roster'
import type { Person } from '@shared/types'

// Who is expected at the door, and who has actually walked through it.
//
// This is the surface the rest of the console is waiting on. Attendance is a
// number everywhere else — badges, the ladder, drifted-off, the return rate —
// and nothing produces it. Closing the door is what would.

export interface Holder {
  person: Person
  ticket: string
  walkIn: boolean
}

export type DoorState = Record<string, { at: string }> // personId -> arrival

function hashOf(planId: string) {
  let h = 0
  for (const ch of planId) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// Which members hold a ticket for a plan. Derived so the same plan always
// picks the same people; a real one would come from the sale log. Sales reads
// this too, to tell a regular's money from a newcomer's.
export function memberHoldersFor(communityId: string, planId: string, sold: number): Member[] {
  const members = membersOf(communityId)
  if (members.length === 0) return []
  const start = hashOf(planId) % members.length
  return Array.from(
    { length: Math.min(sold, members.length) },
    (_, i) => members[(start + i * 7) % members.length],
  )
}

export function holdersFor(communityId: string, planId: string, sold: number): Holder[] {
  const h = hashOf(planId)
  return memberHoldersFor(communityId, planId, sold)
    .map((m, i) => {
      const ref = ((h + i * 2654435761) >>> 0).toString(36).toUpperCase().slice(0, 6)
      return { person: roster[m.personId], ticket: `TC-${ref}`, walkIn: false }
    })
    .filter((x) => x.person)
}

interface DoorValue {
  arrivals: DoorState
  walkIns: Holder[]
  closed: boolean
  checkIn: (personId: string) => void
  undo: (personId: string) => void
  addWalkIn: (name: string) => void
  closeDoor: () => void
  reopen: () => void
}

const DoorContext = createContext<DoorValue | null>(null)

function clock(): string {
  // The mock evening, advancing a few minutes each time somebody arrives.
  const base = new Date()
  base.setHours(19, 25, 0, 0)
  base.setMinutes(base.getMinutes() + Math.floor(Math.random() * 40))
  return base.toTimeString().slice(0, 5)
}

export function DoorProvider({ children }: { children: ReactNode }) {
  const [arrivals, setArrivals] = useState<DoorState>({})
  const [walkIns, setWalkIns] = useState<Holder[]>([])
  const [closed, setClosed] = useState(false)

  const value = useMemo<DoorValue>(
    () => ({
      arrivals,
      walkIns,
      closed,
      checkIn: (id) => setArrivals((a) => (a[id] ? a : { ...a, [id]: { at: clock() } })),
      undo: (id) =>
        setArrivals((a) => {
          const next = { ...a }
          delete next[id]
          return next
        }),
      addWalkIn: (name) => {
        const id = `walk-${name.toLowerCase().replace(/\s+/g, '-')}-${walkIns.length}`
        const initials = name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join('')
        setWalkIns((w) => [
          ...w,
          { person: { id, name, initials, color: 'tint' }, ticket: 'walk-in', walkIn: true },
        ])
        setArrivals((a) => ({ ...a, [id]: { at: clock() } }))
      },
      closeDoor: () => setClosed(true),
      reopen: () => setClosed(false),
    }),
    [arrivals, walkIns, closed],
  )

  return <DoorContext.Provider value={value}>{children}</DoorContext.Provider>
}

export function useDoor(): DoorValue {
  const ctx = useContext(DoorContext)
  if (!ctx) throw new Error('useDoor must be used inside DoorProvider')
  return ctx
}
