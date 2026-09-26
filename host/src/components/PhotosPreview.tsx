import { people } from '@app/data/mock'
import type { Community } from '@app/types'
import type { PhotoDraft } from '../state/photos'

// The app's Photos tab, at phone width. Every fifth tile runs full bleed —
// that is what gives the grid its rhythm, and the host should see which of
// their photos lands in those slots.
export default function PhotosPreview({
  community: c,
  photos,
  coverId,
}: {
  community: Community
  photos: PhotoDraft[]
  coverId: string | undefined
}) {
  const cover = photos.find((p) => p.id === coverId)?.src

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
          <span className="on">Photos</span>
          <span>About</span>
        </div>
      </div>

      <div className="phone-body">
        {photos.length === 0 ? (
          <div className="p-none">
            <span className="p-none-t">No photos yet</span>
            <span className="p-none-s">They show up here after the group meets</span>
          </div>
        ) : (
          <>
            <span className="p-count">{photos.length} photos · newest first</span>
            <div className="p-grid">
              {photos.map((ph, i) => (
                <div
                  className={i % 5 === 0 ? 'p-cell wide' : 'p-cell'}
                  key={ph.id}
                  style={ph.src ? { backgroundImage: `url(${ph.src})` } : { background: ph.color }}
                >
                  <span className="p-cap">
                    {ph.caption}
                    <span className="p-by">
                      {people[ph.byId]?.name} · {ph.timeLabel}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
