import { useNavigate, useParams } from 'react-router-dom'
import { events, series, venues } from '@shared/mock'
import { communities } from '../data/community'
import { useRsvp } from '../state/rsvp'
import { BackIcon } from '../components/icons'
import { QrCode } from '../components/Qr'
import { rupees } from '../lib/money'
import type { CSSProperties } from 'react'
import type { TcEvent } from '@shared/types'

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

export function TicketPass({ event: e, communityId: cid }: { event: TcEvent; communityId?: string }) {
  const { stateFor, orderFor } = useRsvp()
  const state = stateFor(e.id)
  const order = orderFor(e.id)
  const tickets = order?.state === 'paid' ? order.tickets : []
  const venue = venues[e.venueId]
  const communityId = cid ?? (e.seriesId ? series[e.seriesId]?.communityId : undefined)
  const community = communityId ? communities[communityId] : undefined

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
          <div className="pass-tickets">
            {tickets.map((t, i) => (
              <div className="pass-ticket" key={t.ref}>
                <QrCode value={t.ref} />
                <span className="pass-ref">{t.ref}</span>
                <span className="pass-hint">
                  {tickets.length > 1 ? `Ticket ${i + 1} of ${tickets.length} · ` : ''}
                  {t.scanned ? 'Already scanned' : 'Show this at the door'}
                </span>
              </div>
            ))}
          </div>
          {tickets.length > 1 ? <span className="pass-hint">Swipe for the next ticket</span> : null}
          <span className="pass-paid">
            {order ? `${rupees(order.pricePaise)} each` : ''} · {state === 'checked-in' ? 'Checked in' : 'Admits one each'}
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
