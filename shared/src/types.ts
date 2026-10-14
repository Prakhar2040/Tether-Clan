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
  areaName: string // clean locality, e.g. "Koramangala"
  lat: number
  lng: number
  entranceNote: string
  distanceKm: number
  travel: { autoMin: number; autoFare?: number; metro?: string; walkMin?: number }
  accessible?: boolean
  pastEventCount?: number
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
  theme?: string // what this particular night is about, if it has one
  whatToExpect?: string
  icebreaker?: string
  hostAnnouncement?: string
  roles?: EventRole[]
}


// ---- Community ----
// A Community is the standing group; an Event is one occasion it runs.
// Members read, owners and admins write — the channel is a broadcast, not
// a group chat, so the composer is a host-side surface.

export type CommunityRole = 'owner' | 'admin' | 'member'

export interface Community {
  id: string
  name: string
  memberCount: number
  blurb: string // one line, for the list row
  description: string // the About tab
  areaName: string
  categoryLabel: string
  ownerIds: string[]
  adminIds: string[]
  // About is the owner's page: their day job, then their own words. The
  // community description follows as something they are saying too.
  ownerTitle: string // the day job, e.g. "Researcher at Google"
  ownerQuote: string // the line worth pulling out big
  ownerBio: string[] // first person, their voice, one string per paragraph
  highlights: { n: string; label: string }[] // numbers, to break up the prose
  ownerPhoto?: string // a portrait when there is one; the block holds its space
  rating: number // out of 5, from people who actually attended
  ratingCount: number
  color: string // stands in for a logo, and backs the tile when there is no photo
  coverImage?: string // the tile photo; without one the tile falls back to colour
  startedLabel: string // "Started March 2025"
  houseRules: string[]
}


export const REACTION_PICKER = [
  '👍', '❤️', '🎉', '👏', '🔥', '😂',
  '🙌', '✅', '👀', '🤝', '💪', '🙏',
  '😍', '🤔', '😮', '🥳', '⭐', '💯',
] as const

// Two things an admin can put in the channel: something to read, or
// something to answer. Photos live in the Photos tab; plans live on the
// Events tab. This is not a box office.
export type PostKind = 'note' | 'poll'

export interface PollOption {
  id: string
  label: string
  votes: number
}

export interface Poll {
  question: string
  options: PollOption[]
  closesLabel: string // "Closes Friday"
}

export interface CommunityPost {
  id: string
  communityId: string
  authorId: string
  kind: PostKind
  emoji?: string // the post's entry point — carries the colour a wall of text can't
  title?: string // a headline, so the channel skims instead of reading as prose
  body: string
  timeLabel: string // "2d", "5h"
  sortKey: number // minutes ago; lower is newer
  pinned?: boolean
  eventId?: string // the plan this refers to; not rendered yet — pending design
  poll?: Poll // kind 'poll'
  reactions: Record<string, number> // emoji → count
}

export interface CommunityPhoto {
  id: string
  communityId: string
  src?: string // a real photo when there is one; otherwise `color` stands in
  color: string
  caption: string
  byId: string
  timeLabel: string
  eventId?: string
}
