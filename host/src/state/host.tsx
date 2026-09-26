import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { communities } from '@app/data/community'
import { people } from '@app/data/mock'
import type { Community, Person } from '@app/types'

// Who is signed in, and which of their rooms they are looking at. Robin owns
// the board games community; Rahul owns the run club. For now the console
// runs as whoever owns the community you have open.

interface HostValue {
  community: Community
  owner: Person | undefined
  communities: Community[]
  setCommunityId: (id: string) => void
}

const HostContext = createContext<HostValue | null>(null)

const DEFAULT_ID = 'dice-district-regulars'

export function HostProvider({ children }: { children: ReactNode }) {
  const [communityId, setCommunityId] = useState(DEFAULT_ID)

  const value = useMemo<HostValue>(() => {
    const all = Object.values(communities)
    const community = communities[communityId] ?? communities[DEFAULT_ID]
    return {
      community,
      owner: people[community.ownerIds[0]],
      communities: all,
      setCommunityId,
    }
  }, [communityId])

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>
}

export function useHostCommunity(): HostValue {
  const ctx = useContext(HostContext)
  if (!ctx) throw new Error('useHostCommunity must be used inside HostProvider')
  return ctx
}
