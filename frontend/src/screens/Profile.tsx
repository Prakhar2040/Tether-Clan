import { Link } from 'react-router-dom'
import { communities } from '../data/community'
import { competitionsOf, standings } from '../data/leaderboard'
import { events } from '../data/mock'
import { joinedLabel, me, myArea, nextRung, nightsIn, TIER, tierFor } from '../data/me'
import { useCommunities } from '../state/communities'
import { useRsvp } from '../state/rsvp'
import { useLocation } from '../state/location'
import { Brand } from '../components/shared'
import { BellIcon, ChevronIcon, LockIcon, PinIcon } from '../components/icons'

function nth(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

export default function Profile() {
  const { joinedIds } = useCommunities()
  const { stateFor } = useRsvp()
  const { place } = useLocation()

  const mine = joinedIds.map((id) => communities[id]).filter(Boolean)

  const history = Object.values(events).map((e) => stateFor(e.id))
  const went = history.filter((s) => s === 'attended').length
  const missed = history.filter((s) => s === 'no-showed').length
  const coming = history.filter((s) => s === 'going' || s === 'checked-in').length

  // Every competition you have a placing in, newest first.
  const results = mine
    .flatMap((c) =>
      competitionsOf(c.id)
        .map((comp) => ({ comp, community: c, mine: comp.results.find((r) => r[0] === 'you') }))
        .filter((r) => r.mine),
    )
    .sort((a, b) => b.comp.date.localeCompare(a.comp.date))

  const wins = results.filter((r) => r.mine![1] === 1).length
  const podiums = results.filter((r) => r.mine![1] <= 3).length

  return (
    <div className="screen">
      <div className="top-row">
        <Brand />
      </div>

      <header className="me-head">
        <span className={`avatar avatar-${me.color} me-avatar`}>{me.initials}</span>
        <h1 className="me-name">{me.name}</h1>
        <span className="me-sub">
          {myArea} · here since {joinedLabel}
        </span>
      </header>

      <div className="me-stats">
        <div className="me-stat">
          <span className="me-n">{went}</span>
          <span className="me-l">nights been to</span>
        </div>
        <div className="me-stat">
          <span className="me-n">{results.length}</span>
          <span className="me-l">competitions entered</span>
        </div>
        <div className="me-stat">
          <span className="me-n">{podiums}</span>
          <span className="me-l">
            podium{podiums === 1 ? '' : 's'}
            {wins > 0 ? ` · ${wins} won` : ''}
          </span>
        </div>
        <div className="me-stat">
          <span className={missed > 0 ? 'me-n warn' : 'me-n'}>{missed}</span>
          <span className="me-l">missed without cancelling</span>
        </div>
      </div>

      <div className="me-body">
        <section className="me-block">
          <span className="about-label">Where you stand</span>
          {mine.map((c) => {
            const nights = nightsIn[c.id] ?? 0
            const tier = tierFor(nights)
            const next = nextRung(nights)
            const table = standings(c.id)
            const you = table.find((r) => r.isYou)
            return (
              <Link to={`/community/${c.id}`} className="me-comm" key={c.id}>
                <span className="me-comm-top">
                  <span className="me-mark" style={{ background: c.color }}>
                    {c.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                  </span>
                  <span className="stack-2" style={{ flex: 1, minWidth: 0 }}>
                    <span className="me-comm-name">{c.name}</span>
                    <span className="me-comm-meta">{nights} nights · {c.areaName}</span>
                  </span>
                  <ChevronIcon size={15} color="#A79F8C" />
                </span>

                <span className={`me-tier ${tier}`}>
                  {TIER[tier].label}
                  <em>{TIER[tier].note}</em>
                </span>

                {next ? (
                  <span className="me-next">
                    <span className="me-bar">
                      <span
                        className="me-fill"
                        style={{
                          width: `${Math.min(100, Math.round((nights / (nights + next.needed)) * 100))}%`,
                          background: c.color,
                        }}
                      />
                    </span>
                    {next.needed} more and you are {next.label.toLowerCase()}
                  </span>
                ) : null}

                {you ? (
                  <span className="me-rank">
                    <b>
                      {you.rank}
                      {nth(you.rank)}
                    </b>{' '}
                    of {table.length} all time · {you.points} points · best finish {you.best}
                    {nth(you.best)}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </section>

        {results.length > 0 ? (
          <section className="me-block">
            <span className="about-label">Your results</span>
            <div className="me-results">
              {results.slice(0, 6).map(({ comp, community, mine: r }) => (
                <div className="me-res" key={comp.id}>
                  <span className={`me-place p${r![1] <= 3 ? r![1] : 'x'}`}>
                    {r![1]}
                    <em>{nth(r![1])}</em>
                  </span>
                  <span className="stack-2" style={{ flex: 1, minWidth: 0 }}>
                    <span className="me-res-name">{comp.name}</span>
                    <span className="me-res-meta">
                      {comp.dateLabel} · {community.name}
                    </span>
                  </span>
                  <span className="me-res-of">of {comp.entrants}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="me-block">
          <span className="about-label">Coming up</span>
          <Link to="/plans" className="me-row">
            <span className="stack-2" style={{ flex: 1 }}>
              <span className="me-row-t">
                {coming === 0 ? 'Nothing booked' : `${coming} plan${coming === 1 ? '' : 's'} booked`}
              </span>
              <span className="me-row-s">
                {coming === 0 ? 'The Events tab knows what is on' : 'Tickets live in My plans'}
              </span>
            </span>
            <ChevronIcon size={15} color="#A79F8C" />
          </Link>
        </section>

        <section className="me-block">
          <span className="about-label">Settings</span>
          <div className="me-list">
            <button className="me-row">
              <PinIcon size={16} color="#6B665A" strokeWidth={2.1} />
              <span className="stack-2" style={{ flex: 1 }}>
                <span className="me-row-t">{place.label}</span>
                <span className="me-row-s">What counts as near you</span>
              </span>
              <ChevronIcon size={15} color="#A79F8C" />
            </button>
            <button className="me-row">
              <BellIcon size={16} color="#6B665A" strokeWidth={2.1} />
              <span className="stack-2" style={{ flex: 1 }}>
                <span className="me-row-t">Notifications</span>
                <span className="me-row-s">Announcements, and when a plan you hold changes</span>
              </span>
              <ChevronIcon size={15} color="#A79F8C" />
            </button>
          </div>
        </section>

        {/* Worth stating, since it is the thing that makes the rest safe. */}
        <div className="me-privacy">
          <LockIcon size={16} color="#15477C" strokeWidth={2} />
          <span className="stack-2">
            <span className="me-row-t">Nobody can see where you will be</span>
            <span className="me-row-s">
              Your badges, your record and your plans are yours alone. Other members never see
              which nights you are going to — and you never see theirs.
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
