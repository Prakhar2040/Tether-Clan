import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// One source of truth for "where the user is", so distances on event cards
// and the map agree. The last fix is remembered so it survives navigation.

/* THE SWITCH. While true, nothing asks the browser for permission *on its own*:
 * the default position is whatever area the LocationPicker last chose
 * (Indiranagar to begin with), so no screen can put a permission prompt in front
 * of someone who only wanted to look at a map.
 *
 * It no longer disables real location altogether. Tapping "Use my current
 * location" asks the device whatever this says, because a tap is the person
 * asking, not a screen asking for them. Flip it to false and screens may ask on
 * load too. The server needs no change either way - it only ever receives a lat
 * and a lng. */
export const SIMULATED_LOCATION = true

export const FALLBACK = { lat: 12.9719, lng: 77.6412, label: 'Indiranagar' }
export type LocStatus = 'default' | 'locating' | 'granted' | 'denied' | 'blocked' | 'unsupported'

const STORAGE_KEY = 'tc.location'

/* Close enough to stop looking, and how long to keep looking for better.
   A GPS fix lands inside 150m quickly; wifi trilateration reports hundreds of
   metres and IP-derived answers tens of thousands, so the number also doubles
   as "did this come from a real sensor". */
const GOOD_ENOUGH_M = 150
const PATIENCE_MS = 8_000
const GIVE_UP_MS = 25_000

export interface Place {
  lat: number
  lng: number
  label: string
  /* How far out the device thinks it might be, in metres, when the fix came
     from the device. Kept so the app can say so: a laptop with no GPS often
     answers from wifi or the ISP's address and is wrong by kilometres, and a
     position you cannot see the error bars on is one you cannot judge. */
  accuracyM?: number
}

interface LocationValue {
  place: Place
  status: LocStatus
  isReal: boolean // true only when it came from the device
  /* Ask the device where it is. 'user' is somebody tapping the button and
     always asks; 'auto' is a screen asking on its own behalf, which is
     suppressed while simulating. Defaults to 'auto' so a new call site cannot
     start prompting people by accident. */
  request: (trigger?: 'auto' | 'user') => Promise<Place | null>
  setPlace: (p: Place) => void
  distanceKm: (lat: number, lng: number) => number
}

const LocationContext = createContext<LocationValue | null>(null)

function load(): { place: Place; real: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as { place: Place; real: boolean }
      if (typeof p?.place?.lat === 'number') return p
    }
  } catch {
    // storage unavailable — fall through to the default
  }
  return { place: FALLBACK, real: false }
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}



export function LocationProvider({ children }: { children: ReactNode }) {
  /* A remembered device fix is honoured, including while simulating: it can only
     be there because somebody asked for it, and throwing it away would mean
     re-asking on every visit. */
  const initial = load()
  const [place, setPlaceState] = useState<Place>(initial.place)
  const [isReal, setIsReal] = useState(initial.real)
  const [status, setStatus] = useState<LocStatus>(initial.real ? 'granted' : 'default')

  const persist = useCallback((p: Place, real: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ place: p, real }))
    } catch {
      // not fatal
    }
  }, [])

  const setPlace = useCallback(
    (p: Place) => {
      setPlaceState(p)
      setIsReal(false)
      setStatus('default')
      persist(p, false)
    },
    [persist],
  )

  /* Takes the best fix going, not the first one offered.
   *
   * This used to ask for enableHighAccuracy:false with maximumAge of five
   * minutes and resolve on the first callback, which is the fastest, coarsest
   * and possibly stale answer the browser has — on a laptop, typically the
   * ISP's address, kilometres out. Now it asks for the good sources, refuses a
   * cached answer, and keeps the watch open: the first fix starts a short
   * patience window, better fixes replace it, and anything inside
   * GOOD_ENOUGH_M settles immediately. */
  const request = useCallback((trigger: 'auto' | 'user' = 'auto'): Promise<Place | null> => {
    // A screen asking on its own stays silent while simulating; a tap does not.
    if (SIMULATED_LOCATION && trigger === 'auto') return Promise.resolve(null)
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      return Promise.resolve(null)
    }
    setStatus('locating')
    return new Promise((resolve) => {
      let settled = false
      let watchId: number | null = null
      let deadline: ReturnType<typeof setTimeout> | null = null
      let patience: ReturnType<typeof setTimeout> | null = null
      let best: GeolocationPosition | null = null

      const finish = (fix: Place | null) => {
        if (settled) return
        settled = true
        if (watchId !== null) navigator.geolocation.clearWatch(watchId)
        if (deadline) clearTimeout(deadline)
        if (patience) clearTimeout(patience)
        resolve(fix)
      }

      const settleWithBest = () => {
        if (!best) return
        const p: Place = {
          lat: best.coords.latitude,
          lng: best.coords.longitude,
          label: 'Your location',
          accuracyM: Math.round(best.coords.accuracy),
        }
        setPlaceState(p)
        setIsReal(true)
        setStatus('granted')
        persist(p, true)
        finish(p)
      }

      const onFix = (pos: GeolocationPosition) => {
        // Keep the tightest one seen; a later fix is not automatically better.
        if (best && pos.coords.accuracy >= best.coords.accuracy) return
        best = pos
        if (pos.coords.accuracy <= GOOD_ENOUGH_M) return settleWithBest()
        // Worth waiting a moment to see if the device does better than this.
        if (!patience) patience = setTimeout(settleWithBest, PATIENCE_MS)
      }

      const onError = (err: GeolocationPositionError) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('blocked')
          finish(null)
        }
      }

      const opts: PositionOptions = {
        // No cached answers: a five-minute-old fix from another tab is exactly
        // how you end up somewhere you were not.
        maximumAge: 0,
        timeout: GIVE_UP_MS,
        enableHighAccuracy: true,
      }
      navigator.geolocation.getCurrentPosition(onFix, () => {}, opts)
      watchId = navigator.geolocation.watchPosition(onFix, onError, opts)
      deadline = setTimeout(() => {
        // A rough answer beats none, so give back the best there was.
        if (best) return settleWithBest()
        setStatus('denied')
        finish(null)
      }, GIVE_UP_MS)
    })
  }, [persist])

  const value = useMemo<LocationValue>(
    () => ({
      place,
      status,
      isReal,
      request,
      setPlace,
      distanceKm: (lat, lng) => haversineKm(place.lat, place.lng, lat, lng),
    }),
    [place, status, isReal, request, setPlace],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation(): LocationValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used inside LocationProvider')
  return ctx
}
