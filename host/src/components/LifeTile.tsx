import { useRef, useState } from 'react'
import { LogoMark3D } from './icons'

export interface Figure {
  n: string
  label: string
}

/* Everything the room has done, around the mark that made it.
   The tilt is CSS 3D, not a mesh: the logo is drawn art, and a real engine
   would be six hundred kilobytes to rotate a picture. The figures sit on a
   translateZ above the logo's plane, so they swing further than it does when
   the card turns — that parallax is what sells the depth, not the rotation. */
export function LifeTile({
  figures,
  since,
  chip,
}: {
  figures: Figure[]
  since: string
  chip?: React.ReactNode
}) {
  const box = useRef<HTMLDivElement | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [live, setLive] = useState(false)

  const calm =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

  const track = (e: React.MouseEvent) => {
    if (calm || !box.current) return
    const r = box.current.getBoundingClientRect()
    // −1 to 1 from the centre of the tile.
    const dx = (e.clientX - r.left) / r.width - 0.5
    const dy = (e.clientY - r.top) / r.height - 0.5
    setTilt({ x: -dy * 16, y: dx * 20 })
    setLive(true)
  }

  const rest = () => {
    setTilt({ x: 0, y: 0 })
    setLive(false)
  }

  // How far out the figures sit, as a percentage of the stage. Separate axes:
  // the tile is far wider than it is tall, so one radius would either crowd
  // the mark vertically or push the side figures off the edge.
  const RX = 33
  const RY = 30

  return (
    <div className="life" ref={box} onMouseMove={track} onMouseLeave={rest}>
      <div className="life-top">
        <span className="life-label">Since {since}</span>
        {chip}
      </div>

      <div className="life-stage">
        <div
          className={live ? 'life-turn on' : 'life-turn'}
          style={{ transform: `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)` }}
        >
          <span className="life-glow" />
          <span className="life-mark">
            <LogoMark3D size={76} />
          </span>

          {figures.slice(0, 6).map((f, i) => {
            // Six o'clock is where the logo's shadow falls, so start at the
            // top and step round from there.
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2
            return (
              <span
                className="life-fig"
                key={f.label}
                style={{
                  left: `${50 + Math.cos(a) * RX}%`,
                  top: `${50 + Math.sin(a) * RY}%`,
                  transitionDelay: `${i * 22}ms`,
                }}
              >
                <b>{f.n}</b>
                <i>{f.label}</i>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
