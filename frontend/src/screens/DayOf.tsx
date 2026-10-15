import { Link, useNavigate, useParams } from 'react-router-dom'
import { events, people, venues } from '@shared/mock'
import { useRsvp } from '../state/rsvp'
import { useCircle } from '../state/circle'
import { Avatar } from '../components/shared'
import { BackIcon, ChatIcon, CheckIcon, ShieldIcon } from '../components/icons'

export default function DayOf() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { stateFor } = useRsvp()
  const { isConnected } = useCircle()

  const e = id ? events[id] : undefined
  if (!e) return null
  const venue = venues[e.venueId]
  const state = stateFor(e.id)
  const checkedIn = state === 'checked-in' || state === 'attended'
  // Faces only for people you have actually connected with.
  const there = e.attendees.filter((a) => isConnected(a.personId)).slice(0, 3)

  return (
    <div className="screen no-bar dayof">
      <div className="top-row">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <BackIcon size={20} color="#FDBE50" strokeWidth={2.2} />
        </button>
        <span className="dayof-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ background: '#FDBE50' }} /> TONIGHT MODE
        </span>
      </div>

      <div className="detail-body" style={{ gap: 12 }}>
        <div className="stack-2" style={{ gap: 5 }}>
          <span className="dayof-kicker">
            {checkedIn ? "YOU'RE AT THE TABLE" : `${e.startsInLabel?.toUpperCase()} · CHECK-IN OPENS 7:15`}
          </span>
          <h1 className="dayof-title">{e.title}</h1>
          <span className="dayof-sub">
            {e.timeLabel} · {venue.name.replace(' Board Game Café', '')}, {venue.area.split(', ')[1] ?? venue.area} · ₹{e.price} at venue
          </span>
        </div>

        <div className="tile-row">
          <button className="action-tile primary">
            <span className="t">Directions</span>
            <span className="s">{venue.travel.autoMin} min by auto</span>
          </button>
          <button className="action-tile">
            <span className="t">Running late</span>
            <span className="s">tell the table</span>
          </button>
          <button className="action-tile">
            <span className="t">Group chat</span>
            <span className="s hot">3 new</span>
          </button>
        </div>

        <div className="dayof-card">
          <span className="dayof-label">WHO'S THERE NOW</span>
          <div className="card-people">
            {there.length > 0 ? (
              <span className="avatar-stack">
                {there.map((a) => (
                  <Avatar key={a.personId} person={people[a.personId]} size={32} />
                ))}
              </span>
            ) : null}
            <span className="dayof-text">
              {there.length > 0
                ? `${there.map((a) => people[a.personId].name).join(', ')} · `
                : ''}
              {e.going} here or on the way
              {e.firstTimers > 0 ? ` · ${e.firstTimers} first-timer${e.firstTimers > 1 ? 's' : ''}` : ''}
            </span>
          </div>
          {e.hostAnnouncement ? (
            <div className="announcement">
              <ChatIcon size={14} color="#FDBE50" />
              <span>
                {people[e.hostId].name}: {e.hostAnnouncement}
              </span>
            </div>
          ) : null}
        </div>

        <div className="dayof-card" style={{ gap: 6 }}>
          <span className="dayof-label">FINDING THE PLACE</span>
          <span className="dayof-text">
            {venue.entranceNote} {people[e.hostId].name}'s number unlocks at check-in.
          </span>
        </div>

        <div className="safety-line">
          <ShieldIcon size={15} color="#8FD1A3" />
          <span>Safety check-in is on · a friend sees when you arrive and leave</span>
        </div>
      </div>

      <div className="dayof-footer">
        {checkedIn ? (
          <div className="stack-2" style={{ gap: 9 }}>
            <div className="checked-banner">
              <CheckIcon size={17} color="#8FD1A3" strokeWidth={2.6} /> Checked in · have a good one
            </div>
            <Link to={`/event/${e.id}/recap`} className="footer-note" style={{ color: '#FDBE50', textDecoration: 'none' }}>
              Wrap up the night when you're done →
            </Link>
          </div>
        ) : (
          <div className="footer-note" style={{ textAlign: 'center' }}>
            You're checked in when the door scans your ticket
          </div>
        )}
      </div>
    </div>
  )
}
