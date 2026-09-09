import { Link } from 'react-router-dom'
import { events, priceLabel } from '../data/mock'
import { useRsvp } from '../state/rsvp'
import { Brand } from '../components/shared'
import { ChevronIcon } from '../components/icons'
import type { RsvpState } from '../types'

const stateLabels: Partial<Record<RsvpState, string>> = {
  going: 'Going',
  waitlisted: 'Waitlist #3',
  interested: 'Interested',
  'checked-in': 'Checked in',
  attended: 'Attended',
}

export default function Plans() {
  const { stateFor } = useRsvp()
  const mine = Object.values(events)
    .map((e) => ({ e, state: stateFor(e.id) }))
    .filter(({ state }) => state !== 'none' && state !== 'cancelled')

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
      </div>
      <header className="page-head">
        <h1 className="page-title smaller">My plans</h1>
        <span className="page-sub">Everything you've raised a hand for</span>
      </header>
      <div className="feed">
        {mine.length === 0 ? (
          <div className="stub">
            <h2>Nothing yet</h2>
            <p>Join something tonight — plans you make land here.</p>
          </div>
        ) : (
          mine.map(({ e, state }) => {
            const target =
              state === 'going' && e.dayLabel === 'Tonight'
                ? `/event/${e.id}/live`
                : state === 'checked-in' || state === 'attended'
                  ? `/event/${e.id}/recap`
                  : `/event/${e.id}`
            return (
              <Link key={e.id} to={target} className="card compact-card">
                <span className="stack-2" style={{ flex: 1 }}>
                  <span className={`plan-state ${state}`}>{stateLabels[state]}</span>
                  <span className="event-title" style={{ fontSize: 16 }}>{e.title}</span>
                  <span className="event-meta">
                    {e.dayLabel} {e.timeLabel} · {priceLabel(e)}
                    {state === 'going' && e.dayLabel === 'Tonight' ? ' · tonight mode →' : ''}
                  </span>
                </span>
                <ChevronIcon size={16} color="#15477C" />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
