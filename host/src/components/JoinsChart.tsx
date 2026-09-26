import { useId, useState } from 'react'
import type { Bucket } from '../lib/analytics'

// One series over time, so no legend — the heading names it. Faint grid,
// 2px line, a soft area beneath, and the latest month held as the emphasised
// point because that is the one being asked about.
const W = 720
const H = 180
const PAD = { top: 16, right: 14, bottom: 26, left: 30 }

export default function JoinsChart({ data, peak }: { data: Bucket[]; peak: number }) {
  const uid = useId()
  const [hover, setHover] = useState<number | null>(null)

  const top = Math.max(2, Math.ceil(peak * 1.15))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.joined).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`

  const ticks = [0, Math.round(top / 2), top]
  const last = data.length - 1
  const shown = hover ?? last

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`New members a month: ${data.map((d) => `${d.label} ${d.joined}`).join(', ')}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
            <text x={PAD.left - 8} y={y(t) + 4} className="tick" textAnchor="end">
              {t}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${uid}-fill)`} />
        <path d={line} className="series" />

        {/* The month being read, held with a crosshair. */}
        <line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={PAD.top + innerH} className="cross" />
        <circle cx={x(shown)} cy={y(data[shown].joined)} r="5.5" className="point" />

        {data.map((d, i) => (
          <g key={d.monthsAgo}>
            <text x={x(i)} y={H - 7} className={i === shown ? 'mon on' : 'mon'} textAnchor="middle">
              {d.label}
            </text>
            <rect
              x={x(i) - innerW / (data.length * 2)}
              y={PAD.top}
              width={innerW / data.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>

      <figcaption className="chart-read">
        <b>{data[shown].joined}</b> joined in {data[shown].label}
        {shown === last ? ' — this month so far' : ''}
      </figcaption>
    </figure>
  )
}
