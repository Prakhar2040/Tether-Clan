import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { events, priceLabel, seatsLeft, venues } from '@shared/mock'
import { useRsvp } from '../state/rsvp'
import { useBuy } from '../components/BuySheet'
import { Brand } from '../components/shared'
import { GoingRow, WhoSheet } from '../components/WhoSheet'
import { SearchSuggestions } from '../components/SearchSuggestions'
import { useSearch } from '../hooks/useSearch'
import { useLocation } from '../state/location'
import { LocationChip, LocationSheet } from '../components/LocationPicker'
import { addDays, eventMatches, matchesWhen, todayYmd, useFilters, weekdayIndex, WEEKDAYS, whenTitle, ymdOf } from '../state/filters'
import type { When } from '../state/filters'
import type { HydratedEvent, SuggestionItem } from '../api/search'
import {
  BellIcon,
  CheckIcon,
  ChevronIcon,
  LogoMark,
  SearchIcon,
  SlidersIcon,
} from '../components/icons'
import type { TcEvent } from '@shared/types'



// Event-first card: the event leads, and an Instagram-style "who's going"
// row sits below it — tap it to open the attendee sheet.
// One entry in a list. For server results `area` comes from the venue the server
// joined on; for the offline fallback it comes from the local mock.
interface Row {
  e: TcEvent
  area: string
  km: number | null
}

/* "400 m", "2.1 km". Rounded hard on purpose — the position behind it can be
   a few hundred metres out, so a decimal would be claiming precision nobody
   has. */
export function distanceLabel(km: number | null): string | null {
  if (km === null || !Number.isFinite(km)) return null
  if (km < 0.1) return 'under 100 m'
  if (km < 1) return `${Math.round(km * 10) * 100} m`
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

function EventFeedCard({
  e,
  area,
  km,
  onWho,
}: {
  e: TcEvent
  area: string
  km: number | null
  onWho: (id: string) => void
}) {
  const { stateFor, markInterested } = useRsvp()
  const openBuy = useBuy()
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
            {e.timeLabel} · {area}
            {/* The list is ordered by this, so it has to be on screen —
                otherwise nearest-first looks like no order at all. */}
            {distanceLabel(km) ? ` · ${distanceLabel(km)}` : ''} · {priceLabel(e)}
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

function NewAreaFeed({ area, picks }: { area: string; picks: Row[] }) {
  const [notify, setNotify] = useState(false)
  return (
    <>
      <div className="empty-hero">
        <LogoMark size={44} muted />
        <h1 className="empty-title">Quiet in {area} tonight</h1>
        <p className="empty-sub">
          Nothing close by yet. Here's what's further out, and how to be the reason it isn't quiet.
        </p>
      </div>
      <div className="feed">
        {picks.length > 0 ? (
          <div className="card">
            <span className="tile-label">WORTH THE RIDE</span>
            {picks.map(({ e, area: where }) => (
              <Link key={e.id} to={`/event/${e.id}`} className="card-row event-title link">
                <span className="stack-2">
                  <span className="event-title" style={{ fontSize: 14.5 }}>{e.title}</span>
                  <span className="event-meta">
                    {e.dayLabel} {e.timeLabel} · {where} · {priceLabel(e).toLowerCase()}
                  </span>
                </span>
                <ChevronIcon size={16} color="#15477C" />
              </Link>
            ))}
          </div>
        ) : null}
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BellIcon size={20} color="#15477C" />
          <span className="stack-2" style={{ flex: 1 }}>
            <span className="tile-text" style={{ color: '#15477C', fontWeight: 800, fontSize: 13.5 }}>
              Tell me when {area} wakes up
            </span>
            <span className="person-note">One message when the first event lands nearby</span>
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Five rolling weeks from the Monday of this week, on the real calendar. Days before
// today are greyed; the dot marks days the local mock knows an event on.
function Calendar({ when, onPick }: { when: When; onPick: (ymd: string) => void }) {
  const today = todayYmd()
  const start = addDays(today, -weekdayIndex(today))
  const days = Array.from({ length: 35 }, (_, i) => addDays(start, i))
  const busy = new Set(
    Object.values(events).filter((e) => e.startsAt).map((e) => ymdOf(new Date(e.startsAt!))),
  )
  const isSel = (d: string) =>
    when === d ||
    (when === 'tonight' && d === today) ||
    (when === 'weekend' && matchesWhen({ dayLabel: '', startsAt: `${d}T12:00:00+05:30` }, 'weekend'))
  const monthOf = (ymd: string) => MONTH_NAMES[Number(ymd.slice(5, 7)) - 1]
  const first = monthOf(days[0])
  const last = monthOf(days[days.length - 1])
  return (
    <div className="stack-2" style={{ gap: 8 }}>
      <span className="cal-title">{first === last ? first : `${first} – ${last}`} {today.slice(0, 4)}</span>
      <div className="cal">
        {WEEKDAYS.map((w) => (
          <span className="cal-head" key={w}>{w[0]}</span>
        ))}
        {days.map((d) => (
          <button
            key={d}
            className={`cal-day${d < today ? ' off' : ''}${isSel(d) ? ' sel' : ''}`}
            disabled={d < today}
            onClick={() => onPick(d)}
          >
            {Number(d.slice(8))}
            {busy.has(d) && !isSel(d) && d >= today ? <span className="dot" /> : null}
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
  const q = query.trim().toLowerCase()

  // The server drives every list: /api/search with the viewer's position. If it
  // is unreachable we fall back to filtering the local mock - worse results,
  // never a broken screen.
  const { result, offline } = useSearch({
    q: query,
    when,
    free: freeOnly,
    beginner: beginnerOnly,
    tags: selectedTags,
    lat: place.lat,
    lng: place.lng,
    // Nothing to reach in a standalone build; local filtering covers it.
    enabled: !import.meta.env.VITE_STANDALONE,
  })

  const mockRow = (e: TcEvent): Row => {
    const v = venues[e.venueId]
    return { e, area: v.areaName, km: distanceKm(v.lat, v.lng) }
  }
  // The same predicate the Map applies, so the two screens cannot disagree.
  const localRows = Object.values(events)
    .filter((e) =>
      eventMatches(e, { when, freeOnly, beginnerOnly, selectedTags, query }, venues[e.venueId].name),
    )
    .map(mockRow)

  // Server rows carry the event as the server knows it. Detail screens still read
  // the mock by the same id; a miss there is handled on that screen.
  const toRow = (h: HydratedEvent): Row => ({
    e: h,
    area: h.venue.areaName ?? h.venue.area,
    km: h.venue.distanceKm,
  })
  const serverRows = result && !offline ? result.hydrated.map(toRow) : null
  const unsorted = serverRows ?? localRows

  // With no search term, nearest first - everything on screen is the same day,
  // so distance is the useful axis. Unknown distances go last. A search keeps
  // the engine's relevance order.
  const filtered =
    query.trim() === ''
      ? [...unsorted].sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))
      : unsorted
  const fallbackRows = result && !offline ? (result.fallbackHydrated ?? []).map(toRow) : []

  const allTags = [...new Set([...unsorted.flatMap((r) => r.e.tags ?? []), ...selectedTags])].sort()

  // Nothing at all tonight, nothing typed or filtered: say the area is quiet.
  const quiet =
    serverRows !== null &&
    serverRows.length === 0 &&
    when === 'tonight' &&
    q === '' &&
    !freeOnly &&
    !beginnerOnly &&
    selectedTags.length === 0

  /* A plan somebody paid to place. Deliberately drawn from outside what the
     filters returned - a promoted item that was going to appear anyway is not
     a placement, it is a label on a coincidence. */
  const promoted = useMemo(() => {
    const shown = new Set(filtered.map((r) => r.e.id))
    return Object.values(events).find(
      (e) => !shown.has(e.id) && !e.liveNow && e.price > 0 && e.dayLabel !== 'Past',
    )
  }, [filtered])

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))


  const { title, sub } = whenTitle(when)
  const whoSheetEvent = whoFor ? (filtered.find((r) => r.e.id === whoFor)?.e ?? events[whoFor]) : undefined

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
        <NewAreaFeed area={place.label} picks={fallbackRows} />
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
                {fallbackRows.length > 0 ? (
                  <div className="fallback-block" style={{ width: '100%', marginTop: 12 }}>
                    <span className="fallback-title">Worth the ride</span>
                    {fallbackRows.map(({ e, area: where }) => (
                      <Link key={e.id} to={`/event/${e.id}`} className="card-row event-title link">
                        <span className="stack-2">
                          <span className="event-title" style={{ fontSize: 14.5 }}>{e.title}</span>
                          <span className="event-meta">
                            {e.dayLabel} {e.timeLabel} · {where}
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
              filtered.map(({ e, area, km }, i) => (
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
                    <EventFeedCard e={e} area={area} km={km} onWho={setWhoFor} />
                  )}
                </Fragment>
              ))
            )}
          </div>
        </>
      )}

      {locOpen ? <LocationSheet onClose={() => setLocOpen(false)} /> : null}

      {whoSheetEvent ? <WhoSheet e={whoSheetEvent} onClose={() => setWhoFor(null)} /> : null}

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
                className={when === addDays(todayYmd(), 1) ? 'chip active' : 'chip'}
                onClick={() => setWhen(addDays(todayYmd(), 1))}
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
            <Calendar when={when} onPick={(d) => setWhen(d === todayYmd() ? 'tonight' : d)} />

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
