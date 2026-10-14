import type { CommunityPhoto } from '@shared/types'
import { asset, photos as localPhotos } from '../data/community'
import { apiGet } from './client'

/* The gallery from the server.
 *
 * `src` arrives as a bare filename, because the backend has no idea where
 * this bundle serves images from. `asset()` is the same resolver the mock
 * goes through, so a photo from either source is indistinguishable by the
 * time a screen sees it.
 */

export interface WirePhoto {
  id: string
  communityId: string
  src?: string
  color: string
  caption: string
  byId: string
  takenAt: string
  timeLabel: string
  eventId?: string
}

const toApp = (p: WirePhoto): CommunityPhoto => ({
  id: p.id,
  communityId: p.communityId,
  src: asset(p.src),
  color: p.color,
  caption: p.caption,
  byId: p.byId,
  timeLabel: p.timeLabel,
  eventId: p.eventId,
})

export async function fetchPhotos(
  communityId: string,
  signal?: AbortSignal,
): Promise<CommunityPhoto[]> {
  const { photos } = await apiGet<{ photos: WirePhoto[] }>(
    `/api/communities/${communityId}/photos`,
    signal,
  )
  return photos.map(toApp)
}

/** Several communities at once, for the screen that shows them side by side. */
export async function fetchPhotosFor(
  communityIds: string[],
  signal?: AbortSignal,
): Promise<CommunityPhoto[]> {
  const pages = await Promise.all(communityIds.map((id) => fetchPhotos(id, signal)))
  return pages.flat()
}

/** What the gallery shows while the server is unreachable. */
export const localGallery: CommunityPhoto[] = localPhotos
