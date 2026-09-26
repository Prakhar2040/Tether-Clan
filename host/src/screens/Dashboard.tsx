import {
  communityEvents,
  pastCommunityEvents,
  postsFor,
  upcomingCommunityEvents,
} from '@app/data/community'
import { venues } from '@app/data/mock'
import { useHostCommunity } from '../state/host'
import type { TcEvent } from '@app/types'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function parts(e: TcEvent): { dow: string; day: string; mon: string } {
  if (e.startsAt) {
    const d = new Date(e.startsAt)
    return {
      dow: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
      day: String(d.getDate()),
      mon: MONTHS[d.getMonth()],
    }
  }
  const m = /^(\w{3})\s+(\d{1,2})\s+(\w{3})$/.exec(e.dateLabel ?? '')
  if (m) return { dow: m[1].toUpperCase(), day: m[2], mon: m[3].toUpperCase() }
  return { dow: e.dayLabel.slice(0, 3).toUpperCase(), day: '·', mon: '' }
}

function PlanRow({ e, past }: { e: TcEvent; past?: boolean }) {
  const { dow, day, mon } = parts(e)
  const pct = Math.min(100, Math.round((e.going / e.capacity) * 100))
  const full = e.going >= e.capacity
  return (
    <div className="row">
      <span className="row-stub">
        <span className="row-dow">{dow}</span>
        <span className="row-day">{day}</span>
        <span className="row-mon">{mon}</span>
      </span>
      <span className="row-text">
        <span className="row-title">{e.title}</span>
        <span className="row-meta">
          {e.timeLabel} · {venues[e.venueId].name} · {e.price === 0 ? 'Free' : `₹${e.price}`}
        </span>
      </span>
      <span className="row-sales">
        <span className="row-bar">
          <span className={full ? 'row-fill full' : 'row-fill'} style={{ width: `${pct}%` }} />
        </span>
        <span className="row-count">
          {e.going} of {e.capacity} {past ? 'came' : 'taken'}
        </span>
      </span>
      <span className={`row-tag ${past ? 'past' : full ? 'sold' : 'live'}`}>
        {past ? 'Done' : full ? 'Sold out' : 'On sale'}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const { community, owner } = useHostCommunity()

  const upcoming = upcomingCommunityEvents(community.id)
  const past = pastCommunityEvents(community.id)
  const all = communityEvents(community.id)
  const posts = postsFor(community.id)

  const placesLeft = upcoming.reduce((n, e) => n + Math.max(0, e.capacity - e.going), 0)
  const takings = upcoming.reduce((n, e) => n + e.price * e.going, 0)
  const nextUp = upcoming[0]

  return (
    <div className="page">
      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Next plan</span>
          <span className="tile-n">{nextUp ? parts(nextUp).day : '—'}</span>
          <span className="tile-note">
            {nextUp ? `${nextUp.dayLabel} · ${nextUp.timeLabel}` : 'Nothing scheduled'}
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">Places left</span>
          <span className="tile-n">{placesLeft}</span>
          <span className={placesLeft === 0 ? 'tile-note good' : 'tile-note'}>
            {placesLeft === 0 ? 'Everything sold out' : `across ${upcoming.length} plans`}
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">Taken so far</span>
          <span className="tile-n">₹{takings.toLocaleString('en-IN')}</span>
          <span className="tile-note">on plans not yet run</span>
        </div>
        <div className="tile">
          <span className="tile-label">Members</span>
          <span className="tile-n">{community.memberCount}</span>
          <span className="tile-note good">★ {community.rating.toFixed(1)} from {community.ratingCount}</span>
        </div>
      </div>

      <div className="section-head">
        <span className="section-title">On sale now</span>
        <span className="section-link">Plans · soon</span>
      </div>
      <div className="panel">
        {upcoming.length === 0 ? (
          <div className="row">
            <span className="row-meta">Nothing scheduled yet.</span>
          </div>
        ) : (
          upcoming.map((e) => <PlanRow key={e.id} e={e} />)
        )}
      </div>

      <div className="section-head">
        <span className="section-title">Already run</span>
        <span className="section-link">
          {all.length} plans all-time · {posts.length} posts in the channel
        </span>
      </div>
      <div className="panel">
        {past.length === 0 ? (
          <div className="row">
            <span className="row-meta">Nothing has run yet.</span>
          </div>
        ) : (
          past.map((e) => <PlanRow key={e.id} e={e} past />)
        )}
      </div>

      <div className="section-head">
        <span className="section-title">What lands next</span>
      </div>
      <div className="soon">
        <span className="soon-tag">Yet to come</span>
        <span className="soon-title">Everything marked SOON in the rail</span>
        <p className="soon-body">
          The shell is here so the shape is legible. Each section gets built on its own, starting
          wherever you want to start.
        </p>
        <div className="soon-list">
          {[
            'Plans — create and publish, with a live preview of the member-side card as you type',
            'Channel — write notes and polls into the room, pin a post, see what landed',
            `Door — scan the passes, count ${owner?.name ?? 'the host'} a live head count at the entrance`,
            'Members, Photos, About page, Money, Settings',
          ].map((p) => (
            <span className="soon-item" key={p}>
              <span className="soon-dot" />
              <span>{p}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
