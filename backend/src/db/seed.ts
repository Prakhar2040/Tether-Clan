import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { db, pool, schema } from './client'
import { mockEvents, people as mockPeople, series as mockSeries, venues as mockVenues } from '@shared/mock'
import { communities as rawCommunities, communityEvents } from '@shared/community.data'
import { members, roster } from '@shared/roster'
import { photos as mockPhotos, posts as mockPosts } from '@shared/community.data'
import { competitions as mockCompetitions } from '@shared/leaderboard'
import { me, nightsIn } from '@shared/me'
import { myMemberships } from '@shared/community.data'
import { now } from '../world'
import { rebase as rebaseAt, startsAtOf as startsAtFor } from '@shared/clock'
import { makeRef } from '../lib/ref'

/* Loads the mock world into Postgres.
 *
 * Destructive on purpose: truncate, then insert. For local work that is far
 * easier to reason about than upserts, and the data is deterministic so the
 * same seed always produces the same database.
 *
 * `orders` and `attendance` stay empty. Inventing a plausible past was an
 * option and we chose not to: real rows will come from using the apps, and
 * invented attendance that disagreed with roster.attended would have the two
 * halves of the product contradicting each other.
 */

const ASSETS = resolve(import.meta.dirname, '../../../frontend/src/assets')
const IMAGES = [
  'community-board-games.jpg',
  'community-run-club.jpg',
  'ddr-celebration.jpg',
  'ddr-hegemony.jpg',
  'ddr-wizard.jpg',
  'ddr-hall.jpg',
  'ddr-origins.jpg',
  'cpr-start.jpg',
  'cpr-pack.jpg',
  'cpr-finish.jpg',
  'cpr-stretch.jpg',
  'cpr-park.jpg',
  'community-sketchbook.jpg',
  'sbc-spread.jpg',
  'sbc-pens.jpg',
  'sbc-watercolour.jpg',
  'community-riders.jpg',
  'srj-dawn.jpg',
  'srj-climb.jpg',
  'srj-repair.jpg',
  'srj-coffee.jpg',
]

const mediaId = (file: string) => file.replace(/\.[a-z]+$/, '')

/* The mock describes a world relative to its own frozen Wednesday. Seeding
 * rebases that shape onto whenever this runs: an event two days out stays two
 * days out, and keeps its time of day, so "Tonight 7:30 PM" really is tonight
 * at half seven. Re-run the seed and the demo is fresh again.
 *
 * Day offsets are counted on the calendar, not by dividing milliseconds —
 * across a DST or midnight boundary those give different answers.
 */
const SEEDED_AT = now()

/* Turning a count into the rows it stood for.
 *
 * Walks a list from a position derived from `key`, so the same key always
 * picks the same people and reseeding is reproducible. Bounded by the list,
 * not by `n` — a stride of 7 over 210 names only ever reaches 30 of them,
 * and waiting for the set to fill spins forever. */
function pick(key: string, from: string[], n: number): string[] {
  if (from.length === 0 || n <= 0) return []
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const start = h % from.length
  const seen = new Set<string>()
  for (let i = 0; i < from.length && seen.size < n; i++) {
    seen.add(from[(start + i * 7) % from.length])
  }
  return [...seen]
}

const rebase = (mockAt: Date) => rebaseAt(mockAt, SEEDED_AT)
const rupeesToPaise = (r: number) => Math.round(r * 100)

// Joined "18 months ago" against the world's frozen now.
/* Photos record only "2d" or "3mo", so the instant is recovered from the
   label. Coarser than the posts' minutes-ago, but it is all that was kept. */
function agoFrom(label: string): Date {
  const m = /^(\d+)\s*(m|h|d|w|mo)$/.exec(label.trim())
  if (!m) return SEEDED_AT
  const n = Number(m[1])
  const mins = { m: 1, h: 60, d: 1440, w: 10_080, mo: 43_200 }[m[2] as 'm' | 'h' | 'd' | 'w' | 'mo']
  return new Date(SEEDED_AT.getTime() - n * mins * 60_000)
}

/* "Started March 2025" is the only form the mock records, so the instant is
   recovered from it — the first of that month. */
function startedFrom(label: string | undefined): Date | null {
  const m = /([A-Z][a-z]+)\s+(\d{4})/.exec(label ?? '')
  if (!m) return null
  const month = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ].indexOf(m[1])
  return month < 0 ? null : new Date(Number(m[2]), month, 1)
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function weeksBack(weeks: number): Date {
  return new Date(SEEDED_AT.getTime() - weeks * 7 * 86_400_000)
}

function monthsBack(months: number): Date {
  const d = new Date(SEEDED_AT)
  d.setMonth(d.getMonth() - months)
  return d
}

async function seed() {
  console.log('clearing…')
  await db.execute(sql`
    truncate table results, competitions, photos, reactions, poll_votes, poll_options, posts,
                   attendance, tickets, orders, memberships, events, series,
                   communities, venues, people, media restart identity cascade
  `)

  // ---- media: the bytes, straight off disk ----
  const files = await Promise.all(
    IMAGES.map(async (f) => ({ f, bytes: await readFile(resolve(ASSETS, f)) })),
  )
  await db.insert(schema.media).values(
    files.map(({ f, bytes }) => ({
      id: mediaId(f),
      filename: f,
      mime: 'image/jpeg',
      bytes,
      byteSize: bytes.byteLength,
    })),
  )
  console.log(`media        ${files.length}`)

  // ---- people: the five hand-written ones, then the generated roster ----
  /* The viewer is a person too. They live in me.ts rather than the roster,
     which is why nothing could be attributed to them until now. */
  const everyone = { ...mockPeople, ...roster, [me.id]: me }
  await db.insert(schema.people).values(
    Object.values(everyone).map((p) => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      color: p.color ?? 'tint',
    })),
  )
  console.log(`people       ${Object.keys(everyone).length}`)

  await db.insert(schema.venues).values(
    Object.values(mockVenues).map((v) => ({
      id: v.id,
      name: v.name,
      areaName: v.areaName,
      address: v.area,
      lat: v.lat,
      lng: v.lng,
      entranceNote: v.entranceNote,
    })),
  )
  console.log(`venues       ${Object.keys(mockVenues).length}`)

  await db.insert(schema.communities).values(
    Object.values(rawCommunities).map((c) => ({
      id: c.id,
      name: c.name,
      blurb: c.blurb,
      description: c.description,
      areaName: c.areaName,
      categoryLabel: c.categoryLabel,
      color: c.color,
      ownerTitle: c.ownerTitle ?? null,
      ownerQuote: c.ownerQuote ?? null,
      rating: c.rating ?? null,
      ratingCount: c.ratingCount ?? null,
      coverMediaId: c.coverImage ? mediaId(c.coverImage) : null,
      ownerPhotoMediaId: c.ownerPhoto ? mediaId(c.ownerPhoto) : null,
      ownerBio: c.ownerBio ?? [],
      highlights: c.highlights ?? [],
      houseRules: c.houseRules ?? [],
      // "Started March 2025" becomes the instant it describes; the label is
      // rendered back out of it by lib/when, like every other date.
      startedAt: startedFrom(c.startedLabel),
    })),
  )
  console.log(`communities  ${Object.keys(rawCommunities).length}`)

  // ---- memberships: nobody has left, so every leftAt is null ----
  /* The viewer's own memberships are recorded separately in the mock, so they
     have to be folded in or every write they make would be from a stranger. */
  const mine = Object.entries(myMemberships).map(([communityId, role]) => ({
    personId: me.id,
    communityId,
    role,
    // me.ts counts nights, not months; a night a fortnight is near enough.
    monthsIn: Math.max(1, Math.round((nightsIn[communityId] ?? 0) / 2)),
    attended: nightsIn[communityId] ?? 0,
    noShows: 0,
    // The viewer has a ticket for tonight, so they were out recently.
    lastSeenWeeks: 1,
  }))

  /* Rooms the roster never knew about.
   *
   * roster.ts was written when there were four communities and lists real
   * members for those alone. The rooms behind the rest of the listings would
   * otherwise have a memberCount in the mock and nothing in the table — and
   * the API counts live memberships rather than trusting that number, so every
   * one of them would read as empty.
   *
   * Filled deterministically from the same roster: the same people every time
   * the seed runs, the owner and admins given their roles, and plausible
   * attendance so the console's tiers are not all zero. */
  const staffed = new Set(members.map((m) => m.communityId))
  const everyoneIds = Object.keys(roster)
  const generated = Object.values(rawCommunities)
    .filter((c) => !staffed.has(c.id))
    .flatMap((c) => {
      const staff = [...c.ownerIds, ...(c.adminIds ?? [])]
      const pool = pick(`members:${c.id}`, everyoneIds, c.memberCount).filter(
        (id) => !staff.includes(id),
      )
      const ids = [...staff, ...pool].slice(0, c.memberCount)
      return ids.map((personId, i) => ({
        personId,
        communityId: c.id,
        role: c.ownerIds.includes(personId)
          ? 'owner'
          : (c.adminIds ?? []).includes(personId)
            ? 'admin'
            : 'member',
        // Spread over the room's life, oldest first, so growth charts curve.
        monthsIn: Math.max(0, Math.round((i / Math.max(1, ids.length)) * 14)),
        attended: (i * 7) % 19,
        noShows: i % 11 === 0 ? 1 : 0,
        lastSeenWeeks: (i * 3) % 13,
      }))
    })

  await db.insert(schema.memberships).values(
    [...members, ...mine, ...generated].map((m) => ({
      id: `${m.communityId}:${m.personId}`,
      personId: m.personId,
      communityId: m.communityId,
      role: m.role as 'owner' | 'admin' | 'member',
      joinedAt: monthsBack(m.monthsIn),
      leftAt: null,
      attended: m.attended,
      noShows: m.noShows,
      /* Somebody who has never turned up has no last night to record — the
         console reads that null as "never came", which is a different thing
         from "came a long time ago". */
      lastSeenAt: m.attended > 0 ? weeksBack(m.lastSeenWeeks) : null,
    })),
  )
  console.log(`memberships  ${members.length + mine.length}`)

  await db.insert(schema.series).values(
    Object.values(mockSeries).map((s) => ({
      id: s.id,
      communityId: s.communityId!,
      title: s.title,
      cadenceLabel: s.cadenceLabel ?? null,
      hostId: s.hostId ?? null,
    })),
  )
  console.log(`series       ${Object.keys(mockSeries).length}`)

  /* Which community an event belongs to is a function in the data layer
     (series, plus a few hung on the community directly), so invert it once
     rather than guessing from the id. */
  const ownerOf = new Map<string, string>()
  for (const cid of Object.keys(rawCommunities)) {
    for (const e of communityEvents(cid)) ownerOf.set(e.id, cid)
  }

  /* Ten events never recorded a moment, only how to say it; shared/clock
     derives the instant once, here, so a label becomes a fact. */
  const startsAtOf = (e: (typeof mockEvents)[string]) => startsAtFor(e, SEEDED_AT)

  const rows = Object.values(mockEvents)
    .map((e) => ({ e, startsAt: startsAtOf(e) }))
    .filter((x): x is { e: (typeof mockEvents)[string]; startsAt: Date } => x.startsAt !== null)
    .map(({ e, startsAt }) => ({
      id: e.id,
      communityId: ownerOf.get(e.id) ?? null,
      seriesId: e.seriesId ?? null,
      title: e.title,
      description: null,
      venueId: e.venueId,
      startsAt,
      endsAt: e.endsAt ? rebase(new Date(e.endsAt)) : null,
      capacity: e.capacity,
      pricePaise: rupeesToPaise(e.price),
      // Derived from the clock, not stored in the mock.
      /* A plan is over when it ends, not when it starts — something that
         began an hour ago and runs till ten is still on tonight. */
      status: ((e.endsAt ? rebase(new Date(e.endsAt)) : new Date(startsAt.getTime() + 2 * 3600_000)) < SEEDED_AT
        ? 'past'
        : 'on_sale') as 'past' | 'on_sale',
      levelLabel: e.levelLabel ?? null,
      theme: null,
      category: e.category ?? null,
      categoryLabel: e.categoryLabel ?? null,
      tags: e.tags ?? [],
      beginnerFriendly: Boolean(e.beginnerFriendly),
      minViable: e.minViable ?? null,

    }))
  await db.insert(schema.events).values(rows)
  const goingOf = new Map(
    Object.values(mockEvents).map((e) => [e.id, e.going ?? 0] as const),
  )
  const skipped = Object.keys(mockEvents).length - rows.length
  const loose = rows.filter((r) => r.communityId === null).length
  console.log(`events       ${rows.length}  (${loose} belong to no community${skipped ? `, ${skipped} unplaceable` : ''})`)

  /* Orders exist because `going` already said they did.
   *
   * This is not invented history: every mock event carries a `going` count,
   * and these are the rows that number was always standing for. Writing them
   * is what lets the denormalised column go away — `going` becomes
   * `count(orders)` and there is one place the truth lives.
   *
   * Who holds each ticket is picked deterministically from that community's
   * members, so reseeding gives the same room. `createdAt` is the seed
   * moment, which means counts are right but sale velocity is meaningless
   * until bots actually buy things over time.
   */
  const memberIdsBy = new Map<string, string[]>()
  for (const m of members) {
    const list = memberIdsBy.get(m.communityId) ?? []
    list.push(m.personId)
    memberIdsBy.set(m.communityId, list)
  }
  const anyone = Object.keys(everyone)

  /* Real-looking refs, but the same ones every time: a seeded generator feeds the same
     function the live order route uses, so a reseed reproduces the room exactly. */
  let rngState = 0x7e7e1a2b
  const rand = (max: number) => {
    rngState = (rngState + 0x6d2b79f5) >>> 0
    let t = rngState
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max)
  }
  const usedRefs = new Set<string>()
  const seedRef = () => {
    let ref = makeRef(rand)
    while (usedRefs.has(ref)) ref = makeRef(rand)
    usedRefs.add(ref)
    return ref
  }

  const orderRows: (typeof schema.orders.$inferInsert)[] = []
  const ticketRows: (typeof schema.tickets.$inferInsert)[] = []
  for (const r of rows) {
    const going = goingOf.get(r.id) ?? 0
    if (going <= 0) continue
    const candidates = (r.communityId && memberIdsBy.get(r.communityId)) || anyone
    let h = 0
    for (const ch of r.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    const start = h % candidates.length
    /* Bounded by the candidate list, not by the target. A stride of 7 over a
       list of 210 only ever visits 30 of them — gcd(7, 210) is 7 — so waiting
       for `seen` to reach `going` spins forever on a big room. */
    const seen = new Set<string>()
    for (let i = 0; i < candidates.length && seen.size < going; i++) {
      const who = candidates[(start + i * 7) % candidates.length]
      if (seen.has(who)) continue
      seen.add(who)
      const ref = seedRef()
      const id = `${r.id}:${who}`
      orderRows.push({
        id,
        eventId: r.id,
        personId: who,
        ref,
        qty: 1,
        pricePaise: r.pricePaise,
        state: 'paid',
        paidAt: SEEDED_AT,
        paymentProvider: 'seed',
      })
      ticketRows.push({ id: `${id}:1`, orderId: id, eventId: r.id, ref })
    }
  }
  if (orderRows.length > 0) await db.insert(schema.orders).values(orderRows)
  if (ticketRows.length > 0) await db.insert(schema.tickets).values(ticketRows)
  console.log(`orders       ${orderRows.length}  (the rows \`going\` was standing for)`)

  // ---- the channel ----
  const postRows = mockPosts.map((p) => ({
    id: p.id,
    communityId: p.communityId,
    authorId: p.authorId,
    kind: (p.poll ? 'poll' : 'note') as 'poll' | 'note',
    emoji: p.emoji ?? null,
    title: p.title ?? null,
    body: p.body ?? '',
    // sortKey is minutes ago, which is the real fact behind "5h".
    postedAt: new Date(SEEDED_AT.getTime() - p.sortKey * 60_000),
    pinned: Boolean(p.pinned),
    eventId: null,
    pollQuestion: p.poll?.question ?? null,
    pollClosesLabel: p.poll?.closesLabel ?? null,
  }))
  await db.insert(schema.posts).values(postRows)
  console.log(`posts        ${postRows.length}`)

  const optionRows: (typeof schema.pollOptions.$inferInsert)[] = []
  const voteRows: (typeof schema.pollVotes.$inferInsert)[] = []
  for (const p of mockPosts) {
    if (!p.poll) continue
    const pool = memberIdsBy.get(p.communityId) ?? anyone
    // One vote each, so the people who voted for one option cannot vote for
    // another — the pool shrinks as the options are filled.
    const spent = new Set<string>()
    p.poll.options.forEach((o, i) => {
      optionRows.push({ id: `${p.id}:${o.id}`, postId: p.id, label: o.label, position: i })
      const free = pool.filter((x) => !spent.has(x))
      for (const who of pick(`${p.id}:${o.id}`, free, o.votes)) {
        spent.add(who)
        voteRows.push({
          id: `${p.id}:${who}`,
          postId: p.id,
          optionId: `${p.id}:${o.id}`,
          personId: who,
        })
      }
    })
  }
  if (optionRows.length) await db.insert(schema.pollOptions).values(optionRows)
  if (voteRows.length) await db.insert(schema.pollVotes).values(voteRows)
  console.log(`poll options ${optionRows.length}  | votes ${voteRows.length}`)

  /* Reactions were a count per emoji; these are the rows that count stood
     for. A person may react with several emoji, so each is picked separately. */
  const reactionRows: (typeof schema.reactions.$inferInsert)[] = []
  for (const p of mockPosts) {
    const pool = memberIdsBy.get(p.communityId) ?? anyone
    for (const [emoji, n] of Object.entries(p.reactions ?? {})) {
      for (const who of pick(`${p.id}:${emoji}`, pool, n as number)) {
        reactionRows.push({ id: `${p.id}:${who}:${emoji}`, postId: p.id, personId: who, emoji })
      }
    }
  }
  if (reactionRows.length) await db.insert(schema.reactions).values(reactionRows)
  console.log(`reactions    ${reactionRows.length}`)

  const photoRows = mockPhotos.map((ph) => ({
    id: ph.id,
    communityId: ph.communityId,
    mediaId: ph.src ? mediaId(ph.src) : null,
    color: ph.color,
    caption: ph.caption,
    byId: ph.byId,
    takenAt: agoFrom(ph.timeLabel),
    eventId: null,
  }))
  await db.insert(schema.photos).values(photoRows)
  console.log(`photos       ${photoRows.length}`)

  /* Competitions run monthly, so they rebase by month: the newest table is
     always this month's, the one behind it last month's.
     
     What rebases is the weekday, not the date — every competition in the
     mock is the second Saturday, and a club that runs its cup on a Saturday
     morning does not move it to a Tuesday because the calendar turned over.
     So the day is recomputed as the same nth weekday of the target month,
     and pulled back if that would date a result in the future. */
  const today = new Date(SEEDED_AT.getFullYear(), SEEDED_AT.getMonth(), SEEDED_AT.getDate())
  const heldOn = (date: string, monthsAgo: number): string => {
    const [y, m, d] = date.split('-').map(Number)
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    const nth = Math.ceil(d / 7)

    const base = monthsBack(monthsAgo)
    const first = new Date(base.getFullYear(), base.getMonth(), 1)
    const day = 1 + ((dow - first.getDay() + 7) % 7) + (nth - 1) * 7
    const at = new Date(base.getFullYear(), base.getMonth(), day)
    return ymd(at > today ? today : at)
  }

  const knownPeople = new Set(Object.keys(everyone))
  const compRows = mockCompetitions.map((c) => ({
    id: c.id,
    communityId: c.communityId,
    name: c.name,
    heldOn: heldOn(c.date, c.monthsAgo),
    entrants: c.entrants,
  }))
  await db.insert(schema.competitions).values(compRows)

  /* Only placings whose person exists. The mock's tables name a few people
     who are in no roster, and a results table with a ghost in it is worse
     than one that is short. */
  const resultRows = mockCompetitions.flatMap((c) =>
    c.results
      .filter(([personId]) => knownPeople.has(personId))
      .map(([personId, place]) => ({
        id: `${c.id}:${personId}`,
        competitionId: c.id,
        personId,
        place,
      })),
  )
  await db.insert(schema.results).values(resultRows)
  const dropped = mockCompetitions.reduce((n, c) => n + c.results.length, 0) - resultRows.length
  console.log(`competitions ${compRows.length}  | results ${resultRows.length}${dropped ? ` (${dropped} unknown people skipped)` : ''}`)

  console.log('\nattendance left empty — it comes from running the door.')
}

seed()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e)
    await pool.end()
    process.exit(1)
  })
