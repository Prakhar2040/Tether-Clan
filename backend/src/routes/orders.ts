import type { FastifyInstance } from 'fastify'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { z } from 'zod'
import { viewerOf, ViewerUnknown } from '../lib/viewer'
import { parse } from '../lib/body'
import { now } from '../world'
import { when } from '../lib/when'

/* Buying a ticket — the first thing that writes.
 *
 * Everything the product knows about demand currently comes from a `going`
 * column somebody typed. One row per sale replaces it, and carries the thing
 * a count never could: when it happened.
 */

const LIVE: ('paid' | 'held')[] = ['paid', 'held']

/* Nothing is required yet, but the schema is: an unvalidated endpoint quietly
   accepts whatever a bot sends it, and the first surprise field becomes a
   silent null rather than a 400 saying which one. */
const Buy = z.object({
  /* Held means reserved but unpaid — the shape a real checkout needs. */
  state: z.enum(['paid', 'held']).default('paid'),
})

/** TC-A1B2C3. Short enough to read off a phone at a door. */
function ticketRef(): string {
  const n = Math.floor(Math.random() * 36 ** 6)
  return `TC-${n.toString(36).toUpperCase().padStart(6, '0')}`
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

    const body = parse(Buy, req.body, reply)
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

    /* One ticket each. The product has never sold a member two seats to the
       same night, and a bot looping would otherwise fill a room by itself. */
    const [existing] = await db
      .select({ id: schema.orders.id, ref: schema.orders.ref })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.eventId, event.id),
          eq(schema.orders.personId, viewer),
          inArray(schema.orders.state, LIVE),
        ),
      )
      .limit(1)
    if (existing) {
      return reply.code(200).send({ already: true, orderId: existing.id, ref: existing.ref })
    }

    /* Capacity is counted, not cached. Two bots buying the last seat at once
       would both pass a read-then-write check, so the count and the insert
       happen in one transaction. */
    try {
      const order = await db.transaction(async (tx) => {
        const [{ sold }] = (
          await tx.execute(sql`
            select count(*)::int as sold from orders
            where event_id = ${event.id} and state in ('paid','held')
          `)
        ).rows as { sold: number }[]
        if (sold >= event.capacity) throw new SoldOut()

        const [row] = await tx
          .insert(schema.orders)
          .values({
            id: `${event.id}:${viewer}`,
            eventId: event.id,
            personId: viewer,
            ref: ticketRef(),
            qty: 1,
            pricePaise: event.pricePaise,
            state: body.state,
          })
          .returning()
        return row
      })

      return reply.code(201).send({
        orderId: order.id,
        ref: order.ref,
        event: { id: event.id, title: event.title, ...when(event.startsAt) },
        pricePaise: order.pricePaise,
      })
    } catch (e) {
      if (e instanceof SoldOut) return reply.code(409).send({ error: 'Sold out' })
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
    const rows = await db
      .select({
        id: schema.orders.id,
        ref: schema.orders.ref,
        state: schema.orders.state,
        pricePaise: schema.orders.pricePaise,
        createdAt: schema.orders.createdAt,
        eventId: schema.events.id,
        title: schema.events.title,
        startsAt: schema.events.startsAt,
      })
      .from(schema.orders)
      .innerJoin(schema.events, eq(schema.events.id, schema.orders.eventId))
      .where(eq(schema.orders.personId, viewer))
    return {
      viewer,
      orders: rows.map((r) => ({ ...r, ...when(r.startsAt) })),
    }
  })
}

class SoldOut extends Error {}
