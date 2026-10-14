import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NOW, venues } from '@shared/mock'
import { useHostCommunity } from '../state/host'
import { useMembers } from '../state/members'
import { usePlans } from '../state/plans'
import { holdersFor, useDoor } from '../state/door'
import { usePhotos } from '../state/photos'
import { salesFor } from '../lib/sales'
import { tierOf, useBadges } from '../state/badges'
import { ChevronIcon, ImageIcon, OutIcon, PeopleIcon, ScanIcon, StarIcon, TagIcon } from '../components/icons'
import { lifetimeOf } from '@shared/history'
import { DonutChart } from '../components/DonutChart'
import { LifeTile } from '../components/LifeTile'
import { LineChart } from '../components/LineChart'
import { leftInMonth } from '../lib/churn'

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
type SalesOf = ReturnType<typeof salesFor>

/* The month's takings: the figure and its readings down the left, the ring
   they came from on the right with its key in the hole. */
function MoneyTile({ sales, onOpen }: { sales: SalesOf; onOpen: () => void }) {
  const price =
    sales.monthPriceLow === sales.monthPriceHigh
      ? sales.currency(sales.monthPerTicket)
      : `${sales.currency(sales.monthPriceLow)}–${sales.currency(sales.monthPriceHigh)}`

  const figures = (
    <>
      <div className="tl-money-head">
        <span className="tl-money-n">{sales.currency(sales.monthRevenue)}</span>
        <span className="tl-money-when">{sales.monthLabel}</span>
      </div>
      <div className="tl-money-facts">
        <span>
          <b>{sales.monthEvents}</b>
          <i>{sales.monthEvents === 1 ? 'event' : 'events'}</i>
        </span>
        <span>
          <b>{sales.monthTickets}</b>
          <i>tickets sold</i>
        </span>
        <span>
          <b>{price}</b>
          <i>a ticket</i>
        </span>
        <span>
          <b>{Math.round(sales.monthFill * 100)}%</b>
          <i>average fill</i>
        </span>
      </div>
    </>
  )

  const ring = (
    <div className="tl-money-ring">
      <DonutChart
        currency={sales.currency}
        size={284}
        slices={[
          { key: 'regulars', label: 'Regulars', value: sales.monthKeptRegulars, color: 'var(--blue)' },
          { key: 'new', label: 'New faces', value: sales.monthKeptNew, color: 'var(--yellow)' },
          {
            key: 'spent',
            label: 'Spent on the room',
            value: sales.monthExpense,
            color: 'var(--red)',
            out: true,
            negative: true,
          },
          // Never arrived, so it is grey and stands off from the money that did.
          { key: 'unsold', label: 'Unsold seats', value: sales.monthForgone, color: 'var(--outline)', out: true },
        ]}
      />
    </div>
  )

  return (
    <button className="tl tl-money" onClick={onOpen}>
      <div className="tl-top">
        <span className="tl-label">Revenue</span>
        <span className="tl-chip tl-chip-swap">
          <TagIcon size={16} strokeWidth={2.2} />
          <OutIcon size={15} strokeWidth={2.4} />
        </span>
      </div>

      <div className="tl-money-body">
        <div className="tl-money-left">{figures}</div>
        {ring}
      </div>
    </button>
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


export default function Dashboard() {
  const navigate = useNavigate()
  const { community } = useHostCommunity()
  const { config } = useBadges()
  const { plans } = usePlans()
  const { arrivals } = useDoor()
  const { photos, coverId } = usePhotos()
  const [range, setRange] = useState<3 | 6 | 12>(6)

  // Whatever this community is fronted by — the starred gallery photo, or
  // its cover. Never a hardcoded picture.
  const cover = photos.find((p) => p.id === coverId)?.src ?? community.coverImage
  const sales = salesFor(community.id)
  const life = lifetimeOf(community.id, NOW)
  const { members } = useMembers()

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

  // Who arrived and who went, month by month. The joins are real rows; the
  // departures come from lib/churn, because a membership has no end date yet.
  const growth = Array.from({ length: range }, (_, i) => {
    const back = range - 1 - i
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - back, 1)
    const joined = members.filter((m) => m.monthsIn === back).length
    return {
      label: MON[d.getMonth()],
      total: members.filter((m) => m.monthsIn >= back).length,
      joined,
      left: leftInMonth(community.id, back, joined),
    }
  })
  // Net, so the pill agrees with the two lines beneath it.
  const netThisMonth = growth.length === 0 ? 0 : growth[growth.length - 1].joined - growth[growth.length - 1].left

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

        {/* Everything the room has done, around the mark that made it. */}
        <div className="tl tl-life">
          <LifeTile
            since={life.sinceLabel}
            chip={
              <span className="tl-chip">
                <StarIcon size={15} filled />
              </span>
            }
            figures={[
              { n: String(life.nights), label: 'nights held' },
              { n: life.seats.toLocaleString('en-IN'), label: 'seats filled' },
              { n: String(members.length), label: 'members' },
              { n: String(life.rooms), label: 'rooms used' },
              { n: String(photos.length), label: 'photographs' },
              { n: String(life.months), label: 'months running' },
            ]}
          />
        </div>

        <MoneyTile sales={sales} onOpen={() => navigate('/sales')} />


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
                className={netThisMonth > 0 ? 'tl-pill up' : netThisMonth < 0 ? 'tl-pill down' : 'tl-pill flat'}
              >
                {netThisMonth > 0 ? '▲' : netThisMonth < 0 ? '▼' : '–'} {netThisMonth > 0 ? '+' : ''}
                {netThisMonth} this month
              </span>
            </div>

            <div className="tl-range" onClick={(e) => e.stopPropagation()}>
              <select
                value={range}
                onChange={(e) => {
                  setRange(Number(e.target.value) as 3 | 6 | 12)
                }}
                aria-label="How far back"
              >
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
              </select>
            </div>
          </div>

          <div className="tl-people-chart">
            <LineChart
              title="Who came and who went"
              zero
              labels={growth.map((g) => g.label)}
              lines={[
                { label: 'Joined', values: growth.map((g) => g.joined), color: 'var(--blue)' },
                { label: 'Left', values: growth.map((g) => g.left), color: 'var(--red)' },
              ]}
              height={196}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
