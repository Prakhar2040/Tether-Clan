import { venues } from '@app/data/mock'
import type { Community } from '@app/types'
import type { Plan } from '../state/plans'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function stamp(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return { dow: DAYS[d.getDay()].toUpperCase(), day: String(d.getDate()), mon: MON[d.getMonth()] }
}

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`
}

// Both faces a member gets: the row in the Tickets tab, and the plan itself
// once they tap it. Typing in the form moves both.
export default function PlanPreview({
  community: c,
  plan,
  face,
  cover,
}: {
  community: Community
  plan: Plan
  face: 'row' | 'plan'
  cover?: string
}) {
  const { dow, day, mon } = stamp(plan.date)
  const venue = venues[plan.venueId]
  const soldOut = plan.sold >= plan.capacity
  const draft = plan.status === 'draft'

  return (
    <div className="phone">
      <div className="phone-head">
        {cover ? <div className="phone-banner" style={{ backgroundImage: `url(${cover})` }} /> : null}
        <div className="phone-title">
          <span className="phone-mark" style={{ background: c.color }}>
            {c.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
          </span>
          <span className="phone-name">{c.name}</span>
        </div>
        <div className="phone-tabs">
          <span>Posts</span>
          <span className="on">Tickets</span>
          <span>Photos</span>
          <span>About</span>
        </div>
      </div>

      <div className="phone-body" style={{ ['--comm' as string]: c.color }}>
        {draft ? (
          <div className="pv-draft">
            Not published — members cannot see this yet. Publishing puts it at the top of the
            Tickets tab.
          </div>
        ) : null}

        {face === 'row' ? (
          <>
            <span className="p-label">On sale</span>
            <div className="t-row" style={draft ? { opacity: 0.4 } : undefined}>
              <span className="t-stub">
                <span>{dow}</span>
                <b>{day}</b>
                <span>{mon}</span>
              </span>
              <span className="t-text">
                <span className="t-title">{plan.title || 'Untitled plan'}</span>
                <span className="t-where">
                  {clock(plan.time)} · {venue?.name ?? '—'}
                </span>
              </span>
              {soldOut ? (
                <span className="t-sold">Sold out</span>
              ) : (
                <span className="t-buy">{plan.price === 0 ? 'Reserve' : `Buy · ₹${plan.price}`}</span>
              )}
            </div>
            <span className="b-foot">
              {plan.capacity - plan.sold} of {plan.capacity} places still going. Members never see
              the running count — only whether it is on sale or gone.
            </span>
          </>
        ) : (
          <div className="pv-plan" style={draft ? { opacity: 0.45 } : undefined}>
            {cover ? <div className="pv-hero" style={{ backgroundImage: `url(${cover})` }} /> : null}
            <span className="pv-when">
              {dow} {day} {mon} · {clock(plan.time)}
            </span>
            <span className="pv-name">{plan.title || 'Untitled plan'}</span>
            {plan.description ? <p className="pv-body">{plan.description}</p> : null}

            {plan.theme ? (
              <div className="pv-theme">
                <span className="p-label">Theme</span>
                <span>{plan.theme}</span>
              </div>
            ) : null}

            <div className="pv-block">
              <span className="p-label">Where</span>
              <span className="pv-venue">{venue?.name ?? '—'}</span>
              <span className="pv-area">{venue?.area}</span>
              {venue?.entranceNote ? <span className="pv-entr">{venue.entranceNote}</span> : null}
            </div>

            <div className={soldOut ? 'pv-cta out' : 'pv-cta'}>
              {soldOut ? 'Sold out' : plan.price === 0 ? 'Reserve a place · Free' : `Buy · ₹${plan.price}`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
