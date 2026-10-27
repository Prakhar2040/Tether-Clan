import type { Place } from '../state/location'

/* Looking up a place by name.
 *
 * Mapbox geocoding, with the same token the map uses. Three deliberate
 * constraints, all of them because this product is one city:
 *
 *   bbox       results are clamped to Bengaluru. Without it "MG Road" offers
 *              you Pune and Mumbai, which are not places you can go tonight.
 *   proximity  ranked outward from wherever the viewer already is, so the
 *              nearest Koramangala block comes before the far one.
 *   types      settlements and streets, not shops. "Where are you?" is
 *              answered by an area, and POI results bury that in cafés.
 */

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

/* West, south, east, north. Drawn tightly around Bengaluru on purpose: a
   looser box reaches Hosur and Nelamangala, which are an hour away and not
   somewhere you are going tonight. */
const BBOX = '77.44,12.78,77.82,13.16'
const TYPES = 'place,locality,neighborhood,street'

/* Mapbox's Indian street data carries a lot of names that are directions
   rather than places — "Mg Rd Opposite Indira Canteen Behind Bolas", "Cubbon
   Park Opposite M.S Building Near Vidhan Soudha". Unusable as a label and
   never what someone meant, so they are dropped on sight. */
const SIGNPOST = /\b(opposite|opp\.?|near|behind|beside)\b/i
const TOO_LONG = 32

/* Areas before streets. Somebody typing "koram" wants Koramangala, not a road
   with Koramangala in its name. */
const RANK: Record<string, number> = { place: 0, locality: 1, neighborhood: 2, street: 3 }

export interface PlaceHit {
  id: string
  name: string
  /** "Koramangala, Bengaluru" — enough to tell two similar names apart. */
  context: string
  lat: number
  lng: number
}

interface WireFeature {
  id?: string
  properties?: {
    mapbox_id?: string
    name?: string
    place_formatted?: string
    feature_type?: string
  }
  geometry?: { coordinates?: [number, number] }
}

/* Short queries are not worth a round trip: one or two letters match half the
   city and the answer is noise. */
export const MIN_QUERY = 3

export async function searchPlaces(
  query: string,
  near: Pick<Place, 'lat' | 'lng'>,
  signal?: AbortSignal,
): Promise<PlaceHit[]> {
  const q = query.trim()
  if (!TOKEN || q.length < MIN_QUERY) return []

  const url =
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}` +
    `&access_token=${TOKEN}` +
    `&proximity=${near.lng},${near.lat}` +
    `&bbox=${BBOX}&country=in&limit=6&types=${TYPES}&language=en`

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`geocode failed: ${res.status}`)
  const body = (await res.json()) as { features?: WireFeature[] }

  const seen = new Set<string>()
  const hits: (PlaceHit & { rank: number })[] = []
  for (const f of body.features ?? []) {
    const c = f.geometry?.coordinates
    const name = f.properties?.name
    if (!c || !name) continue
    if (name.length > TOO_LONG || SIGNPOST.test(name)) continue
    // Mapbox happily returns the same place twice at different feature types.
    const key = `${name}@${c[0].toFixed(4)},${c[1].toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({
      id: f.properties?.mapbox_id ?? f.id ?? key,
      name,
      // Drop the trailing ", Karnataka, India" — true of everything here.
      context: (f.properties?.place_formatted ?? '')
        .replace(/,?\s*(Bengaluru Urban|Karnataka|India)\b/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/^[,\s]+|[,\s]+$/g, ''),
      lng: c[0],
      lat: c[1],
      rank: RANK[f.properties?.feature_type ?? ''] ?? 9,
    })
  }
  // Stable within a rank, so Mapbox's own relevance ordering survives.
  return hits
    .sort((a, b) => a.rank - b.rank)
    .map(({ rank: _rank, ...hit }) => hit)
}
