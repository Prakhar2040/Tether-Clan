/* The community world, with the pictures attached.
 *
 * Every record lives in community.data.ts, which holds image *filenames* so
 * the backend can seed from it under plain Node — Node cannot import a .jpg.
 * This module resolves those filenames to the URLs this bundle serves and
 * re-exports everything, so no consumer in either app had to change.
 *
 * When the images move to a bucket, only the map below does.
 */
import boardGamesCover from '../assets/community-board-games.jpg'
import runClubCover from '../assets/community-run-club.jpg'
import ddrCelebration from '../assets/ddr-celebration.jpg'
import ddrHegemony from '../assets/ddr-hegemony.jpg'
import ddrWizard from '../assets/ddr-wizard.jpg'
import ddrHall from '../assets/ddr-hall.jpg'
import ddrOrigins from '../assets/ddr-origins.jpg'
import type { Community, CommunityPhoto } from '@shared/types'
import {
  postsFor,
  communities as rawCommunities,
  photos as rawPhotos,
  eventImages as rawEventImages,
} from '@shared/community.data'

const assets: Record<string, string> = {
  'community-board-games.jpg': boardGamesCover,
  'community-run-club.jpg': runClubCover,
  'ddr-celebration.jpg': ddrCelebration,
  'ddr-hegemony.jpg': ddrHegemony,
  'ddr-wizard.jpg': ddrWizard,
  'ddr-hall.jpg': ddrHall,
  'ddr-origins.jpg': ddrOrigins,
}

/** A filename from the data layer → the URL this bundle serves it at. */
export const asset = (file?: string): string | undefined =>
  file ? (assets[file] ?? file) : undefined

export const communities: Record<string, Community> = Object.fromEntries(
  Object.entries(rawCommunities).map(([id, c]) => [id, { ...c, coverImage: asset(c.coverImage) }]),
)

export const photos: CommunityPhoto[] = rawPhotos.map((p) => ({ ...p, src: asset(p.src) }))

export const eventImages: Record<string, string> = Object.fromEntries(
  Object.entries(rawEventImages).map(([id, f]) => [id, asset(f) ?? f]),
)

export { postsFor }
export {
  myMemberships,
  lastReadAt,
  posts,
  communityEvents,
  pastCommunityEvents,
  upcomingCommunityEvents,
  communityOf,
  canPost,
} from '@shared/community.data'

/* These two read the photo list, so they have to read the resolved one. */
export function photosFor(communityId: string): CommunityPhoto[] {
  return photos.filter((p) => p.communityId === communityId)
}
export function photoById(id: string): CommunityPhoto | undefined {
  return photos.find((p) => p.id === id)
}
export function latestPost(communityId: string) {
  return postsFor(communityId)[0]
}
