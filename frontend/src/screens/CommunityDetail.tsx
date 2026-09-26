import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  canPost,
  communities,
  eventImages,
  pastCommunityEvents,
  photosFor,
  postsFor,
  upcomingCommunityEvents,
} from '../data/community'
import { events, people, priceLabel, venues } from '../data/mock'
import { competitionsOf, standings } from '../data/leaderboard'
import { useRsvp } from '../state/rsvp'
import { useCommunities } from '../state/communities'
import { TicketPass } from './Ticket'
import { dateParts, PastRow, TicketRow } from '../components/tickets'
import { Avatar, CommunityMark } from '../components/shared'
import {
  BackIcon,
  CheckIcon,
  ChevronIcon,
  PinIcon,
  TicketIcon,
  LockIcon,
  PinnedIcon,
  ShareIcon,
  SmileyIcon,
  StarIcon,
} from '../components/icons'
import type { Community, CommunityPhoto, CommunityPost, TcEvent } from '../types'
import { REACTION_PICKER } from '../types'

type Tab = 'posts' | 'tickets' | 'photos' | 'board' | 'about'

function nth(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}


function PhotoTile({ photo, height = 92 }: { photo: CommunityPhoto; height?: number }) {
  return (
    <div
      className="photo"
      style={
        photo.src
          ? { backgroundImage: `url(${photo.src})`, height }
          : { background: photo.color, height }
      }
    >
      <span className="photo-label">
        {photo.caption}
        <span className="photo-by">
          {people[photo.byId]?.name} · {photo.timeLabel}
        </span>
      </span>
    </div>
  )
}

// Slack's mechanic: the chips are the reactions people used, and the plus
// opens the rest. A post nobody reacted to shows just the plus.
function ReactionRow({ postId }: { postId: string }) {
  const { reactionsOn, toggleReaction, reacted } = useCommunities()
  const [picking, setPicking] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const used = reactionsOn(postId)

  // The row stays one line. Past four reactions it truncates behind a count
  // you can tap — wrapping seven pills across three lines on a phone is
  // what Slack's 900px message column lets it get away with, and we do not.
  const CAP = 4
  const overflowing = used.length > CAP && !showAll
  const shown = overflowing ? used.slice(0, CAP - 1) : used
  const hidden = used.length - shown.length

  return (
    <>
      <span className={showAll ? 'react-row wrapped' : 'react-row'}>
        {shown.map((r) => (
          <button
            key={r.emoji}
            className={r.mine ? 'react-btn on' : 'react-btn'}
            onClick={() => toggleReaction(postId, r.emoji)}
            aria-pressed={r.mine}
            aria-label={`${r.emoji} ${r.count}`}
          >
            <span className="react-emoji">{r.emoji}</span>
            {r.count}
          </button>
        ))}
        {overflowing ? (
          <button
            className="react-more"
            onClick={() => setShowAll(true)}
            aria-label={`Show ${hidden} more reactions`}
          >
            +{hidden}
          </button>
        ) : null}
        <button className="react-add" onClick={() => setPicking(true)} aria-label="Add a reaction">
          <SmileyIcon size={15} color="#8A8577" />
          <span className="react-plus">+</span>
        </button>
      </span>

      {picking ? (
        <div className="sheet-backdrop" onClick={() => setPicking(false)}>
          <div className="sheet picker" onClick={(ev) => ev.stopPropagation()}>
            <span className="sheet-handle" />
            <span className="sheet-section" style={{ marginTop: 0 }}>
              React
            </span>
            <div className="picker-grid">
              {REACTION_PICKER.map((e) => (
                <button
                  key={e}
                  className={reacted(postId, e) ? 'picker-cell on' : 'picker-cell'}
                  onClick={() => {
                    toggleReaction(postId, e)
                    setPicking(false)
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function PollBody({ post }: { post: CommunityPost }) {
  const { votedFor, vote, voteCount, totalVotes } = useCommunities()
  const poll = post.poll
  if (!poll) return null

  const mine = votedFor(post.id)
  const total = totalVotes(post.id)

  return (
    <div className="poll">
      <span className="poll-q">
        {post.emoji ? <span className="post-emoji">{post.emoji}</span> : null}
        {poll.question}
      </span>
      {poll.options.map((o) => {
        const n = voteCount(post.id, o.id)
        const pct = total === 0 ? 0 : Math.round((n / total) * 100)
        const picked = mine === o.id
        return (
          <button
            key={o.id}
            className={`poll-opt${mine ? ' voted' : ''}${picked ? ' mine' : ''}`}
            onClick={() => vote(post.id, o.id)}
            disabled={Boolean(mine)}
          >
            {mine ? <span className="poll-fill" style={{ width: `${pct}%` }} /> : null}
            <span className="poll-label">
              {picked ? <CheckIcon size={13} color="#15477C" strokeWidth={3} /> : null}
              {o.label}
            </span>
            {mine ? <span className="poll-pct">{pct}%</span> : null}
          </button>
        )
      })}
      <span className="poll-foot">
        {total} {total === 1 ? 'vote' : 'votes'} · {mine ? poll.closesLabel : 'Tap to vote'}
      </span>
    </div>
  )
}

// The plan, as a ticketing app shows one: a picture, what it is, where it
// is, and one button. No attendee list, no roles — who else is coming is
// theirs to tell you, not ours.
function PlanView({
  event,
  onBack,
  onPass,
}: {
  event: TcEvent
  onBack: () => void
  onPass: (id: string) => void
}) {
  const { stateFor, join } = useRsvp()
  const navigate = useNavigate()
  const state = stateFor(event.id)
  const soldOut = event.going >= event.capacity
  const held = state === 'going' || state === 'checked-in'
  const past = event.dayLabel === 'Past'
  const venue = venues[event.venueId]
  const image = eventImages[event.id]
  const { dow, day, mon } = dateParts(event)

  return (
    <div className="plan-view">
      <button className="plan-back" onClick={onBack}>
        <BackIcon size={14} color="#15477C" /> All tickets
      </button>

      {image ? (
        <div className="plan-hero" style={{ backgroundImage: `url(${image})` }} />
      ) : null}

      <div className="plan-headline">
        <span className="plan-date">
          {dow} {day} {mon} · {event.timeLabel}
        </span>
        <h2 className="plan-name">{event.title}</h2>
      </div>

      {event.whatToExpect ? <p className="about-body">{event.whatToExpect}</p> : null}

      {event.theme ? (
        <div className="plan-theme">
          <span className="about-label">Theme</span>
          <span className="plan-theme-text">{event.theme}</span>
        </div>
      ) : null}

      <section className="about-block">
        <span className="about-label">Where</span>
        <div className="plan-where">
          <span className="plan-venue">{venue.name}</span>
          <span className="plan-area">{venue.area}</span>
          <span className="plan-entrance">{venue.entranceNote}</span>
          <button className="plan-map" onClick={() => navigate('/map')}>
            <PinIcon size={14} color="#15477C" strokeWidth={2.2} />
            Open in map
            <ChevronIcon size={13} color="#8A8577" />
          </button>
        </div>
      </section>

      <div className="plan-action">
        {past ? (
          <span className="plan-action-note">This one has already happened</span>
        ) : held ? (
          <button className="btn btn-confirm" onClick={() => onPass(event.id)}>
            <TicketIcon size={16} color="#FDBE50" strokeWidth={2.2} /> View your ticket
          </button>
        ) : soldOut ? (
          <button className="btn btn-ghost" disabled>
            Sold out
          </button>
        ) : (
          <button className="btn btn-confirm" onClick={() => join(event.id)}>
            {event.price === 0 ? 'Reserve a place · Free' : `Buy · ${priceLabel(event)}`}
          </button>
        )}
      </div>
    </div>
  )
}

// A message, not an article block. Avatar in the gutter, bubble to the
// right, reactions hanging off the bottom — so you can see at a glance that
// Robin put this here, and where one message stops and the next starts.
function PostCard({ post }: { post: CommunityPost }) {
  const author = people[post.authorId]

  return (
    <article className="msg">
      <span className="msg-gutter">{author ? <Avatar person={author} size={32} /> : null}</span>

      <div className="msg-main">
        <div className="msg-bubble">
          <span className="msg-head">
            <span className="msg-name">{author?.name}</span>
            <span className="msg-time">{post.timeLabel}</span>
          </span>

          {post.title ? (
            <h3 className="post-title">
              {post.emoji ? <span className="post-emoji">{post.emoji}</span> : null}
              {post.title}
            </h3>
          ) : null}
          {post.body ? <p className="post-body">{post.body}</p> : null}
          {post.kind === 'poll' ? <PollBody post={post} /> : null}
        </div>

        <ReactionRow postId={post.id} />
      </div>
    </article>
  )
}

export function CommunityView({ community: c }: { community: Community }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'posts'
  const openPlanId = params.get('plan')
  const openPassId = params.get('pass')
  const setTab = (t: Tab) => setParams(t === 'posts' ? {} : { tab: t }, { replace: true })
  const openPlan = (eventId: string) => setParams({ tab: 'tickets', plan: eventId })
  const openPass = (eventId: string) => setParams({ tab: 'tickets', pass: eventId })
  const closePlan = () => setParams({ tab: 'tickets' }, { replace: true })
  const [pinOpen, setPinOpen] = useState(false)
  const { roleIn, isMember, join, leave, markRead, newCount, readLineAt } = useCommunities()

  // Opening the channel is what clears its unread dot.
  useEffect(() => {
    markRead(c.id)
  }, [c.id, markRead])

  const role = roleIn(c.id)
  const member = isMember(c.id)
  const writeable = canPost(role)
  const channelPosts = postsFor(c.id)
  const pinned = channelPosts.find((p) => p.pinned)
  const rest = channelPosts.filter((p) => !p.pinned)
  const line = readLineAt(c.id)
  const fresh = newCount(c.id)

  // One flat list: the posts, with a single rule at the point you stopped.
  const timeline: { post?: CommunityPost; sep?: string }[] = []
  let linePlaced = false
  for (const p of rest) {
    if (fresh > 0 && !linePlaced && p.sortKey >= line) {
      timeline.push({ sep: 'new' })
      linePlaced = true
    }
    timeline.push({ post: p })
  }
  if (fresh > 0 && !linePlaced) timeline.push({ sep: 'new' })
  const gallery = photosFor(c.id)
  const comps = competitionsOf(c.id)
  // The most recent competition is what the table means by default. The
  // chosen scope belongs to one community, so switching rooms has to fall
  // back rather than ask for a table that cannot exist.
  const [picked, setPicked] = useState<string | null>(null)
  const scope =
    picked === 'all' || comps.some((x) => x.id === picked) ? picked! : (comps[0]?.id ?? 'all')
  const setScope = setPicked
  const table = standings(c.id, scope)
  const you = table.find((r) => r.isYou)
  const here = comps.find((x) => x.id === scope)

  // Tickets split three ways: what you already hold, what is still for sale,
  // and what has already happened — missed nights included.
  const upcoming = upcomingCommunityEvents(c.id)
  const past = pastCommunityEvents(c.id)
  const openPlan_ = openPlanId ? events[openPlanId] : undefined
  const openPass_ = openPassId ? events[openPassId] : undefined
  const owners = c.ownerIds.map((p) => people[p]).filter(Boolean)
  const owner = owners[0]
  const admins = c.adminIds.map((p) => people[p]).filter(Boolean)

  return (
    <div className="screen">
      <div className="top-row">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <BackIcon size={20} color="#15477C" />
        </button>
        <button className="icon-btn" aria-label="Share community">
          <ShareIcon size={18} color="#15477C" />
        </button>
      </div>

      {c.coverImage ? (
        <div className="comm-banner" style={{ backgroundImage: `url(${c.coverImage})` }}>
          <span className="comm-kicker">{c.categoryLabel}</span>
        </div>
      ) : null}

      <div className="comm-head">
        <CommunityMark c={c} size={54} />
        <span className="comm-head-name">{c.name}</span>
        <div className="comm-head-row">
          <span className="comm-head-stats">
            <span className="comm-stat-n">{c.memberCount}</span>
            members
            <span className="comm-stat-dot" />
            <StarIcon size={13} filled />
            <span className="comm-stat-n">{c.rating.toFixed(1)}</span>
            <span className="comm-rate-n">({c.ratingCount})</span>
          </span>
          {member ? (
            <button className="btn-small done" onClick={() => leave(c.id)}>
              Joined ✓
            </button>
          ) : (
            <button className="btn-small" onClick={() => join(c.id)}>
              Join
            </button>
          )}
        </div>
      </div>

      <div className="tab-bar">
        <button className={tab === 'posts' ? 'tab-link on' : 'tab-link'} onClick={() => setTab('posts')}>
          Posts
        </button>
        <button className={tab === 'tickets' ? 'tab-link on' : 'tab-link'} onClick={() => setTab('tickets')}>
          Tickets
        </button>
        <button className={tab === 'photos' ? 'tab-link on' : 'tab-link'} onClick={() => setTab('photos')}>
          Photos
        </button>
        <button className={tab === 'board' ? 'tab-link on' : 'tab-link'} onClick={() => setTab('board')}>
          Leaderboard
        </button>
        <button className={tab === 'about' ? 'tab-link on' : 'tab-link'} onClick={() => setTab('about')}>
          About
        </button>
      </div>

      {tab === 'posts' ? (
        <>
          <div
            className="channel"
            style={{ '--comm': c.color } as CSSProperties}
          >
            {pinned ? (
              <div className={pinOpen ? 'pinned-band open' : 'pinned-band'}>
                <button className="pinned-head" onClick={() => setPinOpen((v) => !v)}>
                  <span className="post-pin">
                    <PinnedIcon size={10} color="#A0761B" /> PINNED
                  </span>
                  <span className="pinned-title">
                    {pinned.emoji ? <span className="post-emoji">{pinned.emoji}</span> : null}
                    {pinned.title ?? pinned.body}
                  </span>
                  <ChevronIcon size={15} color="#A0761B" />
                </button>
                {pinOpen ? <p className="post-body">{pinned.body}</p> : null}
              </div>
            ) : null}

            {timeline.length === 0 ? (
              <div className="no-match">
                <span className="t">Nothing announced yet</span>
                <span className="s">{owners[0]?.name ?? 'The owner'} will post here first</span>
              </div>
            ) : (
              timeline.map((item) =>
                item.sep ? (
                  <div className="read-line" key="read-line">
                    <span>{fresh} new since you were here</span>
                  </div>
                ) : (
                  <PostCard key={item.post!.id} post={item.post!} />
                ),
              )
            )}
          </div>

          <div className="composer-lock">
            {writeable ? (
              <span className="composer-hint">You can post here as {role}</span>
            ) : (
              <>
                <LockIcon size={14} color="#8A8577" />
                <span className="composer-hint">
                  Only {admins.length ? 'owners and admins' : 'the owner'} can post — react to let
                  them know you read it
                </span>
              </>
            )}
          </div>
        </>
      ) : null}

      {tab === 'tickets' ? (
        <div className="about" style={{ '--comm': c.color } as CSSProperties}>
          {openPass_ ? (
            <div className="plan-view">
              <button className="plan-back" onClick={closePlan}>
                <BackIcon size={14} color="#15477C" /> All tickets
              </button>
              <TicketPass event={openPass_} communityId={c.id} />
            </div>
          ) : openPlan_ ? (
            <PlanView event={openPlan_} onBack={closePlan} onPass={openPass} />
          ) : (
            <>
              <section className="about-block">
                <span className="about-label">On sale</span>
                {upcoming.length === 0 ? (
                  <p className="about-body">
                    Nothing on sale right now. {owner?.name ?? 'The owner'} posts when the next
                    one opens.
                  </p>
                ) : (
                  upcoming.map((e) => (
                    <TicketRow key={e.id} event={e} onOpen={openPlan} onPass={openPass} />
                  ))
                )}
              </section>

              {past.length > 0 ? (
                <section className="about-block">
                  <span className="about-label">Already happened</span>
                  <div className="past-list">
                    {past.map((e) => (
                      <PastRow key={e.id} event={e} onOpen={openPlan} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === 'photos' ? (
        <div className="feed">
          {gallery.length === 0 ? (
            <div className="no-match">
              <span className="t">No photos yet</span>
              <span className="s">They show up here after the group meets</span>
            </div>
          ) : (
            <>
              <span className="gallery-count">
                {gallery.length} photos · newest first
              </span>
              <div className="photo-grid">
                {gallery.map((p, i) => (
                  // Every fifth one runs full width, so the grid has a rhythm
                  // instead of reading as a contact sheet.
                  <div key={p.id} className={i % 5 === 0 ? 'photo-cell wide' : 'photo-cell'}>
                    <PhotoTile photo={p} height={i % 5 === 0 ? 168 : 124} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === 'board' ? (
        <div className="board" style={{ '--comm': c.color } as CSSProperties}>
          {/* The month is the table. All-time sits behind it. */}
          <div className="board-pick">
            <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Which table">
              {comps.map((comp, i) => (
                <option value={comp.id} key={comp.id}>
                  {comp.name} · {comp.dateLabel}
                  {i === 0 ? ' · latest' : ''}
                </option>
              ))}
              <option value="all">All time · {comps.length} competitions</option>
            </select>
            <ChevronIcon size={14} color="#6B665A" />
          </div>

          <div className="board-head">
            <span className="board-note">
              {scope === 'all'
                ? `Every competition so far, ${comps.length} of them. Ten points for a win, seven for second, five for third — and a point for entering.`
                : `${here?.entrants ?? 0} entered. How they finished on the day.`}
            </span>
          </div>

          <div className="podium">
            {table.slice(0, 3).map((r) => (
              <div className={`pod pod-${r.rank}${r.isYou ? ' you' : ''}`} key={r.person.id}>
                <span className="pod-rank">{r.rank}</span>
                <span className={`avatar avatar-${r.person.color}`}>{r.person.initials}</span>
                <span className="pod-name">{r.person.name}</span>
                <span className="pod-n">{scope === 'all' ? r.points : r.place}</span>
                <span className="pod-l">{scope === 'all' ? 'points' : nth(r.place)}</span>
                {scope === 'all' && r.wins > 0 ? <span className="pod-wins">{r.wins}× won</span> : null}
              </div>
            ))}
          </div>

          <div className="board-list">
            {table.slice(3, 20).map((r) => (
              <div className={r.isYou ? 'brow you' : 'brow'} key={r.person.id}>
                <span className="brow-rank">{r.rank}</span>
                <span className={`avatar avatar-${r.person.color}`}>{r.person.initials}</span>
                <span className="brow-name">
                  {r.person.name}
                  {scope === 'all' && r.wins > 0 ? (
                    <span className="brow-streak">{r.wins}× won</span>
                  ) : null}
                </span>
                {scope === 'all' ? <span className="brow-sub">{r.entered} in</span> : null}
                <span className="brow-n">{scope === 'all' ? r.points : r.place}</span>
              </div>
            ))}
          </div>

          {you && you.rank > 20 ? (
            <div className="board-you">
              <span className="brow-rank">{you.rank}</span>
              <span className={`avatar avatar-${you.person.color}`}>{you.person.initials}</span>
              <span className="brow-name">You</span>
              {scope === 'all' ? <span className="brow-sub">{you.entered} in</span> : null}
              <span className="brow-n">{scope === 'all' ? you.points : you.place}</span>
            </div>
          ) : null}

          {scope !== 'all' && !you ? (
            <p className="board-foot">You sat this one out.</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'about' ? (
        <div className="about" style={{ '--comm': c.color } as CSSProperties}>
          {owner ? (
            <>
              <section className="owner-head">
                <div
                  className="owner-photo"
                  style={
                    c.ownerPhoto
                      ? { backgroundImage: `url(${c.ownerPhoto})` }
                      : { background: c.color }
                  }
                >
                  {c.ownerPhoto ? null : <span>{owner.initials}</span>}
                </div>
                <div className="owner-text">
                  <span className="owner-name">{owner.name}</span>
                  <span className="owner-title">{c.ownerTitle}</span>
                  <span className="owner-role">
                    Owner · {c.startedLabel.replace('Started ', 'since ')}
                  </span>
                </div>
              </section>

              <p className="about-lead">{c.ownerBio[0]}</p>

              <blockquote className="pull-quote">{c.ownerQuote}</blockquote>

              <section className="about-block">
                {c.ownerBio.slice(1).map((para) => (
                  <p className="about-lead" key={para.slice(0, 24)}>
                    {para}
                  </p>
                ))}
              </section>

              <div className="stat-strip">
                {c.highlights.map((h) => (
                  <div className="stat" key={h.label}>
                    <span className="stat-n">{h.n}</span>
                    <span className="stat-label">{h.label}</span>
                  </div>
                ))}
              </div>

              {gallery.length > 0 ? (
                <section className="about-block">
                  <span className="about-label">A look inside</span>
                  <div className="strip">
                    {gallery.slice(0, 5).map((ph) => (
                      <div className="strip-cell" key={ph.id}>
                        <PhotoTile photo={ph} height={128} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          <section className="about-block">
            <span className="about-label">What we do here</span>
            <p className="about-body">{c.description}</p>
            <div className="about-facts">
              <span className="about-fact">{c.categoryLabel}</span>
              <span className="about-fact">{c.areaName}</span>
              <span className="about-fact">{c.memberCount} members</span>
            </div>
          </section>

          <section className="about-block">
            <span className="about-label">House rules</span>
            <ol className="rules">
              {c.houseRules.map((r, i) => (
                <li key={r}>
                  <span className="rule-n">{i + 1}</span>
                  <span className="rule-text">{r}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default function CommunityDetail() {
  const { id } = useParams()
  const c = id ? communities[id] : undefined
  if (!c) return null
  return <CommunityView community={c} />
}
