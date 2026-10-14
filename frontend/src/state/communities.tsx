import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CommunityRole } from '@shared/types'
import { lastReadAt, myMemberships } from '../data/community'
import {
  fetchPosts,
  localChannel,
  toggleReactionOn,
  voteOn,
  type ChannelPost,
} from '../api/posts'

// Membership decides what you can do; reactions are the only thing a member
// can send back into the channel. Unread is per community and clears the
// moment you open it.

interface CommunitiesValue {
  roleIn: (communityId: string) => CommunityRole | undefined
  isMember: (communityId: string) => boolean
  join: (communityId: string) => void
  leave: (communityId: string) => void
  joinedIds: string[]
  unread: (communityId: string) => boolean
  newCount: (communityId: string) => number
  // The read line is snapshotted when you open the channel, so it stays put
  // while you are looking at it instead of vanishing under your eyes.
  readLineAt: (communityId: string) => number
  markRead: (communityId: string) => void
  votedFor: (postId: string) => string | undefined
  vote: (postId: string, optionId: string) => void
  voteCount: (postId: string, optionId: string) => number
  totalVotes: (postId: string) => number
  reacted: (postId: string, emoji: string) => boolean
  // Only the emoji that someone actually used, busiest first — a post with
  // no reactions shows none, same as Slack.
  reactionsOn: (postId: string) => { emoji: string; count: number; mine: boolean }[]
  toggleReaction: (postId: string, emoji: string) => void
}

const CommunitiesContext = createContext<CommunitiesValue | null>(null)

export function CommunitiesProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<Record<string, CommunityRole>>(myMemberships)
  const [readAt, setReadAt] = useState<Record<string, number>>(lastReadAt)
  // Frozen at open; the line you see does not move until you come back.
  const [readLine, setReadLine] = useState<Record<string, number>>({})
  const [votes, setVotes] = useState<Record<string, string>>({})

  /* The channel, from the server, with the mock underneath it. Reactions and
     votes used to be an overlay of local flags on top of seeded counts —
     the server knows both for real now, including which are the viewer's, so
     the overlay is gone and these read straight through. */
  const [channel, setChannel] = useState<ChannelPost[]>(localChannel)
  const joinedKey = Object.keys(roles).sort().join(',')

  const reload = useCallback(async () => {
    const ids = joinedKey ? joinedKey.split(',') : []
    if (ids.length === 0) return
    try {
      setChannel(await fetchPosts(ids))
    } catch {
      // Unreachable is not an error here: the mock is already on screen.
    }
  }, [joinedKey])

  useEffect(() => {
    void reload()
  }, [reload])

  const liveOf = (postId: string) => channel.find((p) => p.id === postId)?.live

  const roleIn = useCallback((id: string) => roles[id], [roles])

  const value = useMemo<CommunitiesValue>(() => {
    return {
      roleIn,
      isMember: (id) => Boolean(roles[id]),
      joinedIds: Object.keys(roles),
      join: (id) =>
        setRoles((prev) => (prev[id] ? prev : { ...prev, [id]: 'member' })),
      leave: (id) =>
        setRoles((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        }),
      unread: (id) => {
        const newest = channel
          .filter((p) => p.communityId === id && !p.pinned)
          .sort((a, b) => a.sortKey - b.sortKey)[0]
        return Boolean(newest && newest.sortKey < (readAt[id] ?? Infinity))
      },
      // Counted against the frozen line, not the live pointer — otherwise
      // marking the channel read would wipe out the very count it labels.
      newCount: (id) =>
        channel.filter(
          (p) => p.communityId === id && p.sortKey < (readLine[id] ?? readAt[id] ?? Infinity),
        ).length,
      readLineAt: (id) => readLine[id] ?? readAt[id] ?? 0,
      markRead: (id) =>
        setReadLine((prev) => {
          if (id in prev) return prev
          // Freeze the line here, then advance the stored pointer past it.
          const newest = channel
            .filter((p) => p.communityId === id && !p.pinned)
            .sort((a, b) => a.sortKey - b.sortKey)[0]
          const line = readAt[id] ?? 0
          setReadAt((r) => ({ ...r, [id]: newest ? Math.min(newest.sortKey, r[id] ?? Infinity) : r[id] }))
          return { ...prev, [id]: line }
        }),
      votedFor: (postId) => votes[postId] ?? liveOf(postId)?.poll?.votedFor,
      /* Written straight through, then re-read. No optimistic local count:
         the server enforces one vote each, and a guess that disagreed with
         it would show the wrong number until the next load. */
      vote: (postId, optionId) => {
        setVotes((prev) => ({ ...prev, [postId]: optionId }))
        void voteOn(postId, optionId).then(reload).catch(() => undefined)
      },
      voteCount: (postId, optionId) =>
        liveOf(postId)?.poll?.options.find((o) => o.id === optionId)?.votes ?? 0,
      totalVotes: (postId) =>
        liveOf(postId)?.poll?.options.reduce((n, o) => n + o.votes, 0) ?? 0,
      reacted: (postId, emoji) =>
        Boolean(liveOf(postId)?.reactions.find((r) => r.emoji === emoji)?.mine),
      // Busiest first, and only emoji somebody used — the server already
      // orders and filters, so this is a pass-through.
      reactionsOn: (postId) => liveOf(postId)?.reactions ?? [],
      toggleReaction: (postId, emoji) => {
        void toggleReactionOn(postId, emoji).then(reload).catch(() => undefined)
      },
    }
  }, [roles, readAt, readLine, votes, roleIn, channel, reload])

  return <CommunitiesContext.Provider value={value}>{children}</CommunitiesContext.Provider>
}

export function useCommunities(): CommunitiesValue {
  const ctx = useContext(CommunitiesContext)
  if (!ctx) throw new Error('useCommunities must be used inside CommunitiesProvider')
  return ctx
}
