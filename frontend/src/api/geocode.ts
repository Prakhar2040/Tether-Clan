/* Looking up a place by name.
 *
 * Mapbox's Search Box API, using the token the map already needs. Two reasons
 * it is this one and not the Geocoding API, both learned the hard way:
 *
 *   Geocoding has no POIs at all. "Phoenix Marketcity" returned nothing and
 *   "Adarsh Palm Retreat" fell through to whichever road half-matched, which
 *   is how a search can look like it worked and put you somewhere else.
 *
 *   Within Search Box, /forward is for complete queries and /suggest is for
 *   someone still typing. /forward on "koram" returns nothing and on "indiran"
 *   offers a café called Indiran's abode.
 *
 * So: /suggest while typing, /retrieve for the coordinates once a line is
 * picked. Both carry a session token, which is what Mapbox bills as one
 * search rather than one call per keystroke.
 */

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const BASE = 'https://api.mapbox.com/search/searchbox/v1'

/* West, south, east, north. Drawn tightly around Bengaluru: a looser box
   reaches Hosur and Nelamangala, an hour away. */
const BBOX = '77.44,12.78,77.82,13.16'

/* Mapbox's Indian street data carries names that are directions rather than
   places — "Mg Rd Opposite Indira Canteen Behind Bolas". Never what anyone
   meant, and unusable as a label. Length is not a filter any more: real places
   have long names, like "Embassy Manyata Business Park". */
const SIGNPOST = /\b(opposite|opp\.?|behind|beside)\b/i

/* Two is enough to be worth asking about: "mg", "hs", "jp" are all real
   starts here, and starting early means results are already on screen by the
   time a longer word is finished. */
export const MIN_QUERY = 2

export interface PlaceHit {
  id: string
  name: string
  /** "Koramangala, Bengaluru" — enough to tell two similar names apart. */
  context: string
  /** Only set on the offline fallback, which already knows where it is. */
  lat?: number
  lng?: number
}

/** One token per run of typing, so Mapbox bills a search rather than a call. */
export const newSession = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}${Math.random().toString(36).slice(2)}`

const tidy = (s: string) =>
  s
    .replace(/,?\s*(Bengaluru Urban|Karnataka|India)\b/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/^[,\s]+|[,\s]+$/g, '')

/* Answers already paid for.
 *
 * Mapbox is 600-800ms away from Bengaluru, which is most of the wait and
 * cannot be shortened. What can be avoided is asking twice: deleting a letter
 * or retyping a word is extremely common, and those queries come back
 * instantly from here instead of costing another round trip. */
const cache = new Map<string, PlaceHit[]>()
const CACHE_MAX = 60

/** Cached answer for a query, if there is one. Lets a caller skip the wait. */
export function cachedSuggestions(
  query: string,
  near: { lat: number; lng: number },
): PlaceHit[] | undefined {
  return cache.get(cacheKey(query, near))
}

const cacheKey = (q: string, near: { lat: number; lng: number }) =>
  `${q.trim().toLowerCase()}@${near.lat.toFixed(2)},${near.lng.toFixed(2)}`

export async function suggestPlaces(
  query: string,
  session: string,
  near: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  const q = query.trim()
  if (!TOKEN || q.length < MIN_QUERY) return []

  const key = cacheKey(q, near)
  const hit = cache.get(key)
  if (hit) return hit

  const url =
    `${BASE}/suggest?q=${encodeURIComponent(q)}&access_token=${TOKEN}` +
    `&session_token=${session}&proximity=${near.lng},${near.lat}` +
    `&bbox=${BBOX}&country=IN&limit=7&language=en`

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`suggest failed: ${res.status}`)
  const body = (await res.json()) as {
    suggestions?: { mapbox_id?: string; name?: string; place_formatted?: string }[]
  }

  const hits: PlaceHit[] = []
  const seen = new Set<string>()
  for (const s of body.suggestions ?? []) {
    if (!s.mapbox_id || !s.name || SIGNPOST.test(s.name)) continue
    const context = tidy(s.place_formatted ?? '')
    // Mapbox returns the same name at several feature types; one line each.
    const key = `${s.name}|${context}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({ id: s.mapbox_id, name: s.name, context })
  }

  // Oldest out first; a Map iterates in insertion order.
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, hits)
  return hits
}

/** Where a suggestion actually is. Suggestions carry no coordinates. */
export async function retrievePlace(
  id: string,
  session: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number } | null> {
  if (!TOKEN) return null
  const res = await fetch(
    `${BASE}/retrieve/${encodeURIComponent(id)}?access_token=${TOKEN}&session_token=${session}`,
    { signal },
  )
  if (!res.ok) throw new Error(`retrieve failed: ${res.status}`)
  const body = (await res.json()) as {
    features?: { geometry?: { coordinates?: [number, number] } }[]
  }
  const c = body.features?.[0]?.geometry?.coordinates
  return c ? { lng: c[0], lat: c[1] } : null
}

/* What to call a pair of coordinates.
 *
 * A device fix arrives as numbers and the app was labelling it "Your
 * location", which is a UI label rather than a place name — and it ends up
 * read as one: "Quiet in Your location tonight", "Tell me when Your location
 * wakes up". Naming the area fixes every one of those sentences at once.
 *
 * Tried smallest first. `locality` is the level that answers "Indiranagar"
 * and "Chandana"; `place` only ever answers "Bengaluru", which is true of
 * everything here and therefore useless, so it is the last resort.
 */
export async function reverseName(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!TOKEN) return null
  for (const type of ['locality', 'neighborhood', 'place']) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}` +
          `&access_token=${TOKEN}&types=${type}&limit=1&language=en`,
        { signal },
      )
      if (!res.ok) continue
      const body = (await res.json()) as { features?: { properties?: { name?: string } }[] }
      const name = body.features?.[0]?.properties?.name
      if (name) return name
    } catch (err) {
      if ((err as Error).name === 'AbortError') return null
    }
  }
  return null
}
