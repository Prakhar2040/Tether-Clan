import type { Community } from '@shared/types'
import { communities as localCommunities, asset } from '../data/community'
import { apiGet } from './client'

/* Communities from the server.
 *
 * The API sends `coverImage` and `ownerPhoto` as bare filenames, not URLs —
 * it has no idea where this bundle serves images from. `asset()` is the one
 * place that knows, and it is the same function the local data already goes
 * through, so a record from the server and a record from the mock come out
 * identical from here on.
 */

type Wire = Omit<Community, 'coverImage' | 'ownerPhoto'> & {
  coverImage?: string
  ownerPhoto?: string
}

const resolve = (c: Wire): Community => ({
  ...c,
  coverImage: asset(c.coverImage),
  ownerPhoto: asset(c.ownerPhoto),
})

export async function fetchCommunities(signal?: AbortSignal): Promise<Record<string, Community>> {
  const { communities } = await apiGet<{ communities: Wire[] }>('/api/communities', signal)
  return Object.fromEntries(communities.map((c) => [c.id, resolve(c)]))
}

/** What to show while the server is unreachable: exactly what the app showed
 *  before there was a server. */
export const localCommunitiesById = localCommunities
