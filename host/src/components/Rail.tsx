import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  GaugeIcon,
  IdIcon,
  ImageIcon,
  LogoMark,
  PeopleIcon,
  ScanIcon,
  TagIcon,
  TicketIcon,
  TrophyIcon,
} from './icons'
import { useHostCommunity } from '../state/host'

// Every section sits in the rail from day one, marked SOON until it is
// built, so the shape of the whole console is legible before any of it is.
interface NavItem {
  to: string
  label: string
  icon: (p: { size?: number; color?: string; strokeWidth?: number }) => ReactElement
  end?: boolean
  soon: boolean
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: GaugeIcon, end: true, soon: false }],
  },
  // Named the same as the preview panel on every page inside it, so the
  // console says one thing in two places. Tickets is not here — that tab
  // writes itself from whatever is in Plans.
  {
    group: 'What members see',
    items: [
      { to: '/posts', label: 'Posts', icon: ChatIcon, soon: false },
      { to: '/tickets', label: 'Tickets', icon: TicketIcon, soon: false },
      { to: '/photos', label: 'Photos', icon: ImageIcon, soon: false },
      { to: '/board', label: 'Leaderboard', icon: TrophyIcon, soon: false },
      { to: '/about', label: 'About page', icon: IdIcon, soon: false },
    ],
  },
  // The people, on their own. Not something members see, and not the
  // machinery of running a night either.
  {
    group: 'Community',
    items: [
      { to: '/analytics', label: 'Analytics', icon: ChartIcon, soon: false },
      { to: '/members', label: 'Members', icon: PeopleIcon, soon: false },
    ],
  },
  {
    group: 'Running it',
    items: [
      { to: '/plans', label: 'Plans', icon: CalendarIcon, soon: false },
      { to: '/door', label: 'Door', icon: ScanIcon, soon: false },
    ],
  },
  {
    group: 'Business',
    items: [{ to: '/sales', label: 'Sales', icon: TagIcon, soon: false }],
  },
]

function initials(name: string): string {
  return name
    .split(' ')
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default function Rail() {
  const { community, owner, communities, setCommunityId } = useHostCommunity()

  const cycle = () => {
    const ids = communities.map((c) => c.id)
    const next = ids[(ids.indexOf(community.id) + 1) % ids.length]
    setCommunityId(next)
  }

  return (
    <nav className="rail">
      <div className="rail-brand">
        <LogoMark size={30} />
        <span className="rail-word">
          <span className="rail-name">TETHER CLAN</span>
          <span className="rail-sub">Host</span>
        </span>
      </div>

      <button className="rail-community" onClick={cycle} title="Switch community">
        <span className="rail-mark" style={{ background: community.color }}>
          {initials(community.name)}
        </span>
        <span className="rail-community-text">
          <span className="rail-community-name">{community.name}</span>
          <span className="rail-community-meta">{community.memberCount} members</span>
        </span>
      </button>

      <div className="rail-nav">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <div className="rail-group">{group}</div>
            {items.map(({ to, label, icon: Icon, end, soon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => (isActive ? 'rail-link on' : 'rail-link')}
              >
                <Icon size={17} strokeWidth={2.1} />
                <span>{label}</span>
                {soon ? <span className="rail-soon">SOON</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="rail-foot">
        <span className="rail-avatar">{owner?.initials}</span>
        <span className="rail-foot-text">
          <span className="rail-foot-name">{owner?.name}</span>
          <span className="rail-foot-role">Owner</span>
        </span>
      </div>
    </nav>
  )
}
