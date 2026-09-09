import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { events, priceLabel, seatsLeft, venues } from '../data/mock'
import { matchesWhen, useFilters, whenTitle } from '../state/filters'
import { Brand } from '../components/shared'
import { ChevronIcon, PinIcon, SlidersIcon } from '../components/icons'
import type { TcEvent } from '../types'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const HOME = { lat: 12.9719, lng: 77.6412 } // Indiranagar, the mock "you"
const RADIUS_KM = 5

type SheetPos = 'peek' | 'half' | 'full'

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

// Time proximity carries visual weight: tonight is saturated, later is muted.
// A map otherwise renders "tonight" and "in three weeks" identically.
function weightFor(e: TcEvent): { bg: string; fg: string; opacity: number; ring: boolean } {
  if (e.dayLabel === 'Tonight') return { bg: '#E9712A', fg: '#FFFFFF', opacity: 1, ring: true }
  if (e.dayLabel === 'Tomorrow') return { bg: '#15477C', fg: '#FDBE50', opacity: 1, ring: false }
  return { bg: '#FFFFFF', fg: '#15477C', opacity: 0.92, ring: false }
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
  const [ready, setReady] = useState(false)
  const [sheet, setSheet] = useState<SheetPos>('half')
  const [selected, setSelected] = useState<string | null>(null)
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null)

  const { title } = whenTitle(when)

  // Time filter first — a map of everything is noise.
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
      center: [HOME.lng, HOME.lat],
      zoom: 12.2,
      attributionControl: false,
    })
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    mapRef.current = map

    map.on('load', () => {
      map.addSource('radius', { type: 'geojson', data: circlePolygon(HOME.lat, HOME.lng, RADIUS_KM) })
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
        paint: { 'line-color': '#15477C', 'line-opacity': 0.35, 'line-width': 1.5, 'line-dasharray': [2, 2] },
      })
      setReady(true)
    })

    // The list follows the map: pan updates which events are listed.
    const syncViewport = () => {
      const b = map.getBounds()
      if (!b) return
      setVisibleIds(
        Object.values(events)
          .filter((e) => {
            const v = venues[e.venueId]
            return b.contains([v.lng, v.lat])
          })
          .map((e) => e.id),
      )
    }
    map.on('moveend', syncViewport)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ---- markers, redrawn when the time filter changes ----
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // venue anchors first, so event pins sit on top
    for (const v of anchorVenues) {
      const el = document.createElement('button')
      el.className = 'pin pin-venue'
      el.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>`
      el.title = `${v.name} — no event ${title.toLowerCase()}`
      markersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat([v.lng, v.lat]).addTo(map))
    }

    for (const e of inWindow) {
      const v = venues[e.venueId]
      const w = weightFor(e)
      const left = seatsLeft(e)
      const el = document.createElement('button')
      el.className = `pin pin-event${w.ring ? ' pin-now' : ''}${selected === e.id ? ' pin-selected' : ''}`
      el.style.background = w.bg
      el.style.color = w.fg
      el.style.opacity = String(w.opacity)
      el.innerHTML =
        `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconFor(e.categoryLabel)}</svg>` +
        `<span class="pin-label">${e.timeLabel.replace(':00', '')}</span>` +
        (left === 0 ? '<span class="pin-dot pin-full"></span>' : left <= 3 ? '<span class="pin-dot pin-tight"></span>' : '')
      el.onclick = (ev) => {
        ev.stopPropagation()
        setSelected(e.id)
        setSheet('half')
        map.easeTo({ center: [v.lng, v.lat], duration: 400, offset: [0, -80] })
        document.getElementById(`card-${e.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      markersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat([v.lng, v.lat]).addTo(map))
    }
  }, [inWindow, anchorVenues, ready, selected, title])

  const listed = useMemo(() => {
    const base = visibleIds ? inWindow.filter((e) => visibleIds.includes(e.id)) : inWindow
    return base
  }, [inWindow, visibleIds])

  const recenter = () => {
    mapRef.current?.easeTo({ center: [HOME.lng, HOME.lat], zoom: 12.2, duration: 500 })
  }

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
        <button className="location-chip" onClick={() => navigate('/')}>
          <SlidersIcon size={13} color="#15477C" />
          {title}
          {activeCount > 0 ? ` · ${activeCount}` : ''}
        </button>
      </div>

      <div className="map-canvas" ref={containerRef} />

      <button className="map-recenter" onClick={recenter} aria-label="Recenter">
        <PinIcon size={18} color="#15477C" strokeWidth={2.2} />
      </button>

      <div className={`map-sheet sheet-${sheet}`}>
        <button
          className="sheet-grip"
          onClick={() => setSheet(sheet === 'peek' ? 'half' : sheet === 'half' ? 'full' : 'peek')}
          aria-label="Resize list"
        >
          <span className="sheet-handle" />
        </button>
        <div className="sheet-head">
          <span className="section-label">
            {listed.length} {listed.length === 1 ? 'plan' : 'plans'} in view · {title}
          </span>
          <span className="page-sub">Drag map to explore</span>
        </div>
        <div className="sheet-list">
          {listed.length === 0 ? (
            <div className="no-match">
              <span className="t">Nothing here {title === 'Tonight' ? 'tonight' : `on ${title}`}</span>
              <span className="s">Pan to another area, or change the day from Events</span>
            </div>
          ) : (
            listed.map((e) => {
              const v = venues[e.venueId]
              const left = seatsLeft(e)
              return (
                <button
                  id={`card-${e.id}`}
                  key={e.id}
                  className={`map-card${selected === e.id ? ' selected' : ''}`}
                  onClick={() => {
                    if (selected === e.id) {
                      navigate(`/event/${e.id}`)
                    } else {
                      setSelected(e.id)
                      mapRef.current?.easeTo({ center: [v.lng, v.lat], zoom: 14, duration: 450, offset: [0, -80] })
                    }
                  }}
                >
                  <span className="stack-2" style={{ flex: 1, gap: 3 }}>
                    <span className="event-title" style={{ fontSize: 15 }}>{e.title}</span>
                    <span className="event-meta">
                      {e.dayLabel} {e.timeLabel} · {v.name}
                    </span>
                    <span className="event-meta">
                      {v.travel.autoMin} min away · {priceLabel(e)}
                      {left === 0 ? ' · waitlist' : left <= 3 ? ` · ${left} seats left` : ''}
                    </span>
                  </span>
                  <ChevronIcon size={16} color="#15477C" />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
