import type { CommunityPost } from '@shared/types'
import { posts as localPosts } from '@shared/community.data'
import { apiGet, apiPost } from './client'

/* The channel from the server.
 *
 * Shaped back into the CommunityPost the app already renders, including a
 * `sortKey` in minutes-ago — the unread line is built on that, and the server
 * sends an instant instead. Deriving it here means nothing downstream of the
 * context has to change.
 *
 * The two extras the server knows and the mock never could are carried
 * alongside: which reactions are yours, and what you voted for.
 */

export interface WireReaction {
  emoji: string
  count: number
  mine: boolean
}

export interface WirePost {
  id: string
  communityId: string
  authorId: string
  kind: 'note' | 'poll'
  emoji?: string
  title?: string
  body: string
  postedAt: string
  timeLabel: string
  pinned?: boolean
  reactions: WireReaction[]
  poll?: {
    question: string
    closesLabel: string
    votedFor?: string
    options: { id: string; label: string; votes: number }[]
  }
}

export interface ChannelPost extends CommunityPost {
  live: WirePost
}

const toApp = (p: WirePost, at: number): ChannelPost => ({
  id: p.id,
  communityId: p.communityId,
  authorId: p.authorId,
  kind: p.kind,
  emoji: p.emoji,
  title: p.title,
  body: p.body,
  timeLabel: p.timeLabel,
  // Minutes ago, which is what the read line is measured in.
  sortKey: Math.max(0, Math.round((at - Date.parse(p.postedAt)) / 60_000)),
  pinned: p.pinned,
  reactions: Object.fromEntries(p.reactions.map((r) => [r.emoji, r.count])),
  poll: p.poll
    ? { question: p.poll.question, closesLabel: p.poll.closesLabel, options: p.poll.options }
    : undefined,
  live: p,
})

export async function fetchPosts(communityIds: string[], signal?: AbortSignal): Promise<ChannelPost[]> {
  const at = Date.now()
  const pages = await Promise.all(
    communityIds.map((id) =>
      apiGet<{ posts: WirePost[] }>(`/api/communities/${id}/posts`, signal).then((r) => r.posts),
    ),
  )
  return pages.flat().map((p) => toApp(p, at))
}

export const toggleReactionOn = (postId: string, emoji: string) =>
  apiPost<{ emoji: string; mine: boolean }>(
    `/api/posts/${postId}/reactions/${encodeURIComponent(emoji)}`,
  )

export const voteOn = (postId: string, optionId: string) =>
  apiPost<{ votedFor: string }>(`/api/posts/${postId}/vote/${optionId}`)

/** What the channel shows while the server is unreachable. */
export const localChannel: ChannelPost[] = localPosts.map((p) => ({
  ...p,
  live: {
    id: p.id,
    communityId: p.communityId,
    authorId: p.authorId,
    kind: p.poll ? 'poll' : 'note',
    emoji: p.emoji,
    title: p.title,
    body: p.body,
    postedAt: new Date(Date.now() - p.sortKey * 60_000).toISOString(),
    timeLabel: p.timeLabel,
    pinned: p.pinned,
    reactions: Object.entries(p.reactions ?? {}).map(([emoji, count]) => ({
      emoji,
      count,
      mine: false,
    })),
    poll: p.poll
      ? { question: p.poll.question, closesLabel: p.poll.closesLabel, options: p.poll.options }
      : undefined,
  },
}))
