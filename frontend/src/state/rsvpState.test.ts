import { describe, expect, it } from 'vitest'
import { orderToState, pickOrder } from './rsvpState'
import type { OrderView } from '../api/orders'

const o = (over: Partial<OrderView> & { tickets?: OrderView['tickets'] }): OrderView => ({
  orderId: 'o1', ref: 'x', state: 'paid', qty: 1, pricePaise: 100, totalPaise: 100, currency: 'INR',
  createdAt: '', expiresAt: null, paidAt: null, tickets: [{ ref: 'TC-AAAAAAAA', scanned: false }],
  event: { id: 'e1', title: 't' }, ...over,
})

describe('orderToState', () => {
  it('maps paid orders by scan and time', () => {
    expect(orderToState(o({}), false)).toBe('going')
    expect(orderToState(o({ tickets: [{ ref: 'a', scanned: true }] }), false)).toBe('checked-in')
    expect(orderToState(o({ tickets: [{ ref: 'a', scanned: true }] }), true)).toBe('attended')
    expect(orderToState(o({}), true)).toBe('no-showed')
  })
  it('never treats an unpaid or dead order as a seat', () => {
    expect(orderToState(o({ state: 'held', tickets: [] }), false)).toBe('none')
    expect(orderToState(o({ state: 'expired', tickets: [] }), false)).toBe('none')
    expect(orderToState(o({ state: 'cancelled' }), false)).toBe('cancelled')
    expect(orderToState(o({ state: 'refunded' }), true)).toBe('cancelled')
  })
})

describe('pickOrder', () => {
  it('prefers paid over expired for the same event', () => {
    const list = [o({ orderId: 'a', state: 'expired' }), o({ orderId: 'b' })]
    expect(pickOrder(list, 'e1')?.orderId).toBe('b')
    expect(pickOrder(list, 'zzz')).toBeUndefined()
  })
})
