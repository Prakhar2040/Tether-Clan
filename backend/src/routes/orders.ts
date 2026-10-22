import type { FastifyInstance } from 'fastify'
import { and, eq, inArray } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { db, schema } from '../db/client'
import { z } from 'zod'
import { viewerOf, ViewerUnknown } from '../lib/viewer'
import { parse } from '../lib/body'
import { now } from '../world'
import { freshRefs } from '../lib/ref'
import { HOLD_MINUTES, MAX_PER_ORDER, expireHeld, lockEvent, orderViews, seatsTaken } from '../lib/orders'

/* Buying tickets.
 *
 * The client says how many it wants and nothing else. Whether the order is held or paid,
 * what it costs, and which seats it gets are all the server's to decide — an earlier
 * version took `state` from the request, which let anybody mark their own order paid.
 *
 * A paid event's order starts `held` and owns its seats for HOLD_MINUTES; paying it (see
 * routes/payments.ts) makes it `paid`. A free event's order is paid at once.
 */

/* `.strict()` turns an unknown field into a 400 naming it, instead of quietly ignoring it:
   a bot that still sends `state` should be told, not left to wonder why it was not obeyed. */
const Buy = z
  .object({
    qty: z.number().int().min(1).max(MAX_PER_ORDER).default(1),
  })
  .strict()

class NotEnoughSeats extends Error {
  soldOut: boolean
  constructor(soldOut: boolean) {
    super('not enough seats')
    this.soldOut = soldOut
  }
}

export async function orderRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/api/events/:id/orders', async (req, reply) => {
    let viewer: string
    try {
      viewer = await viewerOf(req)
    } catch (e) {
      if (e instanceof ViewerUnknown) return reply.code(401).send({ error: e.message })
      throw e
    }

    const body = parse(Buy, req.body ?? {}, reply)
    if (!body) return

    const [event] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, req.params.id))
      .limit(1)
    if (!event) return reply.code(404).send({ error: 'No such event' })

    if (event.status !== 'on_sale') {
      return reply.code(409).send({ error: `Not on sale (${event.status})`, status: event.status })
    }
    if (event.startsAt < now()) {
      return reply.code(409).send({ error: 'That one has already started' })
    }

    // Holds past their time stop counting; mark them so nothing below trips over them.
    await expireHeld()

    /* One live order each. Somebody who already holds seats, or is partway through
       paying, is handed that order back rather than a second one: a refresh mid-checkout
       must not double-book, and a bot looping must not fill a room alone. */
    const [existing] = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.eventId, event.id),
          eq(schema.orders.personId, viewer),
          inArray(schema.orders.state, ['held', 'paid']),
        ),
      )
      .limit(1)
    if (existing) {
      const [view] = await orderViews([existing.id])
      return reply.code(200).send({ already: true, ...view })
    }

    try {
      const orderId = await db.transaction(async (tx) => {
        /* Count seats and take them while holding the event's row. Without the lock two
           buyers of the last seat both read "one left" and both get it. */
        await lockEvent(tx, event.id)
        const taken = await seatsTaken(tx, event.id)
        const left = event.capacity - taken
        if (left < body.qty) throw new NotEnoughSeats(left <= 0)

        const refs = await freshRefs(body.qty, async (candidates) => {
          const rows = await tx
            .select({ ref: schema.tickets.ref })
            .from(schema.tickets)
            .where(inArray(schema.tickets.ref, candidates))
          return new Set(rows.map((r) => r.ref))
        })

        const free = event.pricePaise === 0
        const id = `ord_${randomBytes(9).toString('base64url')}`
        await tx.insert(schema.orders).values({
          id,
          eventId: event.id,
          personId: viewer,
          ref: refs[0],
          qty: body.qty,
          pricePaise: event.pricePaise,
          state: free ? 'paid' : 'held',
          expiresAt: free ? null : new Date(now().getTime() + HOLD_MINUTES * 60_000),
          paidAt: free ? now() : null,
          paymentProvider: free ? 'free' : null,
        })
        await tx.insert(schema.tickets).values(
          refs.map((ref, i) => ({ id: `${id}:${i + 1}`, orderId: id, eventId: event.id, ref })),
        )
        return id
      })

      const [view] = await orderViews([orderId])
      return reply.code(201).send(view)
    } catch (e) {
      if (e instanceof NotEnoughSeats) {
        /* Members never see vacancy counts, so even this does not say how many are left —
           only whether the night is full or that many together are not available. */
        return reply
          .code(409)
          .send({ error: e.soldOut ? 'Sold out' : "That many seats aren't available together" })
      }
      throw e
    }
  })

  /** What the viewer holds. A bot needs this to know what it already has. */
  app.get('/api/orders', async (req, reply) => {
    let viewer: string
    try {
      viewer = await viewerOf(req)
    } catch (e) {
      if (e instanceof ViewerUnknown) return reply.code(401).send({ error: e.message })
      throw e
    }
    await expireHeld()
    const mine = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.personId, viewer))
    const orders = await orderViews(mine.map((o) => o.id))
    return {
      viewer,
      orders: orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    }
  })
}
