import type { RankedEvent, SearchResponse, SuggestionGroup, TcEvent } from '../types'
import { activities } from '../data/taxonomy'
import { areaById, areas } from '../data/areas'
import { communities, DEFAULT_LOCATION, events, NOW, people, venues, yourCircle } from '../data/seed'
import { normalize, tokenMatches } from './normalize'
import { route } from './router'
import { logQuery } from './log'

export interface SearchParams {
  q?: string
  when?: string // 'tonight' | 'weekend' | a day-of-month
  free?: boolean
  beginner?: boolean
  tags?: string[]
  areaId?: string
  radiusKm?: number
  lat?: number
  lng?: number
  debug?: boolean
}

const DEFAULT_RADIUS_KM = 8

// ---------- Point 5: hard prefilters ----------

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function matchesWhen(e: TcEvent, when: string | undefined): boolean {
  if (!when) return true
  if (when === 'tonight') return e.dayLabel === 'Tonight'
  if (when === 'weekend') return e.dayLabel === 'Sat' || e.dayLabel === 'Sun'
  const day = Number(when)
  if (!Number.isNaN(day)) return new Date(e.startsAt).getDate() === day
  return true
}

function beginnerOk(e: TcEvent): boolean {
  return (
    Boolean(e.beginnerFriendly) ||
    e.tags.some((t) => /beginner|all levels|drop-in|first-timer/i.test(t)) ||
    /all levels|all paces|drop in|first-timers/i.test(e.levelLabel ?? '')
  )
}

// ---------- Point 6: lexical retrieval over a composed document ----------

interface Doc {
  event: TcEvent
  fields: { text: string; weight: number }[]
}

function composeDoc(e: TcEvent): Doc {
  const venue = venues[e.venueId]
  const community = e.communityId ? communities[e.communityId] : undefined
  const host = people[e.hostId]
  // Synonyms for this event's activity join the document, so a half-typed
  // synonym ("sh" → shuttle → badminton) matches like any other token.
  const synonyms = activities
    .filter((a) => a.categoryLabels.includes(e.categoryLabel))
    .flatMap((a) => a.terms)
    .join(' ')
  return {
    event: e,
    fields: [
      { text: e.title, weight: 1.0 },
      { text: e.categoryLabel, weight: 0.8 },
      { text: e.tags.join(' '), weight: 0.7 },
      { text: synonyms, weight: 0.65 },
      { text: `${venue.name} ${venue.area}`, weight: 0.6 },
      { text: community?.name ?? '', weight: 0.5 },
      { text: host?.name ?? '', weight: 0.4 },
      { text: e.levelLabel ?? '', weight: 0.3 },
      { text: e.description, weight: 0.25 },
    ],
  }
}

const MATCH_WEIGHT = { exact: 1, prefix: 0.8, fuzzy: 0.6 } as const

function textRelevance(doc: Doc, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0
  let total = 0
  for (const qt of queryTokens) {
    let best = 0
    for (const field of doc.fields) {
      if (!field.text) continue
      for (const dt of normalize(field.text).split(' ')) {
        const kind = tokenMatches(qt, dt)
        if (kind) best = Math.max(best, MATCH_WEIGHT[kind] * field.weight)
      }
    }
    total += best
  }
  return total / queryTokens.length // 0..1
}

// ---------- Point 7: deterministic scoring ----------

interface Scored {
  event: TcEvent
  score: number
  breakdown: Record<string, number>
}

const W = { relevance: 0.3, time: 0.25, geo: 0.2, social: 0.15, scarcity: 0.1 }

function scoreEvent(doc: Doc, queryTokens: string[]): Scored {
  const e = doc.event
  const venue = venues[e.venueId]

  const relevance = textRelevance(doc, queryTokens)

  // time proximity: sooner is better, decaying over a week
  const hoursAway = (new Date(e.startsAt).getTime() - NOW.getTime()) / 3_600_000
  const time = Math.max(0, 1 - Math.min(hoursAway, 168) / 168)

  // geo proximity by travel time (Bangalore: km lies, minutes don't)
  const geo = Math.max(0, 1 - Math.min(venue.travel.autoMin, 60) / 60)

  // social proof: people from your circle attending
  const circleCount = e.attendees.filter((a) => yourCircle.has(a.personId)).length
  const social = Math.min(1, circleCount / 3)

  // scarcity: nearly-full is urgent, but full is demoted rather than hidden
  const seatsLeft = Math.max(0, e.capacity - e.going)
  const scarcity = seatsLeft === 0 ? -0.5 : seatsLeft <= 3 ? 1 : Math.max(0, 1 - seatsLeft / e.capacity)

  const breakdown = {
    relevance: +(W.relevance * relevance).toFixed(4),
    time: +(W.time * time).toFixed(4),
    geo: +(W.geo * geo).toFixed(4),
    social: +(W.social * social).toFixed(4),
    scarcity: +(W.scarcity * scarcity).toFixed(4),
  }
  const score = +Object.values(breakdown).reduce((a, b) => a + b, 0).toFixed(4)
  return { event: e, score, breakdown }
}

// ---------- Point 8/9: orchestration, suggestions, fallbacks ----------

function toRanked(list: Scored[], debug: boolean): RankedEvent[] {
  return list.map((s) => ({
    id: s.event.id,
    score: s.score,
    ...(debug ? { breakdown: s.breakdown } : {}),
  }))
}

function buildGroups(
  intents: ReturnType<typeof route>['intents'],
  queryTokens: string[],
  candidates: TcEvent[],
): SuggestionGroup[] {
  const groups: SuggestionGroup[] = []

  // Activities: from intent, or by matching taxonomy labels against the query
  const activityIds = new Set(intents.filter((i) => i.kind === 'activity').map((i) => i.id))
  if (activityIds.size === 0 && queryTokens.length > 0) {
    for (const a of activities) {
      if (a.terms.some((t) => queryTokens.some((qt) => t.startsWith(qt) && qt.length >= 2))) {
        activityIds.add(a.id)
      }
    }
  }
  const activityItems = [...activityIds]
    .map((id) => activities.find((a) => a.id === id)!)
    .filter(Boolean)
    .map((a) => ({
      id: a.id,
      label: a.label,
      count: candidates.filter((e) => a.categoryLabels.includes(e.categoryLabel)).length,
    }))
    .filter((i) => i.count > 0)
  if (activityItems.length) groups.push({ type: 'activity', items: activityItems })

  // Areas
  const areaIds = new Set(intents.filter((i) => i.kind === 'area').map((i) => i.id))
  if (areaIds.size === 0 && queryTokens.length > 0) {
    for (const a of areas) {
      if (queryTokens.some((qt) => qt.length >= 2 && a.name.toLowerCase().startsWith(qt))) areaIds.add(a.id)
    }
  }
  const areaItems = [...areaIds]
    .map((id) => areaById[id])
    .filter(Boolean)
    .map((a) => ({
      id: a.id,
      label: a.name,
      sublabel: 'Area',
      count: candidates.filter((e) => venues[e.venueId].areaId === a.id).length,
    }))
  if (areaItems.length) groups.push({ type: 'area', items: areaItems })

  // Venues
  const venueIds = new Set(intents.filter((i) => i.kind === 'venue').map((i) => i.id))
  if (venueIds.size === 0 && queryTokens.length > 0) {
    for (const v of Object.values(venues)) {
      const name = normalize(v.name)
      if (queryTokens.some((qt) => qt.length >= 2 && name.split(' ').some((w) => w.startsWith(qt)))) {
        venueIds.add(v.id)
      }
    }
  }
  const venueItems = [...venueIds]
    .map((id) => venues[id])
    .filter(Boolean)
    .map((v) => ({
      id: v.id,
      label: v.name,
      sublabel: v.area,
      count: candidates.filter((e) => e.venueId === v.id).length,
    }))
  if (venueItems.length) groups.push({ type: 'venue', items: venueItems })

  // Communities
  const communityIds = new Set(intents.filter((i) => i.kind === 'community').map((i) => i.id))
  if (communityIds.size === 0 && queryTokens.length > 0) {
    for (const c of Object.values(communities)) {
      const name = normalize(c.name)
      if (queryTokens.some((qt) => qt.length >= 3 && name.split(' ').some((w) => w.startsWith(qt)))) {
        communityIds.add(c.id)
      }
    }
  }
  const communityItems = [...communityIds]
    .map((id) => communities[id])
    .filter(Boolean)
    .map((c) => ({ id: c.id, label: c.name, sublabel: `${c.memberCount} members` }))
  if (communityItems.length) groups.push({ type: 'community', items: communityItems })

  return groups
}

export function search(params: SearchParams): SearchResponse {
  const started = performance.now()
  const raw = params.q ?? ''
  const normalized = normalize(raw)
  const { intents, residual } = route(normalized)

  // Intents refine the explicit params (explicit params win).
  const when = params.when ?? intents.find((i) => i.kind === 'when')?.id
  const free = params.free || intents.some((i) => i.kind === 'filter' && i.id === 'free')
  const beginner = params.beginner || intents.some((i) => i.kind === 'filter' && i.id === 'beginner')
  const areaId = params.areaId ?? intents.find((i) => i.kind === 'area')?.id
  const activityIntents = intents.filter((i) => i.kind === 'activity')
  const venueIntent = intents.find((i) => i.kind === 'venue')
  const communityIntent = intents.find((i) => i.kind === 'community')

  const origin = areaId
    ? { lat: areaById[areaId].lat, lng: areaById[areaId].lng }
    : { lat: params.lat ?? DEFAULT_LOCATION.lat, lng: params.lng ?? DEFAULT_LOCATION.lng }
  const radiusKm = params.radiusKm ?? (areaId ? areaById[areaId].radiusKm : DEFAULT_RADIUS_KM)

  const all = Object.values(events)

  // --- hard prefilters: status, time, geo. No score rescues a violator. ---
  const withinTime = all.filter((e) => e.status === 'live' && new Date(e.endsAt) > NOW)
  const prefiltered = withinTime.filter((e) => {
    const v = venues[e.venueId]
    return distanceKm(origin.lat, origin.lng, v.lat, v.lng) <= radiusKm
  })

  // --- soft filters from intents and params ---
  const activityCategories = new Set(
    activityIntents.flatMap((i) => activities.find((a) => a.id === i.id)?.categoryLabels ?? []),
  )
  let candidates = prefiltered.filter((e) => {
    if (!matchesWhen(e, when)) return false
    if (free && e.price !== 0) return false
    if (beginner && !beginnerOk(e)) return false
    if (params.tags?.length && !params.tags.every((t) => e.tags.includes(t))) return false
    if (activityCategories.size > 0 && !activityCategories.has(e.categoryLabel)) return false
    if (venueIntent && e.venueId !== venueIntent.id) return false
    if (communityIntent && e.communityId !== communityIntent.id) return false
    return true
  })

  // --- text retrieval only for whatever the router did not consume ---
  const queryTokens = residual
  if (queryTokens.length > 0) {
    const matched = candidates
      .map((e) => ({ e, rel: textRelevance(composeDoc(e), queryTokens) }))
      .filter((x) => x.rel > 0.15)
    candidates = matched.map((x) => x.e)
  }

  const scored = candidates
    .map((e) => scoreEvent(composeDoc(e), queryTokens))
    .sort((a, b) => b.score - a.score)

  // --- point 9: zero-result fallback — nearest matches beyond the radius ---
  let fallback: SearchResponse['fallback']
  if (scored.length === 0) {
    const wider = withinTime
      .filter((e) => {
        if (activityCategories.size > 0 && !activityCategories.has(e.categoryLabel)) return false
        if (free && e.price !== 0) return false
        if (queryTokens.length === 0) return true
        return textRelevance(composeDoc(e), queryTokens) > 0.15
      })
      .map((e) => scoreEvent(composeDoc(e), queryTokens))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    if (wider.length > 0) {
      fallback = { reason: 'beyond-radius', events: toRanked(wider, Boolean(params.debug)) }
    }
  }

  const groups = buildGroups(intents, queryTokens, candidates)
  const response: SearchResponse = {
    groups,
    events: toRanked(scored, Boolean(params.debug)),
    applied: {
      ...(when ? { when } : {}),
      ...(free ? { free } : {}),
      ...(beginner ? { beginner } : {}),
      ...(params.tags?.length ? { tags: params.tags } : {}),
      ...(areaId ? { areaId } : {}),
    },
    ...(fallback ? { fallback } : {}),
    meta: {
      normalized,
      intents: intents.map((i) => `${i.kind}:${i.id}`),
      tookMs: +(performance.now() - started).toFixed(2),
      total: scored.length,
    },
  }

  // point 10: instrumentation
  logQuery({
    raw,
    normalized,
    intents: response.meta.intents,
    residual: queryTokens,
    resultCount: scored.length,
    tookMs: response.meta.tookMs,
  })

  return response
}

// ---------- Point 9: null state (search opened, nothing typed) ----------

export function nullState() {
  const upcoming = Object.values(events)
    .filter((e) => e.status === 'live' && new Date(e.endsAt) > NOW)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

  const byActivity = activities
    .map((a) => ({
      id: a.id,
      label: a.label,
      count: upcoming.filter((e) => a.categoryLabels.includes(e.categoryLabel)).length,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const circleEvents = upcoming
    .filter((e) => e.attendees.some((a) => yourCircle.has(a.personId)))
    .slice(0, 3)
    .map((e) => ({ id: e.id, label: e.title, sublabel: `${e.dayLabel} ${e.timeLabel}` }))

  return {
    groups: [
      { type: 'activity' as const, items: byActivity },
      { type: 'event' as const, items: circleEvents },
    ],
    trendingAreas: areas
      .map((a) => ({
        id: a.id,
        label: a.name,
        count: upcoming.filter((e) => venues[e.venueId].areaId === a.id).length,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4),
  }
}
