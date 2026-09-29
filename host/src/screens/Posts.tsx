import { useState } from 'react'
import { people } from '@app/data/mock'
import { useHostCommunity } from '../state/host'
import { usePosts } from '../state/posts'
import { usePhotos } from '../state/photos'
import PostsPreview from '../components/PostsPreview'
import { CheckIcon, PencilIcon, PinIcon, TrashIcon } from '../components/icons'
import type { PollOption } from '@app/types'

const EMOJI = ['🎲', '🗳️', '📦', '🪑', '🎉', '⚠️', '☀️', '🚧', '👋', '🏃', '📣', '🥂', '💡', '🔥']

type Mode = 'note' | 'poll'

export default function Posts() {
  const { community, owner } = useHostCommunity()
  const { posts, dirty, publish, update, remove, togglePin, revert, save } = usePosts()
  const { photos, coverId } = usePhotos()

  const [mode, setMode] = useState<Mode>('note')
  const [emoji, setEmoji] = useState('📣')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [question, setQuestion] = useState('')
  const [closes, setCloses] = useState('Closes Friday')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [editing, setEditing] = useState<string | null>(null)
  const [notify, setNotify] = useState(true)
  // Shut by default: the room's history is what you came to see.
  const [writing, setWriting] = useState(false)

  const canPost =
    mode === 'note'
      ? body.trim().length > 0 || title.trim().length > 0
      : question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2

  const send = () => {
    if (!canPost) return
    if (mode === 'note') {
      publish({ kind: 'note', emoji, title: title.trim(), body: body.trim(), notify })
      setTitle('')
      setBody('')
    } else {
      const opts: PollOption[] = options
        .filter((o) => o.trim())
        .map((label, i) => ({ id: `o${i}`, label: label.trim(), votes: 0 }))
      publish({
        kind: 'poll',
        emoji,
        title: '',
        body: '',
        poll: { question: question.trim(), closesLabel: closes.trim(), options: opts },
        notify,
      })
      setQuestion('')
      setOptions(['', ''])
    }
    // Posted, so the history comes back up.
    setWriting(false)
  }

  return (
    <div className="page split">
      <div className="split-main">
        <div className="editor-head">
          <span className="editor-note">
            One way: you write, members react. There are no replies to moderate, which is the whole
            reason the room stays readable.
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

        {/* ---- Composer ---- */}
        {!writing ? (
          <button className="composer-open" onClick={() => setWriting(true)}>
            <span className="composer-open-av">{owner?.initials}</span>
            <span className="composer-open-t">Write something for the room…</span>
            <span className="composer-open-btn">New post</span>
          </button>
        ) : (
        <section className="composer">
          <div className="composer-modes">
            <button className={mode === 'note' ? 'mode on' : 'mode'} onClick={() => setMode('note')}>
              Message
            </button>
            <button className={mode === 'poll' ? 'mode on' : 'mode'} onClick={() => setMode('poll')}>
              Poll
            </button>
          </div>

          <div className="emoji-strip">
            {EMOJI.map((e) => (
              <button
                key={e}
                className={emoji === e ? 'emoji-pick on' : 'emoji-pick'}
                onClick={() => setEmoji(e)}
                aria-label={`Use ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          {mode === 'note' ? (
            <>
              <label className="field">
                <span className="field-label">Headline</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="40+ board games this Saturday"
                />
                <span className="field-hint">
                  Optional. With one the post reads as an announcement and skims at a glance;
                  without one it lands as a quiet note.
                </span>
              </label>
              <label className="field">
                <span className="field-label">Message</span>
                <textarea
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Join us at Dice District, Indiranagar — 5:00 PM, Saturday 12 September…"
                />
              </label>
            </>
          ) : (
            <>
              <label className="field">
                <span className="field-label">Question</span>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What are we opening next Wednesday?"
                />
              </label>
              <div className="field">
                <span className="field-label">Options</span>
                {options.map((o, i) => (
                  <div className="opt-row" key={i}>
                    <input
                      value={o}
                      onChange={(e) => {
                        const next = [...options]
                        next[i] = e.target.value
                        setOptions(next)
                      }}
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 2 ? (
                      <button
                        className="row-x"
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        aria-label="Remove option"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
                <button className="btn btn-ghost add-btn" onClick={() => setOptions([...options, ''])}>
                  Add an option
                </button>
              </div>
              <label className="field">
                <span className="field-label">Closes</span>
                <input value={closes} onChange={(e) => setCloses(e.target.value)} />
              </label>
            </>
          )}

          <div className="notify-row">
            <button
              className={notify ? 'switch on' : 'switch'}
              onClick={() => setNotify((v) => !v)}
              role="switch"
              aria-checked={notify}
              aria-label="Notify everyone"
            >
              <span className="switch-knob" />
            </button>
            <span className="notify-text">
              <span className="notify-t">
                {notify ? 'Notify everyone' : 'Post quietly'}
              </span>
              <span className="field-hint">
                {notify
                  ? `All ${community.memberCount} members get a push. Worth it for a plan or a venue change — not for every shelf update.`
                  : 'It appears in the channel, but nobody gets interrupted.'}
              </span>
            </span>
          </div>

          <div className="composer-foot">
            <span className="field-hint">Posting as {owner?.name}</span>
            <span className="composer-foot-btns">
              <button className="btn btn-ghost" onClick={() => setWriting(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={send} disabled={!canPost}>
                {notify ? 'Post and notify' : 'Post quietly'}
              </button>
            </span>
          </div>
        </section>
        )}

        {/* ---- What is already up ---- */}
        <div className="section-head" style={{ marginTop: 18 }}>
          <span className="section-title">Already posted</span>
          <span className="section-link">{posts.length} in the channel</span>
        </div>

        {posts.map((p) => {
          const author = p.authorId ? people[p.authorId] : owner
          const isEditing = editing === p.id
          const reactions = Object.entries(p.reactions).filter(([, n]) => n > 0)
          return (
            <article className={p.pinned ? 'sent pinned' : 'sent'} key={p.id}>
              <div className="sent-head">
                <span className="sent-emoji">{p.emoji ?? (p.kind === 'poll' ? '🗳️' : '·')}</span>
                <div className="sent-text">
                  <span className="sent-title">
                    {p.title ?? p.poll?.question ?? p.body.slice(0, 54)}
                  </span>
                  <span className="sent-meta">
                    {p.pinned ? 'Pinned · ' : ''}
                    {p.kind === 'poll' ? 'Poll' : 'Message'} · {author?.name} · {p.timeLabel}
                    {p.notify ? ' · notified everyone' : ''}
                  </span>
                </div>
                <div className="sent-actions">
                  <button
                    className={p.pinned ? 'shot-btn on' : 'shot-btn'}
                    onClick={() => togglePin(p.id)}
                    title={p.pinned ? 'Unpin' : 'Pin to the top'}
                    aria-label="Pin"
                  >
                    <PinIcon size={14} strokeWidth={2.1} />
                  </button>
                  {p.kind === 'note' ? (
                    <button
                      className={isEditing ? 'shot-btn on' : 'shot-btn'}
                      onClick={() => setEditing(isEditing ? null : p.id)}
                      title={isEditing ? 'Done' : 'Edit'}
                      aria-label="Edit"
                    >
                      {isEditing ? <CheckIcon size={14} strokeWidth={2.6} /> : <PencilIcon size={14} strokeWidth={2.2} />}
                    </button>
                  ) : null}
                  <button
                    className="shot-btn danger"
                    onClick={() => remove(p.id)}
                    title="Delete"
                    aria-label="Delete"
                  >
                    <TrashIcon size={14} strokeWidth={2.1} />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="sent-edit">
                  <label className="field">
                    <span className="field-label">Headline</span>
                    <input value={p.title ?? ''} onChange={(e) => update(p.id, { title: e.target.value })} />
                  </label>
                  <label className="field">
                    <span className="field-label">Message</span>
                    <textarea rows={4} value={p.body} onChange={(e) => update(p.id, { body: e.target.value })} />
                  </label>
                </div>
              ) : (
                <>
                  {p.body ? <p className="sent-body">{p.body}</p> : null}
                  {p.poll ? (
                    <div className="sent-poll">
                      {p.poll.options.map((o) => {
                        const total = p.poll!.options.reduce((n, x) => n + x.votes, 0)
                        const pct = total === 0 ? 0 : Math.round((o.votes / total) * 100)
                        return (
                          <span className="sent-opt" key={o.id}>
                            <span className="sent-opt-fill" style={{ width: `${pct}%` }} />
                            <span className="sent-opt-label">{o.label}</span>
                            <span className="sent-opt-pct">{pct}%</span>
                          </span>
                        )
                      })}
                    </div>
                  ) : null}
                  {reactions.length > 0 ? (
                    <div className="sent-reacts">
                      {reactions.map(([e, n]) => (
                        <span key={e}>
                          {e} {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="sent-noreact">No reactions yet</span>
                  )}
                </>
              )}
            </article>
          )
        })}
      </div>

      <aside className="split-side">
        <div className="side-head">
          <span className="side-title">What members see</span>
          <span className="side-note">Live · Posts tab</span>
        </div>
        <PostsPreview
          community={community}
          posts={posts}
          cover={photos.find((p) => p.id === coverId)?.src}
        />
      </aside>
    </div>
  )
}
