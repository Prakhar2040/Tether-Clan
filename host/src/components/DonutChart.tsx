import { useEffect, useRef, useState } from 'react'
import { ArcElement, Chart, DoughnutController, Tooltip } from 'chart.js'

Chart.register(ArcElement, DoughnutController, Tooltip)

export interface Slice {
  key: string
  label: string
  value: number
  color: string
  out?: boolean // pushed further out than the rest
  negative?: boolean // money going the other way, so it reads with a minus
}

/* A doughnut with its key in the hole. At rest the middle lists what the ring
   is made of; hover a section and the middle becomes that one figure, exactly.
   Chart.js draws the ring — which is what buys the sweep on load, the animated
   explode and the tooltip — while the middle stays HTML, because a legend of
   real type is not something to draw on a canvas. */
export function DonutChart({
  slices,
  currency,
  size = 236,
}: {
  slices: Slice[]
  currency: (n: number) => string
  size?: number
}) {
  const el = useRef<HTMLCanvasElement | null>(null)
  const chart = useRef<Chart | null>(null)
  const [at, setAt] = useState<number | null>(null)

  const live = slices.filter((s) => s.value > 0)
  const total = live.reduce((n, s) => n + s.value, 0)
  const key = JSON.stringify(live)

  useEffect(() => {
    if (!el.current) return
    const css = getComputedStyle(document.documentElement)
    const tok = (n: string) => css.getPropertyValue(n).trim()
    const hue = (c: string) => {
      const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(c.trim())
      return m ? tok(m[1]) || '#15477C' : c
    }
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    chart.current = new Chart(el.current, {
      type: 'doughnut',
      data: {
        labels: live.map((s) => s.label),
        datasets: [
          {
            data: live.map((s) => s.value),
            backgroundColor: live.map((s) => hue(s.color)),
            borderColor: tok('--card') || '#fff',
            borderWidth: 2,
            // The explode, per slice. Money going the other way sits further
            // out than the money that stayed.
            offset: live.map((s) => (s.out ? 18 : 6)),
            hoverOffset: live.map((s) => (s.out ? 26 : 14)),
            hoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        // It sweeps round and grows out of the middle, then the wedges part.
        animation: calm ? false : { animateRotate: true, animateScale: true, duration: 950 },
        plugins: {
          legend: { display: false }, // it lives in the hole
          tooltip: {
            backgroundColor: tok('--blue') || '#15477C',
            titleFont: { family: "'Archivo Narrow', Archivo, sans-serif", size: 12, weight: 700 },
            bodyFont: { family: "'Archivo Narrow', Archivo, sans-serif", size: 12, weight: 600 },
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (c) =>
                ` ${currency(c.parsed)} · ${Math.round((c.parsed / Math.max(1, total)) * 100)}%`,
            },
          },
        },
        onHover: (_e, els) => setAt(els.length > 0 ? els[0].index : null),
      },
    })
    return () => {
      chart.current?.destroy()
      chart.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const one = at === null ? null : live[at]

  return (
    <div
      className={size < 260 ? 'donut sm' : 'donut'}
      style={{ width: size, height: size }}
      onMouseLeave={() => setAt(null)}
    >
      <canvas ref={el} />
      <div className="donut-hole">
        {one ? (
          <span className="donut-one">
            <i style={{ background: one.color }} />
            <u>{one.label}</u>
            <b>{one.negative ? `−${currency(one.value)}` : currency(one.value)}</b>
            {/* Against the ring's own total, which is named so the share
                cannot be read as a share of revenue. */}
            <em>
              {Math.round((one.value / Math.max(1, total)) * 100)}% of {currency(total)}
            </em>
          </span>
        ) : (
          <span className="donut-key">
            {live.map((s) => (
              <span key={s.key}>
                <i style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
