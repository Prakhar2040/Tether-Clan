import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { RsvpState } from '@shared/types'
import { events } from '@shared/mock'
import { fetchOrders } from '../api/orders'
import type { OrderView } from '../api/orders'
import { orderToState, pickOrder } from './rsvpState'

/* What you hold, from the server.
 *
 * Orders are the truth for going / cancelled (and, via scanned tickets, for
 * checked-in / attended / no-showed). 'interested' is a local-only bookmark
 * for now. Buying lives in BuySheet; there is deliberately no cancel here.
 * If the server is unreachable `orders` is simply empty: browsing works,
 * and nothing pretends you hold a ticket.
 */

interface RsvpContextValue {
  stateFor: (eventId: string) => RsvpState
  orderFor: (eventId: string) => OrderView | undefined
  orders: OrderView[]
  offline: boolean
  markInterested: (eventId: string) => void
  applyOrder: (order: OrderView) => void
  refresh: () => void
}

const RsvpContext = createContext<RsvpContextValue | null>(null)

export function RsvpProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderView[]>([])
  const [offline, setOffline] = useState(false)
  const [interested, setInterested] = useState<Set<string>>(new Set())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    fetchOrders(ac.signal)
      .then((o) => {
        setOrders(o)
        setOffline(false)
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setOffline(true)
      })
    return () => ac.abort()
  }, [tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const applyOrder = useCallback((o: OrderView) => {
    setOrders((prev) => [o, ...prev.filter((x) => x.orderId !== o.orderId)])
  }, [])
  const markInterested = useCallback((id: string) => setInterested((s) => new Set(s).add(id)), [])

  const value = useMemo<RsvpContextValue>(() => {
    const orderFor = (id: string) => pickOrder(orders, id)
    return {
      orders,
      offline,
      orderFor,
      stateFor: (id) => {
        const o = orderFor(id)
        if (o) {
          const past = (events[id]?.dayLabel ?? o.event.dayLabel) === 'Past'
          const s = orderToState(o, past)
          if (s !== 'none') return s
        }
        return interested.has(id) ? 'interested' : 'none'
      },
      markInterested,
      applyOrder,
      refresh,
    }
  }, [orders, offline, interested, markInterested, applyOrder, refresh])

  return <RsvpContext.Provider value={value}>{children}</RsvpContext.Provider>
}

export function useRsvp(): RsvpContextValue {
  const ctx = useContext(RsvpContext)
  if (!ctx) throw new Error('useRsvp must be used inside RsvpProvider')
  return ctx
}
