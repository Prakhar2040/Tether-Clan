import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { postsFor } from '@app/data/community'
import type { CommunityPost, Poll } from '@app/types'

// Loudness is a host-side property: the app renders every post the same, but
// only some of them are worth interrupting 64 people for. It lives here
// rather than on the shared model, which has no use for it.
export interface HostPost extends CommunityPost {
  notify?: boolean
}

// The channel, from the writing end. One way: Robin posts, members react.
// There are no replies to moderate, which is the whole reason the room stays
// readable.

interface PostsValue {
  posts: HostPost[]
  dirty: boolean
  publish: (draft: NewPost) => void
  update: (id: string, patch: Partial<HostPost>) => void
  remove: (id: string) => void
  togglePin: (id: string) => void
  revert: () => void
  save: () => void
}

export interface NewPost {
  kind: 'note' | 'poll'
  emoji: string
  title: string
  body: string
  poll?: Poll
  notify: boolean
}

const PostsContext = createContext<PostsValue | null>(null)

export function PostsProvider({ communityId, children }: { communityId: string; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, HostPost[]>>({})
  const [saved, setSaved] = useState<Record<string, HostPost[]>>({})
  const [n, setN] = useState(0)

  const committed = saved[communityId] ?? postsFor(communityId)
  const posts = drafts[communityId] ?? committed

  const value = useMemo<PostsValue>(() => {
    const write = (next: HostPost[]) => setDrafts((d) => ({ ...d, [communityId]: next }))
    // Pinned first, then newest. Same rule the app reads by.
    const order = (list: HostPost[]) =>
      [...list].sort(
        (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || a.sortKey - b.sortKey,
      )

    return {
      posts,
      dirty: JSON.stringify(posts) !== JSON.stringify(committed),
      publish: (d) => {
        const post: HostPost = {
          id: `new-${communityId}-${n}`,
          communityId,
          authorId: '',
          kind: d.kind,
          emoji: d.emoji || undefined,
          title: d.kind === 'note' ? d.title || undefined : undefined,
          body: d.kind === 'note' ? d.body : '',
          poll: d.kind === 'poll' ? d.poll : undefined,
          timeLabel: 'just now',
          sortKey: 0,
          reactions: {},
          notify: d.notify,
        }
        setN((x) => x + 1)
        write(order([post, ...posts]))
      },
      update: (id, patch) => write(order(posts.map((p) => (p.id === id ? { ...p, ...patch } : p)))),
      remove: (id) => write(posts.filter((p) => p.id !== id)),
      // Only one post can be pinned; pinning a second releases the first.
      togglePin: (id) =>
        write(
          order(
            posts.map((p) =>
              p.id === id ? { ...p, pinned: !p.pinned } : p.pinned ? { ...p, pinned: false } : p,
            ),
          ),
        ),
      revert: () => setDrafts((d) => ({ ...d, [communityId]: committed })),
      save: () => {
        setSaved((s) => ({ ...s, [communityId]: posts }))
        setDrafts((d) => ({ ...d, [communityId]: posts }))
      },
    }
  }, [posts, committed, communityId, n])

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

export function usePosts(): PostsValue {
  const ctx = useContext(PostsContext)
  if (!ctx) throw new Error('usePosts must be used inside PostsProvider')
  return ctx
}
