// Point 1: the query normalizer. Every query passes through here first so
// that every later stage (dictionaries, caching, logging) sees one canonical
// form.

// Tether Clan is Bangalore-only, so every spelling of the city is noise:
// "board games in blr" carries exactly as much information as "board games".
// Stripping beats aliasing here — it keeps these tokens out of text matching.
const CITY_NOISE = new Set([
  'blr',
  'bangalore',
  'banglore',
  'bengaluru',
  'bengalooru',
  'namma',
])

// Filler words that never help matching.
const STOPWORDS = new Set(['in', 'at', 'near', 'the', 'a', 'an', 'of', 'for', 'me', 'my', 'to'])

// Combining diacritical marks, stripped after NFKD so "café" folds to "cafe".
const COMBINING_MARKS = /[̀-ͯ]/g

export function normalize(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const kept = cleaned.split(' ').filter((t) => t && !CITY_NOISE.has(t) && !STOPWORDS.has(t))
  // If the query was ONLY noise ("in bengaluru"), this returns empty rather
  // than falling through to a text search for nothing.
  return kept.join(' ')
}

export function tokenize(normalized: string): string[] {
  return normalized === '' ? [] : normalized.split(' ')
}

// Simple plural folding for matching: "games" ~ "game".
export function singular(token: string): string {
  return token.length > 3 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token
}

// Levenshtein distance with an early exit above `max`. Query tokens are
// short, so a plain DP is plenty fast.
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i)
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0]
    dp[0] = j
    let rowMin = dp[0]
    for (let i = 1; i <= a.length; i++) {
      const cur = dp[i]
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = cur
      rowMin = Math.min(rowMin, dp[i])
    }
    if (rowMin > max) return max + 1
  }
  return dp[a.length]
}

// Fuzzy token equality: exact, prefix, or edit distance 1 on tokens of 4+
// characters. Returns the match kind so the scorer can weight it.
export function tokenMatches(queryTok: string, docTok: string): 'exact' | 'prefix' | 'fuzzy' | null {
  if (queryTok === docTok || singular(queryTok) === singular(docTok)) return 'exact'
  if (docTok.startsWith(queryTok) && queryTok.length >= 3) return 'prefix'
  if (queryTok.length >= 4 && editDistance(queryTok, docTok, 1) <= 1) return 'fuzzy'
  return null
}
