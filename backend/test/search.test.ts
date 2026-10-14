import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { search, nullState } from '../src/engine/index'
import { normalize } from '../src/engine/normalize'
import { route } from '../src/engine/router'
import { resetLog, stats } from '../src/engine/log'
import { loadWorld, type World } from '../src/db/repo'

/* The engine reads a world rather than importing one, so the tests load the
   same one the server does. These are integration tests now: they need the
   database up and seeded (`npm run db:up && npm run db:seed`). */
let w: World
beforeAll(async () => {
  w = await loadWorld()
})

const ids = (r: ReturnType<typeof search>) => r.events.map((e) => e.id)

beforeEach(() => resetLog())

describe('normalizer (point 1)', () => {
  it('cleans punctuation, case and spacing', () => {
    expect(normalize('  Board-Games!!  ')).toBe('board games')
  })
  it('strips the city and filler words, since we are Bangalore-only', () => {
    expect(normalize('board games in BLR')).toBe('board games')
    expect(normalize('bengaluru')).toBe('')
    expect(normalize('events near me')).toBe('events')
  })
  it('folds accents', () => {
    expect(normalize('Café')).toBe('cafe')
  })
})

describe('intent router (point 4)', () => {
  it('reads date words as a when-filter', () => {
    expect(route(normalize('tonight'), w).intents[0]).toMatchObject({ kind: 'when', id: 'tonight' })
  })
  it('reads filter words', () => {
    expect(route(normalize('free'), w).intents[0]).toMatchObject({ kind: 'filter', id: 'free' })
  })
  it('reads areas from the gazetteer', () => {
    expect(route(normalize('koramangala'), w).intents[0]).toMatchObject({ kind: 'area', id: 'koramangala' })
  })
  it('reads activities via synonyms', () => {
    expect(route(normalize('shuttle'), w).intents[0]).toMatchObject({ kind: 'activity', id: 'badminton' })
  })
  it('splits a compound query into several intents and no residual', () => {
    const r = route(normalize('free board games saturday'), w)
    const kinds = r.intents.map((i) => `${i.kind}:${i.id}`)
    expect(kinds).toContain('filter:free')
    expect(kinds).toContain('activity:board-games')
    expect(kinds).toContain('when:12')
    expect(r.residual).toHaveLength(0)
  })
})

describe('hard prefilters (point 5)', () => {
  it('never returns past events, even on a perfect title match', () => {
    expect(ids(search({ q: 'catan' }, w))).not.toContain('last-week-catan')
  })
  it('never returns drafts', () => {
    expect(ids(search({ q: 'pub quiz' }, w))).not.toContain('draft-quiz')
  })
  it('excludes events outside the radius', () => {
    const tight = search({ q: '', radiusKm: 1 }, w)
    expect(tight.events.length).toBeLessThan(search({ q: '' }, w).events.length)
  })
})

describe('lexical retrieval (point 6)', () => {
  it('finds an event by title', () => {
    expect(ids(search({ q: 'catan' }, w))).toContain('catan-night')
  })
  it('tolerates a one-letter typo', () => {
    expect(ids(search({ q: 'potery' }, w))).toContain('pottery-taster')
    expect(ids(search({ q: 'catn' }, w))).toContain('catan-night')
  })
  it('matches on venue name', () => {
    expect(ids(search({ q: 'third wave' }, w))).toContain('kannada-english')
  })
  it('matches on tags', () => {
    expect(ids(search({ q: 'outdoor' }, w))).toContain('sketchwalk')
  })
  it('misses heavy misspellings (documented Phase 2 gap)', () => {
    expect(ids(search({ q: 'kattaan' }, w))).toHaveLength(0)
  })
})

describe('synonyms and facets (point 2)', () => {
  it('boardgame → board games events', () => {
    expect(ids(search({ q: 'boardgame' }, w))).toContain('catan-night')
  })
  it('shuttle → badminton', () => {
    const r = ids(search({ q: 'shuttle' }, w))
    expect(r).toContain('badminton-doubles')
    expect(r.every((id) => id.includes('badminton'))).toBe(true)
  })
  it('ride → cycling', () => {
    expect(ids(search({ q: 'ride' }, w))).toContain('cycle-loop')
  })
})

describe('geo intent (point 3)', () => {
  it('koramangala returns events near there', () => {
    const r = search({ q: 'koramangala' }, w)
    expect(r.applied.areaId).toBe('koramangala')
    expect(ids(r)).toContain('cycle-loop')
  })
})

describe('scoring (point 7)', () => {
  it('ranks sooner events above later ones for the same relevance', () => {
    const r = search({ q: '' }, w)
    const tonight = r.events.findIndex((e) => e.id === 'catan-night')
    const weekend = r.events.findIndex((e) => e.id === 'book-brunch')
    expect(tonight).toBeLessThan(weekend)
  })
  it('demotes but does not hide full events', () => {
    const r = search({ q: 'pickleball' }, w)
    expect(ids(r)).toContain('late-doubles')
  })
  it('exposes the breakdown in debug mode', () => {
    const r = search({ q: 'catan', debug: true }, w)
    expect(r.events[0].breakdown).toHaveProperty('relevance')
    expect(r.events[0].breakdown).toHaveProperty('time')
  })
})

describe('response contract (point 8)', () => {
  it('returns typed suggestion groups', () => {
    const r = search({ q: 'board games' }, w)
    expect(r.groups.some((g) => g.type === 'activity')).toBe(true)
  })
  it('reports what filters were applied and why', () => {
    const r = search({ q: 'free tonight' }, w)
    expect(r.applied.free).toBe(true)
    expect(r.applied.when).toBe('tonight')
    expect(r.meta.intents).toContain('filter:free')
  })
})

describe('null state and zero results (point 9)', () => {
  it('null state offers activities and circle events', () => {
    const n = nullState(w)
    expect(n.groups[0].items.length).toBeGreaterThan(0)
    expect(n.trendingAreas.length).toBeGreaterThan(0)
  })
  it('zero results offer a beyond-radius fallback', () => {
    const r = search({ q: 'pottery', radiusKm: 1 }, w)
    expect(r.events).toHaveLength(0)
    expect(r.fallback?.reason).toBe('beyond-radius')
    expect(r.fallback?.events.length).toBeGreaterThan(0)
  })
})

describe('instrumentation (point 10)', () => {
  it('tracks zero-result rate and no-match terms', () => {
    search({ q: 'catan' }, w)
    search({ q: 'zzzznotathing' }, w)
    const s = stats()
    expect(s.total).toBe(2)
    expect(s.zeroResultRate).toBe(0.5)
    expect(s.noMatchTerms[0].term).toBe('zzzznotathing')
  })
})

describe('typeahead prefixes', () => {
  it('matches from two characters', () => {
    expect(ids(search({ q: 'ca' }, w))).toContain('catan-night')
    expect(ids(search({ q: 'ba' }, w))).toContain('badminton-doubles')
  })
  it('still matches at three and four', () => {
    expect(ids(search({ q: 'cat' }, w))).toContain('catan-night')
    expect(ids(search({ q: 'cata' }, w))).toContain('catan-night')
  })
})
