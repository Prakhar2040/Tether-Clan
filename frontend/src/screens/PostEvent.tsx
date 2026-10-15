import { MissingEvent } from '../components/MissingEvent'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { events, people } from '@shared/mock'
import { useRsvp } from '../state/rsvp'
import { Avatar } from '../components/shared'
import { BackIcon, CheckIcon, PlusIcon, ShareIcon, StarIcon } from '../components/icons'

const connectable = [
  { personId: 'priya', note: 'First-timer like you · traded you out of wheat, twice' },
  { personId: 'rohan', note: 'Also rides with Sarjapur Riders on Sundays' },
]

export default function PostEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { finish } = useRsvp()
  const [rating, setRating] = useState(4)
  const [connected, setConnected] = useState<Record<string, boolean>>({})
  const [rebooked, setRebooked] = useState(false)
  const [skipped, setSkipped] = useState(false)

  const e = id ? events[id] : undefined
  if (!e) return <MissingEvent />

  return (
    <div className="screen no-bar">
      <div className="top-row">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <BackIcon size={20} color="#15477C" strokeWidth={2.2} />
        </button>
        <button className="share-link">
          <ShareIcon size={16} color="#E9712A" /> &nbsp;Share on WhatsApp
        </button>
      </div>

      <div className="detail-body">
        <div className="stack-2" style={{ gap: 4 }}>
          <span className="tile-label" style={{ color: '#E9712A' }}>LAST NIGHT</span>
          <h1 className="detail-title">That was {e.title.split(' at ')[0]}</h1>
          <span className="page-sub">You went with 7 others · your 1st night with this group</span>
        </div>

        <div className="photo-row">
          <div className="photo" style={{ flex: 1.4, background: '#15477C' }}>
            <span className="photo-label">Robin · 4 photos</span>
          </div>
          <div className="photo" style={{ flex: 1, background: '#FDBE50' }} />
          <button className="photo-add" style={{ flex: 1 }}>
            <PlusIcon size={18} color="#8A8577" strokeWidth={2.2} />
            Add yours
          </button>
        </div>

        <section className="card" style={{ gap: 11 }}>
          <span className="section-label">Stay connected?</span>
          {connectable.map(({ personId, note }) => {
            const p = people[personId]
            const done = connected[personId]
            return (
              <div className="card-row" key={personId}>
                <div className="person-row" style={{ alignItems: 'center' }}>
                  <Avatar person={p} size={34} />
                  <span className="stack-2" style={{ gap: 1 }}>
                    <span className="person-name" style={{ fontSize: 13 }}>{p.name}</span>
                    <span className="person-note" style={{ fontSize: 11.5 }}>{note}</span>
                  </span>
                </div>
                <button
                  className={done ? 'btn btn-small done' : 'btn btn-small'}
                  onClick={() => setConnected((c) => ({ ...c, [personId]: !c[personId] }))}
                >
                  {done ? 'Asked ✓' : 'Connect'}
                </button>
              </div>
            )
          })}
          <span className="consent-note">They're only told if they want to connect too</span>
        </section>

        <section className="card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="stack-2" style={{ gap: 2 }}>
            <span className="section-label">How was the night?</span>
            <span className="person-note" style={{ fontSize: 11.5 }}>Quietly feeds Robin's host rating</span>
          </span>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <StarIcon filled={n <= rating} />
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="footer-cta">
        {rebooked ? (
          <div className="btn btn-confirm">
            <CheckIcon size={17} color="#FDBE50" strokeWidth={2.6} /> You're in for next Wednesday
          </div>
        ) : skipped ? (
          <div className="btn btn-ghost" style={{ minHeight: 54 }}>
            Skipping next week — we'll ask again after
          </div>
        ) : (
          <button
            className="btn btn-cta"
            onClick={() => {
              finish(e.id)
              setRebooked(true)
            }}
          >
            Same table next Wednesday · I'm in
          </button>
        )}
        {!rebooked && !skipped ? (
          <span className="footer-note">
            Or{' '}
            <button
              onClick={() => {
                finish(e.id)
                setSkipped(true)
              }}
            >
              skip a week
            </button>{' '}
            — Robin won't count it against you
          </span>
        ) : null}
      </div>
    </div>
  )
}
