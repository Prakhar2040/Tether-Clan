import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CONNECT_WINDOW_HOURS, events, NOW } from '../data/mock'

// Connections come from events you were at. There is no directory and no
// browsable roster of strangers: you add people from a specific plan, only
// while that plan's window is open, and only if they accept.

export interface Connection {
  personId: string
  eventId: string // where you met
}

export interface PendingRequest {
  personId: string
  eventId: string
}

export type WindowState = 'open' | 'not-started' | 'closed'

interface CircleValue {
  connections: Connection[]
  incoming: PendingRequest[]
  outgoing: PendingRequest[]
  isConnected: (personId: string) => boolean
  hasSent: (personId: string) => boolean
  sendRequest: (personId: string, eventId: string) => void
  cancelRequest: (personId: string) => void
  accept: (personId: string) => void
  deny: (personId: string) => void
  remove: (personId: string) => void
  windowFor: (eventId: string) => WindowState
  metAt: (personId: string) => string | undefined
  plansTogether: (personId: string) => number
}

const CircleContext = createContext<CircleValue | null>(null)

export function CircleProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<Connection[]>([
    { personId: 'rohan', eventId: 'catan-sep-2' },
    { personId: 'priya', eventId: 'sketchwalk-aug-30' },
    { personId: 'manav', eventId: 'sketchwalk-aug-30' },
  ])
  const [incoming, setIncoming] = useState<PendingRequest[]>([
    { personId: 'aditi', eventId: 'catan-sep-8' },
    { personId: 'karthik', eventId: 'catan-sep-8' },
  ])
  const [outgoing, setOutgoing] = useState<PendingRequest[]>([])

  // The window opens when the plan starts and closes 48h after it ends.
  const windowFor = useCallback((eventId: string): WindowState => {
    const e = events[eventId]
    if (!e?.startsAt || !e?.endsAt) return 'closed'
    const start = new Date(e.startsAt).getTime()
    const closes = new Date(e.endsAt).getTime() + CONNECT_WINDOW_HOURS * 3_600_000
    const now = NOW.getTime()
    if (now < start) return 'not-started'
    return now <= closes ? 'open' : 'closed'
  }, [])

  const value = useMemo<CircleValue>(() => {
    const isConnected = (personId: string) => connections.some((c) => c.personId === personId)
    const hasSent = (personId: string) => outgoing.some((r) => r.personId === personId)

    return {
      connections,
      incoming,
      outgoing,
      isConnected,
      hasSent,
      sendRequest: (personId, eventId) => {
        if (isConnected(personId) || hasSent(personId)) return
        setOutgoing((prev) => [...prev, { personId, eventId }])
      },
      cancelRequest: (personId) => setOutgoing((prev) => prev.filter((r) => r.personId !== personId)),
      accept: (personId) => {
        const req = incoming.find((r) => r.personId === personId)
        if (!req) return
        setIncoming((prev) => prev.filter((r) => r.personId !== personId))
        setConnections((prev) => [...prev, { personId, eventId: req.eventId }])
      },
      deny: (personId) => setIncoming((prev) => prev.filter((r) => r.personId !== personId)),
      remove: (personId) => setConnections((prev) => prev.filter((c) => c.personId !== personId)),
      windowFor,
      metAt: (personId) => connections.find((c) => c.personId === personId)?.eventId,
      plansTogether: (personId) =>
        Object.values(events).filter((e) => e.attendees.some((a) => a.personId === personId)).length,
    }
  }, [connections, incoming, outgoing, windowFor])

  return <CircleContext.Provider value={value}>{children}</CircleContext.Provider>
}

export function useCircle(): CircleValue {
  const ctx = useContext(CircleContext)
  if (!ctx) throw new Error('useCircle must be used inside CircleProvider')
  return ctx
}
