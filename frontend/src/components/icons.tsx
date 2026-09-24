// Stroke icon set, 24px grid, consistent 2px weight.

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

function base({ size = 20, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
)

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 11l9-8 9 8v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-9z" />
  </svg>
)

export const CircleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    <circle cx="17.5" cy="9.5" r="2.6" />
    <path d="M15.5 13.6a5.4 5.4 0 0 1 6 5.4" />
  </svg>
)

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 10h17M8 2.8V7M16 2.8V7" />
  </svg>
)

export const PersonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20.5c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
  </svg>
)

export const BackIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const ChevronIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
)

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? p.color ?? 'currentColor' : 'none'}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
)

// The add-a-reaction affordance, paired with a small plus.
export const SmileyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
    <path d="M9 9.5h.01M15 9.5h.01" strokeWidth={2.6} />
  </svg>
)

// A ticket stub, notched on both sides.
export const TicketIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9.5V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 0 0 5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.5a2.5 2.5 0 0 0 0-5z" />
    <path d="M14 6v2M14 11v2M14 16v2" />
  </svg>
)

// A pushpin, for the one post a community keeps at the top.
export const PinnedIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 3h6l-1 5 3.5 3.5H6.5L10 8 9 3z" />
    <path d="M12 11.5V21" />
  </svg>
)

// Two hands, for the second reaction. Reads at 14px, which is the only test.
export const ClapIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? p.color ?? 'currentColor' : 'none'}>
    <path d="M8.5 13.5L5.8 10a1.6 1.6 0 0 1 2.5-2l2.2 2.6" />
    <path d="M10.5 9.2V5.1a1.6 1.6 0 0 1 3.2 0v4.3" />
    <path d="M13.7 9.6V6.4a1.6 1.6 0 0 1 3.2 0v5.1" />
    <path d="M16.9 11.5c0-1 .5-1.8 1.5-1.8s1.6.8 1.6 1.8v2.4A6.4 6.4 0 0 1 13.6 21c-2.6 0-4-1.2-5.1-2.8" />
  </svg>
)

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
)

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
    <path d="M10 21a2.2 2.2 0 0 0 4 0" />
  </svg>
)

export const ChatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5h16v11H8l-4 4V5z" />
  </svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="18" cy="5" r="2.6" />
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="18" cy="19" r="2.6" />
    <path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3" />
  </svg>
)

export const SlidersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h8M16 7h4M4 12h3M11 12h9M4 17h11M19 17h1" />
    <circle cx="14" cy="7" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="17" r="2" />
  </svg>
)

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
)

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg
    width={p.size ?? 22}
    height={p.size ?? 22}
    viewBox="0 0 24 24"
    fill={filled ? '#FDBE50' : 'none'}
    stroke={filled ? '#FDBE50' : '#C9C2AE'}
    strokeWidth={1.8}
    strokeLinejoin="round"
  >
    <path d="M12 3l1.8 5.6H20l-5 3.6 1.9 5.8-4.9-3.6-4.9 3.6L9 12.2 4 8.6h6.2L12 3z" />
  </svg>
)

export const LogoMark = ({ size = 26, muted = false }: { size?: number; muted?: boolean }) => {
  const main = muted ? '#C9C2AE' : '#15477C'
  const side = muted ? '#DDD6C3' : '#E9712A'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="22" cy="9" r="6" fill={main} />
      <path
        d="M13 24c0-5 4-9 9-9s9 4 9 9v10c0 4-3 7-7 7h-1l-3 5-1-5c-3.5-0.5-6-3.5-6-7V24z"
        fill={main}
      />
      <circle cx="9" cy="17" r="3.4" fill={side} />
      <path
        d="M4 26c0-3 2.2-5 5-5s5 2 5 5v4.5c0 2.5-2 4.5-4.5 4.5h-0.4L7 38l-0.6-3.1C4.9 34.3 4 32.8 4 31v-5z"
        fill={side}
      />
      <circle cx="38" cy="15" r="3.8" fill={side} />
      <path
        d="M32.5 25c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5v5c0 2.7-2.1 4.8-4.8 4.8h-0.5l-2.4 4-0.6-4.1c-1.6-0.7-2.7-2.3-2.7-4.2V25z"
        fill={side}
      />
    </svg>
  )
}

// 3D treatment of the mark: gradient volume, extruded base, ground shadow,
// specular highlights. Pure SVG, so it stays crisp at any size.
export const LogoMark3D = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={(size * 54) / 48} viewBox="0 0 48 54" fill="none">
    <defs>
      <linearGradient id="tc3d-blue" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor="#3F7DBE" />
        <stop offset="0.5" stopColor="#15477C" />
        <stop offset="1" stopColor="#0D3260" />
      </linearGradient>
      <linearGradient id="tc3d-orange" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor="#F79A5B" />
        <stop offset="0.5" stopColor="#E9712A" />
        <stop offset="1" stopColor="#BC5316" />
      </linearGradient>
      <radialGradient id="tc3d-sheen" cx="0.32" cy="0.22" r="0.95">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
        <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.12" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="24" cy="50" rx="17" ry="3.2" fill="#070808" opacity="0.16" />

    <g transform="translate(0 2.4)" opacity="0.95">
      <circle cx="22" cy="9" r="6" fill="#0A2A4D" />
      <path d="M13 24c0-5 4-9 9-9s9 4 9 9v10c0 4-3 7-7 7h-1l-3 5-1-5c-3.5-0.5-6-3.5-6-7V24z" fill="#0A2A4D" />
      <circle cx="9" cy="17" r="3.4" fill="#8F3E0F" />
      <path d="M4 26c0-3 2.2-5 5-5s5 2 5 5v4.5c0 2.5-2 4.5-4.5 4.5h-0.4L7 38l-0.6-3.1C4.9 34.3 4 32.8 4 31v-5z" fill="#8F3E0F" />
      <circle cx="38" cy="15" r="3.8" fill="#8F3E0F" />
      <path d="M32.5 25c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5v5c0 2.7-2.1 4.8-4.8 4.8h-0.5l-2.4 4-0.6-4.1c-1.6-0.7-2.7-2.3-2.7-4.2V25z" fill="#8F3E0F" />
    </g>

    <circle cx="9" cy="17" r="3.4" fill="url(#tc3d-orange)" />
    <path d="M4 26c0-3 2.2-5 5-5s5 2 5 5v4.5c0 2.5-2 4.5-4.5 4.5h-0.4L7 38l-0.6-3.1C4.9 34.3 4 32.8 4 31v-5z" fill="url(#tc3d-orange)" />
    <circle cx="38" cy="15" r="3.8" fill="url(#tc3d-orange)" />
    <path d="M32.5 25c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5v5c0 2.7-2.1 4.8-4.8 4.8h-0.5l-2.4 4-0.6-4.1c-1.6-0.7-2.7-2.3-2.7-4.2V25z" fill="url(#tc3d-orange)" />

    <circle cx="22" cy="9" r="6" fill="url(#tc3d-blue)" />
    <path d="M13 24c0-5 4-9 9-9s9 4 9 9v10c0 4-3 7-7 7h-1l-3 5-1-5c-3.5-0.5-6-3.5-6-7V24z" fill="url(#tc3d-blue)" />

    <circle cx="22" cy="9" r="6" fill="url(#tc3d-sheen)" />
    <path d="M13 24c0-5 4-9 9-9s9 4 9 9v10c0 4-3 7-7 7h-1l-3 5-1-5c-3.5-0.5-6-3.5-6-7V24z" fill="url(#tc3d-sheen)" />
    <ellipse cx="20" cy="6.8" rx="2.1" ry="1.4" fill="#FFFFFF" opacity="0.65" transform="rotate(-18 20 6.8)" />
    <ellipse cx="7.7" cy="15.6" rx="1.1" ry="0.75" fill="#FFFFFF" opacity="0.55" transform="rotate(-18 7.7 15.6)" />
    <ellipse cx="36.6" cy="13.5" rx="1.2" ry="0.8" fill="#FFFFFF" opacity="0.55" transform="rotate(-18 36.6 13.5)" />
  </svg>
)
