import { randomInt } from 'node:crypto'

/* Ticket refs: TC- and eight characters, read off a phone at a door.
 *
 * No 0/O or 1/I/L, which look the same under bad light, and no vowels beyond what a
 * 31-letter alphabet needs, so a ref is never an accidental word. Thirty-one to the
 * eighth is about 850 billion, so a guess is hopeless and a clash is rare — and the
 * unique index still has the last word. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const LENGTH = 8

/** A ref from the given source of randomness. The seeder passes a seeded one so a reseed
 *  gives the same refs; everything else gets the OS's. */
export function makeRef(rand: (max: number) => number = (max) => randomInt(max)): string {
  let out = ''
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[rand(ALPHABET.length)]
  return `TC-${out}`
}

/** Refs that are not already taken. Checks first rather than catching the unique-index
 *  error, which inside a transaction would abort the lot. */
export async function freshRefs(
  n: number,
  taken: (candidates: string[]) => Promise<Set<string>>,
  rand?: (max: number) => number,
): Promise<string[]> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidates = new Set<string>()
    while (candidates.size < n) candidates.add(makeRef(rand))
    const list = [...candidates]
    const clash = await taken(list)
    if (clash.size === 0) return list
  }
  throw new Error('Could not find unused ticket refs')
}

/** Staff type refs by hand, so be forgiving: any case, stray spaces, no dash. */
export function normaliseRef(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return s.startsWith('TC') ? `TC-${s.slice(2)}` : `TC-${s}`
}
