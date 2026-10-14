import type { FastifyInstance } from 'fastify'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/client'
import { viewerOf, ViewerUnknown } from '../lib/viewer'
import { parse } from '../lib/body'
import { now } from '../world'

/* The door.
 *
 * This is the table whose absence has blocked the most. `attended: 27` was a
 * number somebody typed, with no dates behind it, so nothing could answer
 * whether a cohort came back, how fast a night filled, or who has drifted.
 * One row per person per night, written when they walk in, answers all three.
 *
 * It is also the only thing that separates "nobody came" from "the host never
 * opened this screen" — which is why closing the door records the people who
 * did not arrive as well as the ones who did.
 *
 * A scan also moves the counters on the member's row, which is where the
 * console reads "been to 14 nights" from. Those are a tally carried over
 * from before this database existed, so they cannot be recomputed from the
 * rows below them — which makes double-counting a real hazard, and the
 * reason a scan works out what actually changed before it adds anything.
 */

const Scan = z.object({
  /* Whose ticket. Absent means the caller is scanning themselves in, which is
     what a member's own QR does. */
  personId: z.string().min(1).optional(),
  outcome: z.enum(['attended', 'no_show', 'cancelled']).default('attended'),
  walkIn: z.boolean().default(false),
})

export async function doorRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/api/events/:id/attendance', async (req, reply) => {
    let caller: string
    try {
      caller = await viewerOf(req)
    } catch (e) {
      if (e instanceof ViewerUnknown) return reply.code(401).send({ error: e.message })
      throw e
    }

    const body = parse(Scan, req.body, reply)
    if (!body) return

    const [event] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, req.params.id))
      .limit(1)
    if (!event) return reply.code(404).send({ error: 'No such event' })

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

    const at = now()
    const row = await db.transaction(async (tx) => {
      /* What the door already said about this person tonight. A second scan
         is a double tap, not an error, and it must not be a second night. */
      const [before] = await tx
        .select({ outcome: schema.attendance.outcome })
        .from(schema.attendance)
        .where(
          and(eq(schema.attendance.eventId, event.id), eq(schema.attendance.personId, who)),
        )
        .limit(1)

      const [written] = await tx
        .insert(schema.attendance)
        .values({
          id: `${event.id}:${who}`,
          eventId: event.id,
          personId: who,
          outcome: body.outcome,
          scannedAt: body.outcome === 'attended' ? at : null,
          walkIn: body.walkIn || !ticket,
        })
        .onConflictDoUpdate({
          target: [schema.attendance.eventId, schema.attendance.personId],
          set: { outcome: body.outcome, scannedAt: body.outcome === 'attended' ? at : null },
        })
        .returning()

      const score = (o?: string) => ({
        attended: o === 'attended' ? 1 : 0,
        noShows: o === 'no_show' ? 1 : 0,
      })
      const was = score(before?.outcome)
      const is = score(written.outcome)
      const dAttended = is.attended - was.attended
      const dNoShows = is.noShows - was.noShows

      /* A walk-in from another room, or a night this community does not own,
         has no membership row to move — the update simply matches nothing. */
      if (event.communityId && (dAttended !== 0 || dNoShows !== 0)) {
        await tx
          .update(schema.memberships)
          .set({
            attended: sql`${schema.memberships.attended} + ${dAttended}`,
            noShows: sql`${schema.memberships.noShows} + ${dNoShows}`,
            // Correcting a mistaken scan must not move the last night forward.
            ...(dAttended > 0 ? { lastSeenAt: at } : {}),
          })
          .where(
            and(
              eq(schema.memberships.personId, who),
              eq(schema.memberships.communityId, event.communityId),
              isNull(schema.memberships.leftAt),
            ),
          )
      }

      return written
    })

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
    const [event] = await db
      .select({ id: schema.events.id, title: schema.events.title, capacity: schema.events.capacity })
      .from(schema.events)
      .where(eq(schema.events.id, req.params.id))
      .limit(1)
    if (!event) return reply.code(404).send({ error: 'No such event' })

    const holders = await db
      .select({
        personId: schema.orders.personId,
        name: schema.people.name,
        ref: schema.orders.ref,
      })
      .from(schema.orders)
      .innerJoin(schema.people, eq(schema.people.id, schema.orders.personId))
      .where(and(eq(schema.orders.eventId, event.id), inArray(schema.orders.state, ['paid', 'held'])))

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
    }
  })
}
