import { describe, expect, it } from 'vitest'
import { mockEvents } from '@shared/mock'
import { NOW_MOCK, dayLabel, rebase, rebaseEvents, startsAtOf } from '@shared/clock'
import { dayLabel as serverDayLabel } from '../src/lib/when'

/* The client's mock and the seeder share one rebasing function. */
describe('shared clock', () => {
  const now = new Date('2026-10-15T23:30:00+05:30') // a Thursday night, late

  it('keeps the day offset and the time of day', () => {
    expect(rebase(new Date('2026-09-09T20:00:00+05:30'), now).toISOString()).toBe('2026-10-15T14:30:00.000Z')
    expect(rebase(new Date('2026-09-12T07:00:00+05:30'), now).toISOString()).toBe('2026-10-18T01:30:00.000Z')
  })

  it('maps the mock\'s own "now" onto today', () => {
    expect(dayLabel(rebase(NOW_MOCK, now), now)).toBe('Tonight')
  })

  it('labels agree with the server\'s', () => {
    const rebased = rebaseEvents(mockEvents, now)
    for (const e of Object.values(rebased)) {
      expect(e.dayLabel).toBe(serverDayLabel(new Date(e.startsAt!), now))
    }
  })

  it('places every event that the seeder would', () => {
    for (const e of Object.values(mockEvents)) expect(startsAtOf(e, now)).not.toBeNull()
  })
})
