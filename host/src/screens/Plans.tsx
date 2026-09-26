import { useState } from 'react'
import { venues } from '@app/data/mock'
import { useHostCommunity } from '../state/host'
import { usePhotos } from '../state/photos'
import { usePlans, seriesLabel } from '../state/plans'
import type { Plan, PlanStatus } from '../state/plans'
import PlanPreview from '../components/PlanPreview'
import { BackIcon, PlusIcon, TicketIcon } from '../components/icons'

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

export default function Plans() {
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

      <div className="section-head">
        <span className="section-title">Coming up</span>
        <span className="section-link">{live.length} plans</span>
      </div>
      <div className="panel">
        {live.length === 0 ? (
          <div className="row">
            <span className="row-meta">Nothing scheduled. Start one.</span>
          </div>
        ) : (
          live.map((p) => <Row key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)
        )}
      </div>

      <div className="section-head">
        <span className="section-title">Already run</span>
        <span className="section-link">{past.length} nights</span>
      </div>
      <div className="panel">
        {past.map((p) => (
          <Row key={p.id} p={p} onOpen={() => setOpenId(p.id)} />
        ))}
      </div>
    </div>
  )
}

function Row({ p, onOpen }: { p: Plan; onOpen: () => void }) {
  const { dow, day, mon } = stamp(p.date)
  const pct = p.capacity === 0 ? 0 : Math.round((p.sold / p.capacity) * 100)
  const s = STATUS[p.status]
  return (
    <button className="row plan-row" onClick={onOpen}>
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
        <span className="row-count">
          {p.sold} of {p.capacity}
        </span>
      </span>
      <span className={`row-tag ${s.cls}`}>{s.label}</span>
    </button>
  )
}
