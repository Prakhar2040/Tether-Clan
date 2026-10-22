import { useState } from 'react'
import { SIMULATED_LOCATION, useLocation } from '../state/location'
import { PinIcon } from './icons'

// Where the user is. One control, used by both Events and the Map, so the
// two always agree on the answer.
export const AREAS = [
  { id: 'bellandur', name: 'Bellandur', lat: 12.926, lng: 77.6762 },
  { id: 'indiranagar', name: 'Indiranagar', lat: 12.9719, lng: 77.6412 },
  { id: 'koramangala', name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { id: 'hsr', name: 'HSR Layout', lat: 12.9116, lng: 77.6389 },
  { id: 'whitefield', name: 'Whitefield', lat: 12.9698, lng: 77.75 },
  { id: 'jayanagar', name: 'Jayanagar', lat: 12.9308, lng: 77.5838 },
  { id: 'mg-road', name: 'MG Road / Church St', lat: 12.9756, lng: 77.6046 },
]

export function LocationChip({ onOpen }: { onOpen: () => void }) {
  const { place, status } = useLocation()
  return (
    <button className="location-chip" onClick={onOpen} title="Change location">
      <PinIcon size={12} color="#E9712A" strokeWidth={2.4} />
      {status === 'locating' ? 'Finding you…' : place.label}
    </button>
  )
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

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <span className="sheet-handle" />
        <span className="section-label">Where are you?</span>

        {SIMULATED_LOCATION ? null : (
          <button
            className="btn btn-primary"
            style={{ minHeight: 48 }}
            onClick={async () => {
              setError(null)
              const fix = await request()
              if (fix) {
                onPicked?.(fix.lat, fix.lng)
                onClose()
              } else {
                setError('Could not get a location fix. Pick an area below instead.')
              }
            }}
          >
            <PinIcon size={15} color="#FDBE50" strokeWidth={2.4} />
            {status === 'locating' ? 'Finding you…' : 'Use my current location'}
          </button>
        )}

        {error ? <span className="page-sub">{error}</span> : null}

        <span className="sheet-section">{SIMULATED_LOCATION ? 'Pick an area' : 'Or pick an area'}</span>
        <div className="chip-row" style={{ padding: 0 }}>
          {AREAS.map((a) => (
            <button
              key={a.id}
              className={place.label === a.name ? 'chip active' : 'chip'}
              onClick={() => {
                setPlace({ lat: a.lat, lng: a.lng, label: a.name })
                onPicked?.(a.lat, a.lng)
                onClose()
              }}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
