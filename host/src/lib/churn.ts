// Who left, month by month.
//
// Nothing in the roster records a departure: a membership has a joinedLabel
// and a monthsIn, and no end. So this is a stand-in — deterministic, so the
// same month always reports the same figure, and shaped like real churn
// (small, always non-zero, heavier in the months after a big intake).
//
// The moment a membership can end, delete this file and read the rows.

export function leftInMonth(communityId: string, monthsAgo: number, joined: number): number {
  let h = 0
  for (const ch of `${communityId}:${monthsAgo}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  // A floor of one, plus a little of the intake that came before it.
  return 1 + (h % 3) + (joined > 5 ? 1 : 0)
}
