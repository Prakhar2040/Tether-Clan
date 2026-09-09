import { people } from '../data/mock'
import type { TcEvent } from '../types'
import { useCircle } from '../state/circle'
import { Avatar, AvatarStack } from './shared'
import { ChevronIcon } from './icons'

const relationLabel = { host: 'Host', regular: 'Regular', 'first-timer': 'First-timer' }

// Instagram-style "seen by" row: tiny stacked faces + names, tap to open the list.
export function GoingRow({ e, onOpen, label }: { e: TcEvent; onOpen: () => void; label?: string }) {
  const { isConnected } = useCircle()
  // Names only for people already in your circle; everyone else is a count.
  const friends = e.attendees.filter((a) => isConnected(a.personId)).map((a) => people[a.personId])
  const others = Math.max(0, e.going - friends.length)
  const firstTimers = e.firstTimers ?? 0

  const text = label ? (
    <b>{label}</b>
  ) : friends.length > 0 ? (
    <>
      <b>{friends.map((p) => p.name).join(', ')}</b>
      {others > 0 ? ` and ${others} other${others > 1 ? 's' : ''}` : ''} going
    </>
  ) : (
    <>
      <b>{e.going} going</b>
      {firstTimers > 0 ? ` · ${firstTimers} first-timer${firstTimers > 1 ? 's' : ''}` : ''}
    </>
  )

  return (
    <button className="going-row" onClick={onOpen}>
      {friends.length > 0 ? (
        <AvatarStack people={friends.slice(0, 3)} size={22} />
      ) : (
        <span className="going-anon">{e.going}</span>
      )}
      <span className="going-names">{text}</span>
      <ChevronIcon size={14} color="#A79F8C" />
    </button>
  )
}

export function WhoSheet({ e, onClose }: { e: TcEvent; onClose: () => void }) {
  const { isConnected } = useCircle()
  const friends = e.attendees.filter((a) => isConnected(a.personId))
  const others = Math.max(0, e.going - friends.length)
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
        {friends.map((a) => {
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
        {friends.length === 0 ? (
          <span className="page-sub">
            No one from your circle yet. You can add people you meet once the plan starts.
          </span>
        ) : null}
        {others > 0 ? (
          <span className="consent-note">
            {others} more going. Names are shared only with people they have connected with.
          </span>
        ) : null}
      </div>
    </div>
  )
}
