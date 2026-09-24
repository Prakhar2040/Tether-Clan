import { useNavigate, useParams } from 'react-router-dom'
import { events, priceLabel, series, venues } from '../data/mock'
import { communities } from '../data/community'
import { useRsvp } from '../state/rsvp'
import { BackIcon } from '../components/icons'
import type { CSSProperties } from 'react'
import type { TcEvent } from '../types'

// What a ticket is and is not. It proves you hold a seat and it tells you
// what tonight is about. It does not list who else is coming — that is
// theirs to share, not ours — it carries no roles, and it cannot be
// cancelled from here.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function dateLine(e: TcEvent): string {
  if (e.startsAt) {
    const d = new Date(e.startsAt)
    const dow = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()
    return `${dow} ${d.getDate()} ${MONTHS[d.getMonth()]}`
  }
  return (e.dateLabel ?? e.dayLabel).toUpperCase()
}

// A stable reference per ticket, so the same plan always shows the same code.
function reference(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let out = ''
  let n = h
  for (let i = 0; i < 8; i += 1) {
    out += chars[n % chars.length]
    n = Math.floor(n / chars.length) + (i + 1) * 7919
  }
  return `TC-${out.slice(0, 4)}-${out.slice(4)}`
}

const SIZE = 25

// Drawn, not encoded. It has the anatomy of a QR — three finder eyes, timing
// runs, a quiet zone — and a module pattern derived from the reference, so
// each ticket looks like itself. It will not scan; wiring a real encoder is
// a swap of this one function.
function modules(seed: string): boolean[][] {
  let h = 2166136261
  for (const ch of seed) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  const rand = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    h >>>= 0
    return h / 4294967296
  }

  const g: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false))
  const reserved = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false))

  const eye = (r: number, c: number) => {
    for (let i = -1; i <= 7; i += 1) {
      for (let j = -1; j <= 7; j += 1) {
        const y = r + i
        const x = c + j
        if (y < 0 || x < 0 || y >= SIZE || x >= SIZE) continue
        reserved[y][x] = true
        const ring = i === 0 || i === 6 || j === 0 || j === 6
        const core = i >= 2 && i <= 4 && j >= 2 && j <= 4
        g[y][x] = (ring || core) && i >= 0 && i <= 6 && j >= 0 && j <= 6
      }
    }
  }
  eye(0, 0)
  eye(0, SIZE - 7)
  eye(SIZE - 7, 0)

  for (let i = 8; i < SIZE - 8; i += 1) {
    g[6][i] = i % 2 === 0
    g[i][6] = i % 2 === 0
    reserved[6][i] = true
    reserved[i][6] = true
  }

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (!reserved[y][x]) g[y][x] = rand() > 0.52
    }
  }
  return g
}

function QrBlock({ value }: { value: string }) {
  const g = modules(value)
  const q = 2 // quiet zone
  const dim = SIZE + q * 2
  return (
    <svg className="qr" viewBox={`0 0 ${dim} ${dim}`} role="img" aria-label={`Ticket ${value}`}>
      <rect width={dim} height={dim} fill="#fff" />
      {g.flatMap((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x + q} y={y + q} width={1.02} height={1.02} fill="#070808" /> : null,
        ),
      )}
    </svg>
  )
}

export function TicketPass({ event: e, communityId: cid }: { event: TcEvent; communityId?: string }) {
  const { stateFor } = useRsvp()
  const state = stateFor(e.id)
  const venue = venues[e.venueId]
  const communityId = cid ?? (e.seriesId ? series[e.seriesId]?.communityId : undefined)
  const community = communityId ? communities[communityId] : undefined
  const ref = reference(e.id)

  return (
    <div
      className="pass-wrap"
      style={{ '--comm': community?.color ?? '#15477C' } as CSSProperties}
    >
      <div className="pass">
        <div className="pass-top">
          {community ? <span className="pass-community">{community.name}</span> : null}
          <h1 className="pass-title">{e.title}</h1>
          <span className="pass-when">
            {dateLine(e)} · {e.timeLabel}
          </span>
          <span className="pass-where">
            {venue.name}
            <br />
            {venue.area}
          </span>
        </div>

        {e.theme ? (
          <div className="pass-theme">
            <span className="pass-theme-label">Theme</span>
            <span className="pass-theme-text">{e.theme}</span>
          </div>
        ) : null}

        <div className="perf">
          <span className="notch left" />
          <span className="notch right" />
        </div>

        <div className="pass-bottom">
          <QrBlock value={ref} />
          <span className="pass-ref">{ref}</span>
          <span className="pass-hint">Show this at the door</span>
          <span className="pass-paid">
            {priceLabel(e)} · {state === 'checked-in' ? 'Checked in' : 'Admits one'}
          </span>
        </div>
      </div>

      <p className="pass-privacy">
        Your ticket doesn't show who else is coming. Theirs doesn't show you either.
      </p>
    </div>
  )
}

export default function Ticket() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { stateFor } = useRsvp()

  const e = id ? events[id] : undefined
  if (!e) return null

  const state = stateFor(e.id)
  const held = state === 'going' || state === 'checked-in' || state === 'attended'

  return (
    <div className="screen ticket-screen">
      <div className="top-row">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <BackIcon size={20} color="#15477C" />
        </button>
      </div>
      {held ? (
        <TicketPass event={e} />
      ) : (
        <div className="stub-empty">
          <span className="t">You don't hold a ticket for this</span>
          <span className="s">Buy one from the community's Tickets tab</span>
        </div>
      )}
    </div>
  )
}
