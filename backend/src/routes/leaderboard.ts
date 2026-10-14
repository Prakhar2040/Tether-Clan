import type { FastifyInstance } from 'fastify'
import { and, desc, eq, inArray, lte } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { dayDateLabel, dayMonthLabel } from '../lib/when'
import { pointsFor } from '@shared/points'
import { viewerOf } from '../lib/viewer'

/* The board.
 *
 * A competition table, not an attendance register — placings are the only
 * thing that scores, and a night with no competition contributes nothing.
 *
 * The scoring is applied here rather than in SQL so the rule lives in one
 * file (`@shared/points`) that the offline client also uses; a CASE
 * expression would be a second copy of it, free to drift. That means
 * loading a community's result rows to rank them, which is eighty rows
 * today and the right trade at this size. The day it isn't, points become a
 * stored column on `results` and this becomes a sum.
 */

type Tally = {
  points: number
  wins: number
  podiums: number
  entered: number
  best: number
  place: number
}

const empty = (): Tally => ({ points: 0, wins: 0, podiums: 0, entered: 0, best: 99, place: 99 })

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string }; Querystring: { scope?: string } }>(
    '/api/communities/:id/leaderboard',
    async (req, reply) => {
      const [community] = await db
        .select({ id: schema.communities.id })
        .from(schema.communities)
        .where(eq(schema.communities.id, req.params.id))
        .limit(1)
      if (!community) return reply.code(404).send({ error: 'No such community' })

      const comps = await db
        .select()
        .from(schema.competitions)
        .where(eq(schema.competitions.communityId, req.params.id))
        .orderBy(desc(schema.competitions.heldOn))

      /* The month is the default, because a season total hides who actually
         won last week. A scope naming a competition this community never
         ran falls back rather than 404s — the client keeps a scope in its
         URL, and switching rooms must not break the page. */
      const asked = req.query.scope
      const scope =
        asked === 'all' || comps.some((c) => c.id === asked)
          ? asked!
          : (comps[0]?.id ?? 'all')

      const pool = scope === 'all' ? comps.map((c) => c.id) : [scope]
      const rows = pool.length
        ? await db
            .select({
              personId: schema.results.personId,
              place: schema.results.place,
              name: schema.people.name,
              initials: schema.people.initials,
              color: schema.people.color,
            })
            .from(schema.results)
            .innerJoin(schema.people, eq(schema.people.id, schema.results.personId))
            .where(inArray(schema.results.competitionId, pool))
        : []

      /* The top three of each competition, for the console's list of past
         months and for the "won by" line under it. Three rows a month, so
         it rides along with the table rather than being its own call. */
      const podiums = comps.length
        ? await db
            .select({
              competitionId: schema.results.competitionId,
              place: schema.results.place,
              personId: schema.results.personId,
              name: schema.people.name,
            })
            .from(schema.results)
            .innerJoin(schema.people, eq(schema.people.id, schema.results.personId))
            .where(
              and(
                inArray(
                  schema.results.competitionId,
                  comps.map((c) => c.id),
                ),
                lte(schema.results.place, 3),
              ),
            )
        : []
      const podiumBy = new Map<string, { place: number; personId: string; name: string }[]>()
      for (const r of [...podiums].sort((a, b) => a.place - b.place)) {
        const list = podiumBy.get(r.competitionId) ?? []
        list.push({ place: r.place, personId: r.personId, name: r.name })
        podiumBy.set(r.competitionId, list)
      }

      const viewer = await viewerOf(req)
      const tally = new Map<string, Tally & { name: string; initials: string; color: string }>()
      for (const r of rows) {
        const t =
          tally.get(r.personId) ??
          { ...empty(), name: r.name, initials: r.initials, color: r.color }
        t.points += pointsFor(r.place)
        t.entered += 1
        if (r.place === 1) t.wins += 1
        if (r.place <= 3) t.podiums += 1
        t.best = Math.min(t.best, r.place)
        t.place = Math.min(t.place, r.place)
        tally.set(r.personId, t)
      }

      const standings = [...tally.entries()]
        .map(([id, t]) => ({
          points: t.points,
          wins: t.wins,
          podiums: t.podiums,
          entered: t.entered,
          best: t.best,
          place: t.place,
          isYou: id === viewer,
          person: { id, name: t.name, initials: t.initials, color: t.color },
        }))
        // Within one competition the finishing order is the truth; across a
        // season it is points.
        .sort((a, b) =>
          scope === 'all'
            ? b.points - a.points || b.wins - a.wins || a.person.name.localeCompare(b.person.name)
            : a.place - b.place,
        )
        .map((r, i) => ({ ...r, rank: scope === 'all' ? i + 1 : r.place }))

      return {
        scope,
        competitions: comps.map((c) => ({
          id: c.id,
          communityId: c.communityId,
          name: c.name,
          heldOn: c.heldOn,
          dateLabel: dayDateLabel(c.heldOn),
          monthLabel: dayMonthLabel(c.heldOn),
          entrants: c.entrants,
          podium: podiumBy.get(c.id) ?? [],
        })),
        standings,
      }
    },
  )

  /* Your own placings, across every room you are in. The profile asks for
     this; nobody can ask for anybody else's, which is the same rule the
     attendee lists follow. */
  app.get('/api/me/results', async (req) => {
    const viewer = await viewerOf(req)
    const rows = await db
      .select({
        competitionId: schema.competitions.id,
        name: schema.competitions.name,
        communityId: schema.competitions.communityId,
        communityName: schema.communities.name,
        heldOn: schema.competitions.heldOn,
        entrants: schema.competitions.entrants,
        place: schema.results.place,
      })
      .from(schema.results)
      .innerJoin(schema.competitions, eq(schema.competitions.id, schema.results.competitionId))
      .innerJoin(schema.communities, eq(schema.communities.id, schema.competitions.communityId))
      .where(eq(schema.results.personId, viewer))
      .orderBy(desc(schema.competitions.heldOn))

    return {
      results: rows.map((r) => ({
        ...r,
        dateLabel: dayDateLabel(r.heldOn),
        monthLabel: dayMonthLabel(r.heldOn),
        points: pointsFor(r.place),
      })),
    }
  })
}
