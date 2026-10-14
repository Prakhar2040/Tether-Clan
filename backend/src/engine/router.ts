import { areas } from '../data/areas'
import { activities, DATE_TERMS, FILTER_TERMS } from '../data/taxonomy'
import type { World } from '../db/repo'
import { editDistance, tokenize } from './normalize'

// Point 4: rule-based intent router. Runs before any retrieval, in a fixed
// order of cheapest-and-most-certain first. Whatever it consumes is removed
// from the query; only leftovers reach text search.

export interface Intent {
  kind: 'when' | 'filter' | 'area' | 'activity' | 'venue' | 'community'
  id: string
  label: string
  matched: string // the query text it consumed
}

export interface RoutedQuery {
  normalized: string
  intents: Intent[]
  residual: string[] // tokens left for text retrieval
}

// Try to match a multi-word phrase from the token list against a dictionary
// of phrases. Longest phrase wins, so "board game" beats "board".
function matchPhrase(
  tokens: string[],
  used: boolean[],
  phrases: { phrase: string; payload: Intent }[],
): Intent | null {
  const maxWords = 3
  for (let len = maxWords; len >= 1; len--) {
    for (let i = 0; i + len <= tokens.length; i++) {
      if (used.slice(i, i + len).some(Boolean)) continue
      const candidate = tokens.slice(i, i + len).join(' ')
      for (const { phrase, payload } of phrases) {
        const exact = candidate === phrase
        // typo tolerance on longer phrases only, to avoid absurd matches
        const fuzzy = !exact && phrase.length >= 5 && editDistance(candidate, phrase, 1) <= 1
        if (exact || fuzzy) {
          for (let k = i; k < i + len; k++) used[k] = true
          return { ...payload, matched: candidate }
        }
      }
    }
  }
  return null
}

export function route(normalized: string, w: World): RoutedQuery {
  const tokens = tokenize(normalized)
  const used = new Array(tokens.length).fill(false)
  const intents: Intent[] = []

  // 1. Date words → when-filter
  const datePhrases = Object.entries(DATE_TERMS).map(([phrase, value]) => ({
    phrase,
    payload: { kind: 'when', id: value, label: phrase, matched: '' } as Intent,
  }))
  // 2. Filter words → free / beginner
  const filterPhrases = Object.entries(FILTER_TERMS).map(([phrase, value]) => ({
    phrase,
    payload: { kind: 'filter', id: value, label: phrase, matched: '' } as Intent,
  }))
  // 3. Areas (gazetteer) → geo filter
  const areaPhrases = areas.flatMap((a) =>
    [a.name.toLowerCase(), ...a.aliases].map((phrase) => ({
      phrase,
      payload: { kind: 'area', id: a.id, label: a.name, matched: '' } as Intent,
    })),
  )
  // 4. Activities (taxonomy + synonyms) → facet
  const activityPhrases = activities.flatMap((a) =>
    a.terms.map((phrase) => ({
      phrase,
      payload: { kind: 'activity', id: a.id, label: a.label, matched: '' } as Intent,
    })),
  )
  // 5. Venues and communities → entity jump
  const venuePhrases = Object.values(w.venues).flatMap((v) => {
    const short = v.name.toLowerCase().replace(/ (board game )?caf.*$/, '')
    return [v.name.toLowerCase(), short].map((phrase) => ({
      phrase,
      payload: { kind: 'venue', id: v.id, label: v.name, matched: '' } as Intent,
    }))
  })
  const communityPhrases = Object.values(w.communities).map((c) => ({
    phrase: c.name.toLowerCase(),
    payload: { kind: 'community', id: c.id, label: c.name, matched: '' } as Intent,
  }))

  // Order matters: certain, cheap classifications first.
  const passes = [datePhrases, filterPhrases, areaPhrases, venuePhrases, communityPhrases, activityPhrases]
  for (const phrases of passes) {
    // a query can carry several intents ("free board games saturday")
    let found: Intent | null
    while ((found = matchPhrase(tokens, used, phrases))) {
      if (!intents.some((i) => i.kind === found!.kind && i.id === found!.id)) intents.push(found)
    }
  }

  const residual = tokens.filter((_, i) => !used[i])
  return { normalized, intents, residual }
}
