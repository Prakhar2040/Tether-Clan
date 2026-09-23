import { Link } from 'react-router-dom'
import { communities, upcomingCommunityEvents } from '../data/community'
import { venues } from '../data/mock'
import { useCommunities } from '../state/communities'
import { Brand } from '../components/shared'
import { StarIcon } from '../components/icons'
import type { Community as TcCommunity } from '../types'

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

// A tile, not a row. The photo is the point — you should recognise your
// community the way you recognise a room, before you read its name.
function CommunityTile({ c }: { c: TcCommunity }) {
  const { unread } = useCommunities()
  const next = upcomingCommunityEvents(c.id)[0]
  const isUnread = unread(c.id)

  return (
    <Link to={`/community/${c.id}`} className="comm-tile">
      <div
        className={c.coverImage ? 'comm-cover' : 'comm-cover no-photo'}
        style={
          c.coverImage
            ? { backgroundImage: `url(${c.coverImage})` }
            : { background: c.color }
        }
      >
        {c.coverImage ? null : <span className="comm-cover-mark">{initialsOf(c.name)}</span>}
        <div className="comm-cover-text">
          <span className="comm-kicker">{c.categoryLabel}</span>
          <span className="comm-tile-name">{c.name}</span>
          <span className="comm-tile-stats">
            <span className="comm-stat-n">{c.memberCount}</span>
            <span className="comm-stat-word">members</span>
            <span className="comm-stat-dot" />
            <StarIcon size={14} filled />
            <span className="comm-stat-n">{c.rating.toFixed(1)}</span>
            <span className="comm-stat-word">({c.ratingCount})</span>
          </span>
        </div>
        {isUnread ? <span className="comm-tile-dot" /> : null}
      </div>

      <div className="comm-tile-body">
        {next ? (
          <span className="comm-next">
            <span className="comm-next-dot" />
            {next.dayLabel} {next.timeLabel} · {next.title} · {venues[next.venueId].areaName}
          </span>
        ) : (
          <span className="comm-next quiet">Nothing on the calendar yet</span>
        )}
      </div>
    </Link>
  )
}

// You belong to one community, sometimes two — never a feed of every group in
// the city. Browsing is what the Events tab is for.
export default function Community() {
  const { joinedIds } = useCommunities()
  const mine = joinedIds.map((id) => communities[id]).filter(Boolean)

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
      </div>

      <header className="page-head">
        <h1 className="page-title">Community</h1>
        <span className="page-sub">
          {mine.length === 0
            ? 'Not in one yet'
            : `${mine.length} ${mine.length === 1 ? 'group' : 'groups'} you're part of`}
        </span>
      </header>

      <div className="feed">
        {mine.length === 0 ? (
          <div className="no-match">
            <span className="t">You're not in a community yet</span>
            <span className="s">
              Join one from a plan you go to — that's the only way in, and it's the point
            </span>
            <Link to="/events" className="btn btn-primary" style={{ flex: 'none', padding: '0 18px' }}>
              Find something on
            </Link>
          </div>
        ) : (
          mine.map((c) => <CommunityTile key={c.id} c={c} />)
        )}
      </div>
    </div>
  )
}
