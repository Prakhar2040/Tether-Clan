import { eq, inArray, sql } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { CURRENCY, totalPaise } from './money'
import { when } from './when'
import { now } from '../world'

/* Everything about an order's life that more than one route needs.
 *
 * An order is born `held`, owns its seats for HOLD_MINUTES, and either becomes `paid` or
 * lets go. Nothing runs on a timer: an expired hold is simply not counted, and gets
 * tidied up the next time anyone looks. That keeps it correct on Lambda, where nothing is
 * running between requests to do the sweeping. */

export const HOLD_MINUTES = 10
export const MAX_PER_ORDER = 6

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Mark every hold past its time as expired. Cheap, and safe to call from anywhere. */
export async function expireHeld(): Promise<void> {
  await db.execute(sql`
    update orders set state = 'expired'
    where state = 'held' and expires_at <= ${now()}
  `)
}

/** Take the event's row for the length of this transaction.
 *
 * Counting seats and then inserting is a race: two buyers can both read "one left". A
 * row lock makes the second wait until the first has committed, and then count again —
 * so the last seat is sold once. Only buyers of the *same* event queue behind each other. */
export async function lockEvent(tx: Tx, eventId: string): Promise<void> {
  await tx.execute(sql`select id from events where id = ${eventId} for update`)
}

/** Seats spoken for: everything paid, plus holds still inside their time. */
export async function seatsTaken(tx: Tx, eventId: string): Promise<number> {
  const rows = (
    await tx.execute(sql`
      select coalesce(sum(qty), 0)::int as taken from orders
      where event_id = ${eventId}
        and (state = 'paid' or (state = 'held' and expires_at > ${now()}))
    `)
  ).rows as { taken: number }[]
  return rows[0].taken
}

export type PayResult =
  | { ok: true; already: boolean }
  | { ok: false; reason: 'not_found' | 'expired' | 'no_seats' | 'not_payable' }

/** Money has arrived for this order. Idempotent: a webhook retried, or a button pressed
 *  twice, changes nothing the second time.
 *
 *  An order that expired while the person was paying is revived if its seats are still
 *  free — taking somebody's money and then refusing them their seat is the worse outcome.
 *  If the seats have gone, the caller is told, and that payment needs refunding. */
export async function markPaid(
  orderId: string,
  provider: string,
  paymentRef: string,
): Promise<PayResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1)
    if (!order) return { ok: false, reason: 'not_found' } as const
    if (order.state === 'paid') return { ok: true, already: true } as const
    if (order.state !== 'held' && order.state !== 'expired') {
      return { ok: false, reason: 'not_payable' } as const
    }

    if (order.state === 'expired' || (order.expiresAt && order.expiresAt <= now())) {
      await lockEvent(tx, order.eventId)
      const taken = await seatsTaken(tx, order.eventId)
      const [event] = await tx
        .select({ capacity: schema.events.capacity })
        .from(schema.events)
        .where(eq(schema.events.id, order.eventId))
        .limit(1)
      // `taken` does not include this order (it is expired, or about to be), so this is
      // exactly the question "are there still qty seats for it".
      if (!event || taken + order.qty > event.capacity) {
        return { ok: false, reason: order.state === 'expired' ? 'expired' : 'no_seats' } as const
      }
    }

    await tx
      .update(schema.orders)
      .set({ state: 'paid', paidAt: now(), expiresAt: null, paymentProvider: provider, paymentRef })
      .where(eq(schema.orders.id, orderId))
    return { ok: true, already: false } as const
  })
}

/** An order as the API shows it. Ticket refs appear only once paid: an unpaid order's
 *  refs are not valid anywhere, so there is nothing to hand out. */
export async function orderViews(orderIds: string[]) {
  if (orderIds.length === 0) return []
  const orders = await db
    .select({
      order: schema.orders,
      title: schema.events.title,
      startsAt: schema.events.startsAt,
    })
    .from(schema.orders)
    .innerJoin(schema.events, eq(schema.events.id, schema.orders.eventId))
    .where(inArray(schema.orders.id, orderIds))
  const tickets = await db
    .select({
      orderId: schema.tickets.orderId,
      ref: schema.tickets.ref,
      scannedAt: schema.tickets.scannedAt,
    })
    .from(schema.tickets)
    .where(inArray(schema.tickets.orderId, orderIds))

  return orders.map(({ order, title, startsAt }) => ({
    orderId: order.id,
    ref: order.ref,
    state: order.state,
    qty: order.qty,
    pricePaise: order.pricePaise,
    totalPaise: totalPaise(order.pricePaise, order.qty),
    currency: CURRENCY,
    createdAt: order.createdAt,
    expiresAt: order.state === 'held' ? order.expiresAt : null,
    paidAt: order.paidAt,
    tickets:
      order.state === 'paid'
        ? tickets
            .filter((t) => t.orderId === order.id)
            .map((t) => ({ ref: t.ref, scanned: t.scannedAt !== null }))
        : [],
    event: { id: order.eventId, title, ...when(startsAt) },
  }))
}
