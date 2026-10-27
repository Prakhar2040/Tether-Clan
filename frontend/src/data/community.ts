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
import cprStart from '../assets/cpr-start.jpg'
import cprPack from '../assets/cpr-pack.jpg'
import cprFinish from '../assets/cpr-finish.jpg'
import cprStretch from '../assets/cpr-stretch.jpg'
import cprPark from '../assets/cpr-park.jpg'
import sketchCover from '../assets/community-sketchbook.jpg'
import sbcSpread from '../assets/sbc-spread.jpg'
import sbcPens from '../assets/sbc-pens.jpg'
import sbcWatercolour from '../assets/sbc-watercolour.jpg'
import ridersCover from '../assets/community-riders.jpg'
import srjDawn from '../assets/srj-dawn.jpg'
import srjClimb from '../assets/srj-climb.jpg'
import srjRepair from '../assets/srj-repair.jpg'
import srjCoffee from '../assets/srj-coffee.jpg'
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
  'cpr-start.jpg': cprStart,
  'cpr-pack.jpg': cprPack,
  'cpr-finish.jpg': cprFinish,
  'cpr-stretch.jpg': cprStretch,
  'cpr-park.jpg': cprPark,
  'community-sketchbook.jpg': sketchCover,
  'sbc-spread.jpg': sbcSpread,
  'sbc-pens.jpg': sbcPens,
  'sbc-watercolour.jpg': sbcWatercolour,
  'community-riders.jpg': ridersCover,
  'srj-dawn.jpg': srjDawn,
  'srj-climb.jpg': srjClimb,
  'srj-repair.jpg': srjRepair,
  'srj-coffee.jpg': srjCoffee,
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
