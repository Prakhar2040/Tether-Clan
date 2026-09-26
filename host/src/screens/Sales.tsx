import { useHostCommunity } from '../state/host'
import { salesFor } from '../lib/sales'
import type { Sale } from '../lib/sales'
import { ChartIcon } from '../components/icons'

function Night({ p, currency }: { p: Sale; currency: (n: number) => string }) {
  return (
    <div className="s-row">
      <span className="row-stub">
        <span className="row-dow">{p.dow}</span>
        <span className="row-day">{p.day}</span>
        <span className="row-mon">{p.mon}</span>
      </span>

      <span className="row-text">
        <span className="row-title">{p.title}</span>
        <span className="row-meta">
          {p.venue} · {p.price === 0 ? 'Free' : `${currency(p.price)} a place`}
        </span>
      </span>

      {/* One bar, where the unfilled part is the story. */}
      <span className="s-bar-wrap">
        <span className="s-bar">
          <span
            className={p.soldOut ? 's-sold full' : 's-sold'}
            style={{ width: `${Math.round(p.fill * 100)}%` }}
          />
        </span>
        <span className="s-bar-l">
          {p.sold} of {p.capacity}
          {p.unsold > 0 ? ` · ${p.unsold} unsold` : ' · sold out'}
        </span>
      </span>

      <span className="s-money">
        <span className="s-money-n">{p.revenue === 0 ? '—' : currency(p.revenue)}</span>
        {p.forgone > 0 ? (
          <span className="s-money-l">{currency(p.forgone)} missed</span>
        ) : p.soldOut ? (
          <span className="s-money-l good">sold out</span>
        ) : null}
      </span>
    </div>
  )
}

export default function Sales() {
  const { community } = useHostCommunity()
  const s = salesFor(community.id)

  return (
    <div className="page">
      <div className="s-head">
        <section className="s-hero">
          <span className="s-hero-h">{s.monthLabel.split(' ')[0]} revenue</span>

          <span className="s-big">{s.currency(s.monthRevenue)}</span>

          {/* What the figure is made of, in four equal columns. */}
          <div className="s-made">
            <span>
              <b>{s.monthEvents}</b> event{s.monthEvents === 1 ? '' : 's'}
            </span>
            <span>
              <b>{s.monthTickets}</b> ticket{s.monthTickets === 1 ? '' : 's'} sold
            </span>
            <span>
              <b>
                {s.monthPriceLow === s.monthPriceHigh
                  ? s.currency(s.monthPriceLow)
                  : `${s.currency(s.monthPriceLow)}–${s.monthPriceHigh}`}
              </b>
              a ticket
              {s.monthPriceLow === s.monthPriceHigh ? '' : ` (${s.currency(s.monthPerTicket)} avg)`}
            </span>
            <span>
              <b>{Math.round(s.monthFill * 100)}%</b> average fill this month
            </span>
          </div>
        </section>

      </div>

      {/* ---- Still selling ---- */}
      {s.onSale.length > 0 ? (
        <>
          <div className="section-head">
            <span className="section-title">On sale now</span>
            <span className="section-link">
              {s.onSale.reduce((n, p) => n + p.unsold, 0)} places still going
            </span>
          </div>
          <div className="panel">
            {s.onSale.map((p) => (
              <Night key={p.id} p={p} currency={s.currency} />
            ))}
          </div>
        </>
      ) : null}

      {/* ---- Past, as a statement ---- */}
      <div className="section-head">
        <span className="section-title">Past events</span>
        <span className="section-link">Newest first</span>
      </div>

      {s.months.length === 0 ? (
        <div className="panel">
          <div className="s-row">
            <span className="row-meta">Nothing has run yet.</span>
          </div>
        </div>
      ) : (
        s.months.map((g) => (
          <div className="s-month" key={g.key}>
            {/* A heading a month, with its total — the way a statement reads. */}
            <div className="s-month-head">
              <span className="s-month-l">{g.label}</span>
              <span className="s-month-r">
                <b>{g.revenue === 0 ? '—' : s.currency(g.revenue)}</b>
                {g.tickets} ticket{g.tickets === 1 ? '' : 's'} · {g.plans.length} night
                {g.plans.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="panel">
              {g.plans.map((p) => (
                <Night key={p.id} p={p} currency={s.currency} />
              ))}
            </div>
          </div>
        ))
      )}

      <p className="roster-foot">
        <ChartIcon size={13} strokeWidth={2.2} /> Counted from the places and prices each plan
        carries. Nothing here is estimated, and nothing is deducted — what a night costs to put
        on lands with Money.
      </p>
    </div>
  )
}
