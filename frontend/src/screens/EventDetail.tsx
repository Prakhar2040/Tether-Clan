import { MissingEvent } from '../components/MissingEvent'
import { useNavigate, useParams } from 'react-router-dom'
import { events, people, priceLabel, seatsLeft, venues } from '@shared/mock'
import { useRsvp } from '../state/rsvp'
import { useCircle } from '../state/circle'
import { Avatar } from '../components/shared'
import { BackIcon, CheckIcon, ShareIcon, ShieldIcon } from '../components/icons'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { stateFor, join, markInterested, cancel } = useRsvp()
  const { isConnected } = useCircle()

  const e = id ? events[id] : undefined
  if (!e) return <MissingEvent />
  const venue = venues[e.venueId]
  const state = stateFor(e.id)
  // Deciding needs what/when/where/who; preparing needs roles and icebreakers.
  const going = state === 'going' || state === 'checked-in'

  const headerBadge =
    state === 'going' ? (
      <span className="badge badge-going">YOU'RE GOING · {e.dayLabel.toUpperCase()} {e.timeLabel}</span>
    ) : state === 'interested' ? (
      <span className="badge badge-seats">INTERESTED · WE'LL REMIND YOU BEFORE IT FILLS</span>
    ) : (
      <span className="badge badge-seats">{e.categoryLabel.toUpperCase()} · {e.dayLabel.toUpperCase()} {e.timeLabel}</span>
    )

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
        <div className="stack-2" style={{ gap: 5, alignItems: 'flex-start' }}>
          {headerBadge}
          <h1 className="detail-title">{e.title}</h1>
          <span className="page-sub">
            {state === 'going' && e.firstTimers > 0
              ? "Your first time with this group — they know, and they're glad"
              : `Hosted by ${people[e.hostId].name} · ${e.going} of ${e.capacity} going${e.firstTimers ? ` · ${e.firstTimers} first-timers` : ''}`}
          </span>
          {e.tags && e.tags.length > 0 ? (
            <div className="tag-row" style={{ marginTop: 4 }}>
              {e.tags.map((t) => (
                <span className="tag" key={t}>{t}</span>
              ))}
            </div>
          ) : null}
        </div>

        <section className="card">
          <span className="section-label">Who's going</span>
          {/* Names only for the host and people already in your circle.
              Everyone else is a count — no stranger names, no activity. */}
          {(() => {
            const host = e.attendees.find((a) => a.relation === 'host')
            const allFriends = e.attendees.filter((a) => a.relation !== 'host' && isConnected(a.personId))
            // Cap the named rows: this section must not grow with your circle.
            const friends = allFriends.slice(0, 3)
            const moreFriends = allFriends.length - friends.length
            const others = Math.max(0, e.going - allFriends.length - (host ? 1 : 0))
            return (
              <>
                {host ? (
                  <div className="person-row" style={{ alignItems: 'center' }}>
                    <Avatar person={people[host.personId]} size={36} />
                    <span className="stack-2" style={{ gap: 1 }}>
                      <span className="person-name">{people[host.personId].name}</span>
                      <span className="person-note">Host</span>
                    </span>
                  </div>
                ) : null}
                {friends.map((a) => (
                  <div className="person-row" key={a.personId} style={{ alignItems: 'center' }}>
                    <Avatar person={people[a.personId]} size={36} />
                    <span className="stack-2" style={{ gap: 1 }}>
                      <span className="person-name">{people[a.personId].name}</span>
                      <span className="person-note">In your circle</span>
                    </span>
                  </div>
                ))}
                {moreFriends > 0 ? (
                  <span className="person-note">and {moreFriends} more from your circle</span>
                ) : null}
                {others > 0 ? (
                  <span className="person-note">
                    and {others} other{others > 1 ? 's' : ''} going
                    {e.firstTimers > 0 ? ` · ${e.firstTimers} first-timer${e.firstTimers > 1 ? 's' : ''}` : ''}
                  </span>
                ) : null}
              </>
            )
          })()}
        </section>

        {going && e.roles && e.roles.length > 0 ? (
          <section className="stack-2" style={{ gap: 9 }}>
            <span className="section-label">Roles for tonight</span>
            <div className="role-chips">
              {e.roles.map((r) =>
                r.claimedBy ? (
                  <span key={r.id} className="role-chip">
                    {r.label} · {people[r.claimedBy].name}
                  </span>
                ) : (
                  <button key={r.id} className="role-chip open">
                    + {r.label}
                  </button>
                ),
              )}
            </div>
          </section>
        ) : null}

        {going && e.icebreaker ? (
          <section className="icebreaker">
            <span className="icebreaker-label">TONIGHT'S ICEBREAKER</span>
            <span className="icebreaker-text">{e.icebreaker}</span>
          </section>
        ) : null}

        <div className="tile-row">
          {e.whatToExpect ? (
            <div className="tile">
              <span className="tile-label">WHAT TO EXPECT</span>
              <span className="tile-text">{e.whatToExpect}</span>
            </div>
          ) : null}
          <div className="tile">
            <span className="tile-label">GETTING THERE</span>
            <span className="tile-text">
              {venue.areaName}. {venue.entranceNote.split('—')[0].trim()}.
            </span>
          </div>
        </div>

        <div className="trust-line">
          <ShieldIcon size={15} color="#2E7D4F" />
          <span>
            {state === 'going' || state === 'checked-in'
              ? "Address shared because you're going · report is one tap away"
              : 'Exact address is shared once you join · report is one tap away'}
          </span>
        </div>
      </div>

      <div className="footer-cta">
        {state === 'going' ? (
          <>
            <div className="btn btn-confirm">
              <CheckIcon size={17} color="#FDBE50" strokeWidth={2.6} />
              You're going · see you at {e.timeLabel.replace(' PM', '').replace(' AM', '')}
            </div>
            <span className="footer-note">
              Can't make it?{' '}
              <button onClick={() => cancel(e.id)}>Free cancel till 5 PM</button> — it frees your
              seat for someone else
            </span>
          </>
        ) : seatsLeft(e) === 0 ? (
          <>
            <div className="btn btn-ghost" style={{ minHeight: 54 }}>This plan is full</div>
            <span className="footer-note">All {e.capacity} seats are taken</span>
          </>
        ) : (
          <>
            <div className="btn-row">
              {state !== 'interested' ? (
                <button className="btn btn-ghost" style={{ minHeight: 54 }} onClick={() => markInterested(e.id)}>
                  Interested
                </button>
              ) : null}
              <button className="btn btn-cta" style={{ flex: 1.5 }} onClick={() => join(e.id)}>
                Going · {priceLabel(e)}
              </button>
            </div>
            <span className="footer-note">
              {state === 'interested'
                ? "You're interested — we'll nudge you before it fills up"
                : 'Exact address is shared once you join'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
