import { useState } from 'react'
import type { ReactNode } from 'react'
import { useHostCommunity } from '../state/host'
import { usePhotos } from '../state/photos'
import { useTickets } from '../state/tickets'
import type { TicketSettings } from '../state/tickets'
import TicketsPreview from '../components/TicketsPreview'
import { CheckIcon, ListIcon, LockIcon, PencilIcon, TicketIcon } from '../components/icons'

// Settings read as a list of switches unless each one shows its consequence.
// The chip on the right says what is true right now, in the member's words;
// the pencil opens whatever the row carries, the same way the About page does.
function Row({
  on,
  onChange,
  name,
  onLabel,
  offLabel,
  what,
  show,
  edit,
  editing,
  onEdit,
}: {
  on: boolean
  onChange: () => void
  name: string
  onLabel: string
  offLabel: string
  what: string
  show?: ReactNode
  edit?: ReactNode
  editing?: boolean
  onEdit?: () => void
}) {
  return (
    <div className="opt">
      <button
        className={on ? 'switch on' : 'switch'}
        onClick={onChange}
        role="switch"
        aria-checked={on}
        aria-label={name}
      >
        <span className="switch-knob" />
      </button>
      <div className="opt-text">
        <span className="opt-name">{name}</span>
        <span className="opt-what">{what}</span>
      </div>
      <span className={on ? 'opt-state on' : 'opt-state'}>{on ? onLabel : offLabel}</span>
      {on && edit ? (
        <button
          className={editing ? 'sec-pencil on' : 'sec-pencil'}
          onClick={onEdit}
          aria-expanded={editing}
          aria-label={editing ? `Done editing ${name}` : `Edit ${name}`}
          title={editing ? 'Done' : 'Edit'}
        >
          {editing ? <CheckIcon size={15} strokeWidth={2.6} /> : <PencilIcon size={15} strokeWidth={2.2} />}
        </button>
      ) : null}
      {on && (edit || show) ? <div className="opt-body">{editing ? edit : show}</div> : null}
    </div>
  )
}

export default function Tickets() {
  const { community } = useHostCommunity()
  const { photos, coverId } = usePhotos()
  const { settings, dirty, set, revert, save } = useTickets()
  const [face, setFace] = useState<'list' | 'pass'>('list')
  const [editing, setEditing] = useState<string | null>(null)

  const flip = (k: keyof TicketSettings) => () => set(k, !settings[k] as never)

  return (
    <div className="page split">
      <div className="split-main">
        <div className="editor-head">
          <span className="editor-note">
            What is on sale writes itself from Plans. This is how tickets behave for{' '}
            {community.name} — whether a pass is scannable, what it carries, and what the list
            shows.
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

        {/* The whole configuration as one sentence, so you can read it back
            without decoding five switches. */}
        <div className="summary">
          <span className="summary-label">Right now</span>
          <p className="summary-text">
            A ticket here is{' '}
            <b>{settings.entryQr ? 'a scannable pass' : 'a name on the list'}</b>
            {(settings.passNote && settings.passNoteText.trim()) || settings.passEntrance ? (
              <>
                {' '}
                carrying{' '}
                <b>
                  {[
                    settings.passNote && settings.passNoteText.trim() && 'a line from you',
                    settings.passEntrance && 'the way in',
                  ]
                    .filter(Boolean)
                    .join(' and ')}
                </b>
              </>
            ) : (
              <> with nothing else on it</>
            )}
            . The list shows{' '}
            <b>
              {[settings.showSoldOut && 'sold-out nights', settings.showPast && 'past nights']
                .filter(Boolean)
                .join(' and ') || 'only what is still on sale'}
            </b>
            {settings.showSoldOut || settings.showPast ? ' alongside what is on sale' : ''}.
          </p>
        </div>

        <section className="optgroup">
          <div className="optgroup-head">
            <TicketIcon size={15} strokeWidth={2.1} />
            <span>The pass</span>
          </div>
          <Row
            on={settings.entryQr}
            onChange={flip('entryQr')}
            name="Entry QR"
            onLabel="Scannable"
            offLabel="Name only"
            what="A code the Door screen reads. Off, the ticket is a confirmation and the door works off names."
          />
          <Row
            on={settings.passNote}
            onChange={flip('passNote')}
            name="A line from you"
            onLabel="On the pass"
            offLabel="Hidden"
            what="Printed on every pass, under the title. The one thing you would say to somebody on their way over."
            editing={editing === 'note'}
            onEdit={() => setEditing(editing === 'note' ? null : 'note')}
            show={
              settings.passNoteText.trim() ? (
                <p className="opt-quote">{settings.passNoteText}</p>
              ) : (
                <span className="field-hint">Empty, so nothing prints. Write something or switch it off.</span>
              )
            }
            edit={
              <>
                <textarea
                  rows={2}
                  autoFocus
                  value={settings.passNoteText}
                  onChange={(e) => set('passNoteText', e.target.value)}
                  placeholder="Doors open fifteen minutes before. Come find us rather than waiting outside."
                />
                <span className="field-hint">
                  {settings.passNoteText.trim().length} characters · the same on every ticket
                </span>
              </>
            }
          />
          <Row
            on={settings.passEntrance}
            onChange={flip('passEntrance')}
            name="How to get in"
            onLabel="On the pass"
            offLabel="Hidden"
            what="The stairs, the blue door, the gate round the back — the bit people actually need."
          />
        </section>

        <section className="optgroup">
          <div className="optgroup-head">
            <ListIcon size={15} strokeWidth={2.1} />
            <span>The list</span>
          </div>
          <Row
            on={settings.showPast}
            onChange={flip('showPast')}
            name="Past plans"
            onLabel="Shown"
            offLabel="Hidden"
            what="Proof the group has been running, and for how long. A new community may not want three empty months on show."
          />
          <Row
            on={settings.showSoldOut}
            onChange={flip('showSoldOut')}
            name="Sold-out plans"
            onLabel="Shown"
            offLabel="Hidden"
            what="Listed with SOLD OUT so people see the room fills — or hidden, so the list is only things they can take."
          />
        </section>

        {/* A line worth stating rather than leaving as an absence. */}
        <div className="principle">
          <LockIcon size={16} strokeWidth={2} />
          <div>
            <span className="principle-t">Who else is coming is never shown</span>
            <span className="principle-s">
              Not on the list, not on the pass, not anywhere members can reach. That is not a
              setting, because members have to be able to trust it without checking which community
              they are in. You see the attendee list in Members; they never do.
            </span>
          </div>
        </div>
      </div>

      <aside className="split-side">
        <div className="side-head">
          <span className="side-title">What members see</span>
          <div className="face-flip">
            <button className={face === 'list' ? 'face on' : 'face'} onClick={() => setFace('list')}>
              List
            </button>
            <button className={face === 'pass' ? 'face on' : 'face'} onClick={() => setFace('pass')}>
              Pass
            </button>
          </div>
        </div>
        <TicketsPreview
          community={community}
          settings={settings}
          face={face}
          cover={photos.find((p) => p.id === coverId)?.src}
        />
      </aside>
    </div>
  )
}
