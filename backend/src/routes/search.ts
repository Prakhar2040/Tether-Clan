import type { FastifyInstance } from 'fastify'
import { nullState, search } from '../engine/index'
import { stats } from '../engine/log'
import { events, venues } from '../data/seed'

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
    const { q, when, free, beginner, tags, area, radiusKm, debug } = req.query
    const result = search({
      q,
      when,
      free: bool(free),
      beginner: bool(beginner),
      tags: tags ? tags.split(',').filter(Boolean) : undefined,
      areaId: area,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      debug: bool(debug),
    })

    // Hydrate event rows so the frontend can render without a second call.
    return {
      ...result,
      hydrated: result.events.map((r) => {
        const e = events[r.id]
        const v = venues[e.venueId]
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
              const e = events[r.id]
              const v = venues[e.venueId]
              return { ...e, score: r.score, venue: { id: v.id, name: v.name, area: v.area, travelMin: v.travel.autoMin } }
            }),
          }
        : {}),
    }
  })

  // Point 9: null state — what to show before a single keystroke.
  app.get('/api/search/suggestions', async () => nullState())

  // Point 10: dev-only view of the query log.
  app.get('/api/search/stats', async () => stats())

  app.get('/api/health', async () => ({ ok: true, events: Object.keys(events).length }))
}
