import type { TcEvent } from '@shared/types'
import { API_BASE as BASE } from './client'

// Client for the search engine. Everything here is written against the
// permanent API contract, so swapping the engine's internals changes nothing.

export type SuggestionType = 'activity' | 'area' | 'venue' | 'community' | 'event'

export interface SuggestionItem {
  id: string
  label: string
  sublabel?: string
  count?: number
}

export interface SuggestionGroup {
  type: SuggestionType
  items: SuggestionItem[]
}

export interface HydratedEvent extends TcEvent {
  score: number
  // travelMin is computed by the server but deliberately not shown anywhere yet.
  venue: { id: string; name: string; area: string; areaName: string; distanceKm: number | null; travelMin: number | null }
}

export interface SearchResult {
  groups: SuggestionGroup[]
  hydrated: HydratedEvent[]
  fallbackHydrated?: HydratedEvent[]
  applied: { when?: string; free?: boolean; beginner?: boolean; tags?: string[]; areaId?: string }
  fallback?: { reason: string }
  meta: { normalized: string; intents: string[]; tookMs: number; total: number }
}

export interface NullState {
  groups: SuggestionGroup[]
  trendingAreas: SuggestionItem[]
}

export async function searchEvents(
  params: { q: string; when?: string; free?: boolean; beginner?: boolean; tags?: string[]; lat?: number; lng?: number },
  signal?: AbortSignal,
): Promise<SearchResult> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.when) qs.set('when', params.when)
  if (params.free) qs.set('free', '1')
  if (params.beginner) qs.set('beginner', '1')
  if (params.tags?.length) qs.set('tags', params.tags.join(','))
  // The viewer's position, simulated or real - the server cannot tell and does not care.
  if (params.lat !== undefined && params.lng !== undefined) {
    qs.set('lat', String(params.lat))
    qs.set('lng', String(params.lng))
  }

  const res = await fetch(`${BASE}/api/search?${qs.toString()}`, { signal })
  if (!res.ok) throw new Error(`search failed: ${res.status}`)
  return res.json()
}

export async function fetchNullState(signal?: AbortSignal): Promise<NullState> {
  const res = await fetch(`${BASE}/api/search/suggestions`, { signal })
  if (!res.ok) throw new Error(`suggestions failed: ${res.status}`)
  return res.json()
}
