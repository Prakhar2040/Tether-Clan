import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { circleItems, events, priceLabel, seatsLeft } from '../data/mock'
import { useRsvp } from '../state/rsvp'
import { Brand } from '../components/shared'
import { GoingRow, WhoSheet } from '../components/WhoSheet'
import { CheckIcon, HeartIcon, LockIcon } from '../components/icons'

export default function Circle() {
  const { stateFor, join, markInterested } = useRsvp()
  const navigate = useNavigate()
  const [whoFor, setWhoFor] = useState<string | null>(null)

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
        <span className="page-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <LockIcon size={13} color="#8A8577" /> Only you see this feed
        </span>
      </div>
      <header className="page-head">
        <h1 className="page-title smaller">Your people are going out this week</h1>
        <span className="page-sub">Plans from 12 people you've met at events</span>
      </header>

      <div className="feed">
        {circleItems.map((item) => {
          const e = events[item.eventId]
          const state = stateFor(e.id)
          const showActions = item.id === 'c1'
          return (
            <article className="card" key={item.id}>
              <Link to={`/event/${e.id}`} className="stack-2 event-title link">
                <span className="event-title" style={{ fontSize: 16.5 }}>{e.title}</span>
                <span className="event-meta">
                  {e.dayLabel} {e.timeLabel} ·{' '}
                  {seatsLeft(e) === 0
                    ? `${priceLabel(e)} · full`
                    : `${priceLabel(e)}${seatsLeft(e) <= 3 ? ` · ${seatsLeft(e)} seats left` : ''}`}
                </span>
              </Link>
              {item.sharedInterestNote ? (
                <div className="interest-note">
                  <HeartIcon size={14} color="#E9712A" />
                  <span>{item.sharedInterestNote}</span>
                </div>
              ) : null}
              <GoingRow e={e} onOpen={() => setWhoFor(e.id)} label={item.headline} />
              {showActions ? (
                <div className="btn-row">
                  {state === 'going' ? (
                    <button className="btn btn-primary" onClick={() => navigate(`/event/${e.id}`)}>
                      <CheckIcon size={15} color="#FDBE50" strokeWidth={2.6} /> You're going
                    </button>
                  ) : (
                    <>
                      <button className="btn btn-primary" onClick={() => join(e.id)}>
                        Join them
                      </button>
                      <button className="btn btn-ghost" onClick={() => markInterested(e.id)}>
                        {state === 'interested' ? 'Interested ✓' : 'Maybe'}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      {whoFor ? <WhoSheet e={events[whoFor]} onClose={() => setWhoFor(null)} /> : null}
    </div>
  )
}
