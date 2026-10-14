import { describe, expect, it } from 'vitest'
import { desc, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../src/db/client'
import { dayDateLabel, dayMonthLabel } from '../src/lib/when'
import { pointsFor } from '@shared/points'

/* The board, checked against the seeded database. Like the search tests,
   these need it up and seeded. */

describe('labels for a plain day', () => {
  it('names the weekday without letting a timezone move it', () => {
    // Parsed as UTC on purpose: in IST, local midnight is the day before.
    expect(dayDateLabel('2026-09-12')).toBe('Sat 12 Sep 2026')
    expect(dayDateLabel('2026-01-01')).toBe('Thu 1 Jan 2026')
    expect(dayMonthLabel('2025-12-13')).toBe('Dec 2025')
  })
})

describe('scoring', () => {
  it('pays a podium more than the gap below it, and entering at all', () => {
    expect([1, 2, 3, 4, 5].map(pointsFor)).toEqual([10, 7, 5, 3, 2])
    expect(pointsFor(6)).toBe(1)
    expect(pointsFor(40)).toBe(1)
  })
})

describe('the seeded competitions', () => {
  it('keeps every competition on the weekday the club runs it', async () => {
    const rows = await db.select().from(schema.competitions)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(dayDateLabel(r.heldOn).slice(0, 3)).toBe('Sat')
  })

  it('has none of them dated in the future', async () => {
    const [newest] = await db
      .select()
      .from(schema.competitions)
      .orderBy(desc(schema.competitions.heldOn))
      .limit(1)
    expect(newest.heldOn <= new Date().toISOString().slice(0, 10)).toBe(true)
  })

  it('never seats two people in the same place', async () => {
    const rows = await db.select().from(schema.results)
    const seen = new Set<string>()
    for (const r of rows) {
      const key = `${r.competitionId}:${r.place}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('records fewer placings than entrants — only the table is kept', async () => {
    const rows = await db
      .select({ id: schema.competitions.id, entrants: schema.competitions.entrants })
      .from(schema.competitions)
    for (const c of rows) {
      const placed = await db
        .select()
        .from(schema.results)
        .where(eq(schema.results.competitionId, c.id))
      expect(placed.length).toBeLessThanOrEqual(c.entrants)
    }
  })

  it('leaves no placing attached to a person who is gone', async () => {
    const orphan = await db
      .select({ id: schema.results.id })
      .from(schema.results)
      .leftJoin(schema.people, eq(schema.people.id, schema.results.personId))
      .where(isNull(schema.people.id))
    expect(orphan).toEqual([])
  })
})
