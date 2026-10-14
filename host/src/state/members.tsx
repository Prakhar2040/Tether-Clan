import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useRemote } from '@app/hooks/useRemote'
import { useHostCommunity } from './host'
import { fetchMembers, localMembers, type HostMember } from '../api/members'

export type { HostMember }

/* The open room's roster, fetched once.
 *
 * Every screen in the console reads it — the member table, the dashboard
 * tiles, the analytics, the badge ladder — and asking per screen would mean
 * four requests for one list, and four chances for them to disagree.
 */

interface MembersValue {
  members: HostMember[]
  byId: (personId: string) => HostMember | undefined
  offline: boolean
}

const MembersContext = createContext<MembersValue | null>(null)

export function MembersProvider({ children }: { children: ReactNode }) {
  const { community } = useHostCommunity()
  const { data: members, offline } = useRemote(
    (signal) => fetchMembers(community.id, signal),
    localMembers(community.id),
    [community.id],
  )

  const value = useMemo<MembersValue>(() => {
    /* Filtered by room as well as fetched by it: the fallback belongs to
       whichever room was open when the console started, and switching rooms
       must not show the old one's people under the new one's name. */
    const here = members.filter((m) => m.communityId === community.id)
    const index = new Map(here.map((m) => [m.personId, m]))
    return { members: here, byId: (id) => index.get(id), offline }
  }, [members, community.id, offline])

  return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>
}

export function useMembers(): MembersValue {
  const ctx = useContext(MembersContext)
  if (!ctx) throw new Error('useMembers must be used inside MembersProvider')
  return ctx
}
