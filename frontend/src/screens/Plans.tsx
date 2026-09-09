import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { events, people, priceLabel, seatsLeft, series, venues } from '../data/mock'
import { useRsvp } from '../state/rsvp'
import { Brand, Avatar } from '../components/shared'
import { CalendarIcon, CheckIcon, PinIcon, StarIcon } from '../components/icons'
import type { RsvpState, TcEvent } from '../types'

type Tab = 'upcoming' | 'past'

// Soonest first. Mock "now" is Wed 9 Sep evening.
const ORDER: Record<string, number> = { Tonight: 0, Tomorrow: 1, Sat: 2, Sun: 3, 'Next Wed': 4 }
const SOON = new Set(['Tonight', 'Tomorrow']) // hero only for the next 48h

const STATE_LABEL: Partial<Record<RsvpState, string>> = {
  going: 'Confirmed',
  'checked-in': 'Checked in',
  attended: 'You went',
  'no-showed': 'Missed',
  cancelled: 'Cancelled',
}

function StatePill({ state, event }: { state: RsvpState; event: TcEvent }) {
  if (event.cancelledByHost) return <span className="plan-pill cancelled">Cancelled by host</span>
  const cls =
    state === 'going' || state === 'checked-in' || state === 'attended'
      ? 'confirmed'
      : state === 'no-showed'
          ? 'missed'
          : 'cancelled'
  return <span className={`plan-pill ${cls}`}>{STATE_LABEL[state] ?? state}</span>
}

// Quorum is actionable: it tells you whether to nudge someone.
function Quorum({ e }: { e: TcEvent }) {
  if (!e.minViable) return null
  const need = Math.max(0, e.minViable - e.going)
  const met = need === 0
  return (
    <div className="quorum">
      <div className="quorum-row">
        <span className={`quorum-text${met ? ' met' : ''}`}>
          {met
            ? `Going ahead — ${e.going} of ${e.minViable} needed`
            : `${e.going} of ${e.minViable} confirmed · needs ${need} more by Friday`}
        </span>
        {!met ? <span className="quorum-nudge">Nudge a friend</span> : null}
      </div>
      <div className="quorum-bar">
        {Array.from({ length: e.minViable }, (_, i) => (
          <span key={i} className={i < e.going ? 'seg on' : 'seg'} />
        ))}
      </div>
    </div>
  )
}

export default function Plans() {
  const { stateFor, cancel } = useRsvp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])
  const [rated, setRated] = useState<Record<string, number>>({})

  const mine = Object.values(events)
    .map((e) => ({ e, state: stateFor(e.id) }))
    .filter(({ state }) => state !== 'none' && state !== 'interested')

  const upcoming = mine
    .filter(({ e, state }) => e.dayLabel !== 'Past' && state !== 'cancelled')
    .sort((a, b) => (ORDER[a.e.dayLabel] ?? 99) - (ORDER[b.e.dayLabel] ?? 99))

  const past = mine
    .filter(({ e }) => e.dayLabel === 'Past')
    .sort((a, b) => (b.e.dateLabel ?? '').localeCompare(a.e.dateLabel ?? ''))

  // Series collapse: one card per series, not twelve identical rows.
  const seen = new Set<string>()
  const upcomingCards = upcoming.filter(({ e }) => {
    if (!e.seriesId) return true
    if (seen.has(e.seriesId)) return false
    seen.add(e.seriesId)
    return true
  })
  const seriesCount = (seriesId?: string) =>
    seriesId ? upcoming.filter(({ e }) => e.seriesId === seriesId).length : 0

  const hero = upcomingCards.length > 0 && SOON.has(upcomingCards[0].e.dayLabel) ? upcomingCards[0] : null
  const rest = hero ? upcomingCards.slice(1) : upcomingCards

  const attended = past.filter(({ state }) => state === 'attended')
  const boardGameNights = attended.filter(({ e }) => e.category === 'board-games').length
  const noShows = past.filter(({ state }) => state === 'no-showed').length

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
      </div>
      <header className="page-head">
        <h1 className="page-title smaller">My plans</h1>
      </header>

      <div className="seg-tabs">
        <button className={tab === 'upcoming' ? 'seg-tab on' : 'seg-tab'} onClick={() => setTab('upcoming')}>
          Upcoming
        </button>
        <button className={tab === 'past' ? 'seg-tab on' : 'seg-tab'} onClick={() => setTab('past')}>
          Past
        </button>
      </div>

      {tab === 'upcoming' ? (
        <div className="feed">
          {upcomingCards.length === 0 ? (
            <div className="no-match">
              <span className="t">Nothing planned yet</span>
              <span className="s">There are four things on near you tonight</span>
              <button className="btn btn-cta" style={{ flex: 'none', padding: '0 20px' }} onClick={() => navigate('/')}>
                See tonight
              </button>
            </div>
          ) : null}

          {/* The next plan, when it is imminent, gets everything you need. */}
          {hero ? (
            <article className="hero-plan">
              <div className="card-row">
                <span className="hero-when">
                  {hero.e.startsInLabel ?? `${hero.e.dayLabel} · ${hero.e.timeLabel}`}
                </span>
                <StatePill state={hero.state} event={hero.e} />
              </div>
              <Link to={`/event/${hero.e.id}`} className="hero-title">
                {hero.e.title}
              </Link>
              <span className="hero-meta">
                {venues[hero.e.venueId].name} · {venues[hero.e.venueId].area}
              </span>
              <div className="hero-people">
                <span className="avatar-stack">
                  {hero.e.attendees.slice(0, 3).map((a) => (
                    <Avatar key={a.personId} person={people[a.personId]} size={26} />
                  ))}
                </span>
                <span className="hero-meta">
                  {hero.e.going} going{hero.e.firstTimers ? ` · ${hero.e.firstTimers} first-timers` : ''}
                </span>
              </div>
              <div className="hero-actions">
                <button className="hero-btn" onClick={() => navigate('/map')}>
                  <PinIcon size={15} color="#15477C" strokeWidth={2.2} />
                  Directions
                </button>
                <button className="hero-btn" onClick={() => navigate(`/event/${hero.e.id}/live`)}>
                  <CheckIcon size={15} color="#15477C" strokeWidth={2.4} />
                  Check in
                </button>
                <button className="hero-btn" onClick={() => navigate(`/event/${hero.e.id}/live`)}>
                  Running late
                </button>
              </div>
            </article>
          ) : null}

          {rest.map(({ e, state }) => {
            const count = seriesCount(e.seriesId)
            const isSeries = count > 1
            const isSkipped = skipped.includes(e.id)
            return (
              <article className="card plan-card" key={e.id}>
                <div className="card-row">
                  <Link to={`/event/${e.id}`} className="stack-2 event-title link" style={{ flex: 1 }}>
                    <span className="event-title" style={{ fontSize: 16 }}>{e.title}</span>
                    <span className="event-meta">
                      {e.dateLabel ?? e.dayLabel} {e.timeLabel} · {venues[e.venueId].name} · {priceLabel(e)}
                    </span>
                  </Link>
                  <StatePill state={state} event={e} />
                </div>

                {isSeries ? (
                  <div className="series-note">
                    <CalendarIcon size={14} color="#8A8577" />
                    <span>
                      {series[e.seriesId!].title} · {series[e.seriesId!].cadenceLabel} · {count} scheduled
                    </span>
                    <button
                      className="series-skip"
                      onClick={() => setSkipped((s) => (isSkipped ? s.filter((x) => x !== e.id) : [...s, e.id]))}
                    >
                      {isSkipped ? 'Skipping ✓' : 'Skip this week'}
                    </button>
                  </div>
                ) : null}

                <Quorum e={e} />

                <div className="plan-foot">
                  <span className="event-meta">
                    {seatsLeft(e) === 0 ? 'Full' : `${seatsLeft(e)} seats left`}
                  </span>
                  <button className="plan-cancel" onClick={() => setConfirmCancel(e.id)}>
                    Cancel
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="feed">
          {past.length === 0 ? (
            <div className="no-match">
              <span className="t">Your first plan is still ahead of you</span>
              <span className="s">Once you go to something, it lands here</span>
            </div>
          ) : (
            <>
              <div className="record-strip">
                <span className="record-main">
                  You’ve been to {attended.length} plan{attended.length === 1 ? '' : 's'}
                  {boardGameNights > 0 ? ` · ${boardGameNights} board game nights` : ''}
                </span>
                {noShows > 0 ? (
                  <span className="record-sub">
                    {noShows} missed without cancelling — only you can see this
                  </span>
                ) : null}
              </div>

              {past.map(({ e, state }, idx) => {
                const muted = state === 'no-showed' || state === 'cancelled' || e.cancelledByHost
                const nextInstance = Object.values(events).find(
                  (x) => x.seriesId && x.seriesId === e.seriesId && x.dayLabel !== 'Past',
                )
                const canRate = state === 'attended' && idx === 0
                const stars = rated[e.id] ?? 0
                return (
                  <article className={`card plan-card${muted ? ' muted' : ''}`} key={e.id}>
                    <div className="card-row">
                      <span className="stack-2" style={{ flex: 1 }}>
                        <span className="event-title" style={{ fontSize: 16 }}>{e.title}</span>
                        <span className="event-meta">
                          {e.dateLabel} · {venues[e.venueId].name}
                        </span>
                      </span>
                      <StatePill state={state} event={e} />
                    </div>

                    {e.connectedWith?.length ? (
                      <div className="connected-row">
                        <span className="avatar-stack">
                          {e.connectedWith.map((pid) => (
                            <Avatar key={pid} person={people[pid]} size={24} />
                          ))}
                        </span>
                        <span className="event-meta">
                          Connected with {e.connectedWith.map((pid) => people[pid].name).join(' and ')}
                        </span>
                      </div>
                    ) : null}

                    {canRate ? (
                      <div className="rate-row">
                        <span className="event-meta">How was it?</span>
                        <div className="stars">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} onClick={() => setRated((r) => ({ ...r, [e.id]: n }))} aria-label={`${n} stars`}>
                              <StarIcon filled={n <= stars} size={20} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {nextInstance && !e.cancelledByHost ? (
                      <button className="btn btn-cta" style={{ minHeight: 46 }} onClick={() => navigate(`/event/${nextInstance.id}`)}>
                        Book again · {nextInstance.dateLabel ?? nextInstance.dayLabel}
                      </button>
                    ) : null}
                  </article>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Cancelling shows its consequence before it happens, not after. */}
      {confirmCancel ? (
        <div className="sheet-backdrop" onClick={() => setConfirmCancel(null)}>
          <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
            <span className="sheet-handle" />
            <span className="section-label">Cancel {events[confirmCancel].title}?</span>
            <span className="page-sub">
              It starts {events[confirmCancel].dayLabel.toLowerCase()}. Cancelling within 24 hours
              counts against your reliability, and frees your seat for someone else.
            </span>
            <div className="btn-row">
              <button className="btn btn-ghost" style={{ minHeight: 48 }} onClick={() => setConfirmCancel(null)}>
                Keep my seat
              </button>
              <button
                className="btn btn-cta"
                style={{ minHeight: 48 }}
                onClick={() => {
                  cancel(confirmCancel)
                  setConfirmCancel(null)
                }}
              >
                Cancel anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
