import { useEffect, useRef, useState } from 'react'

/* Server data, with the local copy underneath it.
 *
 * `data` is never empty and never undefined: it starts as the fallback the
 * caller passes — the mock the app has always rendered — and is replaced if
 * and when the server answers. So there is no loading state to design, no
 * spinner, and no blank screen when the API is down; there is just slightly
 * staler data and `offline` set, which a screen can say out loud if it wants.
 *
 * `deps` works like useEffect's: `load` is almost always a fresh closure, so
 * the dependency list is what decides when to ask again, not the function's
 * identity.
 */
export function useRemote<T>(
  load: (signal: AbortSignal) => Promise<T>,
  fallback: T,
  deps: unknown[] = [],
): { data: T; offline: boolean; loading: boolean } {
  const [data, setData] = useState<T>(fallback)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  // Held in a ref so a changing closure cannot re-trigger the effect.
  const run = useRef(load)
  run.current = load

  useEffect(() => {
    const ac = new AbortController()
    let alive = true
    setLoading(true)
    run
      .current(ac.signal)
      .then((fresh) => {
        if (!alive) return
        setData(fresh)
        setOffline(false)
      })
      .catch((err) => {
        // An abort is this component moving on, not the server failing.
        if (!alive || (err as Error).name === 'AbortError') return
        setOffline(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
      ac.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, offline, loading }
}
