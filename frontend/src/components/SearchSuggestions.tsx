import type { SuggestionGroup, SuggestionItem, SuggestionType } from '../api/search'
import { CalendarIcon, ChevronIcon, CircleIcon, PinIcon, SearchIcon } from './icons'

// Typed suggestion groups: each type leads somewhere different, so each gets
// its own icon, label and action. Never a flat blended list.

const GROUP_META: Record<SuggestionType, { title: string; Icon: typeof PinIcon }> = {
  activity: { title: 'Activities', Icon: SearchIcon },
  area: { title: 'Areas', Icon: PinIcon },
  venue: { title: 'Venues', Icon: PinIcon },
  community: { title: 'Communities', Icon: CircleIcon },
  event: { title: 'Events', Icon: CalendarIcon },
}

export interface SuggestionHandlers {
  onActivity: (item: SuggestionItem) => void
  onArea: (item: SuggestionItem) => void
  onVenue: (item: SuggestionItem) => void
  onCommunity: (item: SuggestionItem) => void
  onEvent: (item: SuggestionItem) => void
}

export function SearchSuggestions({
  groups,
  trendingAreas,
  heading,
  handlers,
}: {
  groups: SuggestionGroup[]
  trendingAreas?: SuggestionItem[]
  heading?: string
  handlers: SuggestionHandlers
}) {
  const pick = (type: SuggestionType) => {
    switch (type) {
      case 'activity':
        return handlers.onActivity
      case 'area':
        return handlers.onArea
      case 'venue':
        return handlers.onVenue
      case 'community':
        return handlers.onCommunity
      case 'event':
        return handlers.onEvent
    }
  }

  const shown = groups.filter((g) => g.items.length > 0)
  if (shown.length === 0 && !trendingAreas?.length) return null

  return (
    <div className="suggest">
      {heading ? <span className="suggest-heading">{heading}</span> : null}
      {shown.map((group) => {
        const { title, Icon } = GROUP_META[group.type]
        const onPick = pick(group.type)
        return (
          <div className="suggest-group" key={group.type}>
            <span className="suggest-title">{title}</span>
            {group.items.map((item) => (
              <button className="suggest-row" key={`${group.type}-${item.id}`} onClick={() => onPick(item)}>
                <span className="suggest-icon">
                  <Icon size={15} color="#15477C" />
                </span>
                <span className="stack-2" style={{ flex: 1, gap: 1 }}>
                  <span className="suggest-label">{item.label}</span>
                  {item.sublabel ? <span className="suggest-sub">{item.sublabel}</span> : null}
                </span>
                {typeof item.count === 'number' ? (
                  <span className="suggest-count">{item.count}</span>
                ) : null}
                <ChevronIcon size={13} color="#A79F8C" />
              </button>
            ))}
          </div>
        )
      })}
      {trendingAreas?.length ? (
        <div className="suggest-group">
          <span className="suggest-title">Busy this week</span>
          <div className="chip-row" style={{ padding: '2px 0 0' }}>
            {trendingAreas.map((a) => (
              <button className="chip" key={a.id} onClick={() => handlers.onArea(a)}>
                {a.label} · {a.count}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
