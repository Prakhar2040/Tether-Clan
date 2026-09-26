import { useMemo, useState } from 'react'
import { membersOf, roster } from '@app/data/roster'
import type { Member } from '@app/data/roster'
import { useHostCommunity } from '../state/host'
import { CogIcon, PeopleIcon, SearchIcon } from '../components/icons'
import { TIER_MEANING, tierOf, useBadges } from '../state/badges'
import type { Tier } from '../state/badges'
import Insignia from '../components/Insignia'

type Slice = 'all' | 'admins' | 'new' | 'regulars' | 'lapsed'
type Col = 'name' | 'attended' | 'noShows' | 'lastSeen' | 'joined'

const COLS: { id: Col; label: string; numeric: boolean }[] = [
  { id: 'name', label: 'Name', numeric: false },
  { id: 'attended', label: 'Been to', numeric: true },
  { id: 'noShows', label: 'Missed', numeric: true },
  { id: 'lastSeen', label: 'Last seen', numeric: true },
  { id: 'joined', label: 'Joined', numeric: true },
]

const SLICES: { id: Slice; label: string; hint: string }[] = [
  { id: 'all', label: 'Everyone', hint: 'Newest first' },
  { id: 'new', label: 'Joined recently', hint: 'In the last three months' },
  { id: 'regulars', label: 'Regulars', hint: 'At or above the regular threshold' },
  { id: 'lapsed', label: 'Drifted off', hint: 'Not seen in two months' },
  { id: 'admins', label: 'Runs it', hint: 'You and your admins' },
]

function Avatar({ id, size = 34 }: { id: string; size?: number }) {
  const p = roster[id]
  return (
    <span
      className={`av av-${p?.color ?? 'tint'}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {p?.initials ?? '··'}
    </span>
  )
}

export default function Members() {
  const { community } = useHostCommunity()
  const [slice, setSlice] = useState<Slice>('all')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [sort, setSort] = useState<{ col: Col; desc: boolean }>({ col: 'attended', desc: true })
  const [tuning, setTuning] = useState(false)
  const { config, dirty, set, revert, save } = useBadges()

  // Click a column to sort by it; click it again to flip. Numbers start
  // high-to-low, names start A-Z, because that is what each one is for.
  const bump = (col: Col) =>
    setSort((s) =>
      s.col === col ? { col, desc: !s.desc } : { col, desc: COLS.find((c) => c.id === col)!.numeric },
    )

  const all = useMemo(() => membersOf(community.id), [community.id])

  const counts = useMemo(
    () => ({
      all: all.length,
      admins: all.filter((m) => m.role !== 'member').length,
      new: all.filter((m) => m.monthsIn <= 3).length,
      regulars: all.filter((m) => m.attended >= config.regularAt).length,
      lapsed: all.filter((m) => m.lastSeenWeeks >= 8).length,
      veterans: all.filter((m) => m.attended >= config.veteranAt).length,
    }),
    [all, config.regularAt, config.veteranAt],
  )

  const shown = useMemo(() => {
    const bySlice = all.filter((m) => {
      if (slice === 'admins') return m.role !== 'member'
      if (slice === 'new') return m.monthsIn <= 3
      if (slice === 'regulars') return m.attended >= config.regularAt
      if (slice === 'lapsed') return m.lastSeenWeeks >= 8
      return true
    })
    const needle = q.trim().toLowerCase()
    const byName = needle
      ? bySlice.filter((m) => roster[m.personId]?.name.toLowerCase().includes(needle))
      : bySlice

    const key = (m: Member): number | string => {
      switch (sort.col) {
        case 'name':
          return roster[m.personId]?.name ?? m.personId
        case 'attended':
          return m.attended
        case 'noShows':
          return m.noShows
        case 'lastSeen':
          // Fewer weeks ago is more recent, so invert to keep "desc" meaning
          // "most recently here first".
          return -m.lastSeenWeeks
        case 'joined':
          return -m.monthsIn
      }
    }

    return [...byName].sort((a, b) => {
      const ka = key(a)
      const kb = key(b)
      const cmp = typeof ka === 'string' ? ka.localeCompare(kb as string) : (ka as number) - (kb as number)
      return sort.desc ? -cmp : cmp
    })
  }, [all, slice, q, sort, config.regularAt])

  const one: Member | undefined = picked ? all.find((m) => m.personId === picked) : undefined
  const person = one ? roster[one.personId] : undefined

  return (
    <div className="page split">
      <div className="split-main">
        <div className="tiles">
          <div className="tile">
            <span className="tile-label">Members</span>
            <span className="tile-n">{counts.all}</span>
            <span className="tile-note">{counts.admins} of them run it with you</span>
          </div>
          <div className="tile">
            <span className="tile-label">Joined recently</span>
            <span className="tile-n">{counts.new}</span>
            <span className="tile-note good">in the last three months</span>
          </div>
          <div className="tile">
            <span className="tile-label">Veterans</span>
            <span className="tile-n">{counts.veterans}</span>
            <span className="tile-note">{config.veteranAt}+ nights · {counts.regulars} regulars</span>
          </div>
          <div className="tile">
            <span className="tile-label">Drifted off</span>
            <span className="tile-n">{counts.lapsed}</span>
            <span className={counts.lapsed > 0 ? 'tile-note warn' : 'tile-note'}>
              not seen in two months
            </span>
          </div>
        </div>

        <div className="finder">
          <span className="search">
            <SearchIcon size={15} strokeWidth={2.2} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${counts.all} members by name`}
            />
            {q ? (
              <button className="search-x" onClick={() => setQ('')} aria-label="Clear">
                ×
              </button>
            ) : null}
          </span>
          <div className="slices">
            <button
              className={tuning ? 'slice on tune' : 'slice tune'}
              onClick={() => setTuning(!tuning)}
              title="Change where the badges sit"
            >
              <CogIcon size={13} strokeWidth={2.1} />
              Badges
            </button>
            {SLICES.map((s) => (
              <button
                key={s.id}
                className={slice === s.id ? 'slice on' : 'slice'}
                onClick={() => setSlice(s.id)}
                title={s.hint}
              >
                {s.label}
                <b>{counts[s.id]}</b>
              </button>
            ))}
          </div>
        </div>

        {/* Thresholds move. A number baked into the code is a number that
            will be wrong in six months. */}
        {tuning ? (
          <section className="tuner">
            <div className="tuner-row">
              <div className="tuner-field">
                <span className="field-label">Regular at</span>
                <div className="stepper">
                  <button onClick={() => set('regularAt', Math.max(1, config.regularAt - 1))}>−</button>
                  <input
                    value={config.regularAt}
                    onChange={(e) => set('regularAt', Math.max(1, Number(e.target.value) || 1))}
                  />
                  <button onClick={() => set('regularAt', config.regularAt + 1)}>+</button>
                </div>
                <span className="field-hint">{counts.regulars} people qualify</span>
              </div>

              <div className="tuner-field">
                <span className="field-label">Veteran at</span>
                <div className="stepper">
                  <button
                    onClick={() => set('veteranAt', Math.max(config.regularAt + 1, config.veteranAt - 1))}
                  >
                    −
                  </button>
                  <input
                    value={config.veteranAt}
                    onChange={(e) =>
                      set('veteranAt', Math.max(config.regularAt + 1, Number(e.target.value) || 1))
                    }
                  />
                  <button onClick={() => set('veteranAt', config.veteranAt + 1)}>+</button>
                </div>
                <span className="field-hint">{counts.veterans} people qualify</span>
              </div>

              <div className="tuner-field wide">
                <span className="field-label">Not been yet</span>
                <div className="tuner-toggle">
                  <button
                    className={config.firstNight ? 'switch on' : 'switch'}
                    onClick={() => set('firstNight', !config.firstNight)}
                    role="switch"
                    aria-checked={config.firstNight}
                    aria-label="Label people who have not been yet"
                  >
                    <span className="switch-knob" />
                  </button>
                  <span className="field-hint">
                    Flags anyone who joined but has never turned up — the moment you lose people.
                  </span>
                </div>
              </div>
            </div>

            <div className="ladder">
              {(['first-night', 'regular', 'veteran'] as Exclude<Tier, null>[]).map((t) => (
                <div className="rung" key={t}>
                  <span className={`mtag ${t} big`}>
                    <Insignia tier={t} size={15} />
                  </span>
                  <div className="rung-text">
                    <input
                      className="rung-name"
                      value={config.names[t]}
                      onChange={(e) => set('names', { ...config.names, [t]: e.target.value })}
                      aria-label={`Name for ${t}`}
                    />
                    <span className="field-hint">
                      {TIER_MEANING[t]} ·{' '}
                      {t === 'veteran'
                        ? `${config.veteranAt}+ nights`
                        : t === 'regular'
                          ? `${config.regularAt}+ nights`
                          : 'no nights yet'}
                    </span>
                  </div>
                  <span className="rung-count">
                    {t === 'veteran'
                      ? counts.veterans
                      : t === 'regular'
                        ? counts.regulars - counts.veterans
                        : all.filter((m) => m.attended === 0).length}
                  </span>
                </div>
              ))}
            </div>

            <div className="tuner-foot">
              <span className="field-hint">
                The highest badge somebody has earned is the one that shows. Nobody sees these but
                you — for now.
              </span>
              <div className="editor-actions">
                <button className="btn btn-ghost" onClick={revert} disabled={!dirty}>
                  Revert
                </button>
                <button className="btn btn-primary" onClick={save} disabled={!dirty}>
                  {dirty ? 'Save' : 'Saved'}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="roster">
          <div className="roster-head">
            {COLS.map((c) => (
              <button
                key={c.id}
                className={[
                  'sortcol',
                  c.numeric ? 'col-num' : '',
                  sort.col === c.id ? 'on' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => bump(c.id)}
                aria-label={`Sort by ${c.label}`}
              >
                {c.label}
                <span className="arrow">{sort.col === c.id ? (sort.desc ? '↓' : '↑') : '↕'}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="roster-empty">
              <PeopleIcon size={22} strokeWidth={1.9} />
              <span>Nobody matches “{q}” in {SLICES.find((s) => s.id === slice)?.label}</span>
            </div>
          ) : (
            shown.map((m) => {
              const p = roster[m.personId]
              const tier = tierOf(m.attended, config)
              return (
                <button
                  className={picked === m.personId ? 'mrow on' : 'mrow'}
                  key={m.personId}
                  onClick={() => setPicked(picked === m.personId ? null : m.personId)}
                >
                  <span className="mrow-who">
                    <Avatar id={m.personId} />
                    <span className="mrow-name">
                      {p?.name ?? m.personId}
                      {m.role !== 'member' ? (
                        <span className={`mtag ${m.role}`}>{m.role}</span>
                      ) : null}
                      {tier ? (
                        <span className={`mtag ${tier}`}>
                          <Insignia tier={tier} />
                          {config.names[tier]}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="col-num strong">{m.attended}</span>
                  <span className={m.noShows > 0 ? 'col-num warn' : 'col-num faint'}>
                    {m.noShows || '—'}
                  </span>
                  <span className="col-when">{m.lastSeenLabel}</span>
                  <span className="col-when faint">{m.joinedLabel}</span>
                </button>
              )
            })
          )}
        </div>

        <p className="roster-foot">
          Showing {shown.length} of {counts.all}. This list exists here and nowhere else — members
          never see who else is in the room.
        </p>
      </div>

      <aside className="split-side">
        {one && person ? (
          <div className="card-person">
            <div className="cp-head">
              <Avatar id={one.personId} size={56} />
              <div className="cp-text">
                <span className="cp-name">{person.name}</span>
                <span className="cp-role">
                  {one.role === 'member' ? 'Member' : one.role} · joined {one.joinedLabel}
                </span>
              </div>
            </div>

            <div className="cp-stats">
              <div>
                <span className="cp-n">{one.attended}</span>
                <span className="cp-l">nights here</span>
              </div>
              <div>
                <span className="cp-n">{one.noShows}</span>
                <span className="cp-l">missed without cancelling</span>
              </div>
              <div>
                <span className="cp-n">{one.monthsIn}</span>
                <span className="cp-l">months in</span>
              </div>
            </div>

            <p className="cp-read">
              {one.role !== 'member'
                ? `Helps you run ${community.name}.`
                : one.attended >= 8
                  ? 'A regular. Worth asking before you change anything about the night.'
                  : one.monthsIn <= 3
                    ? 'Still new. Worth saying hello to by name at the door.'
                    : /month/.test(one.lastSeenLabel)
                      ? `Not seen since ${one.lastSeenLabel}. A message might bring them back.`
                      : 'Turns up when they can.'}
            </p>

            <div className="cp-actions">
              <button className="btn btn-ghost" disabled>
                Make an admin
              </button>
              <button className="btn btn-ghost" disabled>
                Remove
              </button>
            </div>
            <span className="field-hint">Both land with the rest of member management.</span>
          </div>
        ) : (
          <div className="card-person empty">
            <PeopleIcon size={26} strokeWidth={1.8} />
            <span className="cp-empty-t">Pick somebody</span>
            <span className="cp-empty-s">
              Their history opens here — how often they come, what they have missed, and how long
              they have been around.
            </span>
          </div>
        )}
      </aside>
    </div>
  )
}
