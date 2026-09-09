// Backend object model. Mirrors the frontend's model, plus the fields the
// engine needs: status, real timestamps, and coordinates. When Postgres
// arrives these become table rows; the shapes stay.

export type EventStatus = 'live' | 'draft' | 'cancelled' | 'past'

export interface Venue {
  id: string
  name: string
  area: string
  areaId: string
  lat: number
  lng: number
  entranceNote: string
  travel: { autoMin: number; autoFare?: number; metro?: string; walkMin?: number }
}

export interface Community {
  id: string
  name: string
  memberCount: number
}

export interface Series {
  id: string
  title: string
  cadenceLabel: string
  hostId: string
  communityId?: string
}

export interface Person {
  id: string
  name: string
  initials: string
}

export interface Attendee {
  personId: string
  relation: 'host' | 'regular' | 'first-timer'
}

export interface TcEvent {
  id: string
  title: string
  description: string
  status: EventStatus
  category: string
  categoryLabel: string
  dayLabel: string // display label the frontend already uses
  timeLabel: string
  startsAt: string // ISO
  endsAt: string // ISO
  liveNow?: boolean
  price: number // ₹, 0 = free
  capacity: number
  going: number
  beginnerFriendly?: boolean
  levelLabel?: string
  tags: string[]
  venueId: string
  hostId: string
  seriesId?: string
  communityId?: string
  attendees: Attendee[]
  firstTimers: number
}

// ---- Search API contract (permanent; the engine behind it may change) ----

export type SuggestionType = 'activity' | 'area' | 'venue' | 'community' | 'event'

export interface SuggestionGroup {
  type: SuggestionType
  items: SuggestionItem[]
}

export interface SuggestionItem {
  id: string
  label: string
  sublabel?: string
  count?: number
}

export interface RankedEvent {
  id: string
  score: number
  breakdown?: Record<string, number>
}

export interface SearchResponse {
  groups: SuggestionGroup[]
  events: RankedEvent[]
  applied: {
    when?: string
    free?: boolean
    beginner?: boolean
    tags?: string[]
    areaId?: string
  }
  fallback?: {
    reason: string
    events: RankedEvent[]
  }
  meta: {
    normalized: string
    intents: string[]
    tookMs: number
    total: number
  }
}
