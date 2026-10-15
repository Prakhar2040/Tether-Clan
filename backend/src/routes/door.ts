import type { FastifyInstance } from 'fastify'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/client'
import { requireHost } from '../lib/host'
import { recordAttendance } from '../lib/attendance'
import { normaliseRef } from '../lib/ref'
import { parse } from '../lib/body'
import { now } from '../world'

/* The door.
 *
 * One row per person per night, written when they walk in, answers whether a
 * cohort came back, how fast a night filled, and who has drifted. It is also
 * the only thing that separates "nobody came" from "the host never opened
 * this screen" — which is why closing the door records the people who did not
 * arrive as well as the ones who did.
 *
 * A scan also moves the counters on the member's row (lib/attendance.ts). Those
 * are a tally carried over from before this database existed, so double-counting
 * is a real hazard: a scan works out what actually changed before it adds.
 *
 * Every route here is host-only (lib/host.ts). Members only hold the QR.
 */

const Scan = z.object({
  /* Whose attendance to mark. Absent means the caller themselves. */
  personId: z.string().min(1).optional(),
  outcome: z.enum(['attended', 'no_show', 'cancelled']).default('attended'),
  walkIn: z.boolean().default(false),
})

const ScanRef = z.object({ ref: z.string().min(1).max(40) })

export async function doorRoutes(app: FastifyInstance) {
  /* The door scan: staff type (later: camera-scan) a ticket ref. */
  app.post<{ Params: { id: string } }>('/api/events/:id/scan', async (req, reply) => {
    const host = await requireHost(req, reply)
    if (!host) return
    const { event } = host
    const body = parse(ScanRef, req.body, reply)
    if (!body) return
    const ref = normaliseRef(body.ref)

    const [found] = await db
      .select({
        id: schema.tickets.id,
        orderId: schema.tickets.orderId,
        scannedAt: schema.tickets.scannedAt,
        state: schema.orders.state,
        qty: schema.orders.qty,
        personId: schema.orders.personId,
        name: schema.people.name,
      })
      .from(schema.tickets)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.tickets.orderId))
      .innerJoin(schema.people, eq(schema.people.id, schema.orders.personId))
      .where(and(eq(schema.tickets.ref, ref), eq(schema.tickets.eventId, event.id)))
      .limit(1)
    if (!found) return reply.code(404).send({ error: `No ticket ${ref} for this night` })
    if (found.state !== 'paid') {
      return reply
        .code(409)
        .send({ error: `Ticket ${ref} is not valid: its order is ${found.state}, not paid` })
    }
    const person = { id: found.personId, name: found.name }
    if (found.scannedAt) {
      return reply.code(409).send({ error: 'Already scanned', scannedAt: found.scannedAt, person })
    }

    const at = now()
    const claimed = await db.transaction(async (tx) => {
      /* Only the scan that flips scanned_at from null wins; a racing second one gets nothing. */
      const [won] = await tx
        .update(schema.tickets)
        .set({ scannedAt: at })
        .where(and(eq(schema.tickets.id, found.id), isNull(schema.tickets.scannedAt)))
        .returning({ id: schema.tickets.id })
      if (!won) return false
      /* One person, one night: later seats of the same order only mark the ticket. */
      const [already] = await tx
        .select({ outcome: schema.attendance.outcome })
        .from(schema.attendance)
        .where(
          and(
            eq(schema.attendance.eventId, event.id),
            eq(schema.attendance.personId, found.personId),
          ),
        )
        .limit(1)
      if (already?.outcome !== 'attended') {
        await recordAttendance(tx, event, found.personId, 'attended', false, at)
      }
      return true
    })
    if (!claimed) {
      const [t] = await db
        .select({ scannedAt: schema.tickets.scannedAt })
        .from(schema.tickets)
        .where(eq(schema.tickets.id, found.id))
        .limit(1)
      return reply.code(409).send({ error: 'Already scanned', scannedAt: t?.scannedAt ?? at, person })
    }

    const siblings = await db
      .select({ scannedAt: schema.tickets.scannedAt })
      .from(schema.tickets)
      .where(eq(schema.tickets.orderId, found.orderId))
    return {
      ticket: { ref },
      person,
      order: { qty: found.qty, scanned: siblings.filter((s) => s.scannedAt).length },
      scannedAt: at,
    }
  })

  /* Corrections and walk-ins: mark somebody, or un-mark them, without a ref. */
  app.post<{ Params: { id: string } }>('/api/events/:id/attendance', async (req, reply) => {
    const host = await requireHost(req, reply)
    if (!host) return
    const { caller, event } = host

    const body = parse(Scan, req.body, reply)
    if (!body) return

    const who = body.personId ?? caller
    const [person] = await db
      .select({ id: schema.people.id, name: schema.people.name })
      .from(schema.people)
      .where(eq(schema.people.id, who))
      .limit(1)
    if (!person) return reply.code(404).send({ error: `No such person: ${who}` })

    /* A walk-in is somebody without a ticket, and saying so is the point of
       the flag — it is how a host later tells demand from attendance. */
    const [ticket] = await db
      .select({ ref: schema.orders.ref })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.eventId, event.id),
          eq(schema.orders.personId, who),
          inArray(schema.orders.state, ['paid', 'held']),
        ),
      )
      .limit(1)
    if (!ticket && !body.walkIn) {
      return reply.code(409).send({ error: 'No ticket for that night', personId: who })
    }

    const { row } = await db.transaction((tx) =>
      recordAttendance(tx, event, who, body.outcome, body.walkIn || !ticket, now()),
    )

    return reply.code(201).send({
      eventId: event.id,
      person: { id: person.id, name: person.name },
      outcome: row.outcome,
      walkIn: row.walkIn,
      ticket: ticket?.ref ?? null,
      scannedAt: row.scannedAt,
    })
  })

  /** Who is expected, who arrived, who did not. The door screen's whole view. */
  app.get<{ Params: { id: string } }>('/api/events/:id/door', async (req, reply) => {
    const host = await requireHost(req, reply)
    if (!host) return
    const event = { id: host.event.id, title: host.event.title, capacity: host.event.capacity }

    const holders = await db
      .select({
        personId: schema.orders.personId,
        name: schema.people.name,
        ref: schema.orders.ref,
      })
      .from(schema.orders)
      .innerJoin(schema.people, eq(schema.people.id, schema.orders.personId))
      .where(and(eq(schema.orders.eventId, event.id), inArray(schema.orders.state, ['paid', 'held'])))

    const tickets = await db
      .select({
        ref: schema.tickets.ref,
        scannedAt: schema.tickets.scannedAt,
        personId: schema.orders.personId,
        name: schema.people.name,
      })
      .from(schema.tickets)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.tickets.orderId))
      .innerJoin(schema.people, eq(schema.people.id, schema.orders.personId))
      .where(and(eq(schema.tickets.eventId, event.id), eq(schema.orders.state, 'paid')))
      .orderBy(asc(schema.people.name), asc(schema.tickets.ref))

    const scans = await db
      .select({
        personId: schema.attendance.personId,
        name: schema.people.name,
        outcome: schema.attendance.outcome,
        walkIn: schema.attendance.walkIn,
        scannedAt: schema.attendance.scannedAt,
      })
      .from(schema.attendance)
      .innerJoin(schema.people, eq(schema.people.id, schema.attendance.personId))
      .where(eq(schema.attendance.eventId, event.id))

    const seen = new Map(scans.map((s) => [s.personId, s]))
    return {
      event,
      arrived: scans.filter((s) => s.outcome === 'attended'),
      yetToArrive: holders.filter((h) => !seen.has(h.personId)),
      walkIns: scans.filter((s) => s.walkIn),
      sold: holders.length,
      /* One row per seat, with whether it has been through the door. */
      tickets: tickets.map((t) => ({
        ref: t.ref,
        personId: t.personId,
        name: t.name,
        scannedAt: t.scannedAt,
      })),
    }
  })
}
