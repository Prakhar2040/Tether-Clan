import { useState } from 'react'
import type { FormEvent } from 'react'
import { venues } from '@shared/mock'
import { useRemote } from '@app/hooks/useRemote'
import { useHostCommunity } from '../state/host'
import { usePlans } from '../state/plans'
import { DoorDenied, fetchDoor, hostUserId, scanTicket } from '../api/door'
import type { DoorTicket, DoorView, ScanOutcome } from '../api/door'
import { CheckIcon, PeopleIcon, ScanIcon, SearchIcon } from '../components/icons'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type DoorData = DoorView & { denied?: string }

const EMPTY: DoorData = {
  event: { id: '', title: '', capacity: 0 },
  tickets: [],
  sold: 0,
  walkIns: [],
}

const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

/* What a scan said, in words a person at a door can read at a glance. */
function describe(o: ScanOutcome): { tone: 'ok' | 'warn' | 'bad'; text: string } {
  switch (o.kind) {
    case 'ok':
      return {
        tone: 'ok',
        text:
          o.qty > 1
            ? `Scanned ✓ ${o.name} · seat ${o.scanned} of ${o.qty}`
            : `Scanned ✓ ${o.name}`,
      }
    case 'already':
      return {
        tone: 'warn',
        text: `Already scanned at ${clock(o.scannedAt) || 'an earlier time'} · ${o.name}`,
      }
    case 'refused':
      return { tone: 'bad', text: o.message }
    case 'unreachable':
      return { tone: 'bad', text: 'Cannot reach the server. Nothing was scanned, try again.' }
  }
}

const TONES = {
  ok: { background: 'var(--green-bg)', color: 'var(--green)' },
  warn: { background: '#FFF3D6', color: '#8A5A00' },
  bad: { background: '#FCE4E0', color: '#A32A1A' },
}

export default function Door() {
  const { owner } = useHostCommunity()
  const { plans } = usePlans()
  const as = hostUserId(owner?.id)

  const doorable = plans.filter((p) => p.status !== 'draft')
  const [planId, setPlanId] = useState(doorable[0]?.id ?? '')
  const plan = doorable.find((p) => p.id === planId) ?? doorable[0]

  const [q, setQ] = useState('')
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ScanOutcome | null>(null)
  const [tick, setTick] = useState(0)

  // The door's one source of truth is the server; every scan refreshes it.
  const { data, offline } = useRemote<DoorData>(
    (signal) =>
      fetchDoor(plan?.id ?? '', as, signal).catch((e) => {
        if (e instanceof DoorDenied) return { ...EMPTY, denied: e.message }
        throw e
      }),
    EMPTY,
    [plan?.id, as, tick],
  )

  if (!plan) {
    return (
      <div className="page">
        <div className="soon">
          <span className="soon-tag">Nothing to open</span>
          <span className="soon-title">No published plan to check anybody into</span>
          <p className="soon-body">Publish a plan and the door opens on it.</p>
        </div>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const typed = ref.trim()
    if (!typed || busy) return
    setBusy(true)
    const out = await scanTicket(plan.id, typed, as)
    setBusy(false)
    setResult(out)
    if (out.kind !== 'unreachable') {
      setRef('')
      setTick((t) => t + 1)
    }
  }

  const tickets = data.tickets
  const here = tickets.filter((t) => t.scannedAt)
  const waiting = tickets.filter((t) => !t.scannedAt)
  const needle = q.trim().toLowerCase()
  const match = (t: DoorTicket) =>
    !needle || t.name.toLowerCase().includes(needle) || t.ref.toLowerCase().includes(needle)
  const shown = waiting.filter(match)
  const shownHere = here.filter(match)

  const d = new Date(`${plan.date}T00:00:00`)
  const pct = tickets.length === 0 ? 0 : Math.round((here.length / tickets.length) * 100)
  const said = result ? describe(result) : null

  const row = (t: DoorTicket, inside: boolean) => (
    <div className={inside ? 'door-row in' : 'door-row'} key={t.ref}>
      <span className="av av-tint" style={{ width: 30, height: 30, fontSize: 11 }}>
        {initialsOf(t.name)}
      </span>
      <span className="door-who">
        <span className="door-name">{t.name}</span>
        <span className="door-ref">{t.ref}</span>
      </span>
      {inside ? (
        <span className="door-state in">
          <CheckIcon size={13} strokeWidth={2.8} /> In at {clock(t.scannedAt)}
        </span>
      ) : (
        <span className="door-state">Yet to arrive</span>
      )}
    </div>
  )

  return (
    <div className="page door">
      <div className="door-head">
        <div className="door-plan">
          <select
            value={plan.id}
            onChange={(e) => {
              setPlanId(e.target.value)
              setResult(null)
            }}
            aria-label="Which night"
          >
            {doorable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || 'Untitled plan'} · {DAYS[new Date(`${p.date}T00:00:00`).getDay()]}{' '}
                {new Date(`${p.date}T00:00:00`).getDate()}{' '}
                {MON[new Date(`${p.date}T00:00:00`).getMonth()]}
              </option>
            ))}
          </select>
          <span className="door-where">
            {venues[plan.venueId]?.name} · {DAYS[d.getDay()]} {d.getDate()} {MON[d.getMonth()]} ·{' '}
            {plan.time}
          </span>
        </div>

        <div className="door-count">
          <span className="door-n">
            {here.length}
            <em>/{tickets.length}</em>
          </span>
          <span className="door-l">seats through the door</span>
          <span className="door-bar">
            <span className="door-fill" style={{ width: `${pct}%` }} />
          </span>
        </div>
      </div>

      {offline ? (
        <div className="roster-empty" role="alert">
          <span>
            Cannot reach the server. The list below may be out of date and scans will not go through.
          </span>
        </div>
      ) : null}
      {data.denied ? (
        <div className="roster-empty" role="alert">
          <span>{data.denied}</span>
        </div>
      ) : null}

      <form className="door-tools" onSubmit={submit}>
        <span className="search">
          <ScanIcon size={15} strokeWidth={2.2} />
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Type the ticket ref, e.g. TC-7KQ4M2XD"
            aria-label="Ticket ref"
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </span>
        <button className="btn btn-primary scan" type="submit" disabled={busy || !ref.trim()}>
          <ScanIcon size={16} strokeWidth={2.1} /> {busy ? 'Scanning…' : 'Scan'}
        </button>
      </form>
      {said ? (
        <div
          role="status"
          style={{
            margin: '0 0 14px',
            padding: '10px 14px',
            borderRadius: 10,
            fontWeight: 700,
            ...TONES[said.tone],
          }}
        >
          {said.text}
        </div>
      ) : null}

      <div className="door-tools">
        <span className="search">
          <SearchIcon size={15} strokeWidth={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a name or a ticket"
          />
          {q ? (
            <button type="button" className="search-x" onClick={() => setQ('')} aria-label="Clear">
              ×
            </button>
          ) : null}
        </span>
      </div>

      <div className="door-body">
        <section className="door-col">
          <span className="door-sub">
            Yet to arrive · {needle ? `${shown.length} of ${waiting.length}` : waiting.length}
          </span>
          <div className="door-list">
            {shown.length === 0 ? (
              <div className="roster-empty">
                <PeopleIcon size={22} strokeWidth={1.9} />
                <span>{needle ? `Nobody still outside matches “${q}”` : 'Everybody is in.'}</span>
              </div>
            ) : (
              shown.map((t) => row(t, false))
            )}
          </div>
        </section>

        <section className="door-col">
          <span className="door-sub">
            Arrived · {needle ? `${shownHere.length} of ${here.length}` : here.length}
          </span>
          <div className="door-list">
            {shownHere.length === 0 ? (
              <div className="roster-empty">
                <CheckIcon size={20} strokeWidth={2} />
                <span>
                  {needle ? `Nobody arrived matches “${q}”` : 'Nobody yet. The first scan lands here.'}
                </span>
              </div>
            ) : (
              [...shownHere]
                .sort((a, b) => (b.scannedAt ?? '').localeCompare(a.scannedAt ?? ''))
                .map((t) => row(t, true))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
