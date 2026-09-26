import { membersOf, roster } from '@app/data/roster'
import { competitionsOf } from '@app/data/leaderboard'
import { pastCommunityEvents, postsFor, upcomingCommunityEvents } from '@app/data/community'
import type { Person } from '@app/types'

// Everything here is derived from the same rows the rest of the console
// reads, so the numbers cannot quietly disagree with the lists they came
// from.

export interface Bucket {
  monthsAgo: number
  label: string
  joined: number
}

export interface AtRisk {
  person: Person
  detail: string
}

// How many people have been this many times or more. Cumulative, so each
// rung contains the ones above it — which is what makes it read as depth
// rather than as buckets.
export interface Rung {
  min: number
  count: number
}

export interface Analytics {
  members: number
  ladder: Rung[]
  deepCount: number
  deepMin: number
  mostNights: number
  joinedThisMonth: number
  joinedLastMonth: number
  avgJoins: number

  // Of everyone who came at least once, how many came back. The one number
  // that says whether the room works.
  cameOnce: number
  cameAgain: number
  returnRate: number

  neverCame: AtRisk[]
  drifted: AtRisk[]

  growth: Bucket[]
  peak: number

  // What share of all attendance comes from the ten busiest people.
  coreShare: number
  coreNames: string[]

  nightsRun: number
  avgFill: number
  soldOut: number
  avgHeads: number

  posts: number
  avgReactions: number
  reachShare: number

  compEntrants: number
  compShare: number
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(back: number): string {
  const idx = 8 - back
  return MON[((idx % 12) + 12) % 12]
}

export function analyticsFor(communityId: string): Analytics {
  const all = membersOf(communityId)
  const attendees = all.filter((m) => m.attended > 0)
  const cameOnce = all.filter((m) => m.attended === 1).length
  const cameAgain = all.filter((m) => m.attended >= 2).length

  const growth: Bucket[] = Array.from({ length: 12 }, (_, i) => {
    const back = 11 - i
    return {
      monthsAgo: back,
      label: monthLabel(back),
      joined: all.filter((m) => m.monthsIn === back).length,
    }
  })

  const totalAttendance = all.reduce((n, m) => n + m.attended, 0)
  const top = [...all].sort((a, b) => b.attended - a.attended).slice(0, 10)
  const coreShare = totalAttendance === 0 ? 0 : top.reduce((n, m) => n + m.attended, 0) / totalAttendance

  const past = pastCommunityEvents(communityId)
  const upcoming = upcomingCommunityEvents(communityId)
  const fills = past.map((e) => (e.capacity === 0 ? 0 : e.going / e.capacity))
  const avgFill = fills.length === 0 ? 0 : fills.reduce((a, b) => a + b, 0) / fills.length
  const avgHeads = past.length === 0 ? 0 : past.reduce((n, e) => n + e.going, 0) / past.length

  const channel = postsFor(communityId)
  const reactionTotals = channel.map((p) => Object.values(p.reactions).reduce((a, b) => a + b, 0))
  const avgReactions =
    channel.length === 0 ? 0 : reactionTotals.reduce((a, b) => a + b, 0) / channel.length

  const comps = competitionsOf(communityId)
  const compEntrants = comps.length === 0 ? 0 : comps.reduce((n, c) => n + c.entrants, 0) / comps.length

  const name = (id: string) => roster[id]?.name ?? id

  const bands = [20, 15, 10, 5, 1]
  const ladder: Rung[] = bands.map((min) => ({
    min,
    count: all.filter((m) => m.attended >= min).length,
  }))
  // The deepest rung that actually holds people, for the line underneath.
  const deep = ladder.find((r) => r.count >= 5) ?? ladder[ladder.length - 1]

  return {
    members: all.length,
    ladder,
    deepCount: deep.count,
    deepMin: deep.min,
    mostNights: Math.max(0, ...all.map((m) => m.attended)),
    joinedThisMonth: all.filter((m) => m.monthsIn === 0).length,
    joinedLastMonth: all.filter((m) => m.monthsIn === 1).length,
    avgJoins: growth.reduce((n, b) => n + b.joined, 0) / growth.length,

    cameOnce,
    cameAgain,
    returnRate: attendees.length === 0 ? 0 : cameAgain / attendees.length,

    neverCame: all
      .filter((m) => m.attended === 0)
      .slice(0, 6)
      .map((m) => ({ person: roster[m.personId], detail: `joined ${m.joinedLabel}` })),

    drifted: all
      .filter((m) => m.attended > 0 && m.lastSeenWeeks >= 8)
      .sort((a, b) => b.attended - a.attended)
      .slice(0, 6)
      .map((m) => ({
        person: roster[m.personId],
        detail: `${m.attended} nights · last seen ${m.lastSeenLabel}`,
      })),

    growth,
    peak: Math.max(1, ...growth.map((b) => b.joined)),

    coreShare,
    coreNames: top.slice(0, 3).map((m) => name(m.personId).split(' ')[0]),

    nightsRun: past.length,
    avgFill,
    soldOut: [...past, ...upcoming].filter((e) => e.going >= e.capacity).length,
    avgHeads,

    posts: channel.length,
    avgReactions,
    // A rough read on reach: how many distinct reactions a post pulls,
    // against the size of the room.
    reachShare: all.length === 0 ? 0 : Math.min(1, avgReactions / all.length),

    compEntrants,
    compShare: all.length === 0 ? 0 : Math.min(1, compEntrants / all.length),
  }
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}
