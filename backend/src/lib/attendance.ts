import { and, eq, isNull, sql } from 'drizzle-orm'
import { db, schema } from '../db/client'

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Outcome = 'attended' | 'no_show' | 'cancelled'

/* Writes one person's night at the door and moves their membership counters by what
 * actually changed, so repeating a scan never counts the night twice. Runs inside the
 * caller's transaction. */
export async function recordAttendance(
  tx: Tx,
  event: { id: string; communityId: string | null },
  personId: string,
  outcome: Outcome,
  walkIn: boolean,
  at: Date,
) {
  const [before] = await tx
    .select({ outcome: schema.attendance.outcome })
    .from(schema.attendance)
    .where(and(eq(schema.attendance.eventId, event.id), eq(schema.attendance.personId, personId)))
    .limit(1)

  const [written] = await tx
    .insert(schema.attendance)
    .values({
      id: `${event.id}:${personId}`,
      eventId: event.id,
      personId,
      outcome,
      scannedAt: outcome === 'attended' ? at : null,
      walkIn,
    })
    .onConflictDoUpdate({
      target: [schema.attendance.eventId, schema.attendance.personId],
      set: { outcome, scannedAt: outcome === 'attended' ? at : null },
    })
    .returning()

  const score = (o?: string) => ({
    attended: o === 'attended' ? 1 : 0,
    noShows: o === 'no_show' ? 1 : 0,
  })
  const was = score(before?.outcome)
  const is = score(written.outcome)
  const dAttended = is.attended - was.attended
  const dNoShows = is.noShows - was.noShows

  /* A walk-in from another room has no membership row to move — the update matches nothing. */
  if (event.communityId && (dAttended !== 0 || dNoShows !== 0)) {
    await tx
      .update(schema.memberships)
      .set({
        attended: sql`${schema.memberships.attended} + ${dAttended}`,
        noShows: sql`${schema.memberships.noShows} + ${dNoShows}`,
        // Correcting a mistaken scan must not move the last night forward.
        ...(dAttended > 0 ? { lastSeenAt: at } : {}),
      })
      .where(
        and(
          eq(schema.memberships.personId, personId),
          eq(schema.memberships.communityId, event.communityId),
          isNull(schema.memberships.leftAt),
        ),
      )
  }
  return { row: written, before: before?.outcome }
}
