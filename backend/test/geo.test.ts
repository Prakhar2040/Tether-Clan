import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { buildApp } from '../src/app'
import { db, schema } from '../src/db/client'

/* The viewer's position travels as lat & lng. Inserts its own venues and events under the
   `geotest` prefix and deletes only those. */
const T = 'geotest'
let app: Awaited<ReturnType<typeof buildApp>>
const day = () => new Date(Date.now() + 2 * 86_400_000)

const get = async (qs: string) => {
  const res = await app.inject({ method: 'GET', url: `/api/search?q=zzgeo${qs}` })
  return { status: res.statusCode, body: res.json() as any }
}
const venueOf = (body: any, id: string) => body.hydrated.find((e: any) => e.id === id)?.venue

beforeAll(async () => {
  process.env.LOG_LEVEL = 'silent'
  app = await buildApp()
  await db.insert(schema.venues).values([
    { id: `${T}-indiranagar`, name: 'Geo Indiranagar', areaName: 'Indiranagar', lat: 12.9719, lng: 77.6412 },
    { id: `${T}-whitefield`, name: 'Geo Whitefield', areaName: 'Whitefield', lat: 12.9698, lng: 77.75 },
    { id: `${T}-unknown`, name: 'Geo Unknown', areaName: 'Somewhere' },
  ])
  await db.insert(schema.events).values(
    ['indiranagar', 'whitefield', 'unknown'].map((v) => ({
      id: `${T}-${v}`,
      title: `Zzgeo gathering ${v}`,
      startsAt: day(),
      capacity: 10,
      pricePaise: 0,
      status: 'on_sale' as const,
      venueId: `${T}-${v}`,
    })),
  )
})

afterAll(async () => {
  await db.execute(sql`delete from events where id like ${T + '-%'}`)
  await db.execute(sql`delete from venues where id like ${T + '-%'}`)
  await app.close()
})

describe('viewer position', () => {
  it('measures distance from the position the client sent', async () => {
    const here = (await get('&lat=12.9719&lng=77.6412')).body
    const there = (await get('&lat=12.9698&lng=77.75')).body
    expect(venueOf(here, `${T}-indiranagar`).distanceKm).toBeLessThan(0.5)
    expect(venueOf(there, `${T}-indiranagar`).distanceKm).toBeGreaterThan(10)
    expect(venueOf(there, `${T}-whitefield`).distanceKm).toBeLessThan(0.5)
  })

  it('applies the radius from the sent position', async () => {
    const { body } = await get('&lat=12.9719&lng=77.6412&radiusKm=3')
    const got = body.hydrated.map((e: any) => e.id)
    expect(got).toContain(`${T}-indiranagar`)
    expect(got).not.toContain(`${T}-whitefield`)
  })

  it('works with no position at all (the old default)', async () => {
    const { status } = await get('')
    expect(status).toBe(200)
  })
})

describe('bad positions are a 400 naming the field', () => {
  it.each([
    ['&lat=abc&lng=77', 'lat'],
    ['&lat=91&lng=77', 'lat'],
    ['&lat=12&lng=181', 'lng'],
    ['&lat=12&lng=', 'lng'],
    ['&lat=12', 'lng'],
    ['&lng=77', 'lat'],
  ])('%s', async (qs, field) => {
    const { status, body } = await get(qs)
    expect(status).toBe(400)
    expect(body.error).toContain(field)
  })
})

describe('a venue without coordinates', () => {
  it('has no distance and is never dropped by the radius', async () => {
    const { body } = await get('&lat=12.9719&lng=77.6412&radiusKm=1')
    const v = venueOf(body, `${T}-unknown`)
    expect(v).toBeDefined()
    expect(v.distanceKm).toBeNull()
    expect(v.travelMin).toBeNull()
  })

  it('ranks after the venues with a known distance', async () => {
    const { body } = await get('&lat=12.9719&lng=77.6412')
    const order = body.hydrated.map((e: any) => e.id)
    expect(order.indexOf(`${T}-unknown`)).toBeGreaterThan(order.indexOf(`${T}-indiranagar`))
    expect(order.indexOf(`${T}-unknown`)).toBeGreaterThan(order.indexOf(`${T}-whitefield`))
  })
})
