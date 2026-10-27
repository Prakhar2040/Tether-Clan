import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { upcomingCommunityEvents } from '../data/community'
import { fetchCommunities, localCommunitiesById } from '../api/communities'
import { fetchPhotosFor, localGallery } from '../api/photos'
import { useRemote } from '../hooks/useRemote'
import { venues } from '@shared/mock'
import { useCommunities } from '../state/communities'
import { Brand } from '../components/shared'
import { ChevronIcon, LogoMark, StarIcon } from '../components/icons'
import type { Community as TcCommunity, CommunityPhoto } from '@shared/types'

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

// How long each picture holds before the next one.
const ROLL_MS = 4200

// A tile, not a row. The photo is the point — you should recognise your
// community the way you recognise a room, before you read its name.
function CommunityTile({ c, photos }: { c: TcCommunity; photos: CommunityPhoto[] }) {
  const { newCount } = useCommunities()
  const next = upcomingCommunityEvents(c.id)[0]
  const unread = newCount(c.id)
  const tonight = next?.dayLabel === 'Tonight'

  // The cover first, then whatever else the room has posted.
  const shots = useMemo(() => {
    const own = photos.filter((ph) => ph.communityId === c.id && ph.src).map((ph) => ph.src as string)
    return [...new Set([c.coverImage, ...own].filter(Boolean) as string[])]
  }, [c.id, c.coverImage, photos])

  const [at, setAt] = useState(0)
  const [held, setHeld] = useState(false)
  const step = (d: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    setAt((n) => (n + d + shots.length) % shots.length)
  }

  // Keyed on `at` so stepping by hand restarts the wait rather than being
  // overtaken by a timer that was already nearly up.
  useEffect(() => {
    if (shots.length < 2 || held) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setAt((n) => (n + 1) % shots.length), ROLL_MS)
    return () => clearTimeout(t)
  }, [at, held, shots.length])

  return (
    <div
      className="comm-tile"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <div className={shots.length > 0 ? 'comm-cover' : 'comm-cover no-photo'} style={{ background: c.color }}>
        {/* Every picture stays mounted and cross-fades, so the next one is
            already fetched by the time it is needed. */}
        {shots.map((src, i) => (
          <span
            key={src}
            className={i === at ? 'comm-shot on' : 'comm-shot'}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        {shots.length === 0 ? <span className="comm-cover-mark">{initialsOf(c.name)}</span> : null}
        {/* The category is the only thing left on the picture. One short word
            in a pill carries its own background, so the photograph does not
            need dimming to support it. */}
        <span className="comm-kicker on-photo">{c.categoryLabel}</span>

        {/* Step through without leaving the page. They surface on hover, and
            sit above the link rather than inside it — a button inside an
            anchor is not something a browser should have to resolve. */}
        {shots.length > 1 ? (
          <>
            <button className="shot-step back" onClick={step(-1)} aria-label="Previous photo">
              <ChevronIcon size={16} strokeWidth={2.6} />
            </button>
            <button className="shot-step fwd" onClick={step(1)} aria-label="Next photo">
              <ChevronIcon size={16} strokeWidth={2.6} />
            </button>
            {/* The live dot fills across its turn, so you can see the next
                picture coming rather than being surprised by it. The bar is
                driven by the same constant as the timer, passed down as a
                custom property so the two cannot drift apart. */}
            <span
              className={held ? 'shot-dots held' : 'shot-dots'}
              style={{ ['--roll' as string]: `${ROLL_MS}ms` } as React.CSSProperties}
            >
              {shots.map((src, i) => (
                <b key={src} className={i === at ? 'on' : ''}>
                  {i === at ? <i key={`${at}-${held}`} /> : null}
                </b>
              ))}
            </span>
          </>
        ) : null}

        {unread > 0 ? <span className="comm-bubble">{unread} new</span> : null}
      </div>

      {/* Off the photograph and onto the card.
       *
       * The old layout laid all of this over the picture, which meant the
       * picture had to be dimmed enough to carry white text — and the cover
       * with a white building in bright sun needed so much dimming that the
       * photograph stopped being worth having. Here the picture is at full
       * strength and the words sit on the card's own surface.
       *
       * The two are one object, not a photo with a caption pasted under it:
       * no gap, no second border, no change of background between them. */}
      {/* The link covers the whole tile, not just the picture. It used to sit
          inside the cover, which was fine while the words were on the
          photograph — now they are below it, and the name and the next plan
          have to be as tappable as the image. */}
      <Link to={`/community/${c.id}`} className="comm-hit" aria-label={c.name} viewTransition />

      <div className="comm-tile-body">
        <span className="comm-tile-name">{c.name}</span>
        <span className="comm-tile-stats">
          <span className="comm-stat-n">{c.memberCount}</span>
          <span className="comm-stat-word">members</span>
          <span className="comm-stat-dot" />
          <StarIcon size={14} filled />
          <span className="comm-stat-n">{c.rating.toFixed(1)}</span>
          <span className="comm-stat-word">({c.ratingCount})</span>
        </span>

        <div className="comm-tile-plan">
          {next ? (
            /* Tonight is the most urgent thing here; it used to read in the
               same weight as a plan three weeks out. */
            <span className={tonight ? 'comm-next now' : 'comm-next'}>
              {tonight ? (
                <span className="comm-now-badge">Tonight</span>
              ) : (
                <span className="comm-next-dot" />
              )}
              {tonight ? '' : `${next.dayLabel} `}
              {next.timeLabel} · {next.title} · {venues[next.venueId].areaName}
            </span>
          ) : (
            <span className="comm-next quiet">Nothing on the calendar yet</span>
          )}
        </div>
      </div>
    </div>
  )
}

// You belong to a handful of communities, not a feed of every group in the
// city. Browsing is what the Events tab is for.
export default function Community() {
  const { joinedIds } = useCommunities()
  /* Served by the API, with the local copy underneath so the screen still
     works with the backend down — the only visible difference is `offline`. */
  const { data: communities, offline } = useRemote(fetchCommunities, localCommunitiesById, [])
  const mine = joinedIds.map((id) => communities[id]).filter(Boolean)
  /* One request per room you're in, asked for here rather than inside the
     tile: the tiles mount and unmount as you join and leave, and the rolling
     gallery should not restart from the first picture each time. */
  const joinedKey = joinedIds.join(',')
  const { data: gallery } = useRemote(
    (signal) => fetchPhotosFor(joinedIds, signal),
    localGallery,
    [joinedKey],
  )

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
      </div>

      <header className="page-head">
        <h1 className="page-title">Community</h1>
        <span className="page-sub">
          {offline ? 'Offline — showing what was here last · ' : ''}
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
          mine.map((c) => <CommunityTile key={c.id} c={c} photos={gallery} />)
        )}
      </div>

      {/* Where the page runs out, the three of them are sitting. */}
      <div className="end-mark">
        <LogoMark size={30} muted />
        <span>That's every room you're in</span>
      </div>
    </div>
  )
}
