import { useRsvp } from '../state/rsvp'
import { priceLabel, venues } from '@shared/mock'
import { CheckIcon, ChevronIcon } from './icons'
import type { TcEvent } from '@shared/types'

// The row shapes shared by a community's Tickets tab and My Plans, so both
// pages speak the same language: a date stub, the plan, one action. Never a
// seat count, and never who else is coming.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function dateParts(e: TcEvent): { dow: string; day: string; mon: string } {
  if (e.startsAt) {
    const d = new Date(e.startsAt)
    return {
      dow: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
      day: String(d.getDate()),
      mon: MONTHS[d.getMonth()],
    }
  }
  const m = /^(\w{3})\s+(\d{1,2})\s+(\w{3})$/.exec(e.dateLabel ?? '')
  if (m) return { dow: m[1].toUpperCase(), day: m[2], mon: m[3].toUpperCase() }
  return { dow: e.dayLabel.slice(0, 3).toUpperCase(), day: '·', mon: '' }
}

function Stub({ event }: { event: TcEvent }) {
  const { dow, day, mon } = dateParts(event)
  return (
    <span className="stub">
      <span className="stub-dow">{dow}</span>
      <span className="stub-day">{day}</span>
      <span className="stub-mon">{mon}</span>
    </span>
  )
}

export function TicketRow({
  event,
  kicker,
  onOpen,
  onPass,
}: {
  event: TcEvent
  kicker?: string
  onOpen?: (id: string) => void
  onPass: (id: string) => void
}) {
  const { stateFor, join } = useRsvp()
  const state = stateFor(event.id)
  const soldOut = event.going >= event.capacity
  const held = state === 'going' || state === 'checked-in'

  return (
    <div className={held ? 'ticket held' : 'ticket'}>
      <Stub event={event} />

      <button
        className="ticket-main"
        onClick={() => (held ? onPass(event.id) : onOpen?.(event.id))}
      >
        {kicker ? <span className="ticket-kicker">{kicker}</span> : null}
        <span className="ticket-title">{event.title}</span>
        <span className="ticket-where">
          {event.timeLabel} · {venues[event.venueId].name}
        </span>
        {held ? (
          <span className="ticket-yours">
            <CheckIcon size={12} color="#2E7D4F" strokeWidth={3} /> You're in — view ticket
            <ChevronIcon size={12} color="#2E7D4F" />
          </span>
        ) : null}
      </button>

      {held ? null : soldOut ? (
        <span className="sold-tag">Sold out</span>
      ) : (
        <button className="btn btn-primary ticket-buy" onClick={() => join(event.id)}>
          {event.price === 0 ? 'Reserve' : `Buy · ${priceLabel(event)}`}
        </button>
      )}
    </div>
  )
}

// Past reads at a glance: the mark says whether you were there, everything
// else fades back so it never competes with what is still to come.
export function PastRow({
  event,
  kicker,
  onOpen,
}: {
  event: TcEvent
  kicker?: string
  onOpen: (id: string) => void
}) {
  const { stateFor } = useRsvp()
  const state = stateFor(event.id)
  const { dow, day, mon } = dateParts(event)

  const verdict = event.cancelledByHost
    ? { cls: 'missed', mark: '✕', text: 'Called off' }
    : state === 'attended'
      ? { cls: 'went', mark: '✓', text: 'You went' }
      : state === 'no-showed'
        ? { cls: 'missed', mark: '✕', text: 'Missed it' }
        : state === 'cancelled'
          ? { cls: 'missed', mark: '✕', text: 'You cancelled' }
          : { cls: 'skipped', mark: '–', text: "Didn't go" }

  return (
    <button className={`past-row ${verdict.cls}`} onClick={() => onOpen(event.id)}>
      <span className="past-mark">{verdict.mark}</span>
      <span className="past-date">
        {dow} {day} {mon}
      </span>
      <span className="past-title">
        {event.title}
        {kicker ? <span className="past-kicker">{kicker}</span> : null}
      </span>
      <span className="past-verdict">{verdict.text}</span>
    </button>
  )
}
