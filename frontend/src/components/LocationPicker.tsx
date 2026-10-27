import { useEffect, useRef, useState } from 'react'
import type { LocStatus } from '../state/location'
import { useLocation } from '../state/location'
import { PinIcon, SearchIcon } from './icons'
import { MIN_QUERY, searchPlaces, type PlaceHit } from '../api/geocode'

/* Where the user is. One control, used by both Events and the Map, so the two
   always agree on the answer.
   
   These are no longer offered as buttons — searching replaced them. They stay
   as the offline fallback: with no network the geocoder cannot answer, and
   filtering these by name keeps the control working instead of leaving a box
   that does nothing. */
export const AREAS = [
  { id: 'bellandur', name: 'Bellandur', lat: 12.926, lng: 77.6762 },
  { id: 'indiranagar', name: 'Indiranagar', lat: 12.9719, lng: 77.6412 },
  { id: 'koramangala', name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { id: 'hsr', name: 'HSR Layout', lat: 12.9116, lng: 77.6389 },
  { id: 'whitefield', name: 'Whitefield', lat: 12.9698, lng: 77.75 },
  { id: 'jayanagar', name: 'Jayanagar', lat: 12.9308, lng: 77.5838 },
  { id: 'mg-road', name: 'MG Road / Church St', lat: 12.9756, lng: 77.6046 },
]

/* "±120 m", "±4 km". Shown because a device fix can be anywhere from a street
   corner to the wrong side of the city, and the number is the only way to tell
   which one you got. */
export function accuracyLabel(m?: number): string | null {
  if (m === undefined) return null
  return m < 1000 ? `±${Math.round(m)} m` : `±${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`
}

export function LocationChip({ onOpen }: { onOpen: () => void }) {
  const { place, status } = useLocation()
  const near = accuracyLabel(place.accuracyM)
  return (
    <button
      className="location-chip"
      onClick={onOpen}
      title={near ? `${place.label}, accurate to ${near} — tap to change` : 'Change location'}
    >
      <PinIcon size={12} color="#E9712A" strokeWidth={2.4} />
      {status === 'locating' ? 'Finding you…' : place.label}
      {near ? <em className="chip-accuracy">{near}</em> : null}
    </button>
  )
}

const WHY: Partial<Record<LocStatus, string>> & { denied: string } = {
  blocked: 'Your browser is blocking location for this site. Allow it in the padlock menu beside the address bar, or pick an area below.',
  /* kCLErrorLocationUnknown, in plain words. On a Mac the usual cause is the
     Wi-Fi radio being off: macOS works out where it is by scanning nearby
     networks, not from the IP address, so being online over Ethernet is not
     enough. Location Services being switched off is the other one, and is what
     people check first, so both are named. */
  unavailable:
    'Your device could not work out where it is. On a Mac, switch Wi-Fi on — it finds itself by scanning nearby networks, so the radio has to be on even when you are online over Ethernet. Failing that, check System Settings → Privacy & Security → Location Services. Pick an area below meanwhile.',
  denied: 'Timed out waiting for a fix. Pick an area below instead.',
  unsupported: 'This browser cannot do location at all. Pick an area below instead.',
}

export function LocationSheet({
  onClose,
  onPicked,
}: {
  onClose: () => void
  onPicked?: (lat: number, lng: number) => void
}) {
  const { place, status, request, setPlace } = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [searching, setSearching] = useState(false)
  // Where to bias results from. Held in a ref so moving the pin mid-search
  // cannot restart the request that is already in flight.
  const near = useRef(place)
  near.current = place

  const choose = (lat: number, lng: number, label: string) => {
    setPlace({ lat, lng, label })
    onPicked?.(lat, lng)
    onClose()
  }

  /* Typing is not a request per keystroke: each one cancels the last and the
     call waits for a pause. The abort matters as much as the delay — without
     it a slow early response can land after a fast later one and overwrite
     the results for a query nobody is looking at any more. */
  useEffect(() => {
    const text = q.trim()
    if (text.length < MIN_QUERY) {
      setHits([])
      setSearching(false)
      return
    }
    const ac = new AbortController()
    setSearching(true)
    const t = setTimeout(() => {
      searchPlaces(text, near.current, ac.signal)
        .then((found) => setHits(found))
        .catch((err) => {
          if ((err as Error).name === 'AbortError') return
          /* Offline, or no token. Falling back to the known areas keeps the
             control usable rather than leaving a dead box. */
          setHits(
            AREAS.filter((a) => a.name.toLowerCase().includes(text.toLowerCase())).map((a) => ({
              id: a.id,
              name: a.name,
              context: 'Bengaluru',
              lat: a.lat,
              lng: a.lng,
            })),
          )
        })
        .finally(() => setSearching(false))
    }, 250)
    return () => {
      ac.abort()
      clearTimeout(t)
    }
  }, [q])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <span className="sheet-handle" />
        <span className="section-label">Where are you?</span>

        {/* Asking here is a tap, so it goes to the device even while positions
            are simulated. */}
        <button
          className="btn btn-primary"
          style={{ minHeight: 48 }}
          disabled={status === 'locating'}
          onClick={async () => {
            setError(null)
            const fix = await request('user')
            if (fix) {
              onPicked?.(fix.lat, fix.lng)
              onClose()
            } else {
              /* Say which failure it was. "Could not get a location" for every
                 case is how a device with location switched off looks
                 identical to one that simply has not answered yet — and why
                 a silent failure read as "it detected the area I just
                 picked". */
              setError(WHY[status] ?? WHY.denied)
            }
          }}
        >
          <PinIcon size={15} color="#FDBE50" strokeWidth={2.4} />
          {status === 'locating' ? 'Finding you…' : 'Use my current location'}
        </button>

        {error ? <span className="page-sub">{error}</span> : null}

        <span className="sheet-section">Or search for a place</span>

        <label className="loc-search">
          <SearchIcon size={15} color="#6B665A" strokeWidth={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Area, street or landmark"
            aria-label="Search for a place"
            autoComplete="off"
            enterKeyHint="search"
          />
          {q ? (
            <button className="loc-clear" onClick={() => setQ('')} aria-label="Clear">
              ×
            </button>
          ) : null}
        </label>

        {q.trim().length < MIN_QUERY ? (
          <span className="page-sub">Start typing an area, street or landmark.</span>
        ) : (
          <div className="loc-hits">
            {hits.map((h) => (
              <button key={h.id} className="loc-hit" onClick={() => choose(h.lat, h.lng, h.name)}>
                <PinIcon size={13} color="#15477C" strokeWidth={2.2} />
                <span className="stack-2" style={{ minWidth: 0 }}>
                  <span className="loc-hit-name">{h.name}</span>
                  {h.context ? <span className="loc-hit-sub">{h.context}</span> : null}
                </span>
              </button>
            ))}
            {hits.length === 0 ? (
              <span className="page-sub">
                {searching ? 'Searching…' : `Nothing in Bengaluru matching “${q.trim()}”.`}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
