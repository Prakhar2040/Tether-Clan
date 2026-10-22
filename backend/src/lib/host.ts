import type { FastifyReply, FastifyRequest } from 'fastify'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { viewerOf, ViewerUnknown } from './viewer'

/* Who may run the door.
 *
 * A host is a person with a live membership (left_at is null) whose role is
 * owner or admin in the event's community. An event that belongs to no
 * community has no host, so nobody can scan it. Members only hold the QR.
 */

export type DoorEvent = typeof schema.events.$inferSelect

export async function isHostOf(personId: string, communityId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.personId, personId),
        eq(schema.memberships.communityId, communityId),
        isNull(schema.memberships.leftAt),
        inArray(schema.memberships.role, ['owner', 'admin']),
      ),
    )
    .limit(1)
  return Boolean(row)
}

/** Resolves the viewer and the event and checks the viewer hosts it. On failure it has
 *  already replied (401 unknown viewer, 404 no event, 403 not a host) and returns null. */
export async function requireHost(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<{ caller: string; event: DoorEvent } | null> {
  let caller: string
  try {
    caller = await viewerOf(req)
  } catch (e) {
    if (e instanceof ViewerUnknown) {
      reply.code(401).send({ error: e.message })
      return null
    }
    throw e
  }
  const [event] = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.id, req.params.id))
    .limit(1)
  if (!event) {
    reply.code(404).send({ error: 'No such event' })
    return null
  }
  if (!event.communityId) {
    reply
      .code(403)
      .send({ error: 'This event belongs to no community, so it has no host and cannot be scanned' })
    return null
  }
  if (!(await isHostOf(caller, event.communityId))) {
    reply.code(403).send({ error: 'Only a host of this community can run the door' })
    return null
  }
  return { caller, event }
}
