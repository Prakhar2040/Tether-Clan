import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { communities, photosFor } from '@app/data/community'
import type { CommunityPhoto } from '@app/types'

// The gallery, as something the host edits. Seeded from what the app already
// ships, then kept per community. Uploads are object URLs — they live as long
// as the tab does, which is enough to design against.

export interface PhotoDraft extends CommunityPhoto {
  uploaded?: boolean
}

interface PhotosValue {
  photos: PhotoDraft[]
  coverId: string | undefined
  dirty: boolean
  add: (files: FileList) => void
  update: (id: string, patch: Partial<PhotoDraft>) => void
  remove: (id: string) => void
  move: (from: string, to: string) => void
  setCover: (id: string) => void
  revert: () => void
  save: () => void
}

const PhotosContext = createContext<PhotosValue | null>(null)

interface Board {
  photos: PhotoDraft[]
  coverId: string | undefined
}

function seed(communityId: string): Board {
  const list = photosFor(communityId).map((p) => ({ ...p }))
  const cover = communities[communityId]?.coverImage
  return { photos: list, coverId: list.find((p) => p.src === cover)?.id }
}

export function PhotosProvider({ communityId, children }: { communityId: string; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, Board>>({})
  const [saved, setSaved] = useState<Record<string, Board>>({})
  const [n, setN] = useState(0)

  const committed = saved[communityId] ?? seed(communityId)
  const board = drafts[communityId] ?? committed

  const value = useMemo<PhotosValue>(() => {
    const write = (next: Board) => setDrafts((d) => ({ ...d, [communityId]: next }))
    return {
      photos: board.photos,
      coverId: board.coverId,
      dirty: JSON.stringify(board) !== JSON.stringify(committed),
      add: (files) => {
        const fresh: PhotoDraft[] = [...files]
          .filter((f) => f.type.startsWith('image/'))
          .map((f, i) => ({
            id: `up-${communityId}-${n + i}`,
            communityId,
            src: URL.createObjectURL(f),
            color: '#15477C',
            caption: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 48),
            byId: communities[communityId].ownerIds[0],
            timeLabel: 'just now',
            uploaded: true,
          }))
        setN((x) => x + fresh.length)
        // Newest first, the way the gallery reads.
        write({ ...board, photos: [...fresh, ...board.photos] })
      },
      update: (id, patch) =>
        write({ ...board, photos: board.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      remove: (id) =>
        write({
          photos: board.photos.filter((p) => p.id !== id),
          coverId: board.coverId === id ? undefined : board.coverId,
        }),
      move: (from, to) => {
        if (from === to) return
        const next = board.photos.filter((p) => p.id !== from)
        const moved = board.photos.find((p) => p.id === from)
        if (!moved) return
        next.splice(next.findIndex((p) => p.id === to), 0, moved)
        write({ ...board, photos: next })
      },
      setCover: (id) => write({ ...board, coverId: board.coverId === id ? undefined : id }),
      revert: () => setDrafts((d) => ({ ...d, [communityId]: committed })),
      save: () => {
        setSaved((s) => ({ ...s, [communityId]: board }))
        setDrafts((d) => ({ ...d, [communityId]: board }))
      },
    }
  }, [board, committed, communityId, n])

  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>
}

export function usePhotos(): PhotosValue {
  const ctx = useContext(PhotosContext)
  if (!ctx) throw new Error('usePhotos must be used inside PhotosProvider')
  return ctx
}
