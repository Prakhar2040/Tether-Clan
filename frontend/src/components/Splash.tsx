import { useEffect, useRef, useState } from 'react'
import { LogoMark, WordMark } from './icons'

/* The launch sequence.
 *
 * Page 2 of the guidelines says the mark is "speech bubbles as human forms to
 * represent people coming together". Coming together is a verb, so this
 * performs it: the three figures hop in from three directions, the name lands
 * underneath them, and the whole lockup then takes its seat in the header,
 * the name swinging round to the side on the way.
 *
 * The lockup's box is the MARK, not the mark plus the name — the name is laid
 * against it absolutely. A flex row would reserve the wordmark's width, which
 * is wider than the app column, and push the mark off to the left.
 */

const BEATS = {
  hop: 1500, // they have faded up, spread apart, and start moving
  gather: 3000, // all three have landed together
  name: 3900, // the name has settled underneath
  fly: 4150, // the flight begins
  seat: 6060, // the lockup has taken its seat
  gone: 6280, // this element is removed
}

// Big enough to be an arrival, small enough that the wordmark still fits the
// column when it is sitting underneath the mark.
const SCALE = 2.2

export function Splash() {
  const [phase, setPhase] = useState<'in' | 'hop' | 'name' | 'fly' | 'done'>('in')
  const mark = useRef<HTMLSpanElement | null>(null)
  const [land, setLand] = useState<string | null>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPhase('done')
      return
    }
    document.body.classList.add('splashing')

    const t = [
      setTimeout(() => setPhase('hop'), BEATS.hop),
      setTimeout(() => setPhase('name'), BEATS.gather),
      setTimeout(() => {
        /* Measure the header's own mark and fly to exactly that box. Scaling
           on the mark rather than the whole lockup is what keeps the name
           landing in the right place too, since it is laid out in the same
           scaled coordinate space. */
        const seat = document.querySelector('.brand.big svg')?.getBoundingClientRect()
        const here = mark.current?.getBoundingClientRect()
        if (seat && here && here.width > 0 && seat.width > 0) {
          const k = seat.width / here.width
          setLand(
            `translate(${(seat.left - here.left).toFixed(1)}px, ${(seat.top - here.top).toFixed(1)}px) scale(${k.toFixed(4)})`,
          )
          setPhase('fly')
          return
        }
        /* No seat on this screen — some route may not carry the lockup. There
           is nowhere to fly to, so hand over straight away rather than leaving
           a full-size logo sitting in the middle for the length of a flight
           that is never going to happen. */
        document.body.classList.remove('splashing')
        setPhase('done')
      }, BEATS.fly),
      setTimeout(() => {
        document.body.classList.remove('splashing')
        setPhase('done')
      }, BEATS.seat),
    ]
    return () => {
      t.forEach(clearTimeout)
      document.body.classList.remove('splashing')
    }
  }, [])

  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (phase !== 'done') return
    const t = setTimeout(() => setGone(true), BEATS.gone - BEATS.seat)
    return () => clearTimeout(t)
  }, [phase])

  if (gone) return null

  return (
    <div className={`splash sp-${phase}`} aria-hidden="true">
      <span
        className="splash-lock"
        ref={mark}
        style={land ? { transform: land, transformOrigin: '0 0' } : undefined}
      >
        <LogoMark size={40 * SCALE} />
        <span className="splash-name">
          <WordMark height={17 * SCALE} />
        </span>
      </span>
    </div>
  )
}
