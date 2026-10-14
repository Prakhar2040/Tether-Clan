import type { FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'

/* Who is asking.
 *
 * A header, not a session — deliberately. Real auth is its own project and
 * nothing local needs it yet, but every write has to be attributable from the
 * first one or you end up retrofitting an actor through a dozen call sites.
 * A bot sets `x-user-id`; a browser gets the demo viewer. When sessions
 * arrive, only this file changes.
 */

export const DEMO_VIEWER = 'you'

export class ViewerUnknown extends Error {
  constructor(id: string) {
    super(`No such person: ${id}`)
  }
}

export async function viewerOf(req: FastifyRequest): Promise<string> {
  const header = req.headers['x-user-id']
  const id = (Array.isArray(header) ? header[0] : header)?.trim() || DEMO_VIEWER
  const [found] = await db
    .select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.id, id))
    .limit(1)
  if (!found) throw new ViewerUnknown(id)
  return found.id
}
