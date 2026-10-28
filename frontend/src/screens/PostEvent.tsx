import { MissingEvent } from '../components/MissingEvent'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { events, people } from '@shared/mock'
import { communityOf } from '../data/community'
import { useCommunities } from '../state/communities'
import { Avatar } from '../components/shared'
import { BackIcon, CheckIcon, PlusIcon, ShareIcon, StarIcon } from '../components/icons'

const connectable = [
  { personId: 'priya', note: 'First-timer like you · traded you out of wheat, twice' },
  { personId: 'rohan', note: 'Also rides with Sarjapur Riders on Sundays' },
]

export default function PostEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  /* Starts at nothing, not at four. A rating the app filled in for you is
     not a rating, and this one feeds the host's score. */
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [connected, setConnected] = useState<Record<string, boolean>>({})
  const [rebooked, setRebooked] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const { isMember, join } = useCommunities()

  const e = id ? events[id] : undefined
  if (!e) return <MissingEvent />

  /* The room that ran the night, offered once the night has been rated.
   *
   * This is the moment the product's own rule points at — "join one from a
   * plan you go to, that's the only way in". Until now nothing implemented
   * it: the only way to join was an ungated button on the room's page, which
   * anybody could press having never met a soul.
   *
   * It sits behind the rating rather than beside it because the rating is
   * the thing somebody has earned the right to be asked for, and answering
   * it is what makes the invitation feel like a consequence of the evening
   * rather than an advert at the end of it. */
  const host = communityOf(e.id)
  const offerJoin = rating > 0 && host && !isMember(host.id)

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

        {/* Optional, and only once there is a rating to attach it to. An
            empty box sitting there before anybody has said anything reads as
            homework. */}
        {rating > 0 ? (
          <section className="card recap-note">
            <label className="section-label" htmlFor="recap-note">
              Anything you'd tell Robin? <em>optional</em>
            </label>
            <textarea
              id="recap-note"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              rows={2}
              placeholder="What worked, what didn't, who to thank"
            />
          </section>
        ) : null}

        {offerJoin ? (
          <section className="card join-offer">
            <span className="join-offer-mark" style={{ background: host.color }}>
              {host.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
            </span>
            <span className="stack-2" style={{ flex: 1, minWidth: 0 }}>
              <span className="join-offer-name">{host.name}</span>
              <span className="join-offer-sub">
                They run this one. Join and you'll hear about the next before anyone else.
              </span>
            </span>
            <button className="btn btn-small" onClick={() => join(host.id)}>
              Join
            </button>
          </section>
        ) : null}
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
