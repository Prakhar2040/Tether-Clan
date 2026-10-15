import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHmac } from 'node:crypto'
import { inArray, like, sql } from 'drizzle-orm'
import { buildApp } from '../src/app'
import { db, pool, schema } from '../src/db/client'

/* Buying, holding, paying — against the real local Postgres, with its own event and its own
   people, all removed afterwards, so the seeded world is left exactly as it was found. */

const T = 'ordtest'
const SECRET = 'test-webhook-secret'
let app: Awaited<ReturnType<typeof buildApp>>
const personIds = Array.from({ length: 8 }, (_, i) => `${T}-p${i}`)

const future = () => new Date(Date.now() + 3 * 86_400_000)

async function makeEvent(id: string, capacity: number, pricePaise: number) {
  await db.insert(schema.events).values({
    id,
    title: `Test ${id}`,
    startsAt: future(),
    capacity,
    pricePaise,
    status: 'on_sale',
  })
}

const buy = (eventId: string, who: string, body: unknown = {}) =>
  app.inject({
    method: 'POST',
    url: `/api/events/${eventId}/orders`,
    headers: { 'x-user-id': who },
    payload: body as object,
  })

const pay = (orderId: string, who: string) =>
  app.inject({ method: 'POST', url: `/api/orders/${orderId}/pay`, headers: { 'x-user-id': who } })

beforeAll(async () => {
  process.env.LOG_LEVEL = 'silent'
  process.env.WEBHOOK_SECRET = SECRET
  delete process.env.PAYMENTS_MODE
  app = await buildApp()
  await db.insert(schema.people).values(
    personIds.map((id) => ({ id, name: id, initials: 'OT', color: '#000000' })),
  )
})

afterAll(async () => {
  await db.execute(sql`delete from tickets where event_id like ${T + '-%'}`)
  await db.execute(sql`delete from orders where event_id like ${T + '-%'}`)
  await db.delete(schema.events).where(like(schema.events.id, `${T}-%`))
  await db.delete(schema.people).where(inArray(schema.people.id, personIds))
  await app.close()
  await pool.end()
})

describe('buying', () => {
  it('refuses a client that tries to choose the order state', async () => {
    await makeEvent(`${T}-state`, 5, 20000)
    const res = await buy(`${T}-state`, personIds[0], { state: 'paid' })
    expect(res.statusCode).toBe(400)
  })

  it('holds a paid event, hides the refs until paid, and prices in rupees', async () => {
    await makeEvent(`${T}-hold`, 10, 25000)
    const res = await buy(`${T}-hold`, personIds[0], { qty: 2 })
    expect(res.statusCode).toBe(201)
    const o = res.json()
    expect(o.state).toBe('held')
    expect(o.qty).toBe(2)
    expect(o.pricePaise).toBe(25000)
    expect(o.totalPaise).toBe(50000)
    expect(o.currency).toBe('INR')
    expect(o.tickets).toEqual([])
    expect(new Date(o.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('pays through the mock button and then shows one distinct ref per seat', async () => {
    const [{ orderId }] = [(await buy(`${T}-hold`, personIds[0])).json()]
    const res = await pay(orderId, personIds[0])
    expect(res.statusCode).toBe(200)
    const o = res.json()
    expect(o.state).toBe('paid')
    expect(o.expiresAt).toBeNull()
    expect(o.tickets).toHaveLength(2)
    const refs = o.tickets.map((t: { ref: string }) => t.ref)
    expect(new Set(refs).size).toBe(2)
    for (const r of refs) expect(r).toMatch(/^TC-[2-9A-HJKMNP-Z]{8}$/)
    // Paying twice is a no-op, not a second payment.
    expect((await pay(orderId, personIds[0])).json().already).toBe(true)
  })

  it('hands back the existing order instead of making a second one', async () => {
    const res = await buy(`${T}-hold`, personIds[0], { qty: 1 })
    expect(res.statusCode).toBe(200)
    expect(res.json().already).toBe(true)
  })

  it("will not let somebody pay for another person's order", async () => {
    const { orderId } = (await buy(`${T}-hold`, personIds[1])).json()
    expect((await pay(orderId, personIds[2])).statusCode).toBe(404)
  })

  it('marks a free event paid straight away', async () => {
    await makeEvent(`${T}-free`, 5, 0)
    const o = (await buy(`${T}-free`, personIds[0])).json()
    expect(o.state).toBe('paid')
    expect(o.tickets).toHaveLength(1)
  })

  it('rejects more than the per-order limit', async () => {
    await makeEvent(`${T}-max`, 50, 100)
    expect((await buy(`${T}-max`, personIds[0], { qty: 7 })).statusCode).toBe(400)
  })
})

describe('overselling', () => {
  it('sells the last seats exactly once when buyers race', async () => {
    await makeEvent(`${T}-race`, 3, 10000)
    const results = await Promise.all(personIds.map((p) => buy(`${T}-race`, p)))
    const ok = results.filter((r) => r.statusCode === 201).length
    const full = results.filter((r) => r.statusCode === 409).length
    expect(ok).toBe(3)
    expect(full).toBe(personIds.length - 3)
  })

  it("does not say how many seats are left when 'that many' are not available", async () => {
    await makeEvent(`${T}-few`, 3, 10000)
    await buy(`${T}-few`, personIds[0], { qty: 2 })
    const res = await buy(`${T}-few`, personIds[1], { qty: 2 })
    expect(res.statusCode).toBe(409)
    expect(JSON.stringify(res.json())).not.toMatch(/\d/)
  })
})

describe('holds expire', () => {
  it('lets go of the seats once the hold has run out', async () => {
    await makeEvent(`${T}-exp`, 1, 10000)
    const first = (await buy(`${T}-exp`, personIds[0])).json()
    expect((await buy(`${T}-exp`, personIds[1])).statusCode).toBe(409)

    await db.execute(sql`update orders set expires_at = now() - interval '1 minute' where id = ${first.orderId}`)
    expect((await buy(`${T}-exp`, personIds[1])).statusCode).toBe(201)

    // The first person pays too late, and the seat has gone to somebody else.
    const late = await pay(first.orderId, personIds[0])
    expect([409, 410]).toContain(late.statusCode)
  })

  it('revives an expired order if its seats are still free when the money arrives', async () => {
    await makeEvent(`${T}-revive`, 5, 10000)
    const o = (await buy(`${T}-revive`, personIds[0])).json()
    await db.execute(sql`update orders set expires_at = now() - interval '1 minute' where id = ${o.orderId}`)
    const res = await pay(o.orderId, personIds[0])
    expect(res.statusCode).toBe(200)
    expect(res.json().state).toBe('paid')
  })
})

describe('the payment webhook', () => {
  const sign = (raw: string) => createHmac('sha256', SECRET).update(raw).digest('hex')
  const post = (payload: object, signature?: string) => {
    const raw = JSON.stringify(payload)
    return app.inject({
      method: 'POST',
      url: '/api/webhooks/payments',
      headers: { 'content-type': 'application/json', 'x-webhook-signature': signature ?? sign(raw) },
      payload: raw,
    })
  }

  it('refuses a bad signature', async () => {
    await makeEvent(`${T}-wh1`, 5, 10000)
    const o = (await buy(`${T}-wh1`, personIds[0])).json()
    const res = await post({ provider: 'razorpay', orderId: o.orderId, paymentRef: 'pay_x', status: 'paid' }, 'nope')
    expect(res.statusCode).toBe(401)
  })

  it('marks the order paid, records who paid it, and is safe to repeat', async () => {
    await makeEvent(`${T}-wh2`, 5, 10000)
    const o = (await buy(`${T}-wh2`, personIds[0])).json()
    const body = { provider: 'razorpay', orderId: o.orderId, paymentRef: 'pay_abc123', status: 'paid' }
    expect((await post(body)).statusCode).toBe(200)
    expect((await post(body)).json().already).toBe(true)
    const [row] = (
      await db.execute(sql`select state, payment_provider, payment_ref, paid_at from orders where id = ${o.orderId}`)
    ).rows as { state: string; payment_provider: string; payment_ref: string; paid_at: Date }[]
    expect(row).toMatchObject({ state: 'paid', payment_provider: 'razorpay', payment_ref: 'pay_abc123' })
    expect(row.paid_at).toBeTruthy()
  })
})
