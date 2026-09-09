import { useMemo, useState } from 'react'
import { events, people, venues } from '../data/mock'
import { useRsvp } from '../state/rsvp'
import { useCircle } from '../state/circle'
import { Avatar, Brand } from '../components/shared'
import { CheckIcon, ChevronIcon, PlusIcon, SearchIcon } from '../components/icons'

// Rosters below this size are shown as a list — you were in a small room with
// these people. Above it, search only: you should be able to find the Rohan
// you met, not page through everyone who attended.
const LIST_LIMIT = 25

export default function Circle() {
  const { stateFor } = useRsvp()
  const {
    connections,
    incoming,
    outgoing,
    isConnected,
    hasSent,
    sendRequest,
    cancelRequest,
    accept,
    deny,
    remove,
    windowFor,
    metAt,
  } = useCircle()

  const [addFor, setAddFor] = useState<string | null>(null)
  const [detailFor, setDetailFor] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Plans you were at, whose add-people window is open or about to open.
  const attendedPlans = useMemo(
    () =>
      Object.values(events)
        .filter((e) => {
          const s = stateFor(e.id)
          return s === 'going' || s === 'checked-in' || s === 'attended'
        })
        .map((e) => ({ e, win: windowFor(e.id) }))
        .filter(({ win }) => win !== 'closed')
        .sort((a) => (a.win === 'open' ? -1 : 1)),
    [stateFor, windowFor],
  )

  const roster = addFor
    ? events[addFor].attendees.filter((a) => a.personId !== 'me' && !isConnected(a.personId))
    : []
  const q = query.trim().toLowerCase()
  const bigRoster = roster.length > LIST_LIMIT
  const shown = bigRoster
    ? q.length >= 2
      ? roster.filter((a) => people[a.personId].name.toLowerCase().includes(q))
      : []
    : roster.filter((a) => q === '' || people[a.personId].name.toLowerCase().includes(q))

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
      </div>
      <header className="page-head">
        <h1 className="page-title smaller">Your circle</h1>
        <span className="page-sub">
          {connections.length} {connections.length === 1 ? 'person' : 'people'} you’ve met at plans
        </span>
      </header>

      <div className="feed">
        {/* Add people you actually met, from a specific plan */}
        {attendedPlans.length > 0 ? (
          <section className="stack-2" style={{ gap: 9 }}>
            <span className="sheet-section">Add people you met</span>
            {attendedPlans.map(({ e, win }) => (
              <button
                key={e.id}
                className={`card compact-card${win === 'not-started' ? ' muted' : ''}`}
                disabled={win !== 'open'}
                onClick={() => {
                  setAddFor(e.id)
                  setQuery('')
                }}
              >
                <span className="stack-2" style={{ flex: 1 }}>
                  <span className="event-title" style={{ fontSize: 15 }}>{e.title}</span>
                  <span className="event-meta">
                    {win === 'open'
                      ? `${e.dateLabel ?? e.dayLabel} · ${e.going} were there · closes 48h after`
                      : `Opens when it starts at ${e.timeLabel}`}
                  </span>
                </span>
                {win === 'open' ? <PlusIcon size={17} color="#15477C" strokeWidth={2.4} /> : null}
              </button>
            ))}
          </section>
        ) : null}

        {/* Requests waiting on you */}
        {incoming.length > 0 ? (
          <section className="stack-2" style={{ gap: 9 }}>
            <span className="sheet-section">Requests</span>
            {incoming.map((r) => {
              const p = people[r.personId]
              return (
                <div className="card person-request" key={r.personId}>
                  <Avatar person={p} size={38} />
                  <span className="stack-2" style={{ flex: 1, gap: 1 }}>
                    <span className="person-name">{p.name}</span>
                    <span className="person-note">Was at {events[r.eventId].title}</span>
                  </span>
                  <div className="req-actions">
                    <button className="btn btn-small" onClick={() => accept(r.personId)}>
                      Accept
                    </button>
                    <button className="req-deny" onClick={() => deny(r.personId)}>
                      Deny
                    </button>
                  </div>
                </div>
              )
            })}
          </section>
        ) : null}

        {/* Requests you have sent */}
        {outgoing.length > 0 ? (
          <section className="stack-2" style={{ gap: 9 }}>
            <span className="sheet-section">Sent</span>
            {outgoing.map((r) => {
              const p = people[r.personId]
              return (
                <div className="card person-request" key={r.personId}>
                  <Avatar person={p} size={38} />
                  <span className="stack-2" style={{ flex: 1, gap: 1 }}>
                    <span className="person-name">{p.name}</span>
                    <span className="person-note">Waiting for them to accept</span>
                  </span>
                  <button className="req-deny" onClick={() => cancelRequest(r.personId)}>
                    Cancel
                  </button>
                </div>
              )
            })}
          </section>
        ) : null}

        {/* Your people */}
        <section className="stack-2" style={{ gap: 9 }}>
          <span className="sheet-section">Your people</span>
          {connections.length === 0 ? (
            <div className="no-match">
              <span className="t">No one here yet</span>
              <span className="s">
                Go to a plan, then add the people you met while the window is open
              </span>
            </div>
          ) : (
            connections.map((c) => {
              const p = people[c.personId]
              return (
                <button className="card person-row-card" key={c.personId} onClick={() => setDetailFor(c.personId)}>
                  <Avatar person={p} size={40} />
                  <span className="stack-2" style={{ flex: 1, gap: 1 }}>
                    <span className="person-name">{p.name}</span>
                    <span className="person-note">
                      Met at {events[c.eventId].title.split(' at ')[0]} ·{' '}
                      {events[c.eventId].dateLabel ?? events[c.eventId].dayLabel}
                    </span>
                  </span>
                  <ChevronIcon size={16} color="#A79F8C" />
                </button>
              )
            })
          )}
        </section>
      </div>

      {/* Add-people sheet, scoped to one plan */}
      {addFor ? (
        <div className="sheet-backdrop" onClick={() => setAddFor(null)}>
          <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
            <span className="sheet-handle" />
            <span className="section-label">Who did you meet?</span>
            <span className="page-sub">
              {events[addFor].title} · {events[addFor].dateLabel ?? events[addFor].dayLabel}
            </span>

            <div className="search-bar" style={{ margin: 0 }}>
              <SearchIcon size={16} color="#A79F8C" />
              <input
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                placeholder={bigRoster ? 'Search by name…' : 'Find someone…'}
                autoFocus
              />
            </div>

            {bigRoster && q.length < 2 ? (
              <span className="page-sub">
                {roster.length} people were here. Type a name to find them.
              </span>
            ) : shown.length === 0 ? (
              <span className="page-sub">No one by that name.</span>
            ) : (
              <div className="roster-list">
                {shown.map((a) => {
                  const p = people[a.personId]
                  const sent = hasSent(a.personId)
                  return (
                    <div className="roster-row" key={a.personId}>
                      <Avatar person={p} size={36} />
                      <span className="stack-2" style={{ flex: 1, gap: 1 }}>
                        <span className="person-name">{p.name}</span>
                        {a.relation === 'host' ? <span className="person-note">Host</span> : null}
                      </span>
                      <button
                        className={sent ? 'btn btn-small done' : 'btn btn-small'}
                        onClick={() => sendRequest(a.personId, addFor)}
                      >
                        {sent ? 'Sent ✓' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <span className="consent-note">
              They choose whether to accept. Requests can’t carry a message.
            </span>
          </div>
        </div>
      ) : null}

      {/* Person detail */}
      {detailFor ? (
        <div className="sheet-backdrop" onClick={() => setDetailFor(null)}>
          <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
            <span className="sheet-handle" />
            <div className="person-row" style={{ alignItems: 'center' }}>
              <Avatar person={people[detailFor]} size={48} />
              <span className="stack-2" style={{ gap: 2 }}>
                <span className="detail-title" style={{ fontSize: 20 }}>{people[detailFor].name}</span>
                {metAt(detailFor) ? (
                  <span className="person-note">
                    Met at {events[metAt(detailFor)!].title.split(' at ')[0]} ·{' '}
                    {venues[events[metAt(detailFor)!].venueId].name}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="trust-line">
              <CheckIcon size={15} color="#2E7D4F" strokeWidth={2.4} />
              <span>Connected — their name shows on plans you can both see</span>
            </div>
            <button
              className="btn btn-ghost"
              style={{ minHeight: 48 }}
              onClick={() => {
                remove(detailFor)
                setDetailFor(null)
              }}
            >
              Remove from circle
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
