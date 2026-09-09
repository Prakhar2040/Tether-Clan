// Point 10: instrumentation. In-memory for now; moves to Postgres later.
// Two numbers matter most: zero-result rate, and the no-match term list that
// feeds the synonym map by hand each week.

export interface QueryLogEntry {
  at: string
  raw: string
  normalized: string
  intents: string[]
  residual: string[]
  resultCount: number
  tookMs: number
}

const MAX_ENTRIES = 5000
const entries: QueryLogEntry[] = []

export function logQuery(e: Omit<QueryLogEntry, 'at'>): void {
  if (e.raw.trim() === '') return // null-state opens are not queries
  entries.push({ at: new Date().toISOString(), ...e })
  if (entries.length > MAX_ENTRIES) entries.shift()
}

export function stats() {
  const total = entries.length
  const zero = entries.filter((e) => e.resultCount === 0)

  // Terms we could not interpret: no intent detected AND no results.
  const noMatchCounts = new Map<string, number>()
  for (const e of zero) {
    if (e.intents.length > 0) continue
    const key = e.normalized
    if (key) noMatchCounts.set(key, (noMatchCounts.get(key) ?? 0) + 1)
  }

  const avgMs = total === 0 ? 0 : +(entries.reduce((a, e) => a + e.tookMs, 0) / total).toFixed(2)

  return {
    total,
    zeroResultRate: total === 0 ? 0 : +(zero.length / total).toFixed(3),
    avgMs,
    noMatchTerms: [...noMatchCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([term, count]) => ({ term, count })),
    recent: entries.slice(-25).reverse(),
  }
}

export function resetLog(): void {
  entries.length = 0
}
