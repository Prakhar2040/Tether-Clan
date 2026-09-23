import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CommunityRole } from '../types'
import { lastReadAt, latestPost, myMemberships, posts } from '../data/community'

// Membership decides what you can do; reactions are the only thing a member
// can send back into the channel. Unread is per community and clears the
// moment you open it.

type ReactionMap = Record<string, Record<string, boolean>>

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
  const [reactions, setReactions] = useState<ReactionMap>({})
  const [readAt, setReadAt] = useState<Record<string, number>>(lastReadAt)
  // Frozen at open; the line you see does not move until you come back.
  const [readLine, setReadLine] = useState<Record<string, number>>({})
  const [votes, setVotes] = useState<Record<string, string>>({})

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
        const p = latestPost(id)
        return Boolean(p && p.sortKey < (readAt[id] ?? Infinity))
      },
      // Counted against the frozen line, not the live pointer — otherwise
      // marking the channel read would wipe out the very count it labels.
      newCount: (id) =>
        posts.filter((p) => p.communityId === id && p.sortKey < (readLine[id] ?? readAt[id] ?? Infinity))
          .length,
      readLineAt: (id) => readLine[id] ?? readAt[id] ?? 0,
      markRead: (id) =>
        setReadLine((prev) => {
          if (id in prev) return prev
          // Freeze the line here, then advance the stored pointer past it.
          const newest = latestPost(id)
          const line = readAt[id] ?? 0
          setReadAt((r) => ({ ...r, [id]: newest ? Math.min(newest.sortKey, r[id] ?? Infinity) : r[id] }))
          return { ...prev, [id]: line }
        }),
      votedFor: (postId) => votes[postId],
      vote: (postId, optionId) =>
        setVotes((prev) => (prev[postId] ? prev : { ...prev, [postId]: optionId })),
      voteCount: (postId, optionId) => {
        const poll = posts.find((p) => p.id === postId)?.poll
        const base = poll?.options.find((o) => o.id === optionId)?.votes ?? 0
        return base + (votes[postId] === optionId ? 1 : 0)
      },
      totalVotes: (postId) => {
        const poll = posts.find((p) => p.id === postId)?.poll
        const base = poll?.options.reduce((n, o) => n + o.votes, 0) ?? 0
        return base + (votes[postId] ? 1 : 0)
      },
      reacted: (postId, emoji) => Boolean(reactions[postId]?.[emoji]),
      reactionsOn: (postId) => {
        const seeded = posts.find((p) => p.id === postId)?.reactions ?? {}
        const mine = reactions[postId] ?? {}
        const keys = new Set([...Object.keys(seeded), ...Object.keys(mine)])
        return [...keys]
          .map((emoji) => ({
            emoji,
            count: (seeded[emoji] ?? 0) + (mine[emoji] ? 1 : 0),
            mine: Boolean(mine[emoji]),
          }))
          .filter((r) => r.count > 0)
          .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
      },
      toggleReaction: (postId, emoji) =>
        setReactions((prev) => ({
          ...prev,
          [postId]: { ...prev[postId], [emoji]: !prev[postId]?.[emoji] },
        })),
    }
  }, [roles, reactions, readAt, readLine, votes, roleIn])

  return <CommunitiesContext.Provider value={value}>{children}</CommunitiesContext.Provider>
}

export function useCommunities(): CommunitiesValue {
  const ctx = useContext(CommunitiesContext)
  if (!ctx) throw new Error('useCommunities must be used inside CommunitiesProvider')
  return ctx
}
