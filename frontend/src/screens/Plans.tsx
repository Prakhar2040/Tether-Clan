import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { events, series } from '../data/mock'
import { communityOf } from '../data/community'
import { useRsvp } from '../state/rsvp'
import { Brand } from '../components/shared'
import { PastRow, TicketRow } from '../components/tickets'
import { CalendarIcon, StarIcon } from '../components/icons'

type Tab = 'upcoming' | 'past'

// Soonest first. Mock "now" is Wed 9 Sep evening.
const ORDER: Record<string, number> = { Tonight: 0, Tomorrow: 1, Sat: 2, Sun: 3, 'Next Wed': 4 }

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
    .sort((a, b) => {
      const t = (x: typeof a) => (x.e.startsAt ? new Date(x.e.startsAt).getTime() : 0)
      return t(b) - t(a)
    })

  const attended = past.filter(({ state }) => state === 'attended')
  const noShows = past.filter(({ state }) => state === 'no-showed').length
  // One rating prompt, for the most recent night you were actually at.
  const toRate = attended.find(({ e }) => !(e.id in rated))

  // Tapping a plan goes back to the room that runs it, not to a stranger list.
  const openPlan = (id: string) => {
    const c = communityOf(id)
    navigate(c ? `/community/${c.id}?tab=tickets&plan=${id}` : `/event/${id}`)
  }
  const openPass = (id: string) => navigate(`/ticket/${id}`)

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
      </div>
      <header className="page-head">
        <h1 className="page-title smaller">My plans</h1>
      </header>

      <div className="tab-bar">
        <button
          className={tab === 'upcoming' ? 'tab-link on' : 'tab-link'}
          onClick={() => setTab('upcoming')}
        >
          Upcoming
        </button>
        <button className={tab === 'past' ? 'tab-link on' : 'tab-link'} onClick={() => setTab('past')}>
          Past
        </button>
      </div>

      {tab === 'upcoming' ? (
        <div className="about">
          {upcoming.length === 0 ? (
            <div className="no-match">
              <span className="t">Nothing planned yet</span>
              <span className="s">There are four things on near you tonight</span>
              <button
                className="btn btn-cta"
                style={{ flex: 'none', padding: '0 20px' }}
                onClick={() => navigate('/events')}
              >
                See tonight
              </button>
            </div>
          ) : (
            upcoming.map(({ e }) => {
              const c = communityOf(e.id)
              const s = e.seriesId ? series[e.seriesId] : undefined
              const isSkipped = skipped.includes(e.id)
              return (
                <div className="plan-entry" key={e.id}>
                  <TicketRow event={e} kicker={c?.name} onOpen={openPlan} onPass={openPass} />
                  <div className="plan-entry-foot">
                    {s ? (
                      <span className="plan-series">
                        <CalendarIcon size={13} color="#8A8577" />
                        {s.cadenceLabel}
                        <button
                          className="plan-link"
                          onClick={() =>
                            setSkipped((x) => (isSkipped ? x.filter((y) => y !== e.id) : [...x, e.id]))
                          }
                        >
                          {isSkipped ? 'Skipping ✓' : 'Skip this one'}
                        </button>
                      </span>
                    ) : (
                      <span />
                    )}
                    <button className="plan-link danger" onClick={() => setConfirmCancel(e.id)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="about">
          {past.length === 0 ? (
            <div className="no-match">
              <span className="t">Your first plan is still ahead of you</span>
              <span className="s">Once you go to something, it lands here</span>
            </div>
          ) : (
            <>
              <div className="stat-strip">
                <div className="stat">
                  <span className="stat-n">{attended.length}</span>
                  <span className="stat-label">plans you went to</span>
                </div>
                <div className="stat">
                  <span className="stat-n">{noShows}</span>
                  <span className="stat-label">
                    {noShows === 1 ? 'missed' : 'missed'} without cancelling — only you see this
                  </span>
                </div>
              </div>

              {toRate ? (
                <section className="rate-card">
                  <span className="about-label">How was it?</span>
                  <span className="rate-title">{toRate.e.title}</span>
                  <span className="event-meta">{toRate.e.dateLabel}</span>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setRated((r) => ({ ...r, [toRate.e.id]: n }))}
                        aria-label={`${n} stars`}
                      >
                        <StarIcon filled={n <= (rated[toRate.e.id] ?? 0)} size={26} />
                      </button>
                    ))}
                  </div>
                  <span className="person-note">Feeds the community's rating. Nobody sees your name.</span>
                </section>
              ) : null}

              <section className="about-block">
                <span className="about-label">Everything so far</span>
                <div className="past-list">
                  {past.map(({ e }) => (
                    <PastRow key={e.id} event={e} kicker={communityOf(e.id)?.name} onOpen={openPlan} />
                  ))}
                </div>
              </section>
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
              counts against your reliability, and frees your place for someone else.
            </span>
            <div className="btn-row">
              <button
                className="btn btn-ghost"
                style={{ minHeight: 48 }}
                onClick={() => setConfirmCancel(null)}
              >
                Keep my place
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
