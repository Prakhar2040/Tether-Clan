import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { istParts } from '@shared/clock'

// Filter state is shared between the Events list and the Map, so switching
// tabs preserves the query instead of resetting it. Time is the primary
// dimension on both surfaces.

// 'tonight' | 'weekend' | a Bengaluru calendar day, "2026-10-17". Real dates, never
// day-of-month numbers: those cannot tell the 3rd of this month from next.
export type When = 'tonight' | 'weekend' | string

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface FiltersValue {
  when: When
  setWhen: (w: When) => void
  freeOnly: boolean
  setFreeOnly: (v: boolean | ((p: boolean) => boolean)) => void
  beginnerOnly: boolean
  setBeginnerOnly: (v: boolean | ((p: boolean) => boolean)) => void
  selectedTags: string[]
  setSelectedTags: (v: string[] | ((p: string[]) => string[])) => void
  query: string
  setQuery: (v: string) => void
  clearFilters: () => void
  activeCount: number
}

const FiltersContext = createContext<FiltersValue | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [when, setWhen] = useState<When>('tonight')
  const [freeOnly, setFreeOnly] = useState(false)
  const [beginnerOnly, setBeginnerOnly] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [query, setQuery] = useState('')

  const value = useMemo<FiltersValue>(
    () => ({
      when,
      setWhen,
      freeOnly,
      setFreeOnly,
      beginnerOnly,
      setBeginnerOnly,
      selectedTags,
      setSelectedTags,
      query,
      setQuery,
      clearFilters: () => {
        setWhen('tonight')
        setFreeOnly(false)
        setBeginnerOnly(false)
        setSelectedTags([])
        setQuery('')
      },
      activeCount:
        (when !== 'tonight' ? 1 : 0) +
        (freeOnly ? 1 : 0) +
        (beginnerOnly ? 1 : 0) +
        selectedTags.length,
    }),
    [when, freeOnly, beginnerOnly, selectedTags, query],
  )

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

export function useFilters(): FiltersValue {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used inside FiltersProvider')
  return ctx
}

/** The Bengaluru civil day of an instant, "2026-10-17" (same words as the server). */
export function ymdOf(at: Date): string {
  const p = istParts(at)
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

/** Today in Bengaluru, read fresh each call so a tab left open overnight stays right. */
export const todayYmd = (): string => ymdOf(new Date())

/** "2026-10-17" shifted by n whole days. */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Mon=0 ... Sun=6 */
export function weekdayIndex(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

const label = (ymd: string) => {
  const [, m, d] = ymd.split('-').map(Number)
  return `${WEEKDAYS[weekdayIndex(ymd)]} ${d} ${MONTHS[m - 1]}`
}

// The coming Saturday/Sunday, as the server counts them: within the next week,
// today included.
export function weekendDays(): string[] {
  const t = todayYmd()
  return [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(t, n)).filter((d) => weekdayIndex(d) >= 5)
}

/* Does this event survive the filters currently set?
 *
 * Lives here rather than on the Events screen because the Map has to answer
 * the same question. It used to apply only the time window, so searching on
 * one screen and switching to the other silently showed a different set —
 * two answers to one question is worse than either answer.
 *
 * `venueName` is passed in: this module knows nothing about venues, and the
 * two screens reach them differently.
 */
export interface EventLike {
  dayLabel: string
  startsAt?: string
  title: string
  categoryLabel: string
  price?: number
  tags?: string[]
  beginnerFriendly?: boolean
  levelLabel?: string
}

export function beginnerOk(e: EventLike): boolean {
  return (
    Boolean(e.beginnerFriendly) ||
    /all levels|all paces|drop in|first-timers/i.test(e.levelLabel ?? '')
  )
}

export interface FilterSet {
  when: When
  freeOnly: boolean
  beginnerOnly: boolean
  selectedTags: string[]
  query: string
}

export function eventMatches(e: EventLike, f: FilterSet, venueName = ''): boolean {
  if (!matchesWhen(e, f.when)) return false
  if (f.freeOnly && e.price !== 0) return false
  if (f.beginnerOnly && !beginnerOk(e)) return false
  if (!f.selectedTags.every((t) => e.tags?.includes(t))) return false

  const q = f.query.trim().toLowerCase()
  if (q === '') return true
  return (
    e.title.toLowerCase().includes(q) ||
    e.categoryLabel.toLowerCase().includes(q) ||
    (e.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
    venueName.toLowerCase().includes(q)
  )
}

export function whenTitle(when: When): { title: string; sub: string } {
  if (when === 'tonight') return { title: 'Tonight', sub: label(todayYmd()) }
  if (when === 'weekend') {
    const days = weekendDays()
    if (days.length === 0) return { title: 'Weekend', sub: 'Sat – Sun' }
    const first = label(days[0])
    const last = label(days[days.length - 1])
    return { title: 'Weekend', sub: days.length === 1 ? first : `${first.split(' ').slice(0, 2).join(' ')} – ${last}` }
  }
  if (when === addDays(todayYmd(), 1)) return { title: 'Tomorrow', sub: label(when) }
  return { title: label(when), sub: label(when) }
}

/** Does this event fall in the chosen window? Uses the same day words as the server. */
export function matchesWhen(e: { dayLabel: string; startsAt?: string }, when: When): boolean {
  if (when === 'tonight') return e.dayLabel === 'Tonight'
  if (when === 'weekend') return e.startsAt ? weekendDays().includes(ymdOf(new Date(e.startsAt))) : false
  return e.startsAt ? ymdOf(new Date(e.startsAt)) === when : false
}
