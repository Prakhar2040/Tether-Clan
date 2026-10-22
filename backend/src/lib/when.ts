/* Turning an instant into the words the apps show.
 *
 * The database stores a moment; the API promises "Tonight" and "7:30 PM".
 * This is the one place that conversion happens, which is only possible
 * because the whole product is in one city — with viewers in several
 * timezones a server could not answer "is this tonight?" at all.
 *
 * Endpoints send `startsAt` alongside these labels. Relative words go stale
 * in a tab left open overnight, and a client that still has the instant can
 * re-derive; a client given only the string is stuck with it.
 */

import { dateLabel, dayLabel, startsInLabel } from '@shared/clock'
// One implementation of the day words, shared with the client's rebased mock.
export { dateLabel, dayLabel, startsInLabel }

export const IST = 'Asia/Kolkata'

/** The Bengaluru civil date of an instant, "2026-10-17". */
export const istYmd = (at: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(at)

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The civil date in Bengaluru, as a plain y/m/d — no timezone left in it. */
function istParts(at: Date) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(at)
  const g = (t: string) => f.find((p) => p.type === t)?.value ?? ''
  return {
    y: Number(g('year')),
    m: Number(g('month')),
    d: Number(g('day')),
    hh: Number(g('hour')) % 24,
    mm: Number(g('minute')),
    dow: g('weekday'),
  }
}

export function timeLabel(at: Date): string {
  const { hh, mm } = istParts(at)
  const h12 = ((hh + 11) % 12) + 1
  return `${h12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`
}

/** "March 2025" — for the things dated to a month rather than a day. */
export function monthYear(at: Date): string {
  const { y, m } = istParts(at)
  const full = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${full[m - 1]} ${y}`
}

/* The two labels for a plain calendar day — a `date` column, with no
   instant in it. Parsed and formatted as UTC on purpose: "2026-09-12" is
   already a Bengaluru date, and running it through a timezone would only
   give it the chance to slip to the 11th. */
function dayParts(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return { y, m, d, dow: DAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] }
}

/** "Sat 12 Sep 2026" — the day a competition was run. */
export function dayDateLabel(day: string): string {
  const { y, m, d, dow } = dayParts(day)
  return `${dow} ${d} ${MON[m - 1]} ${y}`
}

/** "Sep 2026" — which month's table this is. */
export function dayMonthLabel(day: string): string {
  const { y, m } = dayParts(day)
  return `${MON[m - 1]} ${y}`
}

/** "Mar 2025" — short, because it sits in a table column. */
export function monthShortYear(at: Date): string {
  const { y, m } = istParts(at)
  return `${MON[m - 1]} ${y}`
}

/** Whole months between two instants, by Bengaluru calendar month. */
export function monthsApart(from: Date, to: Date): number {
  const a = istParts(from)
  const b = istParts(to)
  const months = (b.y - a.y) * 12 + (b.m - a.m)
  return Math.max(0, b.d < a.d ? months - 1 : months)
}

/* How long since the door last saw somebody. Prose rather than the feed's
   "2w", because this one is read in a sentence and in a table, and a host
   scanning the column for who has drifted should not have to decode it. */
export function lastSeenLabel(weeks: number): string {
  if (weeks <= 0) return 'this week'
  if (weeks === 1) return 'last week'
  if (weeks <= 4) return `${weeks} weeks ago`
  const months = Math.max(1, Math.round(weeks / 4.345))
  return `${months} month${months === 1 ? '' : 's'} ago`
}

/** How long ago, the way a channel says it: 2h, 5h, 1d, 2w, 3mo. */
export function agoLabel(at: Date, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - at.getTime()) / 60_000))
  if (mins < 60) return `${Math.max(1, mins)}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w`
  return `${Math.round(days / 30)}mo`
}

/** Everything a client needs to render a time, including the instant itself. */
export function when(at: Date, now = new Date()) {
  return {
    startsAt: at.toISOString(),
    dayLabel: dayLabel(at, now),
    timeLabel: timeLabel(at),
    dateLabel: dateLabel(at),
    startsInLabel: startsInLabel(at, now),
  }
}
