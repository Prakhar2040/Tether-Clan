import { apiGet, apiPost } from './client'

/* Orders, as the server shows them. Money is paise on the wire. */

export type OrderStateWire = 'held' | 'paid' | 'refunded' | 'cancelled' | 'expired'

export interface OrderView {
  orderId: string
  ref: string
  state: OrderStateWire
  qty: number
  pricePaise: number
  totalPaise: number
  currency: 'INR'
  createdAt: string
  expiresAt: string | null
  paidAt: string | null
  // Empty until paid: an unpaid order's refs are not valid anywhere.
  tickets: { ref: string; scanned: boolean }[]
  event: { id: string; title: string; startsAt?: string; dayLabel?: string; timeLabel?: string; dateLabel?: string }
}

export async function fetchOrders(signal?: AbortSignal): Promise<OrderView[]> {
  const { orders } = await apiGet<{ orders: OrderView[] }>('/api/orders', signal)
  return orders
}

/** Buy: creates a held order (or hands back the live one). Never faked offline. */
export function createOrder(eventId: string, qty: number): Promise<OrderView> {
  return apiPost<OrderView>(`/api/events/${encodeURIComponent(eventId)}/orders`, { qty })
}
