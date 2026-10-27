import { useState } from 'react'
import type { LocStatus } from '../state/location'
import { useLocation } from '../state/location'
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

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <span className="sheet-handle" />
        <span className="section-label">Where are you?</span>

        {/* Always offered. The areas below are the quick way to say where you
            are; this is for when you want the real answer. Asking here is a tap,
            so it goes to the device even while positions are simulated. */}
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

        {/* Said out loud rather than implied: a laptop without GPS answers from
            wifi or the ISP and is routinely kilometres out, and that is the
            browser's doing, not something the app can correct. */}
        {place.accuracyM !== undefined ? (
          <span className="page-sub">
            Last fix was accurate to {accuracyLabel(place.accuracyM)}
            {place.accuracyM > 2000 ? ' — that is your browser guessing from the network, not GPS.' : '.'}
          </span>
        ) : null}

        <span className="sheet-section">Or pick an area</span>
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
