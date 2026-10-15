import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { events, priceLabel, seatsLeft, venues, worthTheRideIds } from '@shared/mock'
import { useRsvp } from '../state/rsvp'
import { useBuy } from '../components/BuySheet'
import { Brand } from '../components/shared'
import { GoingRow, WhoSheet } from '../components/WhoSheet'
import { SearchSuggestions } from '../components/SearchSuggestions'
import { useSearch } from '../hooks/useSearch'
import { useLocation } from '../state/location'
import { LocationChip, LocationSheet } from '../components/LocationPicker'
import { DAY_LABELS, matchesWhen, TODAY, useFilters, WEEKDAYS, whenTitle } from '../state/filters'
import type { When } from '../state/filters'
import type { SuggestionItem } from '../api/search'
import {
  BellIcon,
  CheckIcon,
  ChevronIcon,
  LogoMark,
  SearchIcon,
  SlidersIcon,
} from '../components/icons'
import type { TcEvent } from '@shared/types'



function beginnerOk(e: TcEvent): boolean {
  return Boolean(e.beginnerFriendly) || /all levels|all paces|drop in|first-timers/i.test(e.levelLabel ?? '')
}

// Event-first card: the event leads, and an Instagram-style "who's going"
// row sits below it — tap it to open the attendee sheet.
function EventFeedCard({ e, onWho }: { e: TcEvent; onWho: (id: string) => void }) {
  const { stateFor, markInterested } = useRsvp()
  const openBuy = useBuy()
  const navigate = useNavigate()
  const state = stateFor(e.id)
  const left = seatsLeft(e)
  const v = venues[e.venueId]

  return (
    <article className="card">
      <div className="card-row">
        <Link to={`/event/${e.id}`} className="stack-2 event-title link" style={{ flex: 1 }}>
          <span className="event-title">{e.title}</span>
          <span className="event-meta">
            {e.dayLabel !== 'Tonight' ? `${e.dayLabel} · ` : ''}
            {e.timeLabel} · {v.areaName} · {priceLabel(e)}
          </span>
        </Link>
        {state === 'going' ? (
          <span className="badge badge-going">YOU'RE IN</span>
        ) : left === 0 ? (
          <span className="badge badge-full">FULL</span>
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
      <GoingRow e={e} onOpen={() => onWho(e.id)} />
      <div className="btn-row">
        {state === 'going' ? (
          <button className="btn btn-primary" onClick={() => navigate(`/event/${e.id}`)}>
            <CheckIcon size={15} color="#FDBE50" strokeWidth={2.6} /> You're going
          </button>
        ) : left === 0 ? (
          <button className="btn btn-ghost" disabled>
            Full
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => openBuy(e.id)}>
            Join them
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

/* A paid placement, and labelled as one.
 *
 * It lives here rather than on the Community tab on purpose: Events is a
 * discovery surface, people arrive expecting to be shown things they do not
 * know about, and a promoted plan here is honest. The Community tab is the
 * one screen that is only the rooms somebody chose, and selling space on it
 * would turn a home into a marketplace.
 *
 * It sits after the first few real results, never at the top — a promoted
 * item ahead of what somebody actually searched for is an advert wearing the
 * interface's clothes.
 */
function Promoted({ e }: { e: TcEvent }) {
  return (
    <Link to={`/event/${e.id}`} className="card promoted">
      <span className="promoted-tag">Promoted</span>
      <span className="stack-2" style={{ flex: 1 }}>
        <span className="event-title">{e.title}</span>
        <span className="event-meta">
          {e.dayLabel} {e.timeLabel} · {venues[e.venueId]?.areaName} · {priceLabel(e).toLowerCase()}
        </span>
      </span>
      <ChevronIcon size={16} color="#15477C" />
    </Link>
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
            Pick a café and a time. We handle RSVPs, reminders and the group chat.
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
  const navigate = useNavigate()
  const { place, distanceKm } = useLocation()
  const [locOpen, setLocOpen] = useState(false)
  const [whoFor, setWhoFor] = useState<string | null>(null)
  const {
    when,
    setWhen,
    freeOnly,
    setFreeOnly,
    beginnerOnly,
    setBeginnerOnly,
    query,
    setQuery,
    selectedTags,
    setSelectedTags,
    clearFilters,
    activeCount,
  } = useFilters()
  const [filterOpen, setFilterOpen] = useState(false)
  const quiet = place.label === 'Whitefield'

  const scoped = Object.values(events).filter((e) => matchesWhen(e.dayLabel, when))
  const allTags = [...new Set(scoped.flatMap((e) => e.tags ?? []))].sort()
  const q = query.trim().toLowerCase()

  // The search engine drives results. If it is unreachable we fall back to
  // local filtering — worse results, never a broken screen.
  const engineWhen = when === 'tonight' ? 'tonight' : when === 'weekend' ? 'weekend' : String(when)
  const { result, offline } = useSearch({
    q: query,
    when: engineWhen,
    free: freeOnly,
    beginner: beginnerOnly,
    tags: selectedTags,
    // Nothing to reach in a standalone build; local filtering covers it.
    enabled: !quiet && !import.meta.env.VITE_STANDALONE,
  })

  /* A plan somebody paid to place. Deliberately drawn from outside what the
     filters returned — a promoted item that was going to appear anyway is not
     a placement, it is a label on a coincidence. */
  const promoted = useMemo(() => {
    const shown = new Set(scoped.map((e) => e.id))
    return Object.values(events).find((e) => !shown.has(e.id) && !e.liveNow && e.price > 0)
  }, [scoped])

  const localFiltered = scoped.filter(
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

  // Engine results are ids into our local event map, ranked by the engine.
  const engineFiltered =
    result && !offline
      ? result.hydrated.map((h) => events[h.id]).filter(Boolean)
      : null
  const unsorted = engineFiltered ?? localFiltered

  // With no search term, nearest first — everything on screen is the same day,
  // so distance is the useful axis. A search keeps the engine's relevance order.
  const filtered =
    query.trim() === ''
      ? [...unsorted].sort((a, b) => {
          const va = venues[a.venueId]
          const vb = venues[b.venueId]
          return distanceKm(va.lat, va.lng) - distanceKm(vb.lat, vb.lng)
        })
      : unsorted
  const fallbackEvents =
    result?.fallbackHydrated?.map((h) => events[h.id]).filter(Boolean) ?? []


  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))


  const { title, sub } = whenTitle(when)

  // Typed suggestions appear only while actually typing — before a keystroke
  // the feed itself is the answer.
  const suggestionGroups = query.trim() === '' ? [] : (result?.groups ?? [])

  const suggestionHandlers = {
    onActivity: (item: SuggestionItem) => setQuery(item.label),
    onArea: (item: SuggestionItem) => setQuery(item.label),
    onVenue: (item: SuggestionItem) => setQuery(item.label),
    onCommunity: (item: SuggestionItem) => setQuery(item.label),
    onEvent: (item: SuggestionItem) => navigate(`/event/${item.id}`),
  }

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
        <LocationChip onOpen={() => setLocOpen(true)} />
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

          {suggestionGroups.length > 0 ? (
            <SearchSuggestions groups={suggestionGroups} handlers={suggestionHandlers} />
          ) : null}

          {offline ? (
            <span className="engine-note">
              <span className="dot-warn" /> Search engine unreachable — showing local results
            </span>
          ) : null}

          <div className="feed">
            {filtered.length === 0 ? (
              <div className="no-match">
                <span className="t">Nothing on {title === 'Tonight' ? 'tonight' : title} matches</span>
                <span className="s">Try another day or widen the filters</span>
                <button className="btn btn-ghost" style={{ flex: 'none', padding: '0 18px' }} onClick={clearFilters}>
                  Clear filters
                </button>
                {fallbackEvents.length > 0 ? (
                  <div className="fallback-block" style={{ width: '100%', marginTop: 12 }}>
                    <span className="fallback-title">Worth the ride</span>
                    {fallbackEvents.map((e) => (
                      <Link key={e.id} to={`/event/${e.id}`} className="card-row event-title link">
                        <span className="stack-2">
                          <span className="event-title" style={{ fontSize: 14.5 }}>{e.title}</span>
                          <span className="event-meta">
                            {e.dayLabel} {e.timeLabel} · {venues[e.venueId].name}
                          </span>
                        </span>
                        <ChevronIcon size={16} color="#15477C" />
                      </Link>
                    ))}
                    <button className="btn btn-ghost" style={{ minHeight: 40 }}>
                      <BellIcon size={15} color="#6B665A" /> Notify me when this appears nearby
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              filtered.map((e, i) => (
                <Fragment key={e.id}>
                  {/* Third slot down, so it never outranks a real result. */}
                  {i === 3 && promoted ? <Promoted e={promoted} /> : null}
                  {e.liveNow ? (
                  <Link to={`/event/${e.id}`} className="card compact-card">
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
                    <EventFeedCard e={e} onWho={setWhoFor} />
                  )}
                </Fragment>
              ))
            )}
          </div>
        </>
      )}

      {locOpen ? <LocationSheet onClose={() => setLocOpen(false)} /> : null}

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
