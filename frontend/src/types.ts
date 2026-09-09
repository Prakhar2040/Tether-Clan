// Object model. Event, Series, Community and Venue are deliberately separate
// objects: a person's relationship to a Community (member, regular, host) is
// different from their relationship to an Event (interested, going,
// checked-in), and a Venue is a place with its own identity, not
// a string on an event.

export type ActivityCategory =
  | 'board-games'
  | 'language'
  | 'running'
  | 'pickleball'
  | 'art'

export interface Venue {
  id: string
  name: string
  area: string
  lat: number
  lng: number
  entranceNote: string
  distanceKm: number
  travel: { autoMin: number; autoFare?: number; metro?: string; walkMin?: number }
  accessible?: boolean
  pastEventCount?: number
}

export interface Community {
  id: string
  name: string
  memberCount: number
}

export interface Series {
  id: string
  title: string
  cadenceLabel: string // "every Wednesday"
  hostId: string
  communityId?: string
}

export type AvatarColor = 'blue' | 'orange' | 'yellow' | 'ink' | 'tint'

export interface Person {
  id: string
  name: string
  initials: string
  color: AvatarColor
}

export type EventRelation = 'host' | 'regular' | 'first-timer'

export interface Attendee {
  personId: string
  relation: EventRelation
  note?: string // "Also into cycling — you follow Sarjapur Riders too"
}

// The RSVP lifecycle. Not a boolean — a state machine.
export type RsvpState =
  | 'none'
  | 'interested'
  | 'going'
  | 'checked-in'
  | 'attended'
  | 'no-showed'
  | 'cancelled'

export interface EventRole {
  id: string
  label: string // "Teach the rules"
  claimedBy?: string // personId
}

export interface TcEvent {
  id: string
  title: string
  category: ActivityCategory
  categoryLabel: string
  dayLabel: string // "Tonight", "Tomorrow"
  timeLabel: string // "7:30 PM"
  startsInLabel?: string // "Starts in 1h 40m"
  liveNow?: boolean
  price: number // ₹, 0 = free
  capacity: number
  going: number
  beginnerFriendly?: boolean
  levelLabel?: string // "Intermediate", "All levels", "Pace groups 6–8 min/km"
  venueId: string
  hostId: string
  seriesId?: string
  attendees: Attendee[]
  firstTimers: number
  startsAt?: string // ISO — needed to compute the connect window
  endsAt?: string
  minViable?: number // quorum: below this the plan does not run
  dateLabel?: string // display date for past plans
  cancelledByHost?: boolean
  connectedWith?: string[] // personIds you connected with afterwards
  tags?: string[] // "Beginner friendly", "Social", "Free", "Outdoor"…
  // Server-enforced: exact coordinates are only sent for public venues.
  // House-party and women-only events are fuzzed before they leave the API.
  locationPrecision?: 'exact' | 'approximate' | 'hidden'
  whatToExpect?: string
  icebreaker?: string
  hostAnnouncement?: string
  roles?: EventRole[]
}

