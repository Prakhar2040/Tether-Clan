import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { events, venues } from '@shared/mock'
import { matchesWhen, useFilters, whenTitle } from '../state/filters'
import { useLocation } from '../state/location'
import { LocationSheet } from '../components/LocationPicker'
import { Brand } from '../components/shared'
import { PinIcon, SlidersIcon } from '../components/icons'
import type { TcEvent } from '@shared/types'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
// Fallback when location is denied or unavailable: a sensible city default,
// never a blank screen behind a permission wall.
const RADIUS_KM = 5

// Activity icon per category, drawn as SVG so pins stay crisp at any zoom.
const PIN_ICONS: Record<string, string> = {
  'Board games':
    '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.3" fill="currentColor" stroke="none"/>',
  'Language exchange': '<path d="M4 17c2-1 3-4 3-6a5 5 0 0 1 10 0c0 2 1 5 3 6"/><path d="M8 17h8v1.5a4 4 0 0 1-8 0V17z"/>',
  Art: '<path d="M4 20l3.5-1 9-9-2.5-2.5-9 9L4 20z"/><path d="M14 5.5L16.5 3 21 7.5 18.5 10"/>',
  Make: '<path d="M7 20h10"/><path d="M9 20c0-4 1.5-6 3-6s3 2 3 6"/><ellipse cx="12" cy="8" rx="5" ry="2.6"/>',
  Pickleball: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/>',
  Badminton: '<path d="M6 18l6-6"/><path d="M12 12l3-6 5 2-4 5-4-1z"/><circle cx="6" cy="18" r="2"/>',
  'Run club': '<circle cx="14" cy="5" r="2"/><path d="M9 21l2.5-5 3-2 1-4 3 3 3 .5"/><path d="M5 12l3-3 3.5 1"/>',
  Cycling: '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-7h5l3 7M10 10l-1-3h3"/>',
  Books: '<path d="M4 5.5A2 2 0 0 1 6 4h5v16H6a2 2 0 0 0-2 1.5V5.5z"/><path d="M20 5.5A2 2 0 0 0 18 4h-5v16h5a2 2 0 0 1 2 1.5V5.5z"/>',
}

function iconFor(label: string): string {
  return PIN_ICONS[label] ?? '<circle cx="12" cy="12" r="7"/>'
}

// Pins lead with the event name. Long titles are trimmed at a natural break
// so the pin stays readable rather than swallowing the map.
function shortName(title: string): string {
  const head = title.split(/ [·—-] /)[0]
  return head.length > 22 ? `${head.slice(0, 21).trimEnd()}…` : head
}

// Time proximity carries visual weight: tonight is saturated, later is muted.
// A map otherwise renders "tonight" and "in three weeks" identically.
function weightFor(e: TcEvent): { bg: string; fg: string; ring: boolean } {
  if (e.dayLabel === 'Tonight') return { bg: '#E9712A', fg: '#FFFFFF', ring: true }
  if (e.dayLabel === 'Tomorrow') return { bg: '#15477C', fg: '#FDBE50', ring: false }
  return { bg: '#FFFFFF', fg: '#15477C', ring: false }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

function circlePolygon(lat: number, lng: number, km: number) {
  const points: [number, number][] = []
  const dLat = km / 110.574
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * 2 * Math.PI
    points.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)])
  }
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [points] },
  }
}

export default function MapScreen() {
  const navigate = useNavigate()
  const { when, activeCount } = useFilters()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const meMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [ready, setReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const { place: me, status: locStatus, request } = useLocation()
  const [pickerOpen, setPickerOpen] = useState(false)

  const { title } = whenTitle(when)

  // Time filter first — a map of everything is noise. Everything matching the
  // filter is pinned, regardless of what is currently in view.
  const inWindow = useMemo(
    () => Object.values(events).filter((e) => matchesWhen(e.dayLabel, when)),
    [when],
  )

  // Venue layer: anchors that host things regularly, shown even with no
  // event in the current window.
  const anchorVenues = useMemo(() => {
    const withEvents = new Set(inWindow.map((e) => e.venueId))
    return Object.values(venues).filter((v) => !withEvents.has(v.id))
  }, [inWindow])

  // ---- map init (once) ----
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [me.lng, me.lat],
      zoom: 12.2,
      attributionControl: false,
    })
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    mapRef.current = map

    // "You are here" — attached immediately rather than waiting on style load,
    // so it is never missing.
    const dot = document.createElement('div')
    dot.className = 'me-dot'
    dot.style.zIndex = '10' // must sit above event pins, which can overlap it
    dot.setAttribute('aria-label', 'Your location')
    meMarkerRef.current = new mapboxgl.Marker({ element: dot })
      .setLngLat([me.lng, me.lat])
      .addTo(map)

    map.on('error', (ev) => {
      const message = (ev as unknown as { error?: Error }).error?.message ?? 'Unknown map error'
      setMapError(message)
    })

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)

    map.on('load', () => {
      map.resize()
      map.addSource('radius', {
        type: 'geojson',
        data: circlePolygon(me.lat, me.lng, RADIUS_KM),
      })
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius',
        paint: { 'fill-color': '#15477C', 'fill-opacity': 0.05 },
      })
      map.addLayer({
        id: 'radius-line',
        type: 'line',
        source: 'radius',
        paint: {
          'line-color': '#15477C',
          'line-opacity': 0.35,
          'line-width': 1.5,
          'line-dasharray': [2, 2],
        },
      })
      setReady(true)
    })

    const watchdog = setTimeout(() => {
      if (!map.isStyleLoaded()) setMapError((prev) => prev ?? 'Map tiles did not load')
    }, 6000)

    return () => {
      clearTimeout(watchdog)
      ro.disconnect()
      map.remove()
      mapRef.current = null
      meMarkerRef.current = null
    }
  }, [])

  // ---- real location, asked for without gating the map ----
  const requestLocation = () => request()

  useEffect(() => {
    if (ready && locStatus === 'default') requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Marker, radius ring and camera follow the real fix when it lands.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    meMarkerRef.current?.setLngLat([me.lng, me.lat])
    const src = map.getSource('radius') as mapboxgl.GeoJSONSource | undefined
    src?.setData(circlePolygon(me.lat, me.lng, RADIUS_KM))
    if (locStatus === 'granted') map.easeTo({ center: [me.lng, me.lat], zoom: 12.6, duration: 700 })
  }, [me, ready, locStatus])

  // ---- pins, redrawn when the time filter changes ----
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // venue anchors first, so event pins sit on top
    for (const v of anchorVenues) {
      const el = document.createElement('button')
      el.className = 'pin pin-venue'
      el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg><span class="pin-label">${escapeHtml(v.name.replace(' Board Game Café', ''))}</span>`
      el.title = `${v.name} — nothing on ${title.toLowerCase()}`
      markersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat([v.lng, v.lat]).addTo(map))
    }

    // Event pins lead with the name; colour still carries time proximity.
    for (const e of inWindow) {
      const v = venues[e.venueId]
      const w = weightFor(e)
      const el = document.createElement('button')
      el.className = `pin pin-event${w.ring ? ' pin-now' : ''}`
      el.style.background = w.bg
      el.style.color = w.fg
      el.title = `${e.title} · ${e.dayLabel} ${e.timeLabel}`
      el.innerHTML =
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconFor(e.categoryLabel)}</svg>` +
        `<span class="pin-label">${escapeHtml(shortName(e.title))}</span>`
      el.onclick = (ev) => {
        ev.stopPropagation()
        navigate(`/event/${e.id}`)
      }
      markersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat([v.lng, v.lat]).addTo(map))
    }
  }, [inWindow, anchorVenues, ready, title, navigate])

  // The location button always tries the real thing first; if permission is
  // not given, offer the area picker rather than doing nothing.
  // The locate control opens the sheet; choosing "use my current location"
  // (or an area) is what moves the map.
  const recenter = () => setPickerOpen(true)

  if (!TOKEN) {
    return (
      <div className="screen">
        <div className="top-row">
          <Brand />
        </div>
        <div className="stub">
          <h2>Map needs a Mapbox token</h2>
          <p>Set VITE_MAPBOX_TOKEN in your environment and reload.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen no-bar map-screen">
      <div className="map-header">
        <Brand />
        <button className="location-chip" onClick={() => navigate('/events')}>
          <SlidersIcon size={13} color="#15477C" />
          {title}
          {activeCount > 0 ? ` · ${activeCount}` : ''}
        </button>
      </div>

      <div className="map-canvas" ref={containerRef} style={{ height: '100dvh' }} />

      {mapError ? (
        <div className="map-error">
          <span className="t">Map didn’t load</span>
          <span className="s">{mapError}</span>
        </div>
      ) : null}

      {pickerOpen ? (
        <LocationSheet
          onClose={() => setPickerOpen(false)}
          onPicked={(lat, lng) => mapRef.current?.easeTo({ center: [lng, lat], zoom: 12.6, duration: 600 })}
        />
      ) : null}

      <button className="map-recenter" onClick={recenter} aria-label="Recenter on my location">
        <PinIcon size={18} color="#15477C" strokeWidth={2.2} />
      </button>
    </div>
  )
}
