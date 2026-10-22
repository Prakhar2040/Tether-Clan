import { apiPost } from './client'
import type { OrderView } from './orders'

/* THE MOCK SEAM.
 *
 * This is the only function that stands in for a payment provider. Today it
 * asks the server to mark the order paid, with no money moving. When Razorpay
 * lands, only this function changes: open the checkout, wait for its success
 * callback, and resolve with the paid order once the server confirms it.
 * Everything around it (hold, countdown, processing, done) stays as it is.
 */
export function payForOrder(orderId: string): Promise<OrderView> {
  return apiPost<OrderView>(`/api/orders/${encodeURIComponent(orderId)}/pay`)
}
