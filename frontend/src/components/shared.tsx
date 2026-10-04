import { NavLink } from 'react-router-dom'
import type { Community, Person } from '../types'
import { CalendarIcon, CircleIcon, HomeIcon, LogoMark, PersonIcon, PinIcon, WordMark } from './icons'

export function Brand() {
  return (
    <span className="brand big">
      <LogoMark size={40} decorative />
      <WordMark height={17} />
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

// Stands in for a community logo: its initials on its brand colour.
export function CommunityMark({ c, size = 46 }: { c: Community; size?: number }) {
  const initials = c.name
    .split(' ')
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <span
      className="comm-mark"
      style={{ background: c.color, width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  )
}

const tabs = [
  { to: '/events', label: 'Events', icon: HomeIcon },
  { to: '/map', label: 'Map', icon: PinIcon },
  { to: '/', label: 'Community', icon: CircleIcon, end: true },
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
