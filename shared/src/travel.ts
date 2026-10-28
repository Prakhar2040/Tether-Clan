/* How long it takes to get there.
 *
 * Distance on its own is misleading in this city. The number the apps had was
 * straight-line — Bengaluru roads run about 1.4 times that — so a card saying
 * "6.3 km away" meant nearly nine kilometres of driving, and "away" is read as
 * how far you have to go.
 *
 * Minutes are the honest version and the useful one: 6 km is fifteen minutes
 * at eleven at night and fifty at six in the evening, and nobody decides on
 * kilometres. The coefficient absorbs the road factor — 3.4 minutes per
 * straight-line kilometre works out around 25 km/h on the actual road — and
 * the four minutes are getting out of the door and parking at the other end.
 *
 * Lives here because the server sends it and the client has to produce the
 * same answer offline. Two copies would disagree the moment either changed.
 */
export function travelMinutes(km: number): number {
  return Math.max(5, Math.round(km * 3.4 + 4))
}

/** "15 min", "1 hr 5 min" — long trips read badly in minutes alone. */
export function travelLabel(mins: number | null): string | null {
  if (mins === null || !Number.isFinite(mins)) return null
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}
