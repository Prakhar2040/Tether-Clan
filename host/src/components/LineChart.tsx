import { useEffect, useRef } from 'react'
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Legend,
  Title,
  Tooltip,
} from 'chart.js'
import type { ChartDataset } from 'chart.js'

// Only the pieces this chart uses are registered — the whole of Chart.js is a
// lot of controllers to carry for one line.
Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Legend, Title, Tooltip)

// The console's own type, so the chart does not arrive in Helvetica.
Chart.defaults.font.family = "'Archivo Narrow', Archivo, sans-serif"
Chart.defaults.font.weight = 600
Chart.defaults.font.size = 11.5

export interface Line {
  label: string
  values: number[]
  color: string
  fillTop?: string
  dashed?: boolean
}

/* A Chart.js line wired to the console's palette.
   Built once and updated in place: `lines` is a fresh array on every render,
   so tearing the chart down whenever it changes identity would restart the
   entry animation at random and leave it half-drawn. */
export function LineChart({
  labels,
  lines,
  title,
  suffix = '',
  height = 260,
  zero = false,
}: {
  labels: string[]
  lines: Line[]
  title?: string
  suffix?: string
  height?: number
  zero?: boolean
}) {
  const el = useRef<HTMLCanvasElement | null>(null)
  const chart = useRef<Chart | null>(null)
  // The latest props, for the build that runs inside a mount-only effect.
  const now = useRef({ labels, lines, title, suffix, zero })
  now.current = { labels, lines, title, suffix, zero }

  useEffect(() => {
    if (!el.current) return
    const css = getComputedStyle(document.documentElement)
    const tok = (n: string) => css.getPropertyValue(n).trim()
    // Canvas has no cascade: `var(--blue)` is not a colour to a 2D context,
    // it is an invalid string that silently paints black. Resolve first.
    const hue = (c: string) => {
      const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(c.trim())
      return m ? tok(m[1]) || '#15477C' : c
    }
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    const build = (ls: Line[]): ChartDataset<'line'>[] =>
      ls.map((l) => ({
        label: l.label,
        data: l.values,
        borderColor: hue(l.color),
        borderWidth: 2.6,
        borderDash: l.dashed ? [5, 4] : undefined,
        tension: 0.34,
        fill: l.fillTop ? 'origin' : false,
        backgroundColor: hue(l.fillTop ?? l.color),
        // A dot at every reading, the way the Chart.js samples draw them.
        pointRadius: 3.6,
        pointBackgroundColor: tok('--card') || '#fff',
        pointBorderColor: hue(l.color),
        pointBorderWidth: 2.2,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: hue(l.color),
        pointHoverBorderColor: tok('--card') || '#fff',
        pointHoverBorderWidth: 2,
      }))

    const p = now.current
    chart.current = new Chart(el.current, {
      type: 'line',
      data: { labels: p.labels, datasets: build(p.lines) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // The lines draw themselves up out of the axis rather than fading in.
        animation: calm ? false : { duration: 900, easing: 'easeOutQuart' },
        animations: calm
          ? {}
          : {
              y: {
                from: (ctx) =>
                  ctx.type === 'data' && ctx.mode === 'default'
                    ? ctx.chart.scales.y.getPixelForValue(ctx.chart.scales.y.min)
                    : undefined,
              },
            },
        // Hovering should feel immediate even though the entrance is slow.
        transitions: { active: { animation: { duration: 140 } } },
        // The whole column lights up, so a reading never depends on landing
        // the cursor on a two-pixel dot.
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 2, right: 6, bottom: 0, left: 0 } },
        scales: {
          x: {
            grid: { display: false },
            border: { color: tok('--line') || '#E8E2D2' },
            ticks: { color: tok('--faint') || '#A79F8C', padding: 8 },
          },
          y: {
            beginAtZero: p.zero,
            grid: { color: tok('--line') || '#E8E2D2' },
            border: { display: false, dash: [3, 3] },
            ticks: {
              color: tok('--faint') || '#A79F8C',
              padding: 10,
              maxTicksLimit: 6,
              precision: 0,
              callback: (v) => `${v}${p.suffix}`,
            },
          },
        },
        plugins: {
          title: {
            display: !!p.title,
            text: p.title ?? '',
            align: 'start',
            color: tok('--muted-2') || '#6B665A',
            font: { family: 'Archivo, system-ui, sans-serif', size: 13, weight: 700 },
            padding: { top: 0, bottom: 2 },
          },
          legend: {
            display: p.lines.length > 1,
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'rectRounded',
              boxWidth: 20,
              boxHeight: 9,
              padding: 16,
              color: tok('--muted-2') || '#6B665A',
              font: { family: "'Archivo Narrow', Archivo, sans-serif", size: 12, weight: 700 },
            },
          },
          tooltip: {
            backgroundColor: tok('--blue') || '#15477C',
            titleFont: { family: "'Archivo Narrow', Archivo, sans-serif", size: 12, weight: 700 },
            bodyFont: { family: "'Archivo Narrow', Archivo, sans-serif", size: 12, weight: 600 },
            padding: 10,
            cornerRadius: 8,
            displayColors: p.lines.length > 1,
            boxWidth: 8,
            boxHeight: 8,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y}${p.suffix}` },
          },
        },
      },
    })
    ;(chart.current as Chart & { _build?: typeof build })._build = build

    return () => {
      chart.current?.destroy()
      chart.current = null
    }
  }, [])

  // New numbers animate from the old ones. Keyed on the values themselves, so
  // a parent re-render that changes nothing does not disturb the chart.
  const key = JSON.stringify({ labels, lines, title, suffix, zero })
  useEffect(() => {
    const c = chart.current as (Chart & { _build?: (l: Line[]) => ChartDataset<'line'>[] }) | null
    if (!c?._build) return
    c.data.labels = labels
    c.data.datasets = c._build(lines)
    // The scale union includes time scales, which have no beginAtZero.
    const ys = c.options.scales?.y as { beginAtZero?: boolean } | undefined
    if (ys) ys.beginAtZero = zero
    const t = c.options.plugins?.title
    if (t) {
      t.display = !!title
      t.text = title ?? ''
    }
    c.update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div className="cjs" style={{ height }}>
      <canvas ref={el} />
    </div>
  )
}
