import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { events } from '@shared/mock'
import { ApiError } from '../api/client'
import { createOrder } from '../api/orders'
import type { OrderView } from '../api/orders'
import { payForOrder } from '../api/payment'
import { rupees } from '../lib/money'
import { useRsvp } from '../state/rsvp'

/* The buying flow, one sheet for every "Buy" / "Join" button in the app.
 *
 *   choose  -> pick how many, see the total in rupees
 *   working -> order is held, "Processing payment…" (~2s, mock)
 *   done    -> "Payment done", then on to the ticket
 *   pay     -> a held order we are resuming (refresh, or a failed attempt),
 *              with the 10-minute countdown
 *   lapsed  -> the hold ran out: say so, start again
 *   error   -> including "can't reach the server". A purchase is never faked.
 *
 * It never shows or implies how many seats are left; the server decides.
 */

const MAX_QTY = 6 // the server's per-order cap; the only limit the client knows
const PROCESSING_MS = 2000

type Stage = 'choose' | 'working' | 'done' | 'pay' | 'lapsed' | 'error'

const BuyContext = createContext<{ openBuy: (eventId: string) => void } | null>(null)

export function useBuy() {
  const ctx = useContext(BuyContext)
  if (!ctx) throw new Error('useBuy must be used inside BuyProvider')
  return ctx.openBuy
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function describe(err: unknown): { stage: Stage; message: string } {
  if (err instanceof ApiError) {
    if (err.status === 410) return { stage: 'lapsed', message: 'Your hold ran out and the seats have gone.' }
    if (err.status === 401) return { stage: 'error', message: 'Please sign in to buy tickets.' }
    return { stage: 'error', message: err.detail ?? 'That did not go through. Nothing was charged.' }
  }
  return { stage: 'error', message: "Can't reach the server, so nothing was bought. Try again in a moment." }
}

export function Countdown({ expiresAt, onLapse }: { expiresAt: string; onLapse: () => void }) {
  const [left, setLeft] = useState(() => new Date(expiresAt).getTime() - Date.now())
  const lapsed = useRef(onLapse)
  lapsed.current = onLapse
  useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      setLeft(ms)
      if (ms <= 0) {
        clearInterval(t)
        lapsed.current()
      }
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt])
  const s = Math.max(0, Math.ceil(left / 1000))
  return (
    <span className="buy-hold">
      Seats held for {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  )
}

function Sheet({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const e = events[eventId]
  const navigate = useNavigate()
  const { orderFor, applyOrder, refresh } = useRsvp()
  const existing = orderFor(eventId)
  const resumable =
    existing?.state === 'held' && existing.expiresAt && new Date(existing.expiresAt).getTime() > Date.now()
      ? existing
      : undefined

  const [qty, setQty] = useState(1)
  const [stage, setStage] = useState<Stage>(resumable ? 'pay' : 'choose')
  const [order, setOrder] = useState<OrderView | undefined>(resumable)
  const [message, setMessage] = useState('')
  const busy = useRef(false)

  if (!e) return null
  const free = e.price === 0
  // Before an order exists the server has not priced anything; this is the listed price.
  const total = order ? order.totalPaise : e.price * 100 * qty

  async function run(from?: OrderView) {
    if (busy.current) return
    busy.current = true
    setStage('working')
    let o = from
    try {
      if (!o) {
        o = await createOrder(eventId, qty)
        setOrder(o)
        applyOrder(o)
      }
      if (o.state !== 'paid') {
        await sleep(PROCESSING_MS)
        o = await payForOrder(o.orderId) // the mock seam: see api/payment.ts
        setOrder(o)
        applyOrder(o)
      }
      setStage('done')
      await sleep(1100)
      refresh()
      onClose()
      navigate(`/ticket/${eventId}`)
    } catch (err) {
      const d = describe(err)
      setMessage(d.message)
      // A held order survives a failed attempt; offer to retry it unless it lapsed.
      setStage(d.stage === 'error' && o && o.state === 'held' ? 'pay' : d.stage)
      if (d.stage === 'lapsed') refresh()
    } finally {
      busy.current = false
    }
  }

  const startAgain = () => {
    setOrder(undefined)
    setMessage('')
    setQty(1)
    setStage('choose')
  }

  return (
    <div className="sheet-backdrop" onClick={stage === 'working' || stage === 'done' ? undefined : onClose}>
      <div className="sheet buy-sheet" onClick={(ev) => ev.stopPropagation()}>
        <span className="sheet-handle" />
        <span className="section-label">{e.title}</span>

        {stage === 'working' ? (
          <div className="buy-state" role="status">
            <span className="buy-spin" />
            <span className="buy-big">Processing payment…</span>
            {order?.expiresAt ? <Countdown expiresAt={order.expiresAt} onLapse={() => undefined} /> : null}
          </div>
        ) : stage === 'done' ? (
          <div className="buy-state" role="status">
            <span className="buy-tick">✓</span>
            <span className="buy-big">Payment done</span>
            <span className="page-sub">Getting your ticket…</span>
          </div>
        ) : stage === 'lapsed' ? (
          <div className="buy-state">
            <span className="buy-big">Your hold ran out</span>
            <span className="page-sub">{message || 'The seats were let go after 10 minutes. Nothing was charged.'}</span>
            <button className="btn btn-cta" onClick={startAgain}>Start again</button>
          </div>
        ) : stage === 'pay' && order ? (
          <>
            <span className="page-sub">
              {order.qty} ticket{order.qty > 1 ? 's' : ''} · {rupees(order.totalPaise)}
            </span>
            {order.expiresAt ? (
              <Countdown
                expiresAt={order.expiresAt}
                onLapse={() => {
                  setMessage('')
                  setStage('lapsed')
                  refresh()
                }}
              />
            ) : null}
            {message ? <span className="buy-error">{message}</span> : null}
            <button className="btn btn-cta" onClick={() => run(order)}>Click here to pay</button>
          </>
        ) : (
          <>
            {stage === 'error' ? <span className="buy-error">{message}</span> : null}
            <div className="buy-qty">
              <span className="about-label">Tickets</span>
              <div className="buy-stepper">
                <button aria-label="One fewer" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}>
                  −
                </button>
                <span className="buy-n" aria-live="polite">{qty}</span>
                <button aria-label="One more" disabled={qty >= MAX_QTY} onClick={() => setQty((q) => q + 1)}>
                  +
                </button>
              </div>
            </div>
            <div className="buy-total">
              <span>Total</span>
              <b>{free ? 'Free' : rupees(total)}</b>
            </div>
            <button className="btn btn-cta" onClick={() => run()}>
              {free ? 'Reserve' : 'Click here to pay'}
            </button>
            <button className="btn btn-ghost" style={{ minHeight: 44 }} onClick={onClose}>
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function BuyProvider({ children }: { children: ReactNode }) {
  const [eventId, setEventId] = useState<string | null>(null)
  const openBuy = useCallback((id: string) => setEventId(id), [])
  return (
    <BuyContext.Provider value={{ openBuy }}>
      {children}
      {eventId ? <Sheet key={eventId} eventId={eventId} onClose={() => setEventId(null)} /> : null}
    </BuyContext.Provider>
  )
}
