/* What a placing is worth.
 *
 * On its own, with no mock data behind it, because the server scores the
 * real tables and the client scores the offline fallback — two places, one
 * rule. A podium should matter more than the gap between seventh and
 * eighth, and turning up at all should be worth something.
 */
export const POINTS: Record<number, number> = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
export const POINTS_FOR_ENTERING = 1

export function pointsFor(place: number): number {
  return POINTS[place] ?? POINTS_FOR_ENTERING
}
