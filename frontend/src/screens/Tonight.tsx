import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { events, priceLabel, seatsLeft, venues, worthTheRideIds } from '../data/mock'
import { useRsvp } from '../state/rsvp'
import { Brand } from '../components/shared'
import { GoingRow, WhoSheet } from '../components/WhoSheet'
import {
  BellIcon,
  CheckIcon,
  ChevronIcon,
  HeartIcon,
  LogoMark,
  PinIcon,
  SearchIcon,
  SlidersIcon,
} from '../components/icons'
import type { TcEvent } from '../types'

// "When" is either a preset or a specific day of Sep 2026.
type When = 'tonight' | 'weekend' | number

const TODAY = 9 // Wed 9 Sep 2026, the mock "now"
const DAY_LABELS: Record<number, string> = { 9: 'Tonight', 10: 'Tomorrow', 12: 'Sat', 13: 'Sun' }
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function weekdayOf(day: number): string {
  return WEEKDAYS[(new Date(2026, 8, day).getDay() + 6) % 7]
}

function matchesWhen(e: TcEvent, when: When): boolean {
  if (when === 'tonight') return e.dayLabel === 'Tonight'
  if (when === 'weekend') return e.dayLabel === 'Sat' || e.dayLabel === 'Sun'
  return e.dayLabel === DAY_LABELS[when]
}

function whenTitle(when: When): { title: string; sub: string } {
  if (when === 'tonight') return { title: 'Tonight', sub: 'Wed 9 Sep' }
  if (when === 'weekend') return { title: 'Weekend', sub: 'Sat 12 – Sun 13 Sep' }
  return { title: `${weekdayOf(when)} ${when} Sep`, sub: `${weekdayOf(when)} ${when} Sep` }
}

function beginnerOk(e: TcEvent): boolean {
  return Boolean(e.beginnerFriendly) || /all levels|all paces|drop in|first-timers/i.test(e.levelLabel ?? '')
}

// Event-first card: the event leads, and an Instagram-style "who's going"
// row sits below it — tap it to open the attendee sheet.
function EventFeedCard({ e, onWho }: { e: TcEvent; onWho: (id: string) => void }) {
  const { stateFor, join, markInterested } = useRsvp()
  const navigate = useNavigate()
  const state = stateFor(e.id)
  const left = seatsLeft(e)

  return (
    <article className="card">
      <div className="card-row">
        <Link to={`/event/${e.id}`} className="stack-2 event-title link" style={{ flex: 1 }}>
          <span className="event-title">{e.title}</span>
          <span className="event-meta">
            {e.dayLabel !== 'Tonight' ? `${e.dayLabel} · ` : ''}
            {e.timeLabel} · {venues[e.venueId].travel.autoMin} min away · {priceLabel(e)}
          </span>
        </Link>
        {state === 'going' ? (
          <span className="badge badge-going">YOU'RE IN</span>
        ) : state === 'waitlisted' ? (
          <span className="badge badge-waitlist">WAITLIST #3</span>
        ) : left === 0 ? (
          <span className="badge badge-waitlist">FULL · WAITLIST</span>
        ) : left <= 3 ? (
          <span className="badge badge-seats">{left} seats left</span>
        ) : null}
      </div>
      {e.tags && e.tags.length > 0 ? (
        <div className="tag-row">
          {e.tags.map((t) => (
            <span className="tag" key={t}>{t}</span>
          ))}
        </div>
      ) : null}
      {e.sharedInterestNote ? (
        <div className="interest-note">
          <HeartIcon size={14} color="#E9712A" />
          <span>{e.sharedInterestNote}</span>
        </div>
      ) : null}
      <GoingRow e={e} onOpen={() => onWho(e.id)} />
      <div className="btn-row">
        {state === 'going' ? (
          <button className="btn btn-primary" onClick={() => navigate(`/event/${e.id}`)}>
            <CheckIcon size={15} color="#FDBE50" strokeWidth={2.6} /> You're going
          </button>
        ) : state === 'waitlisted' ? (
          <button className="btn btn-primary" onClick={() => navigate(`/event/${e.id}`)}>
            On the waitlist
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => join(e.id)}>
            {left === 0 ? 'Join waitlist' : 'Join them'}
          </button>
        )}
        {state === 'interested' ? (
          <button className="btn btn-ghost" onClick={() => navigate(`/event/${e.id}`)}>
            Interested ✓
          </button>
        ) : state === 'none' || state === 'cancelled' ? (
          <button className="btn btn-ghost" onClick={() => markInterested(e.id)}>
            Maybe
          </button>
        ) : null}
      </div>
    </article>
  )
}

function NewAreaFeed() {
  const [notify, setNotify] = useState(false)
  return (
    <>
      <div className="empty-hero">
        <LogoMark size={44} muted />
        <h1 className="empty-title">Quiet in Whitefield tonight</h1>
        <p className="empty-sub">
          Nothing within 3 km yet — Tether Clan is new here. Here's what's close, and how to be the
          reason it isn't quiet.
        </p>
      </div>
      <div className="feed">
        <div className="card">
          <span className="tile-label">WORTH THE RIDE</span>
          {worthTheRideIds.map((id) => {
            const e = events[id]
            return (
              <Link key={id} to={`/event/${id}`} className="card-row event-title link">
                <span className="stack-2">
                  <span className="event-title" style={{ fontSize: 14.5 }}>{e.title}</span>
                  <span className="event-meta">
                    {e.dayLabel} {e.timeLabel} · {id === 'catan-night' ? '9.8 km · 40 min' : 'free · pace groups'}
                  </span>
                </span>
                <ChevronIcon size={16} color="#15477C" />
              </Link>
            )
          })}
        </div>
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BellIcon size={20} color="#15477C" />
          <span className="stack-2" style={{ flex: 1 }}>
            <span className="tile-text" style={{ color: '#15477C', fontWeight: 800, fontSize: 13.5 }}>
              Tell me when Whitefield wakes up
            </span>
            <span className="person-note">One message when the first event lands within 3 km</span>
          </span>
          <button
            className="btn btn-primary"
            style={{ flex: 'none', padding: '0 15px', minHeight: 40 }}
            onClick={() => setNotify(true)}
          >
            {notify ? 'On ✓' : 'Notify me'}
          </button>
        </div>
        <div className="host-card">
          <h3>Start one yourself — we'll do the boring part</h3>
          <p>
            Pick a café and a time. We handle RSVPs, reminders, the waitlist and the group chat.
            Three neighbours already asked to be notified.
          </p>
          <button className="btn btn-cta">Host with help</button>
        </div>
      </div>
    </>
  )
}

function Calendar({ when, onPick }: { when: When; onPick: (day: number) => void }) {
  const startOffset = (new Date(2026, 8, 1).getDay() + 6) % 7 // Mon-first
  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const hasEvents = (d: number) => d in DAY_LABELS
  const isSel = (d: number) =>
    when === d || (when === 'tonight' && d === TODAY) || (when === 'weekend' && (d === 12 || d === 13))
  return (
    <div className="stack-2" style={{ gap: 8 }}>
      <span className="cal-title">September 2026</span>
      <div className="cal">
        {WEEKDAYS.map((w) => (
          <span className="cal-head" key={w}>{w[0]}</span>
        ))}
        {Array.from({ length: startOffset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((d) => (
          <button
            key={d}
            className={`cal-day${d < TODAY ? ' off' : ''}${isSel(d) ? ' sel' : ''}`}
            disabled={d < TODAY}
            onClick={() => onPick(d)}
          >
            {d}
            {hasEvents(d) && !isSel(d) ? <span className="dot" /> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Tonight() {
  const [area, setArea] = useState<'Indiranagar' | 'Whitefield'>('Indiranagar')
  const [whoFor, setWhoFor] = useState<string | null>(null)
  const [when, setWhen] = useState<When>('tonight')
  const [freeOnly, setFreeOnly] = useState(false)
  const [beginnerOnly, setBeginnerOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const quiet = area === 'Whitefield'

  const scoped = Object.values(events).filter((e) => matchesWhen(e, when))
  const allTags = [...new Set(scoped.flatMap((e) => e.tags ?? []))].sort()
  const q = query.trim().toLowerCase()
  const filtered = scoped.filter(
    (e) =>
      (!freeOnly || e.price === 0) &&
      (!beginnerOnly || beginnerOk(e)) &&
      selectedTags.every((t) => e.tags?.includes(t)) &&
      (q === '' ||
        e.title.toLowerCase().includes(q) ||
        e.categoryLabel.toLowerCase().includes(q) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        venues[e.venueId].name.toLowerCase().includes(q)),
  )

  const activeCount =
    (when !== 'tonight' ? 1 : 0) + (freeOnly ? 1 : 0) + (beginnerOnly ? 1 : 0) + selectedTags.length

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const clearFilters = () => {
    setWhen('tonight')
    setFreeOnly(false)
    setBeginnerOnly(false)
    setSelectedTags([])
    setQuery('')
  }

  const { title, sub } = whenTitle(when)

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
        <button
          className="location-chip"
          onClick={() => setArea(quiet ? 'Indiranagar' : 'Whitefield')}
          title="Switch area"
        >
          <PinIcon size={12} color="#E9712A" strokeWidth={2.4} />
          {area} · 3 km
        </button>
      </div>

      {quiet ? (
        <NewAreaFeed />
      ) : (
        <>
          <header className="page-head">
            <h1 className="page-title">{title}</h1>
            <span className="page-sub">
              {sub} · {filtered.length} plan{filtered.length === 1 ? '' : 's'} near you
              {when === 'tonight' ? ' · 5 of your people are out' : ''}
            </span>
          </header>

          <div className="search-bar" style={{ marginBottom: 16 }}>
            <SearchIcon size={16} color="#A79F8C" />
            <input
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              placeholder="Search — catan, pottery, cycling…"
            />
            <button className="filter-btn" onClick={() => setFilterOpen(true)} aria-label="Filters">
              <SlidersIcon size={18} color={activeCount > 0 ? '#E9712A' : '#6B665A'} />
              {activeCount > 0 ? <span className="filter-count">{activeCount}</span> : null}
            </button>
          </div>

          <div className="feed">
            {filtered.length === 0 ? (
              <div className="no-match">
                <span className="t">Nothing on {title === 'Tonight' ? 'tonight' : title} matches</span>
                <span className="s">Try another day or widen the filters</span>
                <button className="btn btn-ghost" style={{ flex: 'none', padding: '0 18px' }} onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              filtered.map((e) =>
                e.liveNow ? (
                  <Link key={e.id} to={`/event/${e.id}`} className="card compact-card">
                    <span className="live-dot" />
                    <span className="stack-2" style={{ flex: 1 }}>
                      <span className="event-title">{e.title}</span>
                      <span className="event-meta">
                        Happening now {e.timeLabel} · {e.levelLabel?.toLowerCase()} · {priceLabel(e).toLowerCase()}
                      </span>
                    </span>
                    <ChevronIcon size={16} color="#15477C" />
                  </Link>
                ) : (
                  <EventFeedCard key={e.id} e={e} onWho={setWhoFor} />
                ),
              )
            )}
          </div>
        </>
      )}

      {whoFor ? <WhoSheet e={events[whoFor]} onClose={() => setWhoFor(null)} /> : null}

      {filterOpen ? (
        <div className="sheet-backdrop" onClick={() => setFilterOpen(false)}>
          <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
            <span className="sheet-handle" />
            <div className="card-row">
              <span className="section-label">Filters</span>
              <span className="page-sub">
                {filtered.length} plan{filtered.length === 1 ? '' : 's'} match
              </span>
            </div>

            <span className="sheet-section">When</span>
            <div className="chip-row" style={{ padding: 0 }}>
              <button
                className={when === 'tonight' ? 'chip active' : 'chip'}
                onClick={() => setWhen('tonight')}
              >
                Tonight
              </button>
              <button
                className={when === 10 ? 'chip active' : 'chip'}
                onClick={() => setWhen(10)}
              >
                Tomorrow
              </button>
              <button
                className={when === 'weekend' ? 'chip active' : 'chip'}
                onClick={() => setWhen('weekend')}
              >
                Weekend
              </button>
            </div>
            <Calendar when={when} onPick={(d) => setWhen(d === TODAY ? 'tonight' : d)} />

            <span className="sheet-section">Quick filters</span>
            <div className="chip-row" style={{ padding: 0 }}>
              <button className={freeOnly ? 'chip active' : 'chip'} onClick={() => setFreeOnly((v) => !v)}>
                Free
              </button>
              <button
                className={beginnerOnly ? 'chip active' : 'chip'}
                onClick={() => setBeginnerOnly((v) => !v)}
              >
                Beginner-ok
              </button>
            </div>

            <span className="sheet-section">Tags</span>
            <div className="chip-row" style={{ padding: 0 }}>
              {allTags.length === 0 ? (
                <span className="page-sub">No events this day yet</span>
              ) : (
                allTags.map((t) => (
                  <button
                    key={t}
                    className={selectedTags.includes(t) ? 'chip active' : 'chip'}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                ))
              )}
            </div>

            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={clearFilters}>
                Clear all
              </button>
              <button className="btn btn-primary" onClick={() => setFilterOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
