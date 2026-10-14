import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { nullState, search } from '../engine/index'
import { stats } from '../engine/log'
import { loadWorld } from '../db/repo'

// Thin HTTP layer: parse and validate, then call the engine. No logic here.

interface SearchQuerystring {
  q?: string
  when?: string
  free?: string
  beginner?: string
  tags?: string
  area?: string
  radiusKm?: string
  debug?: string
}

function bool(v: string | undefined): boolean {
  return v === '1' || v === 'true'
}

export async function searchRoutes(app: FastifyInstance) {
  // Suggestions + ranked events. The permanent contract (point 8).
  app.get<{ Querystring: SearchQuerystring }>('/api/search', async (req) => {
    const w = await loadWorld()
    const { q, when, free, beginner, tags, area, radiusKm, debug } = req.query
    const result = search(
      {
        q,
        when,
        free: bool(free),
        beginner: bool(beginner),
        tags: tags ? tags.split(',').filter(Boolean) : undefined,
        areaId: area,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
        debug: bool(debug),
      },
      w,
    )

    // Hydrate event rows so the frontend can render without a second call.
    return {
      ...result,
      hydrated: result.events.map((r) => {
        const e = w.events[r.id]
        const v = w.venues[e.venueId]
        return {
          ...e,
          score: r.score,
          ...(r.breakdown ? { breakdown: r.breakdown } : {}),
          venue: { id: v.id, name: v.name, area: v.area, travelMin: v.travel.autoMin },
        }
      }),
      ...(result.fallback
        ? {
            fallbackHydrated: result.fallback.events.map((r) => {
              const e = w.events[r.id]
              const v = w.venues[e.venueId]
              return { ...e, score: r.score, venue: { id: v.id, name: v.name, area: v.area, travelMin: v.travel.autoMin } }
            }),
          }
        : {}),
    }
  })

  // Point 9: null state — what to show before a single keystroke.
  app.get('/api/search/suggestions', async () => nullState(await loadWorld()))

  // Point 10: dev-only view of the query log.
  app.get('/api/search/stats', async () => stats())

  // Health that actually touches the database. A health check that cannot
  // fail is not reporting anything.
  app.get('/api/health', async (_req, reply) => {
    try {
      const [row] = (
        await db.execute(sql`
          select (select count(*) from people)::int as people,
                 (select count(*) from events)::int as events
        `)
      ).rows as { people: number; events: number }[]
      return { ok: true, db: 'up', ...row }
    } catch (err) {
      reply.code(503)
      return { ok: false, db: 'down', reason: (err as Error).message }
    }
  })
}
