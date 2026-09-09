import { people } from '../data/mock'
import type { TcEvent } from '../types'
import { Avatar, AvatarStack } from './shared'
import { ChevronIcon } from './icons'

const relationLabel = { host: 'Host', regular: 'Regular', 'first-timer': 'First-timer' }

// Instagram-style "seen by" row: tiny stacked faces + names, tap to open the list.
export function GoingRow({ e, onOpen, label }: { e: TcEvent; onOpen: () => void; label?: string }) {
  const faces = e.attendees.slice(0, 2).map((a) => people[a.personId])
  const others = Math.max(0, e.going - faces.length)
  const names = faces.map((p) => p.name).join(', ')
  return (
    <button className="going-row" onClick={onOpen}>
      <AvatarStack people={faces} size={22} />
      {label ? (
        <span className="going-names"><b>{label}</b></span>
      ) : (
        <span className="going-names">
          <b>{names}</b>
          {others > 0 ? ` and ${others} other${others > 1 ? 's' : ''}` : ''} going
        </span>
      )}
      <ChevronIcon size={14} color="#A79F8C" />
    </button>
  )
}

export function WhoSheet({ e, onClose }: { e: TcEvent; onClose: () => void }) {
  const visible = e.attendees.length
  const hidden = Math.max(0, e.going - visible)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <span className="sheet-handle" />
        <div className="card-row">
          <span className="section-label">
            Who's going · {e.going} of {e.capacity}
          </span>
          {e.firstTimers > 0 ? (
            <span className="badge badge-seats">{e.firstTimers} first-timers</span>
          ) : null}
        </div>
        {e.attendees.map((a) => {
          const p = people[a.personId]
          return (
            <div className="person-row" key={a.personId} style={{ alignItems: 'center' }}>
              <Avatar person={p} size={38} />
              <span className="stack-2" style={{ gap: 1, flex: 1 }}>
                <span className="person-name">
                  {p.name} <span className="relation-tag">{relationLabel[a.relation]}</span>
                </span>
                {a.note ? <span className="person-note">{a.note}</span> : null}
              </span>
            </div>
          )
        })}
        {hidden > 0 ? (
          <span className="consent-note">
            +{hidden} more share their attendance only after you join
          </span>
        ) : null}
      </div>
    </div>
  )
}
