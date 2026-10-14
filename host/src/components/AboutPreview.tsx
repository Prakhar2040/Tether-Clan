import { photosFor } from '@app/data/community'
import type { Community, Person } from '@shared/types'
import type { AboutDraft } from '../state/about'

// A faithful copy of the app's About tab, rendered at phone width so the
// host can see what switching a section off actually does. Markup mirrors
// frontend/src/screens/CommunityDetail.tsx; styles are scoped under .phone.
export default function AboutPreview({
  community: c,
  owner,
  draft,
  cover,
}: {
  community: Community
  owner: Person | undefined
  draft: AboutDraft
  cover?: string
}) {
  const on = draft.enabled
  const gallery = photosFor(c.id)
  const nothing = !Object.values(on).some(Boolean)

  return (
    <div className="phone">
      <div className="phone-head" style={{ ['--comm' as string]: c.color }}>
        {cover ? <div className="phone-banner" style={{ backgroundImage: `url(${cover})` }} /> : null}
        <div className="phone-title">
          <span className="phone-mark" style={{ background: c.color }}>
            {c.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
          </span>
          <span className="phone-name">{c.name}</span>
          <span className="phone-stats">
            <b>{c.memberCount}</b> members · ★ <b>{c.rating.toFixed(1)}</b>
          </span>
        </div>
        <div className="phone-tabs">
          <span>Posts</span>
          <span>Tickets</span>
          <span>Photos</span>
          <span className="on">About</span>
        </div>
      </div>

      <div className="phone-body" style={{ ['--comm' as string]: c.color }}>
        {nothing ? (
          <p className="phone-empty">
            Every section is switched off — members would see an empty About tab.
          </p>
        ) : null}

        {draft.order.map((id) => {
          if (!on[id]) return null

          if (id === 'owner' && owner)
            return (
              <div className="p-owner" key={id}>
                <div className="p-portrait" style={{ background: c.color }}>
                  {owner.initials}
                </div>
                <div className="p-owner-text">
                  <span className="p-owner-name">{owner.name}</span>
                  <span className="p-owner-title">{draft.ownerTitle}</span>
                  <span className="p-owner-role">
                    Owner · {c.startedLabel.replace('Started ', 'since ')}
                  </span>
                </div>
              </div>
            )

          if (id === 'bio')
            return (
              <div className="p-paras" key={id}>
                {draft.ownerBio.map((para) => (
                  <p className="p-lead" key={para.slice(0, 20)}>
                    {para}
                  </p>
                ))}
              </div>
            )

          if (id === 'quote')
            return (
              <blockquote className="p-quote" key={id}>
                {draft.ownerQuote}
              </blockquote>
            )

          if (id === 'numbers')
            return (
              <div className="p-stats" key={id}>
                {draft.highlights.map((h) => (
                  <div className="p-stat" key={h.label}>
                    <span className="p-stat-n">{h.n}</span>
                    <span className="p-stat-l">{h.label}</span>
                  </div>
                ))}
              </div>
            )

          if (id === 'photos' && gallery.length > 0)
            return (
              <div className="p-block" key={id}>
                <span className="p-label">A look inside</span>
                <div className="p-strip">
                  {gallery.slice(0, 5).map((ph) => (
                    <div
                      className="p-photo"
                      key={ph.id}
                      style={ph.src ? { backgroundImage: `url(${ph.src})` } : { background: ph.color }}
                    >
                      <span>{ph.caption}</span>
                    </div>
                  ))}
                </div>
              </div>
            )

          if (id === 'community')
            return (
              <div className="p-block" key={id}>
                <span className="p-label">What we do here</span>
                <p className="p-body">{draft.description}</p>
                <div className="p-facts">
                  <span>{draft.categoryLabel}</span>
                  <span>{draft.areaName}</span>
                  <span>{c.memberCount} members</span>
                </div>
              </div>
            )

          if (id === 'rules')
            return (
              <div className="p-block" key={id}>
                <span className="p-label">House rules</span>
                <ol className="p-rules">
                  {draft.houseRules.map((r, i) => (
                    <li key={r || i}>
                      <span className="p-rule-n">{i + 1}</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )

          return null
        })}
      </div>
    </div>
  )
}
