import { useState } from 'react'
import { venues } from '@shared/mock'
import { useHostCommunity } from '../state/host'
import { usePhotos } from '../state/photos'
import { usePlans, seriesLabel } from '../state/plans'
import type { Plan, PlanStatus } from '../state/plans'
import PlanPreview from '../components/PlanPreview'
import { useNavigate } from 'react-router-dom'
import { BackIcon, ChatIcon, PlusIcon, ScanIcon, TicketIcon } from '../components/icons'
import { NOW } from '@shared/mock'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function stamp(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return { dow: DAYS[d.getDay()].toUpperCase(), day: String(d.getDate()), mon: MON[d.getMonth()] }
}

const STATUS: Record<PlanStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'draft' },
  'on-sale': { label: 'On sale', cls: 'live' },
  closed: { label: 'Closed', cls: 'sold' },
  past: { label: 'Run', cls: 'past' },
}

// What to say about a night, in words. A percentage bar is precise and
// silent; "3 places left" is the thing a host acts on.
function urgency(p: Plan): { text: string; tone: string } {
  const left = p.capacity - p.sold
  if (p.status === 'draft') return { text: 'Draft · nobody can see this', tone: 'draft' }
  if (p.status === 'closed') return { text: 'Sales closed', tone: 'shut' }
  if (left <= 0) return { text: 'Sold out', tone: 'shut' }
  if (left <= 3) return { text: `${left} place${left === 1 ? '' : 's'} left`, tone: 'tight' }
  return { text: `${p.sold} of ${p.capacity} taken`, tone: 'ok' }
}

function daysOut(iso: string): number {
  const d = new Date(`${iso}T00:00:00`).getTime()
  const now = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()).getTime()
  return Math.round((d - now) / 86400000)
}

function whenWord(iso: string): string {
  const n = daysOut(iso)
  if (n < 0) return 'Past'
  if (n === 0) return 'Tonight'
  if (n === 1) return 'Tomorrow'
  const { dow, day, mon } = stamp(iso)
  return `${dow} ${day} ${mon}`
}

export default function Plans() {
  const navigate = useNavigate()
  const { community } = useHostCommunity()
  const { photos, coverId } = usePhotos()
  const { plans, dirty, get, update, create, publish, close, reopen, duplicate, remove, revert, save } =
    usePlans()

  const [openId, setOpenId] = useState<string | null>(null)
  const [face, setFace] = useState<'row' | 'plan'>('row')
  const open = openId ? get(openId) : undefined
  const cover = photos.find((p) => p.id === coverId)?.src

  const field = (patch: Partial<Plan>) => open && update(open.id, patch)

  // ---- The editor ----
  if (open) {
    const full = open.sold >= open.capacity
    return (
      <div className="page split">
        <div className="split-main">
          <div className="editor-head">
            <button className="plan-back" onClick={() => setOpenId(null)}>
              <BackIcon size={14} /> All plans
            </button>
            <div className="editor-actions">
              {open.status === 'draft' ? (
                <button
                  className="btn btn-primary"
                  disabled={!open.title.trim()}
                  onClick={() => publish(open.id)}
                >
                  Publish
                </button>
              ) : open.status === 'on-sale' ? (
                <button className="btn btn-ghost" onClick={() => close(open.id)}>
                  Close sales
                </button>
              ) : open.status === 'closed' ? (
                <button className="btn btn-ghost" onClick={() => reopen(open.id)}>
                  Reopen
                </button>
              ) : null}
              <button className="btn btn-ghost" onClick={() => setOpenId(duplicate(open.id).id)}>
                Duplicate
              </button>
            </div>
          </div>

          <section className="optgroup">
            <div className="optgroup-head">
              <TicketIcon size={15} strokeWidth={2.1} />
              <span>The night</span>
            </div>
            <div className="opt-field">
              <label className="field">
                <span className="field-label">Title</span>
                <input
                  value={open.title}
                  autoFocus={!open.title}
                  onChange={(e) => field({ title: e.target.value })}
                  placeholder="Board Game Saturday · 40+ on the shelf"
                />
              </label>
            </div>
            <div className="opt-field">
              <label className="field">
                <span className="field-label">What to expect</span>
                <textarea
                  rows={3}
                  value={open.description}
                  onChange={(e) => field({ description: e.target.value })}
                  placeholder="Four hours, open shelf, tables reshuffle as games end."
                />
              </label>
            </div>
            <div className="opt-field">
              <label className="field">
                <span className="field-label">Theme</span>
                <textarea
                  rows={2}
                  value={open.theme}
                  onChange={(e) => field({ theme: e.target.value })}
                  placeholder="Teaching table. Rules from scratch at 7:50, then two boards."
                />
                <span className="field-hint">
                  What this particular night is about. Prints on the pass, and is the one thing a
                  regular reads before deciding.
                </span>
              </label>
            </div>
          </section>

          <section className="optgroup">
            <div className="optgroup-head">
              <span>When and where</span>
            </div>
            <div className="opt-field">
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Date</span>
                  <input type="date" value={open.date} onChange={(e) => field({ date: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-label">Start</span>
                  <input type="time" value={open.time} onChange={(e) => field({ time: e.target.value })} />
                </label>
              </div>
            </div>
            <div className="opt-field">
              <label className="field">
                <span className="field-label">Venue</span>
                <select value={open.venueId} onChange={(e) => field({ venueId: e.target.value })}>
                  {Object.values(venues).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.areaName}
                    </option>
                  ))}
                </select>
                <span className="field-hint">
                  {venues[open.venueId]?.entranceNote ?? 'No entrance note on this venue.'}
                </span>
              </label>
            </div>
          </section>

          <section className="optgroup">
            <div className="optgroup-head">
              <span>Places and price</span>
            </div>
            <div className="opt-field">
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Places</span>
                  <div className="stepper">
                    <button onClick={() => field({ capacity: Math.max(1, open.capacity - 1) })}>−</button>
                    <input
                      value={open.capacity}
                      onChange={(e) => field({ capacity: Math.max(1, Number(e.target.value) || 1) })}
                    />
                    <button onClick={() => field({ capacity: open.capacity + 1 })}>+</button>
                  </div>
                  <span className={full ? 'field-hint warnhint' : 'field-hint'}>
                    {open.sold} taken{full ? ' · this is now sold out' : ''}
                  </span>
                </label>

                <div className="field">
                  <span className="field-label">Price</span>
                  <div className="choice">
                    <button
                      className={open.price === 0 ? 'pick on' : 'pick'}
                      onClick={() => field({ price: 0 })}
                    >
                      Free
                      <span>a place is reserved, not bought</span>
                    </button>
                    <button
                      className={open.price > 0 ? 'pick on' : 'pick'}
                      onClick={() => field({ price: open.price || 350 })}
                    >
                      Paid
                      <span>members buy a ticket</span>
                    </button>
                  </div>
                  {open.price > 0 ? (
                    <div className="stepper" style={{ marginTop: 8 }}>
                      <span className="rupee">₹</span>
                      <input
                        value={open.price}
                        onChange={(e) => field({ price: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="opt-field">
              <label className="field">
                <span className="field-label">Who it suits</span>
                <input
                  value={open.levelLabel}
                  onChange={(e) => field({ levelLabel: e.target.value })}
                  placeholder="All levels"
                />
              </label>
            </div>
          </section>

          {open.status === 'draft' ? (
            <button className="plan-link danger" onClick={() => { remove(open.id); setOpenId(null) }}>
              Discard this draft
            </button>
          ) : null}
        </div>

        <aside className="split-side">
          <div className="side-head">
            <span className="side-title">What members see</span>
            <div className="face-flip">
              <button className={face === 'row' ? 'face on' : 'face'} onClick={() => setFace('row')}>
                In the list
              </button>
              <button className={face === 'plan' ? 'face on' : 'face'} onClick={() => setFace('plan')}>
                Opened
              </button>
            </div>
          </div>
          <PlanPreview community={community} plan={open} face={face} cover={cover} />
        </aside>
      </div>
    )
  }

  // ---- The list ----
  const live = plans.filter((p) => p.status !== 'past')
  const past = plans.filter((p) => p.status === 'past')

  // Exactly one row matters today, and it is not the one at the top of an
  // alphabetical list.
  const byDate = [...live].sort((a, b) => a.date.localeCompare(b.date))
  const next = byDate[0]
  const rest = byDate.slice(1)

  const groups: { label: string; plans: Plan[] }[] = [
    { label: 'This week', plans: rest.filter((p) => daysOut(p.date) <= 7) },
    { label: 'Later', plans: rest.filter((p) => daysOut(p.date) > 7) },
  ].filter((g) => g.plans.length > 0)

  return (
    <div className="page">
      <div className="editor-head">
        <span className="editor-note">
          Everything a member can buy starts here. A plan stays a draft until you publish it, and
          closing sales is not the same as calling it off.
        </span>
        <div className="editor-actions">
          <button className="btn btn-ghost" onClick={revert} disabled={!dirty}>
            Revert
          </button>
          <button className="btn btn-primary" onClick={() => setOpenId(create().id)}>
            <PlusIcon size={15} strokeWidth={2.4} /> New plan
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!dirty}>
            {dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {next ? (
        <section className={`nextplan ${STATUS[next.status].cls}`}>
          <div className="nextplan-top">
            <span className="nextplan-when">
              {whenWord(next.date)} · {next.time}
            </span>
            <span className={`row-tag ${STATUS[next.status].cls}`}>{STATUS[next.status].label}</span>
          </div>

          <button className="nextplan-title" onClick={() => setOpenId(next.id)}>
            {next.title || 'Untitled plan'}
          </button>
          <span className="nextplan-where">
            {venues[next.venueId]?.name} · {venues[next.venueId]?.areaName} ·{' '}
            {next.price === 0 ? 'Free' : `₹${next.price}`}
          </span>

          <div className="nextplan-fill">
            <span className="nextplan-bar">
              <span
                className={next.sold >= next.capacity ? 'nextplan-run full' : 'nextplan-run'}
                style={{ width: `${Math.round((next.sold / Math.max(1, next.capacity)) * 100)}%` }}
              />
            </span>
            <span className={`urg ${urgency(next).tone}`}>{urgency(next).text}</span>
          </div>

          <div className="nextplan-do">
            {next.status === 'draft' ? (
              <button
                className="btn btn-primary"
                disabled={!next.title.trim()}
                onClick={() => publish(next.id)}
              >
                Publish it
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/door')}>
                <ScanIcon size={15} strokeWidth={2.1} /> Open the door
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => navigate('/posts')}>
              <ChatIcon size={15} strokeWidth={2.1} /> Announce it
            </button>
            <button className="btn btn-ghost" onClick={() => setOpenId(next.id)}>
              Edit
            </button>
          </div>
        </section>
      ) : null}

      {groups.map((g) => (
        <div key={g.label}>
          <div className="section-head">
            <span className="section-title">{g.label}</span>
            <span className="section-link">
              {g.plans.length} plan{g.plans.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="panel">
            {g.plans.map((p) => (
              <Row key={p.id} p={p} onOpen={() => setOpenId(p.id)} />
            ))}
          </div>
        </div>
      ))}

      {past.length > 0 ? (
        <>
          <div className="section-head">
            <span className="section-title">Already run</span>
            <span className="section-link">{past.length} nights</span>
          </div>
          <div className="panel">
            {past.map((p) => (
              <Row key={p.id} p={p} onOpen={() => setOpenId(p.id)} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function Row({ p, onOpen }: { p: Plan; onOpen: () => void }) {
  const { dow, day, mon } = stamp(p.date)
  const pct = p.capacity === 0 ? 0 : Math.round((p.sold / p.capacity) * 100)
  const s = STATUS[p.status]
  const u = urgency(p)
  return (
    <button className={`row plan-row ${s.cls}`} onClick={onOpen}>
      <span className="row-stub">
        <span className="row-dow">{dow}</span>
        <span className="row-day">{day}</span>
        <span className="row-mon">{mon}</span>
      </span>
      <span className="row-text">
        <span className="row-title">{p.title || 'Untitled plan'}</span>
        <span className="row-meta">
          {venues[p.venueId]?.name ?? '—'} · {p.price === 0 ? 'Free' : `₹${p.price}`}
          {p.seriesId ? ` · ${seriesLabel(p.seriesId)}` : ''}
        </span>
      </span>
      <span className="row-sales">
        <span className="row-bar">
          <span className={pct >= 100 ? 'row-fill full' : 'row-fill'} style={{ width: `${pct}%` }} />
        </span>
        <span className={`urg ${u.tone}`}>{u.text}</span>
      </span>
      <span className={`row-tag ${s.cls}`}>{s.label}</span>
    </button>
  )
}
