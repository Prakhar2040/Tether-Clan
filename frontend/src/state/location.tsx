import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// One source of truth for "where the user is", so distances on event cards
// and the map agree. The last fix is remembered so it survives navigation.

export const FALLBACK = { lat: 12.9719, lng: 77.6412, label: 'Indiranagar' }
export type LocStatus = 'default' | 'locating' | 'granted' | 'denied' | 'blocked' | 'unsupported'

const STORAGE_KEY = 'tc.location'

export interface Place {
  lat: number
  lng: number
  label: string
}

interface LocationValue {
  place: Place
  status: LocStatus
  isReal: boolean // true only when it came from the device
  request: () => Promise<Place | null>
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

  // Accepts a recent cached fix, and keeps listening for the first real one.
  const request = useCallback((): Promise<Place | null> => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      return Promise.resolve(null)
    }
    setStatus('locating')
    return new Promise((resolve) => {
      let settled = false
      let watchId: number | null = null
      let deadline: ReturnType<typeof setTimeout> | null = null

      const finish = (fix: Place | null) => {
        if (settled) return
        settled = true
        if (watchId !== null) navigator.geolocation.clearWatch(watchId)
        if (deadline) clearTimeout(deadline)
        resolve(fix)
      }

      const onFix = (pos: GeolocationPosition) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your location' }
        setPlaceState(p)
        setIsReal(true)
        setStatus('granted')
        persist(p, true)
        finish(p)
      }

      const onError = (err: GeolocationPositionError) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('blocked')
          finish(null)
        }
      }

      const opts: PositionOptions = { maximumAge: 300_000, timeout: 25_000, enableHighAccuracy: false }
      navigator.geolocation.getCurrentPosition(onFix, () => {}, opts)
      watchId = navigator.geolocation.watchPosition(onFix, onError, opts)
      deadline = setTimeout(() => {
        setStatus('denied')
        finish(null)
      }, 25_000)
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
