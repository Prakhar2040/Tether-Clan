import { useEffect, useState } from 'react'

/* A set of photographs that cross-fades on a timer.
 *
 * Written once because two feeds use it: the community tile rolls through a
 * room's pictures, and an event card rolls through the night's own art and
 * then the room's. Two copies of this would drift in timing and in the
 * details that matter — the pause on hover, the reduced-motion branch.
 *
 * The wait is keyed on the current index, so stepping by hand restarts it
 * rather than being overtaken by a timer that was already nearly up.
 */
export const ROLL_MS = 4200

export function useRollingShots(count: number, rollMs: number = ROLL_MS) {
  const [at, setAt] = useState(0)
  const [held, setHeld] = useState(false)

  // A shrinking list must not leave the index past its end.
  useEffect(() => {
    if (at >= count && count > 0) setAt(0)
  }, [count, at])

  useEffect(() => {
    if (count < 2 || held) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setAt((n) => (n + 1) % count), rollMs)
    return () => clearTimeout(t)
  }, [at, held, count, rollMs])

  const step = (d: number) => (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setAt((n) => (n + d + count) % count)
  }

  return { at, setAt, held, setHeld, step }
}
