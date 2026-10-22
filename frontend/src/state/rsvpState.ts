import type { RsvpState } from '@shared/types'
import type { OrderView } from '../api/orders'

/* The translation layer. The client's RsvpState is one enum spanning two
 * tables: orders (going, cancelled) and attendance (checked-in, attended,
 * no-showed). The order view only carries a scanned flag per ticket, so:
 *   paid + any ticket scanned  -> checked-in (upcoming) / attended (past)
 *   paid + nothing scanned     -> going (upcoming) / no-showed (past)
 *   cancelled | refunded       -> cancelled
 *   held | expired             -> none (no seat is yours yet)
 * 'interested' never comes from an order; it is a local bookmark.
 */
export function orderToState(order: OrderView, past: boolean): RsvpState {
  switch (order.state) {
    case 'paid': {
      const scanned = order.tickets.some((t) => t.scanned)
      if (past) return scanned ? 'attended' : 'no-showed'
      return scanned ? 'checked-in' : 'going'
    }
    case 'cancelled':
    case 'refunded':
      return 'cancelled'
    default:
      return 'none'
  }
}

/** The order that speaks for an event: paid first, then a live hold, then the newest. */
export function pickOrder(orders: OrderView[], eventId: string, now = Date.now()): OrderView | undefined {
  const mine = orders.filter((o) => o.event.id === eventId)
  const live = (o: OrderView) =>
    o.state === 'held' && !!o.expiresAt && new Date(o.expiresAt).getTime() > now
  return mine.find((o) => o.state === 'paid') ?? mine.find(live) ?? mine[0]
}
