import { NavLink } from 'react-router-dom'
import type { Person } from '../types'
import { CalendarIcon, CircleIcon, HomeIcon, LogoMark3D, PersonIcon, PinIcon } from './icons'

export function Brand() {
  return (
    <span className="brand big">
      <LogoMark3D size={38} /> TETHER CLAN
    </span>
  )
}

export function Avatar({ person, size = 32 }: { person: Person; size?: number }) {
  return (
    <span
      className={`avatar avatar-${person.color}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {person.initials}
    </span>
  )
}

export function AvatarStack({
  people,
  extra,
  size = 32,
}: {
  people: Person[]
  extra?: number
  size?: number
}) {
  return (
    <span className="avatar-stack">
      {people.map((p) => (
        <Avatar key={p.id} person={p} size={size} />
      ))}
      {extra ? (
        <span className="avatar avatar-tint" style={{ width: size, height: size, fontSize: size * 0.36 }}>
          +{extra}
        </span>
      ) : null}
    </span>
  )
}

const tabs = [
  { to: '/', label: 'Events', icon: HomeIcon, end: true },
  { to: '/map', label: 'Map', icon: PinIcon },
  { to: '/circle', label: 'Circle', icon: CircleIcon },
  { to: '/plans', label: 'My plans', icon: CalendarIcon },
  { to: '/you', label: 'You', icon: PersonIcon },
]

export function BottomBar() {
  return (
    <nav className="bottom-bar">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="tab">
          {({ isActive }) => (
            <>
              <Icon size={21} color={isActive ? '#FDBE50' : 'rgba(255,255,255,0.55)'} />
              <span className={isActive ? 'tab-label active' : 'tab-label'}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
