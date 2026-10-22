import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq, inArray, like, sql } from 'drizzle-orm'
import { buildApp } from '../src/app'
import { db, pool, schema } from '../src/db/client'

/* The door, against the real local Postgres, with its own community, people and events
   under one prefix, all removed afterwards. */

const T = 'dortest'
let app: Awaited<ReturnType<typeof buildApp>>
const P = {
  host: `${T}-host`,
  admin: `${T}-admin`,
  ex: `${T}-ex`,
  member: `${T}-member`,
  guest: `${T}-guest`,
  guest2: `${T}-guest2`,
}
const COMM = `${T}-comm`
const EV = `${T}-ev`
const EV2 = `${T}-ev2`
const EV_LOOSE = `${T}-loose`

async function makeEvent(id: string, communityId: string | null) {
  await db.insert(schema.events).values({
    id,
    title: id,
    startsAt: new Date(Date.now() + 86_400_000),
    capacity: 20,
    pricePaise: 100,
    status: 'on_sale',
    communityId,
  })
}

async function makeOrder(
  id: string,
  eventId: string,
  personId: string,
  refs: string[],
  state: 'paid' | 'held' | 'expired' = 'paid',
) {
  await db.insert(schema.orders).values({
    id,
    eventId,
    personId,
    ref: `${id.toUpperCase()}`,
    qty: refs.length,
    pricePaise: 100,
    state,
  })
  await db.insert(schema.tickets).values(
    refs.map((ref, i) => ({ id: `${id}-t${i}`, orderId: id, eventId, ref })),
  )
}

const scan = (eventId: string, who: string, ref: string) =>
  app.inject({
    method: 'POST',
    url: `/api/events/${eventId}/scan`,
    headers: { 'x-user-id': who },
    payload: { ref },
  })

const counters = async (personId: string) =>
  (
    await db
      .select({ attended: schema.memberships.attended, noShows: schema.memberships.noShows })
      .from(schema.memberships)
      .where(eq(schema.memberships.id, `${COMM}:${personId}`))
  )[0]

beforeAll(async () => {
  process.env.LOG_LEVEL = 'silent'
  app = await buildApp()
  await db
    .insert(schema.people)
    .values(Object.values(P).map((id) => ({ id, name: id, initials: 'DT', color: '#000000' })))
  await db.insert(schema.communities).values({
    id: COMM,
    name: COMM,
    blurb: 'x',
    description: 'x',
    areaName: 'x',
    categoryLabel: 'x',
    color: '#000000',
  })
  const m = (personId: string, role: 'owner' | 'admin' | 'member', leftAt: Date | null = null) => ({
    id: `${COMM}:${personId}`,
    personId,
    communityId: COMM,
    role,
    joinedAt: new Date(Date.now() - 86_400_000 * 30),
    leftAt,
    attended: 5,
  })
  await db
    .insert(schema.memberships)
    .values([
      m(P.host, 'owner'),
      m(P.admin, 'admin'),
      m(P.ex, 'admin', new Date()),
      m(P.member, 'member'),
      m(P.guest, 'member'),
      m(P.guest2, 'member'),
    ])
  await makeEvent(EV, COMM)
  await makeEvent(EV2, COMM)
  await makeEvent(EV_LOOSE, null)
  await makeOrder(`${T}-o1`, EV, P.guest, ['TC-DOOR2AAA'])
  await makeOrder(`${T}-o2`, EV, P.guest2, ['TC-DOOR2BBB', 'TC-DOOR2CCC'])
  await makeOrder(`${T}-o3`, EV2, P.guest, ['TC-DOOR2DDD'])
  await makeOrder(`${T}-o4`, EV, P.member, ['TC-DOOR2EEE'], 'held')
  await makeOrder(`${T}-o5`, EV_LOOSE, P.guest, ['TC-DOOR2FFF'])
})

afterAll(async () => {
  const like_ = `${T}-%`
  await db.execute(sql`delete from attendance where event_id like ${like_}`)
  await db.execute(sql`delete from tickets where event_id like ${like_}`)
  await db.execute(sql`delete from orders where event_id like ${like_}`)
  await db.delete(schema.events).where(like(schema.events.id, like_))
  await db.delete(schema.memberships).where(eq(schema.memberships.communityId, COMM))
  await db.delete(schema.communities).where(eq(schema.communities.id, COMM))
  await db.delete(schema.people).where(inArray(schema.people.id, Object.values(P)))
  await app.close()
  await pool.end()
})

describe('who may scan', () => {
  it('refuses a plain member, a former admin, and an unknown viewer', async () => {
    expect((await scan(EV, P.member, 'TC-DOOR2AAA')).statusCode).toBe(403)
    expect((await scan(EV, P.guest, 'TC-DOOR2AAA')).statusCode).toBe(403)
    expect((await scan(EV, P.ex, 'TC-DOOR2AAA')).statusCode).toBe(403)
    expect((await scan(EV, `${T}-nobody`, 'TC-DOOR2AAA')).statusCode).toBe(401)
  })

  it('refuses an event with no community, and says why', async () => {
    const res = await scan(EV_LOOSE, P.host, 'TC-DOOR2FFF')
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toMatch(/no community/)
  })

  it('keeps the other door routes host-only too', async () => {
    const att = await app.inject({
      method: 'POST',
      url: `/api/events/${EV}/attendance`,
      headers: { 'x-user-id': P.member },
      payload: { personId: P.guest },
    })
    expect(att.statusCode).toBe(403)
    const list = await app.inject({
      method: 'GET',
      url: `/api/events/${EV}/door`,
      headers: { 'x-user-id': P.member },
    })
    expect(list.statusCode).toBe(403)
  })
})

describe('scanning', () => {
  it('lets an owner scan, with a sloppy typed ref, and counts the night once', async () => {
    const before = await counters(P.guest)
    const res = await scan(EV, P.host, ' tc door2aaa ')
    expect(res.statusCode).toBe(200)
    const b = res.json()
    expect(b.ticket.ref).toBe('TC-DOOR2AAA')
    expect(b.person).toEqual({ id: P.guest, name: P.guest })
    expect(b.order).toEqual({ qty: 1, scanned: 1 })
    expect((await counters(P.guest)).attended).toBe(before.attended + 1)
  })

  it('refuses a second scan of the same ticket and does not count it again', async () => {
    const before = await counters(P.guest)
    const res = await scan(EV, P.admin, 'TC-DOOR2AAA')
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('Already scanned')
    expect(res.json().scannedAt).toBeTruthy()
    expect(res.json().person.id).toBe(P.guest)
    expect(await counters(P.guest)).toEqual(before)
  })

  it('treats two tickets in one order as one attendance but both scannable', async () => {
    const before = await counters(P.guest2)
    const a = await scan(EV, P.host, 'TC-DOOR2BBB')
    expect(a.statusCode).toBe(200)
    expect(a.json().order).toEqual({ qty: 2, scanned: 1 })
    const b = await scan(EV, P.host, 'TC-DOOR2CCC')
    expect(b.statusCode).toBe(200)
    expect(b.json().order).toEqual({ qty: 2, scanned: 2 })
    expect((await counters(P.guest2)).attended).toBe(before.attended + 1)
    const rows = await db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.eventId, EV))
    expect(rows.filter((r) => r.personId === P.guest2)).toHaveLength(1)
  })

  it('refuses a ref from another night', async () => {
    const res = await scan(EV, P.host, 'TC-DOOR2DDD')
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toMatch(/TC-DOOR2DDD/)
  })

  it("refuses a ticket whose order is not paid, and does not mark it", async () => {
    const res = await scan(EV, P.host, 'TC-DOOR2EEE')
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/held/)
    const [t] = await db.select().from(schema.tickets).where(eq(schema.tickets.ref, 'TC-DOOR2EEE'))
    expect(t.scannedAt).toBeNull()
  })

  it('shows scanned state on the door list, and attendance still works for a host', async () => {
    const list = await app.inject({
      method: 'GET',
      url: `/api/events/${EV}/door`,
      headers: { 'x-user-id': P.host },
    })
    expect(list.statusCode).toBe(200)
    const tickets = list.json().tickets as { ref: string; scannedAt: string | null }[]
    expect(tickets.find((t) => t.ref === 'TC-DOOR2AAA')?.scannedAt).toBeTruthy()
    expect(list.json().arrived.length).toBeGreaterThanOrEqual(2)

    const att = await app.inject({
      method: 'POST',
      url: `/api/events/${EV}/attendance`,
      headers: { 'x-user-id': P.host },
      payload: { personId: P.member, walkIn: true },
    })
    expect(att.statusCode).toBe(201)
  })
})
