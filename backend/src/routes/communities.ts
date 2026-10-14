import type { FastifyInstance } from 'fastify'
import { and, asc, count, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { agoLabel, monthYear } from '../lib/when'
import { now } from '../world'

/* Communities, as the apps want them.
 *
 * Three things are computed rather than stored, because storing them would
 * mean two places to keep in step:
 *   memberCount  — live memberships, so somebody leaving changes it
 *   ownerIds     — the memberships that say 'owner'
 *   startedLabel — rendered from startedAt, like every other date here
 */

type Row = typeof schema.communities.$inferSelect

async function shape(rows: Row[]) {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  const counts = await db
    .select({ communityId: schema.memberships.communityId, n: count() })
    .from(schema.memberships)
    .where(and(inArray(schema.memberships.communityId, ids), isNull(schema.memberships.leftAt)))
    .groupBy(schema.memberships.communityId)
  const countBy = new Map(counts.map((c) => [c.communityId, Number(c.n)]))

  const staff = await db
    .select({
      communityId: schema.memberships.communityId,
      personId: schema.memberships.personId,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .where(
      and(
        inArray(schema.memberships.communityId, ids),
        isNull(schema.memberships.leftAt),
        inArray(schema.memberships.role, ['owner', 'admin']),
      ),
    )

  /* Filenames, not bytes. The client maps a filename to whatever it serves
     the image from — a bundled asset today, a bucket later — and the API
     never has to know which. */
  const mediaIds = rows.flatMap((r) => [r.coverMediaId, r.ownerPhotoMediaId].filter(Boolean) as string[])
  const files = mediaIds.length
    ? await db
        .select({ id: schema.media.id, filename: schema.media.filename })
        .from(schema.media)
        .where(inArray(schema.media.id, mediaIds))
    : []
  const fileBy = new Map(files.map((f) => [f.id, f.filename]))

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    memberCount: countBy.get(r.id) ?? 0,
    blurb: r.blurb,
    description: r.description,
    areaName: r.areaName,
    categoryLabel: r.categoryLabel,
    ownerIds: staff.filter((s) => s.communityId === r.id && s.role === 'owner').map((s) => s.personId),
    adminIds: staff.filter((s) => s.communityId === r.id && s.role === 'admin').map((s) => s.personId),
    ownerTitle: r.ownerTitle ?? '',
    ownerQuote: r.ownerQuote ?? '',
    ownerBio: r.ownerBio ?? [],
    highlights: r.highlights ?? [],
    ownerPhoto: r.ownerPhotoMediaId ? fileBy.get(r.ownerPhotoMediaId) : undefined,
    rating: r.rating ?? 0,
    ratingCount: r.ratingCount ?? 0,
    color: r.color,
    coverImage: r.coverMediaId ? fileBy.get(r.coverMediaId) : undefined,
    startedLabel: r.startedAt ? `Started ${monthYear(r.startedAt)}` : '',
    houseRules: r.houseRules ?? [],
  }))
}

export async function communityRoutes(app: FastifyInstance) {
  /* A room's photographs. Filenames again, never URLs — the client decides
     where an image is served from, and that is the whole reason the bucket
     move will be a one-function change rather than a migration. */
  app.get<{ Params: { id: string } }>('/api/communities/:id/photos', async (req, reply) => {
    const [community] = await db
      .select({ id: schema.communities.id })
      .from(schema.communities)
      .where(eq(schema.communities.id, req.params.id))
      .limit(1)
    if (!community) return reply.code(404).send({ error: 'No such community' })

    const rows = await db
      .select({
        id: schema.photos.id,
        communityId: schema.photos.communityId,
        color: schema.photos.color,
        caption: schema.photos.caption,
        byId: schema.photos.byId,
        takenAt: schema.photos.takenAt,
        eventId: schema.photos.eventId,
        filename: schema.media.filename,
      })
      .from(schema.photos)
      .leftJoin(schema.media, eq(schema.media.id, schema.photos.mediaId))
      .where(eq(schema.photos.communityId, req.params.id))
      .orderBy(desc(schema.photos.takenAt))

    const at = now()
    return {
      photos: rows.map((r) => ({
        id: r.id,
        communityId: r.communityId,
        src: r.filename ?? undefined,
        color: r.color,
        caption: r.caption,
        byId: r.byId,
        takenAt: r.takenAt.toISOString(),
        timeLabel: agoLabel(r.takenAt, at),
        eventId: r.eventId ?? undefined,
      })),
    }
  })

  app.get('/api/communities', async () => {
    const rows = await db.select().from(schema.communities).orderBy(asc(schema.communities.name))
    return { communities: await shape(rows) }
  })

  app.get<{ Params: { id: string } }>('/api/communities/:id', async (req, reply) => {
    const rows = await db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.id, req.params.id))
      .limit(1)
    if (rows.length === 0) return reply.code(404).send({ error: 'No such community' })
    return (await shape(rows))[0]
  })
}
