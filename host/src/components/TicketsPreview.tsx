import { pastCommunityEvents, upcomingCommunityEvents } from '@app/data/community'
import { venues } from '@app/data/mock'
import type { Community, TcEvent } from '@app/types'
import type { TicketSettings } from '../state/tickets'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function parts(e: TcEvent) {
  if (e.startsAt) {
    const d = new Date(e.startsAt)
    return {
      dow: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
      day: String(d.getDate()),
      mon: MONTHS[d.getMonth()],
    }
  }
  const m = /^(\w{3})\s+(\d{1,2})\s+(\w{3})$/.exec(e.dateLabel ?? '')
  if (m) return { dow: m[1].toUpperCase(), day: m[2], mon: m[3].toUpperCase() }
  return { dow: e.dayLabel.slice(0, 3).toUpperCase(), day: '·', mon: '' }
}

// Two faces of the same tab: the list members browse, and the pass they hold
// once they have bought. Flipping between them is how you see what a setting
// actually does.
export default function TicketsPreview({
  community: c,
  settings: s,
  face,
  cover,
}: {
  community: Community
  settings: TicketSettings
  face: 'list' | 'pass'
  cover?: string
}) {
  const upcoming = upcomingCommunityEvents(c.id).filter(
    (e) => s.showSoldOut || e.going < e.capacity,
  )
  const past = pastCommunityEvents(c.id)
  const held = upcomingCommunityEvents(c.id)[0]
  const venue = held ? venues[held.venueId] : undefined

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
          <span>Posts</span>
          <span className="on">Tickets</span>
          <span>Photos</span>
          <span>About</span>
        </div>
      </div>

      {face === 'list' ? (
        <div className="phone-body" style={{ ['--comm' as string]: c.color }}>
          <span className="p-label">On sale</span>
          {upcoming.length === 0 ? (
            <p className="t-none">Nothing on sale right now.</p>
          ) : (
            upcoming.map((e) => {
              const { dow, day, mon } = parts(e)
              const sold = e.going >= e.capacity
              return (
                <div className="t-row" key={e.id}>
                  <span className="t-stub">
                    <span>{dow}</span>
                    <b>{day}</b>
                    <span>{mon}</span>
                  </span>
                  <span className="t-text">
                    <span className="t-title">{e.title}</span>
                    <span className="t-where">
                      {e.timeLabel} · {venues[e.venueId].name}
                    </span>
                  </span>
                  {sold ? (
                    <span className="t-sold">Sold out</span>
                  ) : (
                    <span className="t-buy">{e.price === 0 ? 'Reserve' : `Buy · ₹${e.price}`}</span>
                  )}
                </div>
              )
            })
          )}

          {s.showPast && past.length > 0 ? (
            <>
              <span className="p-label" style={{ marginTop: 6 }}>
                Already happened
              </span>
              {past.map((e) => {
                const { dow, day, mon } = parts(e)
                return (
                  <div className="t-past" key={e.id}>
                    <span className="t-mark">–</span>
                    <span className="t-date">
                      {dow} {day} {mon}
                    </span>
                    <span className="t-ptitle">{e.title}</span>
                  </div>
                )
              })}
            </>
          ) : null}
        </div>
      ) : (
        <div className="phone-body pass-face">
          {held ? (
            <div className="t-pass">
              <div className="t-pass-top" style={{ background: c.color }}>
                <span className="t-pass-comm">{c.name}</span>
                <span className="t-pass-title">{held.title}</span>
                <span className="t-pass-when">
                  {parts(held).dow} {parts(held).day} {parts(held).mon} · {held.timeLabel}
                </span>
                <span className="t-pass-where">{venue?.name}</span>
              </div>

              {s.passNote && s.passNoteText.trim() ? (
                <div className="t-pass-theme">
                  <span className="p-label">From {c.name.split(' ')[0]}</span>
                  <span>{s.passNoteText}</span>
                </div>
              ) : null}

              {s.passEntrance && venue?.entranceNote ? (
                <div className="t-pass-theme">
                  <span className="p-label">Getting in</span>
                  <span>{venue.entranceNote}</span>
                </div>
              ) : null}

              <div className="t-perf" />

              <div className="t-pass-foot">
                {s.entryQr ? (
                  <>
                    <div className="t-qr" />
                    <span className="t-ref">TC-9K4M-2287</span>
                    <span className="t-hint">Show this at the door</span>
                  </>
                ) : (
                  <>
                    <span className="t-tick">✓</span>
                    <span className="t-ref">You're on the list</span>
                    <span className="t-hint">No code needed — just say your name</span>
                  </>
                )}
                <span className="t-paid">
                  {held.price === 0 ? 'Free' : `₹${held.price}`} · Admits one
                </span>
              </div>
            </div>
          ) : (
            <p className="t-none">Nothing to show a pass for yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
