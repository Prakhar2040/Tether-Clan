import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { RsvpState } from '../types'
import { events, seatsLeft } from '../data/mock'

// The RSVP lifecycle as an explicit state machine. Illegal transitions are
// ignored rather than thrown — UI affordances should already prevent them.

interface RsvpContextValue {
  stateFor: (eventId: string) => RsvpState
  markInterested: (eventId: string) => void
  join: (eventId: string) => void // going, or waitlisted when full
  cancel: (eventId: string) => void
  checkIn: (eventId: string) => void
  finish: (eventId: string) => void // checked-in -> attended
}

const RsvpContext = createContext<RsvpContextValue | null>(null)

const allowed: Record<RsvpState, RsvpState[]> = {
  none: ['interested', 'going', 'waitlisted'],
  interested: ['going', 'waitlisted', 'none'],
  going: ['checked-in', 'cancelled', 'no-showed'],
  waitlisted: ['going', 'cancelled'],
  'checked-in': ['attended'],
  attended: [],
  'no-showed': [],
  cancelled: ['interested', 'going', 'waitlisted'],
}

export function RsvpProvider({ children }: { children: ReactNode }) {
  // Seeded so the pre-event/day-of/post-event screens have a story to tell.
  const [states, setStates] = useState<Record<string, RsvpState>>({
    // Upcoming
    'catan-night': 'going',
    'badminton-doubles': 'going',
    'late-doubles': 'waitlisted',
    'catan-next-wed': 'going',
    // Past — gives My Plans a history to show
    'catan-sep-2': 'attended',
    'sketchwalk-aug-30': 'attended',
    'catan-aug-26': 'no-showed',
    'pottery-aug-23': 'cancelled',
  })

  const stateFor = useCallback(
    (eventId: string) => states[eventId] ?? 'none',
    [states],
  )

  const transition = useCallback((eventId: string, to: RsvpState) => {
    setStates((prev) => {
      const from = prev[eventId] ?? 'none'
      if (from === to || !allowed[from].includes(to)) return prev
      return { ...prev, [eventId]: to }
    })
  }, [])

  const value = useMemo<RsvpContextValue>(
    () => ({
      stateFor,
      markInterested: (id) => transition(id, 'interested'),
      join: (id) => {
        const e = events[id]
        transition(id, e && seatsLeft(e) === 0 ? 'waitlisted' : 'going')
      },
      cancel: (id) => transition(id, 'cancelled'),
      checkIn: (id) => transition(id, 'checked-in'),
      finish: (id) => transition(id, 'attended'),
    }),
    [stateFor, transition],
  )

  return <RsvpContext.Provider value={value}>{children}</RsvpContext.Provider>
}

export function useRsvp(): RsvpContextValue {
  const ctx = useContext(RsvpContext)
  if (!ctx) throw new Error('useRsvp must be used inside RsvpProvider')
  return ctx
}
