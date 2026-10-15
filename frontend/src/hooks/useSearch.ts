import { useEffect, useRef, useState } from 'react'
import { searchEvents } from '../api/search'
import type { SearchResult } from '../api/search'

// Debounced search with in-flight cancellation, and a hard rule: if the
// engine is unreachable, the caller falls back to local filtering. Search
// being down means worse results, never a broken app.

interface Options {
  q: string
  when?: string
  free?: boolean
  beginner?: boolean
  tags?: string[]
  lat?: number
  lng?: number
  enabled?: boolean
  debounceMs?: number
}

export function useSearch(opts: Options) {
  const { q, when, free, beginner, tags, lat, lng, enabled = true, debounceMs = 200 } = opts
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const tagKey = (tags ?? []).join(',')

  useEffect(() => {
    if (!enabled) return
    const handle = setTimeout(async () => {
      abortRef.current?.abort() // stale responses must never render
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const r = await searchEvents({ q, when, free, beginner, tags, lat, lng }, controller.signal)
        setResult(r)
        setOffline(false)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setOffline(true)
        setResult(null)
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(handle)
  }, [q, when, free, beginner, tagKey, lat, lng, enabled, debounceMs])

  useEffect(() => () => abortRef.current?.abort(), [])

  return { result, loading, offline }
}
