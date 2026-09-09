import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// Filter state is shared between the Events list and the Map, so switching
// tabs preserves the query instead of resetting it. Time is the primary
// dimension on both surfaces.

export type When = 'tonight' | 'weekend' | number

export const TODAY = 9 // Wed 9 Sep 2026, the mock "now"
export const DAY_LABELS: Record<number, string> = { 9: 'Tonight', 10: 'Tomorrow', 12: 'Sat', 13: 'Sun' }
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

export function weekdayOf(day: number): string {
  return WEEKDAYS[(new Date(2026, 8, day).getDay() + 6) % 7]
}

export function whenTitle(when: When): { title: string; sub: string } {
  if (when === 'tonight') return { title: 'Tonight', sub: 'Wed 9 Sep' }
  if (when === 'weekend') return { title: 'Weekend', sub: 'Sat 12 – Sun 13 Sep' }
  return { title: `${weekdayOf(when)} ${when} Sep`, sub: `${weekdayOf(when)} ${when} Sep` }
}

export function matchesWhen(dayLabel: string, when: When): boolean {
  if (when === 'tonight') return dayLabel === 'Tonight'
  if (when === 'weekend') return dayLabel === 'Sat' || dayLabel === 'Sun'
  return dayLabel === DAY_LABELS[when]
}
