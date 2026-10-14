import type { Standing } from '@shared/leaderboard'
import { competitionsOf, pointsFor, standings, YOU } from '@shared/leaderboard'
import { roster } from '@shared/roster'
import { people } from '@shared/mock'
import { apiGet } from './client'

/* The board, scored by the server.
 *
 * The client used to add the points up itself out of the whole competition
 * list. It does not any more: ranking a season is the server's job, and the
 * only reason the mock version survives is that it is what the page shows
 * when the server cannot be reached.
 *
 * What comes back is already in the shape the table renders — the same
 * `Standing` the offline path produces — so the screens read one or the
 * other without caring which.
 */

export interface BoardCompetition {
  id: string
  communityId: string
  name: string
  heldOn: string // a plain day, "2026-10-10" — a competition has no clock
  dateLabel: string
  monthLabel: string
  entrants: number
  /* The top three, in order. The console lists past months with their
     medals; the member's board does not use it. */
  podium: { place: number; personId: string; name: string }[]
}

export interface Board {
  scope: string
  competitions: BoardCompetition[]
  standings: Standing[]
}

export const fetchBoard = (communityId: string, scope: string, signal?: AbortSignal) =>
  apiGet<Board>(
    `/api/communities/${communityId}/leaderboard?scope=${encodeURIComponent(scope)}`,
    signal,
  )

const nameOf = (id: string) => (id === 'you' ? YOU.name : (people[id] ?? roster[id])?.name ?? id)

/** The same board, out of the mock, for when the server is unreachable. */
export function localBoard(communityId: string, scope: string): Board {
  const comps = competitionsOf(communityId)
  const at = comps.some((c) => c.id === scope) || scope === 'all' ? scope : (comps[0]?.id ?? 'all')
  return {
    scope: at,
    competitions: comps.map((c) => ({
      id: c.id,
      communityId: c.communityId,
      name: c.name,
      heldOn: c.date,
      dateLabel: c.dateLabel,
      monthLabel: c.monthLabel,
      entrants: c.entrants,
      podium: c.results
        .filter(([, place]) => place <= 3)
        .sort((a, b) => a[1] - b[1])
        .map(([personId, place]) => ({ place, personId, name: nameOf(personId) })),
    })),
    standings: standings(communityId, at),
  }
}

/* Several rooms' all-time tables at once, keyed by community — the profile
   shows where you stand in each one, and cannot ask inside a loop. */
export async function fetchBoards(
  communityIds: string[],
  signal?: AbortSignal,
): Promise<Record<string, Board>> {
  const boards = await Promise.all(communityIds.map((id) => fetchBoard(id, 'all', signal)))
  return Object.fromEntries(communityIds.map((id, i) => [id, boards[i]]))
}

export const localBoards = (communityIds: string[]): Record<string, Board> =>
  Object.fromEntries(communityIds.map((id) => [id, localBoard(id, 'all')]))

/* Your own placings, newest first. Only ever your own — the same rule that
   keeps attendee lists on the host's side of the wall. */
export interface MyResult {
  competitionId: string
  name: string
  communityId: string
  communityName: string
  heldOn: string
  dateLabel: string
  monthLabel: string
  entrants: number
  place: number
  points: number
}

export const fetchMyResults = (signal?: AbortSignal) =>
  apiGet<{ results: MyResult[] }>('/api/me/results', signal).then((r) => r.results)

export function localMyResults(
  communities: { id: string; name: string }[],
): MyResult[] {
  return communities
    .flatMap((c) =>
      competitionsOf(c.id).flatMap((comp) => {
        const mine = comp.results.find(([personId]) => personId === 'you')
        return mine
          ? [
              {
                competitionId: comp.id,
                name: comp.name,
                communityId: c.id,
                communityName: c.name,
                heldOn: comp.date,
                dateLabel: comp.dateLabel,
                monthLabel: comp.monthLabel,
                entrants: comp.entrants,
                place: mine[1],
                points: pointsFor(mine[1]),
              },
            ]
          : []
      }),
    )
    .sort((a, b) => b.heldOn.localeCompare(a.heldOn))
}
