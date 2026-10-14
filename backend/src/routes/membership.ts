import type { FastifyInstance } from 'fastify'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { lastSeenLabel, monthShortYear, monthsApart } from '../lib/when'
import { viewerOf, ViewerUnknown } from '../lib/viewer'
import { now } from '../world'

/* Joining and leaving.
 *
 * Leaving is the half that never existed. A membership had a start and no
 * end, which is why the growth chart could only ever climb and why the host
 * console carries a lib/churn.ts inventing departures. Writing `leftAt` makes
 * the line able to go down.
 *
 * Rejoining works because the unique index only covers live rows, so a
 * person's history with a room is a sequence of spells, not one flag.
 */
export async function membershipRoutes(app: FastifyInstance) {
  const whoOr401 = async (req: Parameters<typeof viewerOf>[0], reply: { code: (n: number) => { send: (b: unknown) => unknown } }) => {
    try {
      return await viewerOf(req)
    } catch (e) {
      if (e instanceof ViewerUnknown) {
        reply.code(401).send({ error: e.message })
        return null
      }
      throw e
    }
  }

  app.post<{ Params: { id: string } }>('/api/communities/:id/join', async (req, reply) => {
    const viewer = await whoOr401(req, reply)
    if (!viewer) return

    const [community] = await db
      .select({ id: schema.communities.id, name: schema.communities.name })
      .from(schema.communities)
      .where(eq(schema.communities.id, req.params.id))
      .limit(1)
    if (!community) return reply.code(404).send({ error: 'No such community' })

    const [live] = await db
      .select({ id: schema.memberships.id, role: schema.memberships.role })
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.personId, viewer),
          eq(schema.memberships.communityId, community.id),
          isNull(schema.memberships.leftAt),
        ),
      )
      .limit(1)
    if (live) return reply.code(200).send({ already: true, role: live.role })

    const joinedAt = now()
    const [row] = await db
      .insert(schema.memberships)
      .values({
        // Spells are distinct rows, so the id carries the moment.
        id: `${community.id}:${viewer}:${joinedAt.getTime()}`,
        personId: viewer,
        communityId: community.id,
        role: 'member',
        joinedAt,
      })
      .returning()
    return reply.code(201).send({ membershipId: row.id, community: community.name, joinedAt })
  })

  app.post<{ Params: { id: string } }>('/api/communities/:id/leave', async (req, reply) => {
    const viewer = await whoOr401(req, reply)
    if (!viewer) return

    const left = await db
      .update(schema.memberships)
      .set({ leftAt: now() })
      .where(
        and(
          eq(schema.memberships.personId, viewer),
          eq(schema.memberships.communityId, req.params.id),
          isNull(schema.memberships.leftAt),
        ),
      )
      .returning({ id: schema.memberships.id, leftAt: schema.memberships.leftAt })
    if (left.length === 0) return reply.code(404).send({ error: 'Not a member' })
    return { membershipId: left[0].id, leftAt: left[0].leftAt }
  })

  /* The roster. The host console's list, and the one thing in this product
     a member is never shown — who else is in the room is the owner's to see,
     which is why this hangs off the community rather than off a person.
     
     Everything a column sorts on is sent as a number as well as a label:
     "2 weeks ago" does not sort, and 14 does. */
  app.get<{ Params: { id: string } }>('/api/communities/:id/members', async (req, reply) => {
    const [community] = await db
      .select({ id: schema.communities.id })
      .from(schema.communities)
      .where(eq(schema.communities.id, req.params.id))
      .limit(1)
    if (!community) return reply.code(404).send({ error: 'No such community' })

    const rows = await db
      .select({
        personId: schema.memberships.personId,
        communityId: schema.memberships.communityId,
        role: schema.memberships.role,
        joinedAt: schema.memberships.joinedAt,
        attended: schema.memberships.attended,
        noShows: schema.memberships.noShows,
        lastSeenAt: schema.memberships.lastSeenAt,
        name: schema.people.name,
        initials: schema.people.initials,
        color: schema.people.color,
      })
      .from(schema.memberships)
      .innerJoin(schema.people, eq(schema.people.id, schema.memberships.personId))
      .where(
        and(eq(schema.memberships.communityId, community.id), isNull(schema.memberships.leftAt)),
      )
      .orderBy(asc(schema.people.name))

    const at = now()
    const WEEK = 7 * 86_400_000
    return {
      members: rows.map((r) => {
        /* Nobody who has never come has a last night. The console reads the
           absence as "never came", which is not the same as "came, long
           ago" — so the number it sorts on is large rather than zero. */
        const weeks = r.lastSeenAt
          ? Math.max(0, Math.floor((at.getTime() - r.lastSeenAt.getTime()) / WEEK))
          : null
        return {
          personId: r.personId,
          communityId: r.communityId,
          role: r.role,
          joinedAt: r.joinedAt,
          joinedLabel: monthShortYear(r.joinedAt),
          monthsIn: monthsApart(r.joinedAt, at),
          attended: r.attended,
          noShows: r.noShows,
          lastSeenWeeks: weeks ?? 999,
          lastSeenLabel: weeks === null ? 'never' : lastSeenLabel(weeks),
          person: { id: r.personId, name: r.name, initials: r.initials, color: r.color },
        }
      }),
    }
  })

  /** Which rooms the viewer is in right now. */
  app.get('/api/memberships', async (req, reply) => {
    const viewer = await whoOr401(req, reply)
    if (!viewer) return
    const rows = await db
      .select({
        communityId: schema.memberships.communityId,
        name: schema.communities.name,
        role: schema.memberships.role,
        joinedAt: schema.memberships.joinedAt,
      })
      .from(schema.memberships)
      .innerJoin(schema.communities, eq(schema.communities.id, schema.memberships.communityId))
      .where(and(eq(schema.memberships.personId, viewer), isNull(schema.memberships.leftAt)))
    return { viewer, memberships: rows }
  })
}
