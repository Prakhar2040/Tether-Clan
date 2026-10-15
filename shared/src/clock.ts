/* The mock world's clock, and how to move it onto the real one.
 *
 * Every mock time is measured against NOW_MOCK (Wed 9 Sep 2026, 17:50 IST).
 * `rebase` keeps an event's distance from that Wednesday, in Bengaluru
 * calendar days, and its time of day, and re-hangs it on whenever "now" is.
 * The seeder and the client both call it, so the database, the mocked
 * details and the host screens all agree what "tonight" is.
 *
 * Plain TypeScript, no imports: the backend loads this under plain Node and
 * the apps load it through a bundler. Do not add asset imports here. */

import type { TcEvent } from './types'

export const NOW_MOCK = new Date('2026-09-09T17:50:00+05:30')

const IST = 'Asia/Kolkata'
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function istParts(at: Date) {
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

const pad = (n: number) => String(n).padStart(2, '0')
/** Whole Bengaluru calendar days since the epoch. */
const dayNumber = (at: Date) => {
  const p = istParts(at)
  return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86_400_000)
}
/** The Bengaluru civil date `n` days from the day containing `from`, as y-m-d. */
function istDay(from: Date, n: number): string {
  const d = new Date((dayNumber(from) + n) * 86_400_000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
/** An instant written the way the mock authors them: Bengaluru wall time with its +05:30 offset. */
export function istIso(when: Date): string {
  const p = istParts(when)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}:00+05:30`
}
/** The Bengaluru civil date of an instant, "2026-10-17". */
export const ymdOf = (when: Date): string => istIso(when).slice(0, 10)

const at = (day: string, hh: number, mm: number) => new Date(`${day}T${pad(hh)}:${pad(mm)}:00+05:30`)

/** Days between two instants counted by Bengaluru calendar date. */
export function daysApart(from: Date, to: Date): number {
  return dayNumber(to) - dayNumber(from)
}

export function dateLabel(when: Date): string {
  const { d, m, dow } = istParts(when)
  return `${dow} ${d} ${MON[m - 1]}`
}

/** "Tonight", "Tomorrow", "Sat", "Wed 16 Sep", "Past". */
export function dayLabel(when: Date, now = new Date()): string {
  const gap = daysApart(now, when)
  if (gap < 0) return 'Past'
  if (gap === 0) return 'Tonight'
  if (gap === 1) return 'Tomorrow'
  if (gap < 7) return istParts(when).dow
  return dateLabel(when)
}

/** "Starts in 1h 40m" - only while it is close enough to matter. */
export function startsInLabel(when: Date, now = new Date()): string | undefined {
  const mins = Math.round((when.getTime() - now.getTime()) / 60_000)
  if (mins < 0 || mins > 12 * 60) return undefined
  if (mins < 1) return 'Starting now'
  if (mins < 60) return `Starts in ${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `Starts in ${h}h${m ? ` ${m}m` : ''}`
}

/** A mock instant, moved onto `now`: same day offset from NOW_MOCK, same clock time. */
export function rebase(mockAt: Date, now: Date): Date {
  const offset = dayNumber(mockAt) - dayNumber(NOW_MOCK)
  const p = istParts(mockAt)
  return at(istDay(now, offset), p.hh, p.mm)
}

/** The instant an event starts, on the real clock. Most mock events carry
 *  `startsAt`; the rest only say it in words ("Sat", "Next Wed", "Past" with
 *  a dateLabel), so the instant is recovered from the words. */
export function startsAtOf(e: TcEvent, now: Date): Date | null {
  if (e.startsAt) return rebase(new Date(e.startsAt), now)

  const [hhmm, ampm] = (e.timeLabel ?? '7:00 PM').split(' ')
  const [h, m] = hhmm.split(':').map(Number)
  const hour = ampm === 'PM' && h !== 12 ? h + 12 : ampm === 'AM' && h === 12 ? 0 : h
  const minute = m || 0
  const label = e.dayLabel ?? ''

  if (label === 'Tonight') return at(istDay(now, 0), hour, minute)
  if (label === 'Tomorrow') return at(istDay(now, 1), hour, minute)

  // A weekday name means the next one strictly after today.
  const nextOn = (dow: number) => {
    for (let n = 1; n <= 7; n++) {
      const day = istDay(now, n)
      if (new Date(`${day}T00:00:00Z`).getUTCDay() === dow) return at(day, hour, minute)
    }
    return null
  }
  const want = DAY.indexOf(label)
  if (want >= 0) return nextOn(want)
  if (label === 'Next Wed') return nextOn(3)

  // Past plans carry "Wed 26 Aug"; the year is the mock world's own.
  const past = /^\w{3}\s+(\d{1,2})\s+(\w{3})$/.exec(e.dateLabel ?? '')
  if (past) {
    const mon = MON.indexOf(past[2])
    if (mon < 0) return null
    const year = istParts(NOW_MOCK).y
    let mock = at(`${year}-${pad(mon + 1)}-${pad(Number(past[1]))}`, hour, minute)
    if (mock.getTime() > NOW_MOCK.getTime()) {
      mock = at(`${year - 1}-${pad(mon + 1)}-${pad(Number(past[1]))}`, hour, minute)
    }
    return rebase(mock, now)
  }
  return null
}

/** A mock event with its moments and the words for them moved onto the real clock. */
export function rebaseEvent(e: TcEvent, now: Date): TcEvent {
  const start = startsAtOf(e, now)
  if (!start) return e
  const out: TcEvent = { ...e, startsAt: istIso(start), dayLabel: dayLabel(start, now) }
  if (e.endsAt) out.endsAt = istIso(rebase(new Date(e.endsAt), now))
  if (e.dateLabel) out.dateLabel = dateLabel(start)
  const soon = startsInLabel(start, now)
  if (soon) out.startsInLabel = soon
  else delete out.startsInLabel
  return out
}

export function rebaseEvents(events: Record<string, TcEvent>, now: Date): Record<string, TcEvent> {
  return Object.fromEntries(Object.entries(events).map(([id, e]) => [id, rebaseEvent(e, now)]))
}
