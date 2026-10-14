import { useMemo, useState } from 'react'
import { venues } from '@shared/mock'
import { useHostCommunity } from '../state/host'
import { usePlans } from '../state/plans'
import { holdersFor, useDoor } from '../state/door'
import { CheckIcon, PeopleIcon, ScanIcon, SearchIcon } from '../components/icons'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Door() {
  const { community } = useHostCommunity()
  const { plans } = usePlans()
  const { arrivals, walkIns, closed, checkIn, undo, closeDoor, reopen } = useDoor()

  const doorable = plans.filter((p) => p.status !== 'draft')
  const [planId, setPlanId] = useState(doorable[0]?.id ?? '')
  const plan = doorable.find((p) => p.id === planId) ?? doorable[0]

  const [q, setQ] = useState('')

  const holders = useMemo(
    () => (plan ? [...holdersFor(community.id, plan.id, plan.sold), ...walkIns] : []),
    [community.id, plan, walkIns],
  )

  if (!plan) {
    return (
      <div className="page">
        <div className="soon">
          <span className="soon-tag">Nothing to open</span>
          <span className="soon-title">No published plan to check anybody into</span>
          <p className="soon-body">Publish a plan and the door opens on it.</p>
        </div>
      </div>
    )
  }

  const here = holders.filter((h) => arrivals[h.person.id])
  const waiting = holders.filter((h) => !arrivals[h.person.id])
  const needle = q.trim().toLowerCase()
  const match = (h: (typeof holders)[number]) =>
    !needle ||
    h.person.name.toLowerCase().includes(needle) ||
    h.ticket.toLowerCase().includes(needle)

  const shown = waiting.filter(match)
  const shownHere = here.filter(match)

  const d = new Date(`${plan.date}T00:00:00`)
  const pct = holders.length === 0 ? 0 : Math.round((here.length / holders.length) * 100)

  // Scanning, without a camera: takes the next person still outside.
  const scanNext = () => {
    const next = waiting[0]
    if (next) checkIn(next.person.id)
  }

  return (
    <div className="page door">
      <div className="door-head">
        <div className="door-plan">
          <select value={plan.id} onChange={(e) => setPlanId(e.target.value)} aria-label="Which night">
            {doorable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || 'Untitled plan'} · {DAYS[new Date(`${p.date}T00:00:00`).getDay()]}{' '}
                {new Date(`${p.date}T00:00:00`).getDate()}{' '}
                {MON[new Date(`${p.date}T00:00:00`).getMonth()]}
              </option>
            ))}
          </select>
          <span className="door-where">
            {venues[plan.venueId]?.name} · {DAYS[d.getDay()]} {d.getDate()} {MON[d.getMonth()]} ·{' '}
            {plan.time}
          </span>
        </div>

        <div className="door-count">
          <span className="door-n">
            {here.length}
            <em>/{holders.length}</em>
          </span>
          <span className="door-l">through the door</span>
          <span className="door-bar">
            <span className="door-fill" style={{ width: `${pct}%` }} />
          </span>
        </div>

        {closed ? (
          <button className="btn btn-ghost" onClick={reopen}>
            Reopen the door
          </button>
        ) : (
          <button className="btn btn-primary" onClick={closeDoor} disabled={here.length === 0}>
            Close the door
          </button>
        )}
      </div>

      {closed ? (
        <section className="door-closed">
          <span className="door-closed-t">Door closed · {here.length} came</span>
          <p className="door-closed-b">
            {waiting.length === 0
              ? 'Everybody who held a place turned up.'
              : `${waiting.length} held a place and did not come. Marking them here is what makes "missed without cancelling" mean anything — it is the only place that number can come from.`}
          </p>
          {waiting.length > 0 ? (
            <div className="who">
              {waiting.map((h) => (
                <div className="who-row" key={h.person.id}>
                  <span className={`av av-${h.person.color}`} style={{ width: 24, height: 24, fontSize: 9 }}>
                    {h.person.initials}
                  </span>
                  <span className="who-name">{h.person.name}</span>
                  <span className="who-detail">no-show</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <>
          {/* Search sits above both columns, so the two lists start level. */}
          <div className="door-tools">
            <span className="search">
              <SearchIcon size={15} strokeWidth={2.2} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a name or a ticket"
              />
              {q ? (
                <button className="search-x" onClick={() => setQ('')} aria-label="Clear">
                  ×
                </button>
              ) : null}
            </span>
            <button className="btn btn-primary scan" onClick={scanNext} disabled={waiting.length === 0}>
              <ScanIcon size={16} strokeWidth={2.1} /> Scan a pass
            </button>
          </div>

          <div className="door-body">
            <section className="door-col">
              <span className="door-sub">
                Yet to arrive · {needle ? `${shown.length} of ${waiting.length}` : waiting.length}
              </span>
              <div className="door-list">
                {shown.length === 0 ? (
                  <div className="roster-empty">
                    <PeopleIcon size={22} strokeWidth={1.9} />
                    <span>
                      {needle ? `Nobody still outside matches “${q}”` : 'Everybody is in.'}
                    </span>
                  </div>
                ) : (
                  shown.map((h) => {
                    const inAlready = Boolean(arrivals[h.person.id])
                    return (
                      <div className={inAlready ? 'door-row in' : 'door-row'} key={h.person.id}>
                        <span className={`av av-${h.person.color}`} style={{ width: 30, height: 30, fontSize: 11 }}>
                          {h.person.initials}
                        </span>
                        <span className="door-who">
                          <span className="door-name">{h.person.name}</span>
                          <span className="door-ref">{h.walkIn ? 'walk-in' : h.ticket}</span>
                        </span>
                        {/* Green means arrived. An action never wears it. */}
                        {inAlready ? (
                          <>
                            <span className="door-state in">
                              <CheckIcon size={13} strokeWidth={2.8} /> In at {arrivals[h.person.id].at}
                            </span>
                            <button className="door-undo" onClick={() => undo(h.person.id)}>
                              Undo
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="door-state">Yet to arrive</span>
                            <button className="door-in" onClick={() => checkIn(h.person.id)}>
                              Check in
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section className="door-col">
              <span className="door-sub">
                Arrived · {needle ? `${shownHere.length} of ${here.length}` : here.length}
              </span>
              <div className="door-list">
                {shownHere.length === 0 ? (
                  <div className="roster-empty">
                    <CheckIcon size={20} strokeWidth={2} />
                    <span>
                      {needle
                        ? `Nobody arrived matches “${q}”`
                        : 'Nobody yet. The first scan lands here.'}
                    </span>
                  </div>
                ) : (
                  [...shownHere].reverse().map((h) => (
                    <div className="door-row in" key={h.person.id}>
                      <span className={`av av-${h.person.color}`} style={{ width: 30, height: 30, fontSize: 11 }}>
                        {h.person.initials}
                      </span>
                      <span className="door-who">
                        <span className="door-name">{h.person.name}</span>
                        <span className="door-ref">{h.walkIn ? 'walk-in' : h.ticket}</span>
                      </span>
                      <span className="door-state in">
                        <CheckIcon size={13} strokeWidth={2.8} /> In at {arrivals[h.person.id].at}
                      </span>
                      <button className="door-undo" onClick={() => undo(h.person.id)}>
                        Undo
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
