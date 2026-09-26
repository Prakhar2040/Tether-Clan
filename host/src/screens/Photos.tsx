import { useRef, useState } from 'react'
import { people } from '@app/data/mock'
import { useHostCommunity } from '../state/host'
import { usePhotos } from '../state/photos'
import PhotosPreview from '../components/PhotosPreview'
import { CheckIcon, GripIcon, ImageIcon, PencilIcon, StarIcon, TrashIcon } from '../components/icons'

export default function Photos() {
  const { community, owner } = useHostCommunity()
  const { photos, coverId, dirty, add, update, remove, move, setCover, revert, save } = usePhotos()
  const [editing, setEditing] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [hovering, setHovering] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const cast = [owner, ...Object.values(people).slice(0, 6)].filter(Boolean)

  return (
    <div className="page split">
      <div className="split-main">
        <div className="editor-head">
          <span className="editor-note">
            {photos.length} photos. The first, and then every fifth, runs full width in the app —
            drag to choose which ones get that slot.
          </span>
          <div className="editor-actions">
            <button className="btn btn-ghost" onClick={revert} disabled={!dirty}>
              Revert
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!dirty}>
              {dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        </div>

        <button
          className={hovering ? 'dropzone over' : 'dropzone'}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setHovering(true)
          }}
          onDragLeave={() => setHovering(false)}
          onDrop={(e) => {
            e.preventDefault()
            setHovering(false)
            if (e.dataTransfer.files.length) add(e.dataTransfer.files)
          }}
        >
          <ImageIcon size={22} strokeWidth={1.9} />
          <span className="dropzone-t">Drop photos here, or click to choose</span>
          <span className="dropzone-s">They land at the top — newest first, the way the tab reads</span>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) add(e.target.files)
              e.target.value = ''
            }}
          />
        </button>

        <div className="shots">
          {photos.map((ph, i) => {
            const isCover = coverId === ph.id
            const isEditing = editing === ph.id
            const wide = i % 5 === 0
            return (
              <article
                className={[
                  'shot',
                  dragging === ph.id ? 'dragging' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={ph.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragging && dragging !== ph.id) move(dragging, ph.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(null)
                }}
              >
                <div
                  className="shot-img"
                  style={ph.src ? { backgroundImage: `url(${ph.src})` } : { background: ph.color }}
                >
                  <span
                    className="shot-grip"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', ph.id)
                      const card = (e.currentTarget as HTMLElement).closest('.shot')
                      if (card) e.dataTransfer.setDragImage(card, 24, 24)
                      setEditing(null)
                      setDragging(ph.id)
                    }}
                    onDragEnd={() => setDragging(null)}
                    title="Drag to reorder"
                  >
                    <GripIcon size={15} color="#fff" />
                  </span>
                  {wide ? <span className="shot-wide">Full width</span> : null}
                  {isCover ? <span className="shot-cover">Cover</span> : null}
                </div>

                {isEditing ? (
                  <div className="shot-edit">
                    <label className="field">
                      <span className="field-label">Caption</span>
                      <input value={ph.caption} onChange={(e) => update(ph.id, { caption: e.target.value })} />
                    </label>
                    <div className="grid-2">
                      <label className="field">
                        <span className="field-label">Taken by</span>
                        <select value={ph.byId} onChange={(e) => update(ph.id, { byId: e.target.value })}>
                          {cast.map((p) => (
                            <option key={p!.id} value={p!.id}>
                              {p!.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span className="field-label">When</span>
                        <input value={ph.timeLabel} onChange={(e) => update(ph.id, { timeLabel: e.target.value })} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="shot-text">
                    <span className="shot-cap">{ph.caption || 'No caption'}</span>
                    <span className="shot-by">
                      {people[ph.byId]?.name ?? 'Unknown'} · {ph.timeLabel}
                    </span>
                  </div>
                )}

                <div className="shot-actions">
                  <button
                    className={isCover ? 'shot-btn on' : 'shot-btn'}
                    onClick={() => setCover(ph.id)}
                    title={isCover ? 'Remove as cover' : 'Use as the community cover'}
                    aria-label="Use as cover"
                  >
                    <StarIcon size={14} filled={isCover} />
                  </button>
                  <button
                    className={isEditing ? 'shot-btn on' : 'shot-btn'}
                    onClick={() => setEditing(isEditing ? null : ph.id)}
                    title={isEditing ? 'Done' : 'Edit caption'}
                    aria-label="Edit caption"
                  >
                    {isEditing ? <CheckIcon size={14} strokeWidth={2.6} /> : <PencilIcon size={14} strokeWidth={2.2} />}
                  </button>
                  <button
                    className="shot-btn danger"
                    onClick={() => remove(ph.id)}
                    title="Remove from the gallery"
                    aria-label="Remove"
                  >
                    <TrashIcon size={14} strokeWidth={2.1} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {photos.length === 0 ? (
          <p className="shots-empty">
            Nothing in the gallery yet. The Photos tab is the cheapest proof a community is real —
            three or four honest pictures beat a polished cover.
          </p>
        ) : null}
      </div>

      <aside className="split-side">
        <div className="side-head">
          <span className="side-title">What members see</span>
          <span className="side-note">Live · Photos tab</span>
        </div>
        <PhotosPreview community={community} photos={photos} coverId={coverId} />
      </aside>
    </div>
  )
}
