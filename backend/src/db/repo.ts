import { asc, eq, gte, inArray, sql } from 'drizzle-orm'
import { travelMinutes } from '@shared/travel'
import { db, schema } from './client'
import { areas } from '../data/areas'
import type { Community, Person, TcEvent, Venue } from '../types'
import { dateLabel, dayLabel, startsInLabel, timeLabel } from '../lib/when'
import { DEFAULT_LOCATION, now } from '../world'

/* Everything the engine needs, read from Postgres on the request that needs
 * it.
 *
 * Not cached on purpose. An in-memory copy loaded at boot is a millisecond
 * faster and wrong in two ways that matter: writes do not show until a
 * restart, and two server processes each hold their own stale world. These
 * are indexed lookups over a handful of tables — when that stops being fast
 * enough, a cache goes behind this interface and nothing above it changes.
 */

export interface World {
  events: Record<string, TcEvent>
  venues: Record<string, Venue>
  people: Record<string, Person>
  communities: Record<string, Community>
}

/* The gazetteer is the one place an area is defined, so venues resolve onto
   it by name rather than carrying a second copy of the id. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

/* How long it takes to get there is a fact about the viewer, not about the
   venue, so it is computed rather than stored. Straight-line distance at
   roughly Bengaluru's effective traffic speed, plus the few minutes every
   journey costs at either end. Good enough to rank on; replace it with a
   routing service the day it needs to be right. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(bLat - aLat)
  const dLng = rad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
// Shared with the client, which has to produce the same answer offline.
const autoMinutes = travelMinutes
const areaIdByName = new Map(areas.map((a) => [slug(a.name), a.id]))

export async function loadWorld(
  at: Date = now(),
  from: { lat: number; lng: number } = DEFAULT_LOCATION,
): Promise<World> {
  const [eventRows, venueRows, personRows, communityRows] = await Promise.all([
    db.select().from(schema.events).orderBy(asc(schema.events.startsAt)),
    db.select().from(schema.venues),
    db.select().from(schema.people),
    db.select().from(schema.communities),
  ])

  const venues: Record<string, Venue> = {}
  for (const v of venueRows) {
    venues[v.id] = {
      id: v.id,
      name: v.name,
      areaId: areaIdByName.get(slug(v.areaName)) ?? slug(v.areaName),
      area: v.address ?? v.areaName,
      areaName: v.areaName,
      /* No coordinates means unknown, not (0,0): a made-up point in the Gulf of
         Guinea would give absurd distances. The engine treats null as "no
         distance, never radius-filtered, ranked after known distances". */
      lat: v.lat ?? null,
      lng: v.lng ?? null,
      entranceNote: v.entranceNote ?? undefined,
      distanceKm: v.lat == null || v.lng == null ? null : haversineKm(from.lat, from.lng, v.lat, v.lng),
      travel: {
        autoMin: v.lat == null || v.lng == null ? null : autoMinutes(haversineKm(from.lat, from.lng, v.lat, v.lng)),
      },
    } as Venue
  }

  const people: Record<string, Person> = {}
  for (const p of personRows) {
    people[p.id] = { id: p.id, name: p.name, initials: p.initials } as Person
  }

  const communities: Record<string, Community> = {}
  for (const c of communityRows) {
    communities[c.id] = {
      id: c.id,
      name: c.name,
      memberCount: 0,
      blurb: c.blurb,
      areaName: c.areaName,
      categoryLabel: c.categoryLabel,
    } as Community
  }

  /* `going` is counted, not stored. It used to be a column somebody typed;
     now it is the number of live tickets, grouped in one query so it can
     never drift from the orders table. */
  const goingRows = await db
    .select({ eventId: schema.orders.eventId, n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(inArray(schema.orders.state, ['paid', 'held']))
    .groupBy(schema.orders.eventId)
  const goingBy = new Map(goingRows.map((r) => [r.eventId, r.n]))

  /* Hosts come from the series; a plan hung straight on a community has no
     series to ask, so it falls back to that community's first owner. */
  const seriesRows = await db.select().from(schema.series)
  const hostOfSeries = new Map(seriesRows.map((s) => [s.id, s.hostId]))

  const events: Record<string, TcEvent> = {}
  for (const e of eventRows) {
    const startsAt = e.startsAt
    events[e.id] = {
      id: e.id,
      title: e.title,
      description: e.description ?? '',
      /* The database says on_sale / past; the engine's vocabulary is
         live / past. Translating at this boundary keeps the clearer word in
         the schema without rewriting the ranker. */
      status: e.status === 'on_sale' ? 'live' : e.status,
      category: e.category ?? '',
      categoryLabel: e.categoryLabel ?? '',
      tags: e.tags ?? [],
      beginnerFriendly: e.beginnerFriendly,
      minViable: e.minViable ?? undefined,
      // Computed here, in one place, because the product is one city. A
      // client is sent the instant too, so it can re-derive if a tab is left
      // open past midnight.
      startsAt: startsAt.toISOString(),
      dayLabel: dayLabel(startsAt, at),
      timeLabel: timeLabel(startsAt),
      dateLabel: dateLabel(startsAt),
      startsInLabel: startsInLabel(startsAt, at),
      price: e.pricePaise / 100,
      capacity: e.capacity,
      endsAt: (e.endsAt ?? new Date(startsAt.getTime() + 2 * 3600_000)).toISOString(),
      going: goingBy.get(e.id) ?? 0,
      /* Who is coming comes from `orders`, which are empty until the apps
         start writing them. So the social-proof signal scores zero for now —
         honest, rather than a fabricated guest list that would contradict
         the roster the moment anyone looked. */
      attendees: [],
      firstTimers: 0,
      levelLabel: e.levelLabel ?? undefined,
      venueId: e.venueId ?? '',
      hostId: (e.seriesId ? hostOfSeries.get(e.seriesId) : null) ?? '',
      seriesId: e.seriesId ?? undefined,
      communityId: e.communityId ?? undefined,
    } as unknown as TcEvent
  }

  /* An event may have no venue yet. Give those one placeholder with an
     unknown location, so nothing downstream has to special-case a miss. */
  if (Object.values(events).some((e) => !venues[e.venueId])) {
    venues[''] = {
      id: '', name: '', areaId: '', area: '', areaName: '', lat: null, lng: null,
      entranceNote: '', distanceKm: null, travel: { autoMin: null },
    } as Venue
  }

  return { events, venues, people, communities }
}

export { eq, gte, inArray }
