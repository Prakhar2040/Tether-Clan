import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { photosFor } from '@app/data/community'
import { useHostCommunity } from '../state/host'
import { SECTIONS, useAbout } from '../state/about'
import { usePhotos } from '../state/photos'
import type { SectionId } from '../state/about'
import AboutPreview from '../components/AboutPreview'
import { CheckIcon, GripIcon, ImageIcon, PencilIcon } from '../components/icons'

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      className={on ? 'switch on' : 'switch'}
      onClick={onChange}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span className="switch-knob" />
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  rows,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  hint?: string
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {rows ? (
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export default function About() {
  const navigate = useNavigate()
  const { community, owner } = useHostCommunity()
  const { draft, dirty, toggle, move, update, revert, save } = useAbout()
  const { photos, coverId } = usePhotos()
  const [open, setOpen] = useState<SectionId | null>(null)
  const [dragging, setDragging] = useState<SectionId | null>(null)
  const photoCount = photosFor(community.id).length

  // What the section actually holds, laid out readably. Switching a section
  // on opens it — you should be able to see what you just turned on without
  // having to click into an editor first.
  const content = (id: SectionId) => {
    switch (id) {
      case 'owner':
        return (
          <div className="view-owner">
            <span className="view-portrait" style={{ background: community.color }}>
              {owner?.initials}
            </span>
            <span className="view-owner-text">
              <span className="view-name">{owner?.name}</span>
              <span className="view-title">{draft.ownerTitle}</span>
              <span className="view-role">
                Owner · {community.startedLabel.replace('Started ', 'since ')}
              </span>
            </span>
          </div>
        )
      case 'quote':
        return <blockquote className="view-quote">{draft.ownerQuote}</blockquote>
      case 'bio':
        return (
          <div className="view-paras">
            {draft.ownerBio.map((para) => (
              <p key={para.slice(0, 20)}>{para}</p>
            ))}
          </div>
        )
      case 'numbers':
        return (
          <div className="view-nums">
            {draft.highlights.map((h) => (
              <span className="view-num" key={h.label}>
                <b>{h.n}</b>
                {h.label}
              </span>
            ))}
          </div>
        )
      case 'photos':
        return photoCount === 0 ? (
          <p className="view-empty">No photos in the gallery yet — this strip would be empty.</p>
        ) : (
          <div className="view-photos">
            {photosFor(community.id)
              .slice(0, 5)
              .map((ph) => (
                <span
                  className="view-photo"
                  key={ph.id}
                  style={ph.src ? { backgroundImage: `url(${ph.src})` } : { background: ph.color }}
                />
              ))}
            <span className="view-photo-note">{photoCount} in the gallery</span>
          </div>
        )
      case 'community':
        return (
          <div className="view-paras">
            <p>{draft.description}</p>
            <div className="view-facts">
              <span>{draft.categoryLabel}</span>
              <span>{draft.areaName}</span>
              <span>{community.memberCount} members</span>
            </div>
          </div>
        )
      case 'rules':
        return (
          <ol className="view-rules">
            {draft.houseRules.map((r, i) => (
              <li key={r || i}>
                <span className="view-rule-n">{i + 1}</span>
                <span>{r || <em className="view-empty">Empty rule</em>}</span>
              </li>
            ))}
          </ol>
        )
    }
  }

  const editor = (id: SectionId) => {
    switch (id) {
      case 'owner':
        return (
          <>
            <div className="portrait-slot">
              <div className="portrait-box" style={{ background: community.color }}>
                {owner?.initials}
              </div>
              <div className="portrait-text">
                <span className="field-label">Portrait</span>
                <span className="field-hint">
                  No photo yet — your initials stand in. Uploading lands with the Photos section.
                </span>
                <button className="btn btn-ghost" disabled style={{ marginTop: 8 }}>
                  Upload a photo
                </button>
              </div>
            </div>
            <Field
              label="Day job"
              value={draft.ownerTitle}
              onChange={(v) => update({ ownerTitle: v })}
              hint="Sits under your name. Keep it short — it is a label, not a bio."
            />
          </>
        )
      case 'quote':
        return (
          <Field
            label="The line worth pulling out"
            value={draft.ownerQuote}
            onChange={(v) => update({ ownerQuote: v })}
            rows={3}
            hint="Set large in your community's colour. One sentence carries best."
          />
        )
      case 'bio':
        return (
          <Field
            label="Your own words"
            value={draft.ownerBio.join('\n\n')}
            onChange={(v) => update({ ownerBio: v.split(/\n{2,}/).filter(Boolean) })}
            rows={10}
            hint="First person. Blank line between paragraphs. The first one is set slightly larger."
          />
        )
      case 'numbers':
        return (
          <div className="grid-2">
            {draft.highlights.map((h, i) => (
              <div className="num-pair" key={i}>
                <input
                  className="num-n"
                  value={h.n}
                  onChange={(e) => {
                    const next = [...draft.highlights]
                    next[i] = { ...h, n: e.target.value }
                    update({ highlights: next })
                  }}
                />
                <input
                  className="num-l"
                  value={h.label}
                  onChange={(e) => {
                    const next = [...draft.highlights]
                    next[i] = { ...h, label: e.target.value }
                    update({ highlights: next })
                  }}
                />
                <button
                  className="row-x"
                  onClick={() => update({ highlights: draft.highlights.filter((_, j) => j !== i) })}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost add-btn"
              onClick={() => update({ highlights: [...draft.highlights, { n: '0', label: 'something' }] })}
            >
              Add a number
            </button>
          </div>
        )
      case 'photos':
        return (
          <div className="handoff">
            <p className="field-hint">
              This strip pulls straight from the community gallery — there is nothing to write
              here. Adding, captioning and reordering photos lives in the Photos section, so the
              strip and the Photos tab can never disagree.
            </p>
            <button className="btn btn-ghost" onClick={() => navigate('/photos')}>
              <ImageIcon size={15} strokeWidth={2.1} />
              Open Photos
            </button>
          </div>
        )
      case 'community':
        return (
          <>
            <Field
              label="What the group does"
              value={draft.description}
              onChange={(v) => update({ description: v })}
              rows={6}
              hint="Written as you talking to the room, since it sits under your own words."
            />
            <div className="grid-2">
              <Field label="Category" value={draft.categoryLabel} onChange={(v) => update({ categoryLabel: v })} />
              <Field label="Area" value={draft.areaName} onChange={(v) => update({ areaName: v })} />
            </div>
          </>
        )
      case 'rules':
        return (
          <div className="rules-edit">
            {draft.houseRules.map((r, i) => (
              <div className="rule-pair" key={i}>
                <span className="rule-num">{i + 1}</span>
                <textarea
                  rows={2}
                  value={r}
                  onChange={(e) => {
                    const next = [...draft.houseRules]
                    next[i] = e.target.value
                    update({ houseRules: next })
                  }}
                />
                <button
                  className="row-x"
                  onClick={() => update({ houseRules: draft.houseRules.filter((_, j) => j !== i) })}
                  aria-label="Remove rule"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost add-btn"
              onClick={() => update({ houseRules: [...draft.houseRules, ''] })}
            >
              Add a rule
            </button>
          </div>
        )
    }
  }

  const liveCount = draft.order.filter((id) => draft.enabled[id]).length

  return (
    <div className="page split">
      <div className="split-main">
        <div className="editor-head">
          <span className="editor-note">
            {liveCount} of {draft.order.length} sections showing. Switch one off and members stop
            seeing it. Drag a handle to change the order they appear in.
          </span>
          <div className="editor-actions">
            <button className="btn btn-ghost" onClick={revert} disabled={!dirty}>
              Revert
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!dirty}>
              {dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        </div>

        {draft.order.map((id) => {
          const meta = SECTIONS[id]
          const editing = open === id
          const enabled = draft.enabled[id]
          return (
            <section
              className={[
                'sec',
                enabled ? '' : 'off',
                dragging === id ? 'dragging' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={id}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragging && dragging !== id) move(dragging, id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(null)
              }}
            >
              <div className="sec-head">
                <span
                  className="sec-grip"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', id)
                    // Drag the whole card, not the little handle.
                    const card = (e.currentTarget as HTMLElement).closest('.sec')
                    if (card) e.dataTransfer.setDragImage(card, 24, 24)
                    setOpen(null)
                    setDragging(id)
                  }}
                  onDragEnd={() => setDragging(null)}
                  title="Drag to reorder"
                  aria-label={`Reorder ${meta.name}`}
                >
                  <GripIcon size={16} />
                </span>

                <Toggle
                  on={enabled}
                  onChange={() => {
                    if (enabled && editing) setOpen(null)
                    toggle(id)
                  }}
                  label={`Show ${meta.name}`}
                />
                <div className="sec-text">
                  <span className="sec-name">{meta.name}</span>
                  <span className="sec-what">{enabled ? meta.what : 'Not showing'}</span>
                </div>
                {enabled ? (
                  <button
                    className={editing ? 'sec-pencil on' : 'sec-pencil'}
                    onClick={() => setOpen(editing ? null : id)}
                    aria-expanded={editing}
                    aria-label={editing ? `Done editing ${meta.name}` : `Edit ${meta.name}`}
                    title={editing ? 'Done' : 'Edit'}
                  >
                    {editing ? <CheckIcon size={15} strokeWidth={2.6} /> : <PencilIcon size={15} strokeWidth={2.2} />}
                  </button>
                ) : null}
              </div>

              {/* Switched on opens it. The pencil swaps the view for the form. */}
              {enabled ? (
                <div className="sec-body">{editing ? editor(id) : content(id)}</div>
              ) : null}
            </section>
          )
        })}
      </div>

      <aside className="split-side">
        <div className="side-head">
          <span className="side-title">What members see</span>
          <span className="side-note">Live · About tab</span>
        </div>
        <AboutPreview
          community={community}
          owner={owner}
          draft={draft}
          cover={photos.find((p) => p.id === coverId)?.src}
        />
      </aside>
    </div>
  )
}
