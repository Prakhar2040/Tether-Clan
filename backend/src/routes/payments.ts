import type { FastifyInstance } from 'fastify'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/client'
import { viewerOf, ViewerUnknown } from '../lib/viewer'
import { parse } from '../lib/body'
import { markPaid, orderViews, type PayResult } from '../lib/orders'

/* Paying.
 *
 * Two doors lead to the same room. The mock "Click here to pay" button and, later, a real
 * provider's webhook both end in `markPaid`, which is idempotent and decides what happens
 * to an order that expired mid-payment. Swapping Razorpay in therefore means writing the
 * checkout call and mapping their webhook body onto `Webhook` below — nothing else moves.
 *
 * PAYMENTS_MODE=mock (the default) turns the button's endpoint on. Set it to anything
 * else once a real provider is wired, and the endpoint answers 404 as if it never existed.
 */

const mockEnabled = () => (process.env.PAYMENTS_MODE ?? 'mock') === 'mock'

/** A payment provider's word that money arrived, in this app's own shape. */
const Webhook = z
  .object({
    provider: z.string().min(1),
    orderId: z.string().min(1),
    paymentRef: z.string().min(1),
    status: z.literal('paid'),
  })
  .strict()

const WHY: Record<Extract<PayResult, { ok: false }>['reason'], [number, string]> = {
  not_found: [404, 'No such order'],
  expired: [410, 'This order expired before it was paid, and its seats have gone'],
  no_seats: [409, 'The seats for this order have gone'],
  not_payable: [409, 'This order cannot be paid'],
}

export async function paymentRoutes(app: FastifyInstance) {
  /* The webhook has to be checked against the exact bytes the provider signed, so this
     plugin (and only this plugin — Fastify keeps parsers inside the plugin that adds
     them) keeps the raw body alongside the parsed one. */
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const raw = String(body)
    if (raw === '') return done(null, { raw, json: {} })
    try {
      done(null, { raw, json: JSON.parse(raw) })
    } catch (e) {
      done(e as Error, undefined)
    }
  })

  /** The mock payment: pays the viewer's own order. For the placeholder checkout only. */
  app.post<{ Params: { id: string } }>('/api/orders/:id/pay', async (req, reply) => {
    if (!mockEnabled()) return reply.code(404).send({ error: 'Not found' })

    let viewer: string
    try {
      viewer = await viewerOf(req)
    } catch (e) {
      if (e instanceof ViewerUnknown) return reply.code(401).send({ error: e.message })
      throw e
    }

    const [order] = await db
      .select({ personId: schema.orders.personId })
      .from(schema.orders)
      .where(eq(schema.orders.id, req.params.id))
      .limit(1)
    if (!order) return reply.code(404).send({ error: 'No such order' })
    // Somebody else's order is reported as missing, not forbidden: no reason to confirm it exists.
    if (order.personId !== viewer) return reply.code(404).send({ error: 'No such order' })

    const result = await markPaid(req.params.id, 'mock', `mock_${randomBytes(9).toString('base64url')}`)
    if (!result.ok) {
      const [status, error] = WHY[result.reason]
      return reply.code(status).send({ error })
    }
    const [view] = await orderViews([req.params.id])
    return reply.code(200).send({ already: result.already, ...view })
  })

  /** A provider telling us a payment landed. Signed with WEBHOOK_SECRET (HMAC-SHA256 of the
   *  raw body, hex, in `x-webhook-signature`); with no secret set it is switched off. */
  app.post('/api/webhooks/payments', async (req, reply) => {
    const secret = process.env.WEBHOOK_SECRET
    if (!secret) return reply.code(503).send({ error: 'Webhooks are not configured' })

    const { raw, json } = req.body as { raw: string; json: unknown }
    const given = String(req.headers['x-webhook-signature'] ?? '')
    const want = createHmac('sha256', secret).update(raw).digest('hex')
    const a = Buffer.from(given)
    const b = Buffer.from(want)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return reply.code(401).send({ error: 'Bad signature' })
    }

    const body = parse(Webhook, json, reply)
    if (!body) return

    const result = await markPaid(body.orderId, body.provider, body.paymentRef)
    if (!result.ok) {
      /* Money has moved but the order cannot take it. Answer with an error so the provider
         retries or flags it, and log loudly: this payment needs refunding by hand. */
      req.log.error({ orderId: body.orderId, reason: result.reason }, 'payment arrived for an order that cannot take it')
      const [status, error] = WHY[result.reason]
      return reply.code(status).send({ error })
    }
    return reply.code(200).send({ ok: true, already: result.already })
  })
}
