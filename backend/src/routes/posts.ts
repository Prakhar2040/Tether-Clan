import type { FastifyInstance } from 'fastify'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { viewerOf, ViewerUnknown } from '../lib/viewer'
import { agoLabel } from '../lib/when'
import { now } from '../world'

/* The channel, as a member sees it.
 *
 * Counts are derived from rows rather than stored, which costs a query and
 * buys the only thing the UI actually needs: whether *you* reacted, and what
 * *you* voted for. A stored count cannot answer either.
 */
export async function postRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/api/communities/:id/posts', async (req, reply) => {
    let viewer: string | null = null
    try {
      viewer = await viewerOf(req)
    } catch (e) {
      if (!(e instanceof ViewerUnknown)) throw e
      // An unknown caller still gets the room, just without their own marks.
    }

    const rows = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.communityId, req.params.id))
      .orderBy(desc(schema.posts.postedAt))
    if (rows.length === 0) {
      const [community] = await db
        .select({ id: schema.communities.id })
        .from(schema.communities)
        .where(eq(schema.communities.id, req.params.id))
        .limit(1)
      if (!community) return reply.code(404).send({ error: 'No such community' })
      return { posts: [] }
    }

    const ids = rows.map((r) => r.id)
    const [opts, votes, reacts] = await Promise.all([
      db.select().from(schema.pollOptions).where(inArray(schema.pollOptions.postId, ids)).orderBy(asc(schema.pollOptions.position)),
      db.select().from(schema.pollVotes).where(inArray(schema.pollVotes.postId, ids)),
      db.select().from(schema.reactions).where(inArray(schema.reactions.postId, ids)),
    ])

    const at = now()
    return {
      posts: rows.map((r) => {
        const mine = viewer ? votes.find((v) => v.postId === r.id && v.personId === viewer) : undefined
        const onThis = reacts.filter((x) => x.postId === r.id)

        /* Busiest first, and only emoji somebody actually used — a post with
           no reactions shows none, the same rule the app already follows. */
        const tally = new Map<string, number>()
        for (const x of onThis) tally.set(x.emoji, (tally.get(x.emoji) ?? 0) + 1)

        return {
          id: r.id,
          communityId: r.communityId,
          authorId: r.authorId,
          kind: r.kind,
          emoji: r.emoji ?? undefined,
          title: r.title ?? undefined,
          body: r.body,
          postedAt: r.postedAt.toISOString(),
          timeLabel: agoLabel(r.postedAt, at),
          pinned: r.pinned || undefined,
          reactions: [...tally.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([emoji, count]) => ({
              emoji,
              count,
              mine: viewer ? onThis.some((x) => x.emoji === emoji && x.personId === viewer) : false,
            })),
          poll: r.pollQuestion
            ? {
                question: r.pollQuestion,
                closesLabel: r.pollClosesLabel ?? '',
                votedFor: mine?.optionId?.split(':').pop(),
                options: opts
                  .filter((o) => o.postId === r.id)
                  .map((o) => ({
                    id: o.id.split(':').pop()!,
                    label: o.label,
                    votes: votes.filter((v) => v.optionId === o.id).length,
                  })),
              }
            : undefined,
        }
      }),
    }
  })

  /* Reacting is a toggle, because that is what tapping the same emoji twice
     means to a person. */
  app.post<{ Params: { id: string; emoji: string } }>(
    '/api/posts/:id/reactions/:emoji',
    async (req, reply) => {
      let viewer: string
      try {
        viewer = await viewerOf(req)
      } catch (e) {
        if (e instanceof ViewerUnknown) return reply.code(401).send({ error: e.message })
        throw e
      }
      const emoji = decodeURIComponent(req.params.emoji)
      const [post] = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.id, req.params.id)).limit(1)
      if (!post) return reply.code(404).send({ error: 'No such post' })

      const id = `${post.id}:${viewer}:${emoji}`
      const gone = await db.delete(schema.reactions).where(eq(schema.reactions.id, id)).returning()
      if (gone.length > 0) return { emoji, mine: false }
      await db.insert(schema.reactions).values({ id, postId: post.id, personId: viewer, emoji })
      return { emoji, mine: true }
    },
  )

  /* Voting replaces, never adds — one vote each is enforced by the index, so
     changing your mind has to be an update. */
  app.post<{ Params: { id: string; optionId: string } }>(
    '/api/posts/:id/vote/:optionId',
    async (req, reply) => {
      let viewer: string
      try {
        viewer = await viewerOf(req)
      } catch (e) {
        if (e instanceof ViewerUnknown) return reply.code(401).send({ error: e.message })
        throw e
      }
      const optionId = `${req.params.id}:${req.params.optionId}`
      const [option] = await db
        .select({ id: schema.pollOptions.id })
        .from(schema.pollOptions)
        .where(and(eq(schema.pollOptions.id, optionId), eq(schema.pollOptions.postId, req.params.id)))
        .limit(1)
      if (!option) return reply.code(404).send({ error: 'No such option on that poll' })

      await db
        .insert(schema.pollVotes)
        .values({ id: `${req.params.id}:${viewer}`, postId: req.params.id, optionId, personId: viewer })
        .onConflictDoUpdate({
          target: [schema.pollVotes.postId, schema.pollVotes.personId],
          set: { optionId, votedAt: now() },
        })
      return { votedFor: req.params.optionId }
    },
  )
}
