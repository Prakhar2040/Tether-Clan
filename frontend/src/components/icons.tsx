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

/* The brand mark, lifted from the guidelines rather than drawn by eye: three
   speech bubbles standing in for people, the flanking pair always orange, the
   centre figure taking whichever of amber or blue the ground is not. */
export const MARK = {
  head: 'M 85.29 0.00 C 92.01 0.00 98.09 2.73 102.50 7.13 C 106.91 11.54 109.63 17.61 109.63 24.34 C 109.63 31.05 106.91 37.14 102.50 41.54 C 98.09 45.95 92.02 48.67 85.29 48.67 C 78.58 48.67 72.49 45.94 68.09 41.54 C 63.68 37.14 60.96 31.06 60.96 24.34 C 60.96 17.62 63.68 11.54 68.09 7.13 C 72.49 2.73 78.57 0.00 85.29 0.00',
  body: 'M 129.80 204.00 C 129.80 204.00 118.31 199.72 118.08 188.04 C 122.71 181.59 125.45 173.68 125.45 165.13 L 125.45 96.29 C 125.45 74.59 107.85 56.99 86.14 56.99 L 80.09 56.99 C 58.39 56.99 40.79 74.59 40.79 96.29 L 40.79 165.13 C 40.79 186.83 58.39 204.43 80.09 204.43 L 86.14 204.43 C 91.86 204.43 97.29 203.21 102.19 201.01 C 104.14 202.40 116.79 210.79 129.80 204.00',
  rightHead:
    'M 145.51 34.38 C 150.82 34.38 155.62 36.54 159.10 40.02 C 162.58 43.50 164.73 48.30 164.73 53.61 C 164.73 58.91 162.58 63.72 159.10 67.20 C 155.62 70.68 150.82 72.84 145.51 72.84 C 140.20 72.84 135.40 70.68 131.92 67.20 C 128.44 63.72 126.29 58.92 126.29 53.61 C 126.29 48.30 128.44 43.50 131.92 40.02 C 135.40 36.54 140.20 34.38 145.51 34.38',
  rightBody:
    'M 167.72 167.48 L 167.72 167.48 C 178.34 158.79 185.33 144.03 185.33 127.28 C 185.33 100.54 167.50 78.85 145.51 78.85 C 123.52 78.85 105.69 100.54 105.69 127.28 C 105.69 154.03 123.52 175.71 145.51 175.71 C 148.56 175.71 151.53 175.29 154.38 174.50 L 154.38 174.51 C 154.38 174.51 162.63 183.98 173.75 180.75 C 173.75 180.75 166.04 175.97 167.72 167.48',
  leftHead:
    'M 34.38 62.82 C 38.80 62.82 42.82 64.61 45.72 67.52 C 48.62 70.42 50.42 74.42 50.42 78.85 C 50.42 83.28 48.62 87.29 45.72 90.19 C 42.82 93.09 38.81 94.89 34.38 94.89 C 29.96 94.89 25.95 93.09 23.04 90.19 C 20.14 87.29 18.34 83.28 18.34 78.85 C 18.34 74.43 20.14 70.42 23.04 67.52 C 25.95 64.61 29.95 62.82 34.38 62.82',
  leftBody:
    'M 15.20 163.38 L 15.20 163.38 C 6.03 157.13 0.00 146.52 0.00 134.48 C 0.00 115.25 15.39 99.66 34.38 99.66 C 53.37 99.66 68.76 115.25 68.76 134.48 C 68.76 153.71 53.37 169.30 34.38 169.30 C 31.75 169.30 29.18 169.00 26.72 168.43 L 26.73 168.43 C 26.73 168.43 19.59 175.25 10.00 172.92 C 10.00 172.92 16.66 169.49 15.20 163.38',
}

/* The wordmark, as outlines rather than as type.
   Aliment is the brand's primary face but the PDF embeds its personal-use cut,
   which does not cover a shipped product — and the eleven letters here never
   change, so they do not need a font. These are the real glyph outlines lifted
   out of the guidelines with `pdftocairo`, at exact geometry. */
export const WordMark = ({ height = 20, color = 'var(--blue)' }: { height?: number; color?: string }) => (
  <svg
    width={(height * 591.43) / 65.76}
    height={height}
    viewBox="0 0 591.43 65.76"
    fill="none"
    role="img"
    aria-label="Tether Clan"
  >
    <path fill={color} d="M 56.17 22.37 L 35.81 22.37 L 35.81 58.34 L 20.28 58.34 L 20.28 22.37 L 0.00 22.37 L 0.00 6.84 L 56.17 6.84Z M 56.17 22.37 M 75.49 19.39 L 75.49 28.83 L 96.98 28.83 L 96.98 36.48 L 75.49 36.48 L 75.49 45.92 L 103.67 45.92 L 103.67 58.34 L 59.96 58.34 L 59.96 6.84 L 103.67 6.84 L 103.67 19.25Z M 75.49 19.39 M 163.79 22.37 L 143.43 22.37 L 143.43 58.34 L 127.90 58.34 L 127.90 22.37 L 107.62 22.37 L 107.62 6.84 L 163.79 6.84Z M 163.79 22.37 M 219.08 6.84 L 219.08 58.34 L 203.55 58.34 L 203.55 38.42 L 183.11 38.42 L 183.11 58.34 L 167.58 58.34 L 167.58 6.84 L 183.11 6.84 L 183.11 28.83 L 203.55 28.83 L 203.55 6.84Z M 219.08 6.84 M 239.81 19.39 L 239.81 28.83 L 261.30 28.83 L 261.30 36.48 L 239.81 36.48 L 239.81 45.92 L 267.99 45.92 L 267.99 58.34 L 224.28 58.34 L 224.28 6.84 L 267.99 6.84 L 267.99 19.25Z M 239.81 19.39 M 299.36 45.18 L 288.72 45.18 L 288.72 58.40 L 273.19 58.40 L 273.19 6.90 L 303.73 6.90 C 306.41 6.90 308.94 7.42 311.31 8.43 C 313.69 9.45 315.76 10.85 317.51 12.64 C 319.27 14.42 320.66 16.49 321.67 18.84 C 322.69 21.20 323.20 23.71 323.20 26.37 C 323.20 29.50 322.42 32.30 320.86 34.78 C 319.30 37.26 317.31 39.12 314.89 40.36 L 327.08 53.36 L 316.73 63.47Z M 308.50 28.01 C 308.50 26.68 308.24 25.56 307.72 24.64 C 307.19 23.72 306.50 22.98 305.62 22.40 C 304.76 21.83 303.75 21.43 302.61 21.22 C 301.47 20.99 300.29 20.87 299.06 20.87 L 288.72 20.87 L 288.72 35.15 L 299.06 35.15 C 300.29 35.15 301.47 35.04 302.61 34.83 C 303.75 34.60 304.76 34.20 305.62 33.62 C 306.50 33.05 307.19 32.31 307.72 31.39 C 308.24 30.47 308.50 29.35 308.50 28.01Z M 308.50 28.01 M 373.45 32.62 C 373.45 34.65 373.82 36.46 374.56 38.04 C 375.30 39.63 376.27 40.98 377.48 42.09 C 378.70 43.21 380.10 44.06 381.69 44.65 C 383.28 45.25 384.94 45.57 386.67 45.62 C 388.02 45.68 389.34 45.53 390.66 45.18 C 391.97 44.83 393.18 44.29 394.30 43.54 C 395.41 42.81 396.41 41.87 397.30 40.73 C 398.19 39.59 398.89 38.25 399.39 36.72 L 414.39 40.95 C 413.50 43.92 412.16 46.67 410.38 49.20 C 408.59 51.72 406.49 53.89 404.06 55.70 C 401.63 57.51 398.95 58.92 396.00 59.97 C 393.05 61.01 389.94 61.53 386.67 61.53 C 382.66 61.53 378.91 60.77 375.41 59.26 C 371.91 57.76 368.86 55.68 366.23 53.06 C 363.61 50.43 361.54 47.36 360.03 43.84 C 358.52 40.32 357.77 36.58 357.77 32.62 C 357.77 28.61 358.52 24.86 360.03 21.37 C 361.54 17.87 363.61 14.81 366.23 12.18 C 368.86 9.56 371.91 7.49 375.41 5.98 C 378.91 4.47 382.66 3.72 386.67 3.72 C 389.94 3.72 393.05 4.24 396.00 5.28 C 398.95 6.32 401.63 7.75 404.06 9.56 C 406.49 11.36 408.59 13.53 410.38 16.06 C 412.16 18.58 413.50 21.33 414.39 24.29 L 399.39 28.47 C 398.94 27.12 398.30 25.90 397.48 24.78 C 396.67 23.67 395.72 22.70 394.63 21.89 C 393.53 21.07 392.32 20.42 390.98 19.95 C 389.65 19.48 388.24 19.25 386.75 19.25 C 385.02 19.25 383.35 19.58 381.73 20.25 C 380.12 20.92 378.69 21.85 377.45 23.04 C 376.22 24.23 375.25 25.65 374.53 27.28 C 373.81 28.90 373.45 30.68 373.45 32.62Z M 373.45 32.62 M 463.07 42.81 L 463.07 58.34 L 418.85 58.34 L 418.85 6.84 L 434.38 6.84 L 434.38 42.81Z M 463.07 42.81 M 532.20 58.34 L 513.84 58.34 L 509.45 50.61 L 498.60 55.43 L 487.23 50.68 L 482.85 58.34 L 464.57 58.34 L 498.31 1.56Z M 489.98 45.86 L 506.70 45.86 L 498.38 31.14Z M 489.98 45.86 M 591.43 6.84 L 591.43 65.76 L 549.13 30.47 L 549.13 58.26 L 533.60 58.26 L 533.60 -0.00 L 575.90 35.29 L 575.90 6.84Z M 591.43 6.84" />
  </svg>
)


export const LogoMark = ({
  size = 26,
  tone = 'blue',
  muted = false,
  decorative = false,
}: {
  size?: number
  /** Which colour the centre figure takes — the one the ground is not. */
  tone?: 'blue' | 'amber'
  muted?: boolean
  /** Set when the wordmark sits beside it and already names the brand. */
  decorative?: boolean
}) => {
  const centre = muted ? '#C9C2AE' : tone === 'amber' ? 'var(--yellow)' : 'var(--blue)'
  const flank = muted ? 'var(--chip-line)' : 'var(--orange)'
  // The art is taller than it is wide; height is what the caller means by size.
  return (
    <svg
      width={(size * 185.33) / 210.79}
      height={size}
      viewBox="0 0 185.33 210.79"
      fill="none"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Tether Clan' })}
    >
      {/* Grouped by figure rather than by draw order, so the splash can fly
          each one in separately. Paint order is still right-behind-centre. */}
      <g className="mk-mid">
        <path d={MARK.head} fill={centre} />
      </g>
      <g className="mk-right">
        <path d={MARK.rightHead} fill={flank} />
        <path d={MARK.rightBody} fill={flank} />
      </g>
      <g className="mk-mid">
        <path d={MARK.body} fill={centre} />
      </g>
      <g className="mk-left">
        <path d={MARK.leftBody} fill={flank} />
        <path d={MARK.leftHead} fill={flank} />
      </g>
    </svg>
  )
}
