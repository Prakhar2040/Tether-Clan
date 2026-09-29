import { pastCommunityEvents, upcomingCommunityEvents } from '@app/data/community'
import { NOW, venues } from '@app/data/mock'
import type { TcEvent } from '@app/types'
import { memberHoldersFor } from '../state/door'

// Where a night's money came from. Somebody who has been five times or more
// is a regular; anyone under that is still new to the room. A real one would
// read the sale log — this reads who holds the tickets.
export const REGULAR_AT = 5

// Nothing in the data records what a night actually costs, so this stands in
// until the host can enter it.
export const SPEND_A_MONTH = 2000

// Capacities in the mock data are generous, so the real unsold figure dwarfs
// everything else in the ring and the shape stops being readable. Pinned small
// until capacities are real. The per-plan `forgone` the sales page shows is
// untouched — this only flattens the month's total.
export const UNSOLD_A_MONTH = 200

// Demand, not accounting. What moved, how full it got, and what the empty
// places would have taken. Everything comes from capacity, going and price —
// the three numbers a plan already carries. Nothing is deducted here.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MON = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface Sale {
  id: string
  title: string
  venue: string
  dow: string
  day: string
  mon: string
  sortKey: number
  price: number
  capacity: number
  sold: number
  unsold: number
  fill: number
  revenue: number
  forgone: number // what the empty places would have taken
  soldOut: boolean
  run: boolean // already happened
  year: number
  monthIdx: number
}

export interface MonthGroup {
  key: string
  label: string
  revenue: number
  tickets: number
  plans: Sale[]
}

export interface Sales {
  onSale: Sale[]
  months: MonthGroup[]

  monthLabel: string
  monthRevenue: number
  monthTickets: number
  monthEvents: number
  monthUnsold: number

  // One figure when every ticket cost the same; a range when they did not,
  // because an average nobody paid is worse than no number at all.
  monthPriceLow: number
  monthPriceHigh: number
  monthPerTicket: number

  // Scoped to the month, like the figure they sit beside — a rolling window
  // next to a calendar month would be two clocks on one wall.
  monthSoldOut: number
  monthFill: number

  monthFromRegulars: number
  monthFromNew: number
  monthForgone: number
  monthExpense: number
  // The two above, less their share of the spend, so the three add up to the
  // month's revenue exactly and the pie closes on the headline figure.
  monthKeptRegulars: number
  monthKeptNew: number

  currency: (n: number) => string
}

function when(e: TcEvent): { dow: string; day: string; mon: string; sortKey: number } {
  if (e.startsAt) {
    const d = new Date(e.startsAt)
    return {
      dow: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
      day: String(d.getDate()),
      mon: MON[d.getMonth()].toUpperCase(),
      sortKey: d.getTime(),
    }
  }
  const m = /^(\w{3})\s+(\d{1,2})\s+(\w{3})$/.exec(e.dateLabel ?? '')
  if (m) {
    const idx = MON.findIndex((x) => x.toLowerCase() === m[3].toLowerCase())
    return {
      dow: m[1].toUpperCase(),
      day: m[2],
      mon: m[3].toUpperCase(),
      sortKey: new Date(2026, idx < 0 ? 0 : idx, Number(m[2])).getTime(),
    }
  }
  return { dow: e.dayLabel.slice(0, 3).toUpperCase(), day: '·', mon: '', sortKey: Date.now() }
}

export function salesFor(communityId: string): Sales {
  const toSale = (e: TcEvent, run: boolean): Sale => {
    const w = when(e)
    const sold = Math.min(e.going, e.capacity)
    const unsold = Math.max(0, e.capacity - sold)
    const d = new Date(w.sortKey)
    return {
      id: e.id,
      title: e.title,
      venue: venues[e.venueId]?.name ?? '',
      ...w,
      price: e.price,
      capacity: e.capacity,
      sold,
      unsold,
      fill: e.capacity === 0 ? 0 : sold / e.capacity,
      revenue: e.price * sold,
      forgone: e.price * unsold,
      soldOut: unsold === 0,
      run,
      year: d.getFullYear(),
      monthIdx: d.getMonth(),
    }
  }

  const past = pastCommunityEvents(communityId)
    .map((e) => toSale(e, true))
    .sort((a, b) => b.sortKey - a.sortKey)
  const onSale = upcomingCommunityEvents(communityId)
    .map((e) => toSale(e, false))
    .sort((a, b) => a.sortKey - b.sortKey)

  // Grouped the way a statement is: a heading a month, newest first.
  const groups = new Map<string, MonthGroup>()
  for (const p of past) {
    const key = `${p.year}-${p.monthIdx}`
    const g =
      groups.get(key) ??
      ({ key, label: `${FULL_MON[p.monthIdx]} ${p.year}`, revenue: 0, tickets: 0, plans: [] } as MonthGroup)
    g.revenue += p.revenue
    g.tickets += p.sold
    g.plans.push(p)
    groups.set(key, g)
  }

  const thisMonth = [...past, ...onSale].filter(
    (p) => p.year === NOW.getFullYear() && p.monthIdx === NOW.getMonth(),
  )
  const monthRevenue = thisMonth.reduce((n, p) => n + p.revenue, 0)
  const monthTickets = thisMonth.reduce((n, p) => n + p.sold, 0)
  const soldPrices = thisMonth.filter((p) => p.sold > 0).map((p) => p.price)

  const monthExpense = thisMonth.length === 0 ? 0 : SPEND_A_MONTH

  // Split the month's takings by who paid them.
  let monthFromRegulars = 0
  for (const p of thisMonth) {
    const regulars = memberHoldersFor(communityId, p.id, p.sold).filter((m) => m.attended >= REGULAR_AT)
    monthFromRegulars += regulars.length * p.price
  }
  const monthFromNew = monthRevenue - monthFromRegulars
  const keptNew =
    monthRevenue === 0 ? 0 : Math.round((monthFromNew / monthRevenue) * (monthRevenue - monthExpense))

  return {
    onSale,
    months: [...groups.values()],

    monthLabel: `${FULL_MON[NOW.getMonth()]} ${NOW.getFullYear()}`,
    monthRevenue,
    monthTickets,
    monthEvents: thisMonth.length,
    monthUnsold: thisMonth.reduce((n, p) => n + p.unsold, 0),

    monthPriceLow: soldPrices.length === 0 ? 0 : Math.min(...soldPrices),
    monthPriceHigh: soldPrices.length === 0 ? 0 : Math.max(...soldPrices),
    monthPerTicket: monthTickets === 0 ? 0 : Math.round(monthRevenue / monthTickets),

    monthFromRegulars,
    monthFromNew,
    monthForgone: thisMonth.length === 0 ? 0 : UNSOLD_A_MONTH,
    monthExpense,
    monthKeptRegulars: monthRevenue - monthExpense - keptNew,
    monthKeptNew: keptNew,

    monthSoldOut: thisMonth.filter((p) => p.soldOut).length,
    monthFill:
      thisMonth.length === 0 ? 0 : thisMonth.reduce((n, p) => n + p.fill, 0) / thisMonth.length,

    currency: (n: number) => `₹${n.toLocaleString('en-IN')}`,
  }
}
