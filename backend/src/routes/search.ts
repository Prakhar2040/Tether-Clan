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
  lat?: string
  lng?: string
  debug?: string
}

function bool(v: string | undefined): boolean {
  return v === '1' || v === 'true'
}

/* The viewer's position. Both or neither; each a finite number in range.
   Whether it came from a simulated picker or the browser is the client's
   business - the server only ever sees a lat and a lng. */
function parseViewer(q: SearchQuerystring): { lat: number; lng: number } | undefined | { error: string } {
  const { lat, lng } = q
  if (lat === undefined && lng === undefined) return undefined
  if (lat === undefined) return { error: 'lat is required when lng is given' }
  if (lng === undefined) return { error: 'lng is required when lat is given' }
  const num = (name: string, raw: string, max: number) => {
    const n = raw.trim() === '' ? NaN : Number(raw)
    return Number.isFinite(n) && Math.abs(n) <= max ? n : { error: `${name} must be a number between -${max} and ${max}` }
  }
  const a = num('lat', lat, 90)
  if (typeof a !== 'number') return a
  const b = num('lng', lng, 180)
  if (typeof b !== 'number') return b
  return { lat: a, lng: b }
}

export async function searchRoutes(app: FastifyInstance) {
  // Suggestions + ranked events. The permanent contract (point 8).
  app.get<{ Querystring: SearchQuerystring }>('/api/search', async (req, reply) => {
    const viewer = parseViewer(req.query)
    if (viewer && 'error' in viewer) {
      reply.code(400)
      return { error: viewer.error }
    }
    const w = await loadWorld(undefined, viewer)
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
        ...(viewer ? { lat: viewer.lat, lng: viewer.lng } : {}),
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
          venue: { id: v.id, name: v.name, area: v.area, areaName: v.areaName ?? v.area, distanceKm: v.distanceKm == null ? null : +v.distanceKm.toFixed(1), travelMin: v.travel.autoMin },
        }
      }),
      ...(result.fallback
        ? {
            fallbackHydrated: result.fallback.events.map((r) => {
              const e = w.events[r.id]
              const v = w.venues[e.venueId]
              return { ...e, score: r.score, venue: { id: v.id, name: v.name, area: v.area, areaName: v.areaName ?? v.area, distanceKm: v.distanceKm == null ? null : +v.distanceKm.toFixed(1), travelMin: v.travel.autoMin } }
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
