import { people } from '@shared/mock'
import type { TcEvent } from '@shared/types'
import { useCircle } from '../state/circle'
import { Avatar, AvatarStack } from './shared'
import { ChevronIcon } from './icons'

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
  const host = e.attendees.find((a) => a.relation === 'host')
  const friends = e.attendees.filter((a) => a.relation !== 'host' && isConnected(a.personId))

  // Everyone else is described by type, never by name.
  const named = friends.length + (host ? 1 : 0)
  const others = Math.max(0, e.going - named)
  const knownFirstTimers = e.attendees.filter(
    (a) => a.relation === 'first-timer' && !isConnected(a.personId),
  ).length
  const firstTimers = Math.min(others, Math.max(knownFirstTimers, e.firstTimers ?? 0))
  const regulars = Math.max(0, others - firstTimers)

  const breakdown = [
    regulars > 0 ? `${regulars} regular${regulars > 1 ? 's' : ''}` : null,
    firstTimers > 0 ? `${firstTimers} first-timer${firstTimers > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <span className="sheet-handle" />
        <span className="section-label">
          Who's going · {e.going} of {e.capacity}
        </span>

        {host ? (
          <div className="person-row" style={{ alignItems: 'center' }}>
            <Avatar person={people[host.personId]} size={38} />
            <span className="stack-2" style={{ gap: 1, flex: 1 }}>
              <span className="person-name">{people[host.personId].name}</span>
              <span className="person-note">Host</span>
            </span>
          </div>
        ) : null}

        {friends.map((a) => (
          <div className="person-row" key={a.personId} style={{ alignItems: 'center' }}>
            <Avatar person={people[a.personId]} size={38} />
            <span className="stack-2" style={{ gap: 1, flex: 1 }}>
              <span className="person-name">{people[a.personId].name}</span>
              <span className="person-note">In your circle</span>
            </span>
          </div>
        ))}

        {others > 0 ? (
          <span className="page-sub">
            And {others} more going{breakdown ? ` · ${breakdown}` : ''}
          </span>
        ) : null}

        <span className="consent-note">
          {friends.length === 0
            ? 'You can add people you meet once the plan starts.'
            : 'Only people in your circle are named here.'}
        </span>
      </div>
    </div>
  )
}
