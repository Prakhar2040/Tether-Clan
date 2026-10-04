// Same 24px grid and 2px weight as the app's icon set.

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

function base({ size = 18, color = 'currentColor', strokeWidth = 2 }: IconProps) {
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

export const GaugeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="M12 14l4-3.5" />
  </svg>
)

export const TicketIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9.5V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 0 0 5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.5a2.5 2.5 0 0 0 0-5z" />
    <path d="M14 6v2M14 11v2M14 16v2" />
  </svg>
)

export const ChatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 16 0z" />
  </svg>
)

export const ScanIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
    <path d="M4 12h16" />
  </svg>
)

export const PeopleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    <circle cx="17.5" cy="9.5" r="2.6" />
    <path d="M15.5 13.6a5.4 5.4 0 0 1 6 5.4" />
  </svg>
)

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="10" r="1.6" />
    <path d="M3.5 17l4.8-4.6a2 2 0 0 1 2.8 0L16 17.5" />
    <path d="M14 14.5l1.6-1.5a2 2 0 0 1 2.8 0l2.1 2" />
  </svg>
)

export const IdIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="9" cy="11" r="2.2" />
    <path d="M5.5 16.5c.5-1.7 1.9-2.6 3.5-2.6s3 .9 3.5 2.6" />
    <path d="M15 10h4M15 13.5h4" />
  </svg>
)

export const CogIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6" />
  </svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

// The drag handle. Two rows of dots is the convention people reach for.
export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12.5V4.5A1.5 1.5 0 0 1 4.5 3h8l8.5 8.5a1.5 1.5 0 0 1 0 2.1l-6.9 6.9a1.5 1.5 0 0 1-2.1 0L3 12.5z" />
    <circle cx="7.8" cy="7.8" r="1.4" />
  </svg>
)

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
)

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 20v-6M12.5 20V8M17 20v-9" />
  </svg>
)

export const TrophyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
    <path d="M12 14v3M9 20h6M10 17h4l.5 3h-5l.5-3z" />
  </svg>
)

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
)

export const ListIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth={2.6} />
  </svg>
)

export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
)

export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 3h6l-1 5 3.5 3.5H6.5L10 8 9 3z" />
    <path d="M12 11.5V21" />
  </svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

export const StarIcon = ({ filled, size = 16 }: IconProps & { filled?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? '#FDBE50' : 'none'}
    stroke={filled ? '#FDBE50' : 'currentColor'}
    strokeWidth={1.9}
    strokeLinejoin="round"
  >
    <path d="M12 3l1.8 5.6H20l-5 3.6 1.9 5.8-4.9-3.6-4.9 3.6L9 12.2 4 8.6h6.2L12 3z" />
  </svg>
)

export const GripIcon = ({ size = 16, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
)

export const PencilIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20l4-1 10-10-3-3L5 16l-1 4z" />
    <path d="M14.5 5.5l3 3" />
  </svg>
)

export const OutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 16L16 8" />
    <path d="M9.5 8H16v6.5" />
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

// The app's mark, lifted from the phone so the console wears the same face.
// Gradient ids are namespaced: two copies on one page would otherwise fight
// over `tch-blue` and the second would render with the first's ramp.
export const LogoMark3D = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={(size * 54) / 48} viewBox="0 0 48 54" fill="none">
    <defs>
      <linearGradient id="tch-blue" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor="#3F7DBE" />
        <stop offset="0.5" stopColor="#15477C" />
        <stop offset="1" stopColor="#0D3260" />
      </linearGradient>
      <linearGradient id="tch-orange" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor="#F79A5B" />
        <stop offset="0.5" stopColor="#E9712A" />
        <stop offset="1" stopColor="#BC5316" />
      </linearGradient>
      <radialGradient id="tch-sheen" cx="0.32" cy="0.22" r="0.95">
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

    <circle cx="9" cy="17" r="3.4" fill="url(#tch-orange)" />
    <path d="M4 26c0-3 2.2-5 5-5s5 2 5 5v4.5c0 2.5-2 4.5-4.5 4.5h-0.4L7 38l-0.6-3.1C4.9 34.3 4 32.8 4 31v-5z" fill="url(#tch-orange)" />
    <circle cx="38" cy="15" r="3.8" fill="url(#tch-orange)" />
    <path d="M32.5 25c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5v5c0 2.7-2.1 4.8-4.8 4.8h-0.5l-2.4 4-0.6-4.1c-1.6-0.7-2.7-2.3-2.7-4.2V25z" fill="url(#tch-orange)" />

    <circle cx="22" cy="9" r="6" fill="url(#tch-blue)" />
    <path d="M13 24c0-5 4-9 9-9s9 4 9 9v10c0 4-3 7-7 7h-1l-3 5-1-5c-3.5-0.5-6-3.5-6-7V24z" fill="url(#tch-blue)" />

    <circle cx="22" cy="9" r="6" fill="url(#tch-sheen)" />
    <path d="M13 24c0-5 4-9 9-9s9 4 9 9v10c0 4-3 7-7 7h-1l-3 5-1-5c-3.5-0.5-6-3.5-6-7V24z" fill="url(#tch-sheen)" />
    <ellipse cx="20" cy="6.8" rx="2.1" ry="1.4" fill="#FFFFFF" opacity="0.65" transform="rotate(-18 20 6.8)" />
    <ellipse cx="7.7" cy="15.6" rx="1.1" ry="0.75" fill="#FFFFFF" opacity="0.55" transform="rotate(-18 7.7 15.6)" />
    <ellipse cx="36.6" cy="13.5" rx="1.2" ry="0.8" fill="#FFFFFF" opacity="0.55" transform="rotate(-18 36.6 13.5)" />
  </svg>
)


// The app's 3D logo mark, at rail size.
export const LogoMark = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect x="6" y="6" width="52" height="52" rx="15" fill="#15477C" />
    <rect x="6" y="6" width="52" height="46" rx="15" fill="#1C5A99" />
    <circle cx="24" cy="28" r="7.5" fill="#FDBE50" />
    <circle cx="41" cy="36" r="5.5" fill="#E9712A" />
    <path d="M24 28l17 8" stroke="#FDBE50" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
)
