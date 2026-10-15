import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  doublePrecision,
  date,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { customType } from 'drizzle-orm/pg-core'

/* The spine of the thing.
 *
 * Three decisions worth stating, because they are hard to change later:
 *
 * 1. Ids are text slugs, not uuids. The mock world already uses them
 *    ('ananya', 'dice-district-regulars'), they seed one-to-one, and they
 *    keep URLs readable. Nothing here needs them to be opaque.
 *
 * 2. Money is integer paise. A price is never a float — ₹350 is 35000, and
 *    no amount of arithmetic can turn it into ₹349.99999.
 *
 * 3. Every instant is `timestamptz`. The app renders "Tonight" and
 *    "7:30 PM"; those are the client's job, computed from an absolute
 *    moment. The server stores the moment.
 */

export const memberRole = pgEnum('member_role', ['owner', 'admin', 'member'])
export const eventStatus = pgEnum('event_status', [
  'draft',
  'on_sale',
  'closed',
  'past',
  'cancelled',
])
/* `expired` is a held order nobody paid for in time. It is not `cancelled`, which is
   something a person chose — keeping them apart is what lets cancellation arrive later
   without every old abandoned checkout looking like a decision. */
export const orderState = pgEnum('order_state', ['held', 'paid', 'refunded', 'cancelled', 'expired'])
export const postKind = pgEnum('post_kind', ['note', 'poll'])

export const attendanceOutcome = pgEnum('attendance_outcome', [
  'attended',
  'no_show',
  'cancelled',
])

/* Images live here as bytes for now.
 *
 * Seven JPEGs is about a megabyte — nothing for Postgres, and it makes the
 * database the single source of truth so neither app has to ship them. The
 * `filename` column is what makes the bucket cheap later: read the rows out,
 * upload them, point the serving layer elsewhere. The schema does not change. */
export const media = pgTable('media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  mime: text('mime').notNull(),
  bytes: customType<{ data: Buffer; notNull: true }>({ dataType: () => 'bytea' })('bytes').notNull(),
  byteSize: integer('byte_size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const people = pgTable('people', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  initials: text('initials').notNull(),
  color: text('color').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const venues = pgTable('venues', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  areaName: text('area_name').notNull(),
  address: text('address'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  entranceNote: text('entrance_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  blurb: text('blurb').notNull(),
  description: text('description').notNull(),
  areaName: text('area_name').notNull(),
  categoryLabel: text('category_label').notNull(),
  color: text('color').notNull(),
  ownerTitle: text('owner_title'),
  ownerQuote: text('owner_quote'),
  rating: doublePrecision('rating'),
  ratingCount: integer('rating_count'),
  coverMediaId: text('cover_media_id').references(() => media.id),
  ownerPhotoMediaId: text('owner_photo_media_id').references(() => media.id),
  /* The owner's own words, one paragraph per element — prose, not markup, so
     the app can set each paragraph itself. */
  ownerBio: text('owner_bio').array(),
  /* Numbers that break up that prose: [{ n: '400+', label: 'games on the
     shelf' }]. Shaped, but never queried, so jsonb rather than two columns
     and a join to a table that would only ever be read whole. */
  highlights: jsonb('highlights').$type<{ n: string; label: string }[]>(),
  houseRules: text('house_rules').array(),
  /* The instant, not "Started March 2025". The label is rendered from this in
     lib/when, same as every other date in the API. */
  startedAt: timestamp('started_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/* Membership has an end date.
 *
 * Its absence is why the growth chart could only ever climb, and why
 * lib/churn.ts exists inventing departures. A row with `leftAt` set is
 * somebody who left; the partial unique index means a person can rejoin
 * later without colliding with their own history. */
export const memberships = pgTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    personId: text('person_id').notNull().references(() => people.id),
    communityId: text('community_id').notNull().references(() => communities.id),
    role: memberRole('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
    leftAt: timestamp('left_at', { withTimezone: true }),
    /* The running tally the door keeps.
     *
     * A count, not a query over `attendance`, and the distinction is
     * deliberate. The console reads these on every screen it has — who is a
     * regular, who has lapsed, who never came at all — and the history they
     * stand for is longer than this database will ever hold: a club that
     * has run for two years arrives with two years of nights behind it.
     * Seeding them is how that past gets in; the door adds to them from
     * there. `attendance` still records the individual nights, and answers
     * the question these cannot: which ones. */
    attended: integer('attended').notNull().default(0),
    noShows: integer('no_shows').notNull().default(0),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (t) => [
    index('memberships_community_idx').on(t.communityId),
    uniqueIndex('memberships_one_live_idx')
      .on(t.personId, t.communityId)
      .where(sql`left_at is null`),
  ],
)

export const series = pgTable('series', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  title: text('title').notNull(),
  cadenceLabel: text('cadence_label'),
  hostId: text('host_id').references(() => people.id),
})

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id').references(() => communities.id),
    seriesId: text('series_id').references(() => series.id),
    title: text('title').notNull(),
    description: text('description'),
    venueId: text('venue_id').references(() => venues.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    capacity: integer('capacity').notNull(),
    pricePaise: integer('price_paise').notNull().default(0),
    status: eventStatus('status').notNull().default('draft'),
    levelLabel: text('level_label'),
    theme: text('theme'),
    // What search matches on. The gazetteer and the taxonomy stay in code;
    // these are the per-event facts those are matched against.
    category: text('category'),
    categoryLabel: text('category_label'),
    tags: text('tags').array(),
    beginnerFriendly: boolean('beginner_friendly').notNull().default(false),
    minViable: integer('min_viable'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('events_community_starts_idx').on(t.communityId, t.startsAt),
    index('events_starts_idx').on(t.startsAt),
  ],
)

/* The sale log.
 *
 * Who holds a ticket is currently derived from a hash of the plan id, which
 * is why host/src/state/door.tsx and lib/sales.ts have to agree on the same
 * arithmetic. A row per sale replaces that, and carries the one thing the
 * hash never could: when it happened, which is sale velocity and
 * time-to-fill. */
export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().references(() => events.id),
    personId: text('person_id').notNull().references(() => people.id),
    ref: text('ref').notNull(),
    qty: integer('qty').notNull().default(1),
    /* Per ticket, in paise — always rupees, never another currency. The order's total is
       `pricePaise * qty`; see lib/money.ts. */
    pricePaise: integer('price_paise').notNull(),
    state: orderState('state').notNull().default('paid'),
    /* A held order lets go of its seats at this instant. Null once it is paid. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    /* Who took the money and what they call the payment. 'mock' until Razorpay arrives;
       a real provider fills both in from its webhook, so nothing else changes shape. */
    paymentProvider: text('payment_provider'),
    paymentRef: text('payment_ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('orders_ref_idx').on(t.ref),
    index('orders_event_idx').on(t.eventId),
    index('orders_person_idx').on(t.personId),
    // One live order per person per night. An expired or cancelled one steps aside, so
    // somebody whose checkout timed out can try again.
    uniqueIndex('orders_one_live_idx')
      .on(t.eventId, t.personId)
      .where(sql`state in ('held', 'paid')`),
    uniqueIndex('orders_payment_ref_idx')
      .on(t.paymentProvider, t.paymentRef)
      .where(sql`payment_ref is not null`),
  ],
)

/* One row per seat.
 *
 * An order can cover several, and the door scans a ticket, not an order — so each seat
 * has its own ref, and its own "came in" time. `orders.ref` is simply the first ticket's
 * ref, kept so there is one short thing to quote. */
export const tickets = pgTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id),
    eventId: text('event_id').notNull().references(() => events.id),
    ref: text('ref').notNull(),
    scannedAt: timestamp('scanned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('tickets_ref_idx').on(t.ref),
    index('tickets_order_idx').on(t.orderId),
    index('tickets_event_idx').on(t.eventId),
  ],
)

/* The event log — the table whose absence has blocked the most.
 *
 * `attended: 27` is a scalar with no dates behind it, so nothing can answer
 * "did this cohort come back", "how fast did that night fill", or "who has
 * drifted". One row per person per night, written when the door is closed,
 * answers all of them. */
export const attendance = pgTable(
  'attendance',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().references(() => events.id),
    personId: text('person_id').notNull().references(() => people.id),
    outcome: attendanceOutcome('outcome').notNull(),
    scannedAt: timestamp('scanned_at', { withTimezone: true }),
    walkIn: boolean('walk_in').notNull().default(false),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('attendance_once_idx').on(t.eventId, t.personId),
    index('attendance_person_idx').on(t.personId),
  ],
)

/* The channel.
 *
 * One way by design: the owner posts, members react or vote, and there are no
 * replies to moderate. That is a product rule, and it shows up here as the
 * absence of a parent_id — there is no thread to hang one on.
 */
export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id').notNull().references(() => communities.id),
    authorId: text('author_id').notNull().references(() => people.id),
    kind: postKind('kind').notNull().default('note'),
    emoji: text('emoji'),
    title: text('title'),
    body: text('body').notNull().default(''),
    /* The mock carried "5h" and a sortKey in minutes-ago; the minutes are the
       real fact, so the instant is kept and the label rendered from it. */
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
    pinned: boolean('pinned').notNull().default(false),
    eventId: text('event_id').references(() => events.id),
    /* A post has at most one poll, so its question lives here rather than in
       a table that would always be joined one-to-one. Only the options need
       rows of their own. */
    pollQuestion: text('poll_question'),
    /* Prose a host wrote — "Closes Tuesday night" — not a date anything
       computes against, so it stays the words they chose. */
    pollClosesLabel: text('poll_closes_label'),
  },
  (t) => [index('posts_community_posted_idx').on(t.communityId, t.postedAt)],
)

export const pollOptions = pgTable(
  'poll_options',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id),
    label: text('label').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [index('poll_options_post_idx').on(t.postId)],
)

/* One vote each, which is why the unique index is on the person and the post
   rather than the option — changing your mind updates a row, it does not add
   one. */
export const pollVotes = pgTable(
  'poll_votes',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id),
    optionId: text('option_id').notNull().references(() => pollOptions.id),
    personId: text('person_id').notNull().references(() => people.id),
    votedAt: timestamp('voted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('poll_votes_once_idx').on(t.postId, t.personId)],
)

/* Rows, not counts. A count would be cheaper to read and could not answer
   the only question the UI actually asks — did *I* react — so the count is
   derived and the rows are the truth. */
export const reactions = pgTable(
  'reactions',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull().references(() => posts.id),
    personId: text('person_id').notNull().references(() => people.id),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('reactions_once_idx').on(t.postId, t.personId, t.emoji)],
)

/* Photographs from a room.
 *
 * `media` holds the bytes; this says whose room they belong to, who took
 * them and when. Separate because a photograph is not a file — the same file
 * could front a community and appear in its gallery, which is exactly what
 * the cover images do.
 */
export const photos = pgTable(
  'photos',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id').notNull().references(() => communities.id),
    mediaId: text('media_id').references(() => media.id),
    /* Stands in when there is no file — the app paints the tile with it
       rather than showing a hole. */
    color: text('color').notNull(),
    caption: text('caption').notNull().default(''),
    byId: text('by_id').notNull().references(() => people.id),
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull(),
    eventId: text('event_id').references(() => events.id),
  },
  (t) => [index('photos_community_taken_idx').on(t.communityId, t.takenAt)],
)


/* Competitions, and who finished where.
 *
 * The leaderboard is a results table, not an attendance register — that rule
 * is the reason these are their own tables rather than a column on `events`.
 * A room can run a competition at a night it already hosts, or off its own
 * bat, and a night with no competition contributes nothing to the standing.
 *
 * `held_on` is the one column here that is not an instant. A competition is
 * a day on the club's calendar — "Sat 12 Sep 2026" is what the board says,
 * and what time the first game started is neither recorded nor shown.
 * Storing a `timestamptz` would mean inventing an hour.
 *
 * `entrants` is how many turned up, which is larger than the rows below it:
 * only the placings that made the table are kept.
 */
export const competitions = pgTable(
  'competitions',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id').notNull().references(() => communities.id),
    name: text('name').notNull(),
    heldOn: date('held_on').notNull(),
    entrants: integer('entrants').notNull(),
  },
  (t) => [index('competitions_community_held_idx').on(t.communityId, t.heldOn)],
)

/* One row per placing. Two things cannot happen: the same person finishing
   twice, and two people taking the same place. Both are indexes rather than
   trust, because a results table nobody can argue with is the whole point of
   having one. */
export const results = pgTable(
  'results',
  {
    id: text('id').primaryKey(),
    competitionId: text('competition_id').notNull().references(() => competitions.id),
    personId: text('person_id').notNull().references(() => people.id),
    place: integer('place').notNull(),
  },
  (t) => [
    uniqueIndex('results_once_idx').on(t.competitionId, t.personId),
    uniqueIndex('results_place_idx').on(t.competitionId, t.place),
    index('results_person_idx').on(t.personId),
  ],
)
