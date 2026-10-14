import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { communityEvents } from '@app/data/community'
import { series, venues } from '@shared/mock'
import type { TcEvent } from '@shared/types'

// A plan, as the host holds it. Seeded from what the community already runs,
// then edited here. Status is the thing the shared model never had: a plan
// can be written before anyone can buy it, and closed without being
// cancelled.

export type PlanStatus = 'draft' | 'on-sale' | 'closed' | 'past'

export interface Plan {
  id: string
  title: string
  description: string
  theme: string
  date: string // yyyy-mm-dd
  time: string // HH:MM
  venueId: string
  capacity: number
  price: number
  levelLabel: string
  seriesId?: string
  status: PlanStatus
  sold: number
}

function isoOf(e: TcEvent): string {
  if (e.startsAt) return e.startsAt.slice(0, 10)
  const m = /^(\w{3})\s+(\d{1,2})\s+(\w{3})$/.exec(e.dateLabel ?? '')
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (m) {
    const idx = MON.findIndex((x) => x.toLowerCase() === m[3].toLowerCase())
    return `2026-${String(idx + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return '2026-09-09'
}

function timeOf(e: TcEvent): string {
  if (e.startsAt) return e.startsAt.slice(11, 16)
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(e.timeLabel ?? '')
  if (!m) return '19:30'
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3])) h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

function fromEvent(e: TcEvent): Plan {
  return {
    id: e.id,
    title: e.title,
    description: e.whatToExpect ?? '',
    theme: e.theme ?? '',
    date: isoOf(e),
    time: timeOf(e),
    venueId: e.venueId,
    capacity: e.capacity,
    price: e.price,
    levelLabel: e.levelLabel ?? '',
    seriesId: e.seriesId,
    status: e.dayLabel === 'Past' ? 'past' : e.going >= e.capacity ? 'closed' : 'on-sale',
    sold: Math.min(e.going, e.capacity),
  }
}

export function blankPlan(communityId: string): Plan {
  const last = communityEvents(communityId).find((e) => e.seriesId)
  return {
    id: `new-${communityId}-${Date.now()}`,
    title: '',
    description: '',
    theme: '',
    date: '2026-09-16',
    time: '19:30',
    // Defaults come from the last thing this community ran, which is what
    // makes scheduling a weekly night three fields instead of twelve.
    venueId: last?.venueId ?? Object.keys(venues)[0],
    capacity: last?.capacity ?? 20,
    price: last?.price ?? 0,
    levelLabel: last?.levelLabel ?? '',
    seriesId: last?.seriesId,
    status: 'draft',
    sold: 0,
  }
}

interface PlansValue {
  plans: Plan[]
  dirty: boolean
  get: (id: string) => Plan | undefined
  update: (id: string, patch: Partial<Plan>) => void
  create: () => Plan
  publish: (id: string) => void
  close: (id: string) => void
  reopen: (id: string) => void
  duplicate: (id: string) => Plan
  remove: (id: string) => void
  revert: () => void
  save: () => void
}

const PlansContext = createContext<PlansValue | null>(null)

export function PlansProvider({ communityId, children }: { communityId: string; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, Plan[]>>({})
  const [saved, setSaved] = useState<Record<string, Plan[]>>({})

  const committed = saved[communityId] ?? communityEvents(communityId).map(fromEvent)
  const plans = drafts[communityId] ?? committed

  const value = useMemo<PlansValue>(() => {
    const write = (next: Plan[]) => setDrafts((d) => ({ ...d, [communityId]: next }))
    const order = (list: Plan[]) =>
      [...list].sort((a, b) => {
        const rank = { draft: 0, 'on-sale': 1, closed: 2, past: 3 } as const
        return rank[a.status] - rank[b.status] || a.date.localeCompare(b.date)
      })

    return {
      plans: order(plans),
      dirty: JSON.stringify(plans) !== JSON.stringify(committed),
      get: (id) => plans.find((p) => p.id === id),
      update: (id, patch) => write(plans.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      create: () => {
        const p = blankPlan(communityId)
        write([p, ...plans])
        return p
      },
      publish: (id) => write(plans.map((p) => (p.id === id ? { ...p, status: 'on-sale' } : p))),
      close: (id) => write(plans.map((p) => (p.id === id ? { ...p, status: 'closed' } : p))),
      reopen: (id) => write(plans.map((p) => (p.id === id ? { ...p, status: 'on-sale' } : p))),
      // How a weekly night actually gets scheduled: last week, a week later.
      duplicate: (id) => {
        const src = plans.find((p) => p.id === id)!
        const next = new Date(`${src.date}T00:00:00`)
        next.setDate(next.getDate() + 7)
        const copy: Plan = {
          ...src,
          id: `copy-${src.id}-${plans.length}`,
          date: next.toISOString().slice(0, 10),
          status: 'draft',
          sold: 0,
        }
        write([copy, ...plans])
        return copy
      },
      remove: (id) => write(plans.filter((p) => p.id !== id)),
      revert: () => setDrafts((d) => ({ ...d, [communityId]: committed })),
      save: () => {
        setSaved((s) => ({ ...s, [communityId]: plans }))
        setDrafts((d) => ({ ...d, [communityId]: plans }))
      },
    }
  }, [plans, committed, communityId])

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>
}

export function usePlans(): PlansValue {
  const ctx = useContext(PlansContext)
  if (!ctx) throw new Error('usePlans must be used inside PlansProvider')
  return ctx
}

export function seriesLabel(seriesId?: string): string {
  return seriesId ? (series[seriesId]?.cadenceLabel ?? '') : ''
}
