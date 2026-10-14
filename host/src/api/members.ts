import type { MemberRole } from '@shared/roster'
import { membersOf, roster } from '@shared/roster'
import type { Person } from '@shared/types'
import { apiGet } from '@app/api/client'

/* The roster, from the server.
 *
 * The console's own list — members never see who else is in a room, so
 * there is no client-side equivalent of this call.
 *
 * Each row carries its person, which the mock kept in a separate table the
 * console had to look through. Three numbers come with it: `attended` and
 * `noShows` are the running tally the door keeps on the membership row, and
 * `lastSeenWeeks` is what the Last seen column sorts on, since "2 weeks
 * ago" does not sort.
 */

export interface HostMember {
  personId: string
  communityId: string
  role: MemberRole
  joinedLabel: string // "Mar 2025"
  monthsIn: number
  attended: number
  noShows: number
  lastSeenLabel: string
  lastSeenWeeks: number // 999 for somebody who has never come
  person: Person
}

export const fetchMembers = (communityId: string, signal?: AbortSignal) =>
  apiGet<{ members: HostMember[] }>(`/api/communities/${communityId}/members`, signal).then(
    (r) => r.members,
  )

/** The same roster out of the mock, for when the server is unreachable. */
export const localMembers = (communityId: string): HostMember[] =>
  membersOf(communityId)
    .filter((m) => roster[m.personId])
    .map((m) => ({ ...m, person: roster[m.personId] }))
