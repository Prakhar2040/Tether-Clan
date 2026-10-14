import type { Person } from './types'

// You. The one person in the app who is not a row in somebody else's list —
// which is why the badges and the record on this page are yours alone, and
// nobody else can see them.

export const me: Person = { id: 'you', name: 'Ishaan Rao', initials: 'IR', color: 'orange' }

export const myArea = 'Indiranagar'
export const joinedLabel = 'March 2026'

// Nights turned up to, per community.
export const nightsIn: Record<string, number> = {
  'dice-district-regulars': 14,
  'cubbon-runners': 9,
}

// The ladder, self-facing. The host names their own rungs; these are the
// defaults a member sees until a community renames them.
export type Tier = 'old-hand' | 'regular' | 'new-face'

export const TIER: Record<Tier, { label: string; note: string }> = {
  'old-hand': { label: 'Old hand', note: 'Been here longer than most of the shelf' },
  regular: { label: 'Regular', note: 'You know the room' },
  'new-face': { label: 'New face', note: 'Not been along yet' },
}

export function tierFor(nights: number): Tier {
  if (nights >= 20) return 'old-hand'
  if (nights >= 8) return 'regular'
  return 'new-face'
}

// How many more nights until the next rung, so the page can say something
// useful rather than just stamping a label on you.
export function nextRung(nights: number): { label: string; needed: number } | null {
  if (nights < 8) return { label: TIER.regular.label, needed: 8 - nights }
  if (nights < 20) return { label: TIER['old-hand'].label, needed: 20 - nights }
  return null
}
