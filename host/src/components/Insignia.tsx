import type { Tier } from '../state/badges'

// A mark that escalates, rather than another word in a pill. One bar for
// somebody who has not been yet, a chevron once they are a fixture, a
// chevron under a star once they have outlasted most of the room.
export default function Insignia({ tier, size = 13 }: { tier: Exclude<Tier, null>; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (tier === 'first-night')
    return (
      <svg {...common}>
        <path d="M5 16h14" />
      </svg>
    )

  if (tier === 'regular')
    return (
      <svg {...common}>
        <path d="M5 17l7-6 7 6" />
        <path d="M5 21l7-6 7 6" />
      </svg>
    )

  return (
    <svg {...common}>
      <path d="M12 2.5l2.2 4.6 5 .7-3.6 3.5.85 5-4.45-2.4-4.45 2.4.85-5L4.8 7.8l5-.7L12 2.5z" />
      <path d="M5.5 20.5l6.5-5 6.5 5" />
    </svg>
  )
}
