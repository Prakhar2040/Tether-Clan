import { competitionsOf, standings } from '@app/data/leaderboard'
import { people } from '@app/data/mock'
import { roster } from '@app/data/roster'
import type { Community } from '@app/types'
import type { BoardConfig } from '../state/board'

export default function BoardPreview({
  community: c,
  config,
  cover,
}: {
  community: Community
  config: BoardConfig
  cover?: string
}) {
  const comps = competitionsOf(c.id)
  const scope = config.opensOn === 'all' && config.allowAllTime ? 'all' : (comps[0]?.id ?? 'all')
  const season = scope === 'all'
  const table = standings(c.id, scope)
  const here = comps.find((x) => x.id === scope)

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
          <span>Tickets</span>
          <span>Photos</span>
          {config.enabled ? <span className="on">Leaderboard</span> : null}
          <span className={config.enabled ? '' : 'on'}>About</span>
        </div>
      </div>

      <div className="phone-body" style={{ ['--comm' as string]: c.color }}>
        {!config.enabled ? (
          <div className="p-none">
            <span className="p-none-t">No leaderboard</span>
            <span className="p-none-s">
              The tab is gone — members go straight from Photos to About, and results stay between
              you and whoever was there
            </span>
          </div>
        ) : (
          <>
            <div className="b-pick">
              {season ? `All time · ${comps.length} competitions` : `${here?.name} · ${here?.dateLabel}`}
              <span>▾</span>
            </div>
            <span className="b-sub-note">
              {season
                ? 'Points across every competition so far.'
                : `${here?.entrants ?? 0} entered. How they finished on the day.`}
            </span>
            <div className="b-pod">
              {table.slice(0, 3).map((r) => (
                <div className={`b-p b-p${r.rank}`} key={r.person.id}>
                  <span className="b-rank">{r.rank}</span>
                  <span className={`av av-${r.person.color}`} style={{ width: 30, height: 30, fontSize: 10 }}>
                    {r.person.initials}
                  </span>
                  <span className="b-name">{r.person.name}</span>
                  <span className="b-n">{season ? r.points : r.place}</span>
                  {season && r.wins > 0 ? <span className="b-wins">{r.wins}× won</span> : null}
                </div>
              ))}
            </div>

            <div className="b-list">
              {table.slice(3, Math.max(4, config.listLength)).map((r) => (
                <div className={r.isYou ? 'b-row you' : 'b-row'} key={r.person.id}>
                  <span className="b-rn">{r.rank}</span>
                  <span className={`av av-${r.person.color}`} style={{ width: 22, height: 22, fontSize: 8 }}>
                    {r.person.initials}
                  </span>
                  <span className="b-who">
                    {r.person.name}
                    {season && r.wins > 0 ? <span className="b-streak">{r.wins}× won</span> : null}
                  </span>
                  {season && config.showEntered ? <span className="b-sub">{r.entered} in</span> : null}
                  <span className="b-score">{season ? r.points : r.place}</span>
                </div>
              ))}
            </div>

            <span className="b-foot">
              {config.allowAllTime
                ? 'The dropdown holds every past date, and all time.'
                : 'The dropdown holds every past date. All time is switched off.'}
            </span>

            <span className="p-label" style={{ marginTop: 4 }}>
              Also in the dropdown
            </span>
            {comps.slice(season ? 0 : 1, season ? 3 : 4).map((comp) => {
              const w = comp.results.find((r) => r[1] === 1)
              const name = w ? (w[0] === 'you' ? 'You' : (people[w[0]] ?? roster[w[0]])?.name) : '—'
              return (
                <div className="b-comp" key={comp.id}>
                  <span className="b-comp-m">{comp.dateLabel.replace(/^\w+ /, '')}</span>
                  <span className="b-comp-t">
                    <b>{comp.name}</b>
                    <span>
                      Won by {name} · {comp.entrants} entered
                    </span>
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
