import { people } from '@app/data/mock'
import type { Community, CommunityPost, Person } from '@app/types'

// The app's Posts tab, at phone width. Messages, not article blocks — the
// avatar in the gutter and the tail on the bubble are what make it read as
// something a person sent.
function Bubble({ post, author, color }: { post: CommunityPost; author: Person | undefined; color: string }) {
  const reactions = Object.entries(post.reactions).filter(([, n]) => n > 0)
  const total = Object.keys(post.poll?.options ?? {}).length
    ? post.poll!.options.reduce((n, o) => n + o.votes, 0)
    : 0

  return (
    <div className="m-row">
      <span className="m-avatar" style={{ background: color }}>
        {author?.initials ?? '··'}
      </span>
      <div className="m-main">
        <div className="m-bubble" style={{ ['--comm' as string]: color }}>
          <span className="m-head">
            <span className="m-name">{author?.name ?? 'You'}</span>
            <span className="m-time">{post.timeLabel}</span>
          </span>

          {post.title ? (
            <h4 className="m-title">
              {post.emoji ? <span className="m-emoji">{post.emoji}</span> : null}
              {post.title}
            </h4>
          ) : null}
          {post.body ? <p className="m-body">{post.body}</p> : null}

          {post.poll ? (
            <div className="m-poll">
              <span className="m-title">
                {post.emoji ? <span className="m-emoji">{post.emoji}</span> : null}
                {post.poll.question}
              </span>
              {post.poll.options.map((o) => (
                <span className="m-opt" key={o.id}>
                  {o.label}
                </span>
              ))}
              <span className="m-poll-foot">
                {total} {total === 1 ? 'vote' : 'votes'} · {post.poll.closesLabel}
              </span>
            </div>
          ) : null}
        </div>

        <span className="m-reacts">
          {reactions.slice(0, 4).map(([emoji, n]) => (
            <span className="m-react" key={emoji}>
              {emoji} {n}
            </span>
          ))}
          <span className="m-react add">☺+</span>
        </span>
      </div>
    </div>
  )
}

export default function PostsPreview({
  community: c,
  posts,
  cover,
}: {
  community: Community
  posts: CommunityPost[]
  cover?: string
}) {
  const pinned = posts.find((p) => p.pinned)
  const rest = posts.filter((p) => !p.pinned)
  const owner = people[c.ownerIds[0]]

  return (
    <div className="phone">
      <div className="phone-head">
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
          <span className="on">Posts</span>
          <span>Tickets</span>
          <span>Photos</span>
          <span>About</span>
        </div>
      </div>

      <div className="phone-body chan">
        {pinned ? (
          <div className="m-pinned">
            <span className="m-pin-label">📌 PINNED</span>
            <span className="m-pin-title">
              {pinned.emoji ? <span className="m-emoji">{pinned.emoji}</span> : null}
              {pinned.title ?? pinned.body.slice(0, 48)}
            </span>
          </div>
        ) : null}

        {rest.length === 0 && !pinned ? (
          <div className="p-none">
            <span className="p-none-t">Nothing announced yet</span>
            <span className="p-none-s">{owner?.name ?? 'The owner'} will post here first</span>
          </div>
        ) : null}

        {rest.map((p) => (
          <Bubble
            key={p.id}
            post={p}
            author={p.authorId ? people[p.authorId] : owner}
            color={c.color}
          />
        ))}
      </div>

      <div className="m-lock">🔒 Only the owner can post — react to let them know you read it</div>
    </div>
  )
}
