import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { communities } from '@app/data/community'
import type { Community } from '@shared/types'

// The About tab, as something the host owns rather than something the app
// hardcodes. Each section can be switched off, and what is left is what
// members see — so Robin can run an owner-led page, a community-led one, or
// anything in between.

export type SectionId = 'owner' | 'quote' | 'bio' | 'numbers' | 'photos' | 'community' | 'rules'

export interface SectionMeta {
  id: SectionId
  name: string
  what: string // what it puts on the page
  editable: boolean
}

export const SECTIONS: Record<SectionId, SectionMeta> = {
  owner: { id: 'owner', name: 'Name and portrait', what: 'Your photo, name and day job', editable: true },
  bio: { id: 'bio', name: 'About owner', what: 'A few paragraphs in first person', editable: true },
  quote: { id: 'quote', name: 'Pulled quote', what: 'One line of yours, set large', editable: true },
  numbers: { id: 'numbers', name: 'The numbers', what: 'Figures that break up the prose', editable: true },
  photos: { id: 'photos', name: 'A look inside', what: 'A strip from the community gallery', editable: true },
  community: { id: 'community', name: 'About the community', what: 'What the group does, and the facts about it', editable: true },
  rules: { id: 'rules', name: 'House rules', what: 'A numbered list of how it runs', editable: true },
}

// The order sections appear in on the page. The host can drag to change it.
export const DEFAULT_ORDER: SectionId[] = [
  'owner',
  'bio',
  'quote',
  'numbers',
  'photos',
  'community',
  'rules',
]

export interface AboutDraft {
  order: SectionId[]
  enabled: Record<SectionId, boolean>
  ownerTitle: string
  ownerQuote: string
  ownerBio: string[]
  highlights: { n: string; label: string }[]
  description: string
  categoryLabel: string
  areaName: string
  houseRules: string[]
}

function draftFrom(c: Community): AboutDraft {
  return {
    order: [...DEFAULT_ORDER],
    enabled: { owner: true, quote: true, bio: true, numbers: true, photos: true, community: true, rules: true },
    ownerTitle: c.ownerTitle,
    ownerQuote: c.ownerQuote,
    ownerBio: [...c.ownerBio],
    highlights: c.highlights.map((h) => ({ ...h })),
    description: c.description,
    categoryLabel: c.categoryLabel,
    areaName: c.areaName,
    houseRules: [...c.houseRules],
  }
}

interface AboutValue {
  draft: AboutDraft
  dirty: boolean
  toggle: (id: SectionId) => void
  move: (from: SectionId, to: SectionId) => void
  update: (patch: Partial<AboutDraft>) => void
  revert: () => void
  save: () => void
}

const AboutContext = createContext<AboutValue | null>(null)

export function AboutProvider({ communityId, children }: { communityId: string; children: ReactNode }) {
  const base = communities[communityId]
  const [drafts, setDrafts] = useState<Record<string, AboutDraft>>({})
  const [saved, setSaved] = useState<Record<string, AboutDraft>>({})

  const draft = drafts[communityId] ?? saved[communityId] ?? draftFrom(base)
  const committed = saved[communityId] ?? draftFrom(base)

  const value = useMemo<AboutValue>(() => {
    const write = (next: AboutDraft) => setDrafts((d) => ({ ...d, [communityId]: next }))
    return {
      draft,
      dirty: JSON.stringify(draft) !== JSON.stringify(committed),
      toggle: (id) => write({ ...draft, enabled: { ...draft.enabled, [id]: !draft.enabled[id] } }),
      move: (from, to) => {
        if (from === to) return
        const next = draft.order.filter((x) => x !== from)
        next.splice(next.indexOf(to), 0, from)
        write({ ...draft, order: next })
      },
      update: (patch) => write({ ...draft, ...patch }),
      revert: () => setDrafts((d) => ({ ...d, [communityId]: committed })),
      save: () => {
        setSaved((s) => ({ ...s, [communityId]: draft }))
        setDrafts((d) => ({ ...d, [communityId]: draft }))
      },
    }
  }, [draft, committed, communityId])

  return <AboutContext.Provider value={value}>{children}</AboutContext.Provider>
}

export function useAbout(): AboutValue {
  const ctx = useContext(AboutContext)
  if (!ctx) throw new Error('useAbout must be used inside AboutProvider')
  return ctx
}
