import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NOW, people, venues } from '@app/data/mock'
import { membersOf } from '@app/data/roster'
import { useHostCommunity } from '../state/host'
import { usePlans } from '../state/plans'
import { holdersFor, useDoor } from '../state/door'
import { usePosts } from '../state/posts'
import { usePhotos } from '../state/photos'
import { salesFor } from '../lib/sales'
import { tierOf, useBadges } from '../state/badges'
import { ChatIcon, ChevronIcon, ImageIcon, OutIcon, PeopleIcon, ScanIcon, TagIcon } from '../components/icons'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const today = () => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())

function dayWord(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const out = Math.round((d.getTime() - today().getTime()) / 86400000)
  if (out === 0) return 'Tonight'
  if (out === 1) return 'Tomorrow'
  if (out > 1 && out < 7) return DAYS[d.getDay()]
  return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MON[d.getMonth()]}`
}

// How long until the doors, rather than only when they are. A fact becomes
// a prompt.
function countdown(iso: string, hhmm: string): string | null {
  const [h, m] = hhmm.split(':').map(Number)
  const start = new Date(`${iso}T00:00:00`)
  start.setHours(h, m, 0, 0)
  const mins = Math.round((start.getTime() - NOW.getTime()) / 60000)
  if (mins <= -180) return null
  if (mins <= 0) return 'running now'
  if (mins < 60) return `in ${mins}m`
  if (mins < 60 * 24) {
    const hrs = Math.floor(mins / 60)
    const rem = mins % 60
    return `in ${hrs}h${rem > 0 ? ` ${rem}m` : ''}`
  }
  return null
}

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// How the room grew. Total members at the end of each month, derived from
// how long each person has been here.
/* Where the month's money came from, and what it left on the table. Three
   wedges, each pushed out along its own angle so they read as parts that were
   taken apart rather than as one ring. */
function RevenueMix({
  parts,
  aside,
  currency,
}: {
  parts: { key: string; label: string; value: number; tone: string }[]
  aside: { label: string; value: number }
  currency: (n: number) => string
}) {
  const total = parts.reduce((n, p) => n + p.value, 0)
  if (total <= 0) return null

  const R = 52
  const C = 66 // centre, with room for the explode offset
  const live = parts.filter((p) => p.value > 0)

  let a = -Math.PI / 2
  const wedges = live.map((p) => {
    const sweep = (p.value / total) * Math.PI * 2
    const a0 = a
    const a1 = a + sweep
    a = a1
    const mid = (a0 + a1) / 2
    // A full circle has no wedge to draw, so it stays a plain disc.
    const d =
      live.length === 1
        ? `M${C},${C - R} A${R},${R} 0 1 1 ${C - 0.01},${C - R} Z`
        : `M${C},${C} L${C + R * Math.cos(a0)},${C + R * Math.sin(a0)} ` +
          `A${R},${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${C + R * Math.cos(a1)},${C + R * Math.sin(a1)} Z`
    const off = p.key === 'spent' ? 11 : 4
    return { ...p, d, dx: Math.cos(mid) * off, dy: Math.sin(mid) * off }
  })

  return (
    <div className="tl-mix">
      <svg viewBox={`0 0 ${C * 2} ${C * 2}`} className="tl-pie" role="img" aria-label="Where the month's money came from">
        {wedges.map((w) => (
          <path
            key={w.key}
            d={w.d}
            className={`pie-w pie-${w.tone}`}
            transform={`translate(${w.dx.toFixed(2)}, ${w.dy.toFixed(2)})`}
          >
            <title>{`${w.label} · ${currency(w.value)}`}</title>
          </path>
        ))}
      </svg>

      <div className="tl-mix-key">
        {parts.map((p) => (
          <span key={p.key}>
            <em className={`pie-${p.tone}`} />
            <i>{p.label}</i>
            <b className={p.key === 'spent' ? 'neg' : undefined}>{currency(p.value)}</b>
          </span>
        ))}
        {/* Never arrived, so it is no part of the circle: it sits under a
            rule, outside the three wedges that make up the month. */}
        <span className="out">
          <em className="pie-c" />
          <i>{aside.label}</i>
          <b className="off">{currency(aside.value)}</b>
        </span>
      </div>
    </div>
  )
}

const ROLL_MS = 4000

/* One photograph at a time, rolling. Two layers cross-fading, so a picture
   never cuts to the next one. */
function PhotoWall({
  photos,
}: {
  photos: { id: string; src?: string; color?: string; timeLabel?: string; caption?: string }[]
}) {
  const [at, setAt] = useState(0)
  const [paused, setPaused] = useState(false)

  const many = photos.length > 1
  const step = (d: number) => setAt((n) => (n + d + photos.length) % photos.length)

  // `at` is a dependency on purpose: stepping by hand restarts the countdown,
  // so a photo you just asked for gets its full turn.
  useEffect(() => {
    if (!many || paused) return
    // Somebody who asked for less motion should not get a slideshow.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setAt((n) => (n + 1) % photos.length), ROLL_MS)
    return () => clearTimeout(t)
  }, [many, paused, at, photos.length])

  if (photos.length === 0) return null

  const fill = (i: number) => {
    const ph = photos[((i % photos.length) + photos.length) % photos.length]
    return ph?.src ? { backgroundImage: `url(${ph.src})` } : { background: ph?.color ?? 'var(--paper)' }
  }
  const now = photos[at]

  return (
    <div
      className="tl tl-wall"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Every photo stays mounted, so the browser has already fetched the
          next one by the time it is needed. */}
      {photos.map((ph, i) => (
        <i key={ph.id} style={fill(i)} className={i === at ? 'tl-wall-img on' : 'tl-wall-img'} />
      ))}
      <span className="tl-wall-scrim" />

      <div className="tl-top">
        <span className="tl-label light">Photos</span>
        <span className="tl-chip on-dark">
          <ImageIcon size={16} strokeWidth={2.2} />
        </span>
      </div>

      {/* Step through by hand. They surface on hover so the picture is not
          permanently wearing two buttons. */}
      {many ? (
        <>
          <button className="tl-wall-step back" onClick={() => step(-1)} aria-label="Previous photo">
            <ChevronIcon size={18} strokeWidth={2.6} />
          </button>
          <button className="tl-wall-step fwd" onClick={() => step(1)} aria-label="Next photo">
            <ChevronIcon size={18} strokeWidth={2.6} />
          </button>
        </>
      ) : null}

      <div className="tl-wall-foot">
        <span className="tl-wall-cap">
          {now?.caption ?? `${photos.length} photographs`}
          {now?.timeLabel ? <em>{now.timeLabel}</em> : null}
        </span>
        <span className="tl-wall-dots">
          {photos.slice(0, 12).map((ph, i) => (
            <button
              key={ph.id}
              className={i === at ? 'on' : ''}
              onClick={() => setAt(i)}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

function MembersChart({
  points,
  hover,
  onHover,
}: {
  points: { label: string; total: number; joined: number }[]
  hover: number | null
  onHover: (i: number | null) => void
}) {
  const W = 460
  const H = 108
  const PAD = { t: 24, r: 10, b: 22, l: 10 }
  const lo = Math.min(...points.map((p) => p.total))
  const hi = Math.max(...points.map((p) => p.total))
  const span = Math.max(1, hi - lo)
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (i / Math.max(1, points.length - 1)) * iw
  const y = (v: number) => PAD.t + ih - ((v - lo) / span) * ih

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${PAD.t + ih} L${x(0).toFixed(1)},${PAD.t + ih} Z`
  const last = points.length - 1
  const at = hover ?? last
  // Net movement, so a month that lost people reads as a loss rather than
  // as no joins.
  const change = at === 0 ? points[0].joined : points[at].total - points[at - 1].total
  const sign = change > 0 ? `+${change}` : change < 0 ? `−${Math.abs(change)}` : null
  const tipW = sign ? 104 : 78
  const tipX = Math.min(W - PAD.r - tipW / 2, Math.max(PAD.l + tipW / 2, x(at)))

  return (
    // No preserveAspectRatio override: stretching the box is what made the
    // strokes and labels look soft.
    <svg
      className="grow"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      onMouseLeave={() => onHover(null)}
      aria-label={`Members by month: ${points.map((p) => `${p.label} ${p.total}`).join(', ')}`}
    >
      <defs>
        <linearGradient id="growfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--blue)" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#growfill)" />
      <path d={line} className="grow-line" />

      {/* At rest the line just ends in a point; the reading only appears
          when you go looking for it. */}
      {hover === null ? (
        <circle cx={x(last)} cy={y(points[last].total)} r="4.5" className="grow-dot" />
      ) : (
        <>
          <line x1={x(at)} x2={x(at)} y1={PAD.t - 2} y2={PAD.t + ih} className="grow-cross" />
          <circle cx={x(at)} cy={y(points[at].total)} r="5" className="grow-dot" />
          <g transform={`translate(${tipX}, 0)`}>
            <rect
              x={-tipW / 2}
              y="1"
              width={tipW}
              height="18"
              rx="6"
              className={change < 0 ? 'grow-tip down' : 'grow-tip'}
            />
            <text x="0" y="13.8" className="grow-tip-t" textAnchor="middle">
              {points[at].label} · {points[at].total}
              {sign ? ` · ${sign}` : ''}
            </text>
          </g>
        </>
      )}

      {points.map((p, i) => (
        <g key={p.label + i}>
          <text
            x={x(i)}
            y={H - 6}
            className={hover === i ? 'grow-lbl on' : 'grow-lbl'}
            textAnchor="middle"
          >
            {p.label}
          </text>
          <rect
            x={x(i) - iw / (points.length * 2)}
            y={0}
            width={iw / points.length}
            height={PAD.t + ih}
            fill="transparent"
            onMouseEnter={() => onHover(i)}
          />
        </g>
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { community, owner } = useHostCommunity()
  const { config } = useBadges()
  const { plans } = usePlans()
  const { arrivals } = useDoor()
  const { posts } = usePosts()
  const { photos, coverId } = usePhotos()
  const [range, setRange] = useState<3 | 6 | 12>(6)
  const [hover, setHover] = useState<number | null>(null)

  // Whatever this community is fronted by — the starred gallery photo, or
  // its cover. Never a hardcoded picture.
  const cover = photos.find((p) => p.id === coverId)?.src ?? community.coverImage
  const sales = salesFor(community.id)
  const members = membersOf(community.id)
  const joinedThisMonth = members.filter((m) => m.monthsIn === 0).length

  const next = [...plans]
    .filter((p) => p.status !== 'past')
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const isToday = next ? new Date(`${next.date}T00:00:00`).getTime() === today().getTime() : false
  const holders = next ? holdersFor(community.id, next.id, next.sold) : []
  const arrived = holders.filter((h) => arrivals[h.person.id]).length

  // Who is coming, not just how many. Read from the same rows the door list
  // and the badge ladder use, so the three never disagree.
  const byId = new Map(members.map((m) => [m.personId, m]))
  const coming = holders.map((h) => byId.get(h.person.id)).filter(Boolean)
  const firstTimers = coming.filter((m) => m!.attended === 0).length
  const regulars = coming.filter((m) => {
    const t = tierOf(m!.attended, config)
    return t === 'regular' || t === 'veteran'
  }).length

  const until = next ? countdown(next.date, next.time) : null
  const pct = next && next.capacity > 0
    ? Math.round(((isToday ? arrived : next.sold) / (isToday ? Math.max(1, holders.length) : next.capacity)) * 100)
    : 0

  // Newest first, pins ignored — this is the rhythm of the room, not its
  // reference material.
  const recent = [...posts].sort((a, b) => a.sortKey - b.sortKey).slice(0, 6)
  const latest = recent[0]
  const author = latest ? (latest.authorId ? people[latest.authorId] : owner) : undefined
  const reactions = latest ? Object.entries(latest.reactions).filter(([, n]) => n > 0) : []
  const totalReacts = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)
  const allReacts = posts.reduce((a, p) => a + totalReacts(p.reactions), 0)
  const polls = posts.filter((p) => p.poll).length

  // The room's size, month by month. Nobody leaves in this data, so the
  // line only climbs — a real one would dip.
  const growth = Array.from({ length: range }, (_, i) => {
    const back = range - 1 - i
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - back, 1)
    return {
      label: MON[d.getMonth()],
      total: members.filter((m) => m.monthsIn >= back).length,
      joined: members.filter((m) => m.monthsIn === back).length,
    }
  })

  return (
    <div className="page dash">
      {/* Two halves: what is next, and what was last said. */}
      <div className="dash-grid">
        {next ? (
          <button
            className={isToday ? 'tl tl-night on' : 'tl tl-night'}
            onClick={() => navigate(isToday ? '/door' : '/plans')}
          >
            {cover ? (
              <span className="tl-bg" style={{ backgroundImage: `url(${cover})` }} aria-hidden="true" />
            ) : null}
            <div className="tl-top">
              <span className="tl-label light">
                {dayWord(next.date)} ·{' '}
                {until ? `doors ${until}` : `${isToday ? 'doors at ' : ''}${clock(next.time)}`}
              </span>
              <span className="tl-chip dark">
                <ScanIcon size={16} strokeWidth={2.2} />
              </span>
            </div>

            <span className="tl-night-title">{next.title || 'Untitled plan'}</span>
            <span className="tl-night-where">
              {venues[next.venueId]?.name} · {venues[next.venueId]?.areaName}
              {until ? ` · ${clock(next.time)}` : ''}
            </span>

            {next.theme ? <p className="tl-theme">“{next.theme}”</p> : null}

            {/* Who is coming, not only how many. */}
            <span className="tl-who">
              {firstTimers > 0 ? (
                <span className="tl-who-bit new">
                  {firstTimers} first-timer{firstTimers === 1 ? '' : 's'}
                </span>
              ) : null}
              {regulars > 0 ? (
                <span className="tl-who-bit reg">
                  {regulars} regular{regulars === 1 ? '' : 's'}
                </span>
              ) : null}
            </span>

            <div className="tl-foot">
              <span className="tl-meter">
                <span className="tl-meter-bar">
                  <span className="tl-meter-run" style={{ width: `${pct}%` }} />
                </span>
                <b>
                  {isToday
                    ? `${arrived} of ${holders.length} arrived`
                    : `${next.sold} of ${next.capacity} taken`}
                </b>
              </span>
              <span className="tl-go light">
                {isToday ? 'Open the door' : 'See the plan'} <OutIcon size={15} strokeWidth={2.4} />
              </span>
            </div>
          </button>
        ) : (
          <button className="tl tl-night quiet" onClick={() => navigate('/plans')}>
            <div className="tl-top">
              <span className="tl-label">Nothing on</span>
            </div>
            <span className="tl-night-title">No night scheduled</span>
            <span className="tl-night-where">
              The room goes quiet until you put something in the diary.
            </span>
            <div className="tl-foot">
              <span className="tl-go">
                Plan something <OutIcon size={15} strokeWidth={2.4} />
              </span>
            </div>
          </button>
        )}

        {/* The room as members see it, beside the night: the latest post in the
            app's own bubble, the rest beneath, then how the room is used. */}
        <button className="tl tl-msg" onClick={() => navigate('/posts')}>
          <div className="tl-top">
            <span className="tl-label">The channel</span>
            <span className="tl-chip tl-chip-swap">
              <ChatIcon size={16} strokeWidth={2.2} />
              <OutIcon size={15} strokeWidth={2.4} />
            </span>
          </div>

          {latest ? (
            <div className="tl-thread">
              <div className="tl-bub">
                <span className="tl-bub-by">
                  <span className={`av av-${author?.color ?? 'tint'}`} style={{ width: 24, height: 24, fontSize: 10 }}>
                    {author?.initials}
                  </span>
                  <b>{author?.name}</b>
                  <i>{latest.timeLabel} ago</i>
                  {latest.poll ? <u>Poll</u> : null}
                </span>

                <span className="tl-bub-title">
                  {latest.emoji ? <em>{latest.emoji}</em> : null}
                  {latest.title ?? latest.poll?.question ?? 'A note to the room'}
                </span>
                <p className="tl-bub-body">
                  {latest.body ||
                    (latest.poll
                      ? `${latest.poll.options.length} options · ${latest.poll.closesLabel}`
                      : '')}
                </p>

                {reactions.length > 0 ? (
                  <span className="tl-bub-r">
                    {reactions.slice(0, 4).map(([e, n]) => (
                      <span key={e}>
                        {e} {n}
                      </span>
                    ))}
                    {reactions.length > 4 ? <span className="more">+{reactions.length - 4}</span> : null}
                  </span>
                ) : null}
              </div>

              {/* What came before, quieter, and scrollable: the room keeps
                  going past the bottom of the tile. */}
              {recent.slice(1).map((p) => {
                const who = p.authorId ? people[p.authorId] : owner
                return (
                  <div className="tl-bub prev" key={p.id}>
                    <span className="tl-bub-title">
                      {p.emoji ? <em>{p.emoji}</em> : null}
                      {p.title ?? p.poll?.question ?? p.body}
                    </span>
                    <span className="tl-bub-by">
                      <b>{who?.name.split(' ')[0]}</b>
                      <i>{p.timeLabel} ago</i>
                      <span className="tl-bub-r">
                        <span>{totalReacts(p.reactions)} reactions</span>
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="tl-bub-body">Nothing has been posted to this room yet.</p>
          )}

          {/* Three facts, evenly spaced, the way the sales tile reads. */}
          <div className="tl-msg-facts">
            <span>
              <b>{posts.length}</b>
              <i>posts</i>
            </span>
            <span>
              <b>{allReacts}</b>
              <i>reactions</i>
            </span>
            <span>
              <b>{polls}</b>
              <i>{polls === 1 ? 'poll' : 'polls'}</i>
            </span>
          </div>
        </button>

        {/* The month's takings: the figure and what makes it up down the
            left, the pie taking the right so the tile isn't hollow there. */}
        <button className="tl tl-money" onClick={() => navigate('/sales')}>
          <div className="tl-top">
            <span className="tl-label">{sales.monthLabel} revenue</span>
            <span className="tl-chip tl-chip-swap">
              <TagIcon size={16} strokeWidth={2.2} />
              <OutIcon size={15} strokeWidth={2.4} />
            </span>
          </div>

          <div className="tl-money-body">
            <div className="tl-money-left">
              <span className="tl-money-n">{sales.currency(sales.monthRevenue)}</span>

              {/* What the figure is made of, in points rather than a strip. */}
              <ul className="tl-money-pts">
                <li>
                  {sales.monthEvents} {sales.monthEvents === 1 ? 'event' : 'events'}
                </li>
                <li>{sales.monthTickets} tickets sold</li>
                <li>
                  {sales.monthPriceLow === sales.monthPriceHigh
                    ? `${sales.currency(sales.monthPerTicket)} a ticket`
                    : `${sales.currency(sales.monthPriceLow)}–${sales.currency(sales.monthPriceHigh)} a ticket`}
                </li>
                <li>{Math.round(sales.monthFill * 100)}% average fill</li>
              </ul>
            </div>

            <RevenueMix
              currency={sales.currency}
              aside={{ label: 'Unsold seats', value: sales.monthForgone }}
              parts={[
                { key: 'regulars', label: 'Regulars', value: sales.monthKeptRegulars, tone: 'a' },
                { key: 'new', label: 'New faces', value: sales.monthKeptNew, tone: 'b' },
                { key: 'spent', label: 'Spent on the room', value: sales.monthExpense, tone: 'd' },
              ]}
            />
          </div>
        </button>

        {/* The only tile here that is not a number: the room's own photographs,
            drifting, so the page has something alive on it. */}
        <PhotoWall photos={photos} />

        {/* The room's size as a wide band: the count and its controls on the
            left, the line given the width a line wants. */}
        <div
          className="tl tl-people"
          role="link"
          tabIndex={0}
          onClick={() => navigate('/members')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate('/members')
            }
          }}
        >
          <div className="tl-people-side">
            <div className="tl-top">
              <span className="tl-label">Community</span>
              {/* The chip carries the go-there arrow on hover, so the tile
                  needs no footer and the chart can reach the bottom edge. */}
              <span className="tl-chip tl-chip-swap">
                <PeopleIcon size={16} strokeWidth={2.2} />
                <OutIcon size={15} strokeWidth={2.4} />
              </span>
            </div>

            <div className="tl-people-head">
              <span className="tl-people-n">
                {members.length}
                <em>members</em>
              </span>
              <span
                className={joinedThisMonth > 0 ? 'tl-pill up' : joinedThisMonth < 0 ? 'tl-pill down' : 'tl-pill flat'}
              >
                {joinedThisMonth > 0 ? '▲' : joinedThisMonth < 0 ? '▼' : '–'} {joinedThisMonth > 0 ? '+' : ''}
                {joinedThisMonth} this month
              </span>
            </div>

            <div className="tl-range" onClick={(e) => e.stopPropagation()}>
              <select
                value={range}
                onChange={(e) => {
                  setRange(Number(e.target.value) as 3 | 6 | 12)
                  setHover(null)
                }}
                aria-label="How far back"
              >
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
              </select>
            </div>
          </div>

          <MembersChart points={growth} hover={hover} onHover={setHover} />
        </div>
      </div>
    </div>
  )
}
