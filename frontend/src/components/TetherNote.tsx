import { useEffect, useRef, useState } from 'react'
import { LogoMark } from './icons'

/* Tether, speaking first in the channel.
 *
 * This replaced a grey line of chrome pinned above the tab bar. Saying the
 * same thing as a message from the product, at the head of the room, makes it
 * read as part of the conversation rather than as a warning label — and it
 * cannot cover what you are reading, which the pinned version did.
 *
 * The tips rotate because one line is a notice and a handful is a voice. They
 * are contextual rather than random: each one answers something people
 * actually get wrong about this app.
 *
 * Motion is deliberately small. The skill's own rule is that motion which
 * plays at you is worse than motion that responds to you, so this is one line
 * rising as it arrives — no loop on the avatar, nothing moving while you read.
 * It stops entirely when scrolled out of view, and under reduced motion it
 * settles on the first tip and stays there.
 */
const ROTATE_MS = 8000

export function TetherNote({ tips }: { tips: string[] }) {
  const [at, setAt] = useState(0)
  const [animate, setAnimate] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const still =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (tips.length < 2 || still) return
    const el = ref.current
    if (!el) return

    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (timer) return
      timer = setInterval(() => {
        setAnimate(true)
        setAt((n) => (n + 1) % tips.length)
      }, ROTATE_MS)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }

    /* Nothing ticks while it is off screen. A timer running under a feed
       nobody is looking at is pure battery.
       
       Guarded because this is an optimisation, not the feature: where
       IntersectionObserver is missing the tips should still rotate, and an
       unguarded `new IntersectionObserver` took the entire page down with it
       when they were not there. */
    if (typeof IntersectionObserver === 'undefined') {
      start()
      return stop
    }
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      stop()
    }
  }, [tips.length, still])

  if (tips.length === 0) return null

  return (
    <div className="tether-note" ref={ref}>
      <span className="tether-mark">
        <LogoMark size={20} tone="amber" decorative />
      </span>
      <span className="tether-body">
        <span className="tether-name">Tether</span>
        {/* Keyed so the animation replays on each change. One line is on
            screen at a time, so there is no duplicate to hide from a screen
            reader — but it must not announce itself every eight seconds
            either, hence no live region. */}
        <span key={at} className={animate ? 'tether-tip rising' : 'tether-tip'}>
          {tips[at]}
        </span>
      </span>
    </div>
  )
}
