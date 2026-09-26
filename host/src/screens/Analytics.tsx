import { Link } from 'react-router-dom'
import { useHostCommunity } from '../state/host'
import { analyticsFor, pct } from '../lib/analytics'
import JoinsChart from '../components/JoinsChart'
import { ChevronIcon } from '../components/icons'

export default function Analytics() {
  const { community } = useHostCommunity()
  const a = analyticsFor(community.id)


  return (
    <div className="page">
      {/* The headline is the health of the room, not its size. */}
      <div className="head-row">
        <section className="hero-stat">
          <span className="tile-label">The shape of the room</span>
          <div className="ladder">
            {a.ladder.map((r) => (
              <div className="rung" key={r.min}>
                <span className="rung-l">
                  {r.min}+ night{r.min === 1 ? '' : 's'}
                </span>
                <span className="rung-track">
                  <span
                    className={r.min >= 15 ? 'rung-fill deep' : 'rung-fill'}
                    style={{ width: `${Math.max(2, (r.count / Math.max(1, a.ladder[a.ladder.length - 1].count)) * 100)}%` }}
                  />
                </span>
                <span className="rung-n">{r.count}</span>
              </div>
            ))}
          </div>
          <span className="hero-l">
            {a.deepCount} people have been {a.deepMin} times or more, and somebody has been{' '}
            {a.mostNights}. That depth is what a room is — the rest is size.
          </span>
        </section>

        <div className="mini-col">
          <div className="tile">
            <span className="tile-label">Members</span>
            <span className="tile-n">{a.members}</span>
            <span className="tile-note">{a.joinedThisMonth} joined this month</span>
          </div>
          <div className="tile">
            <span className="tile-label">A typical month</span>
            <span className="tile-n">{a.avgJoins.toFixed(1)}</span>
            <span className="tile-note">new members, averaged over the year</span>
          </div>
        </div>
      </div>

      {/* ---- Growth ---- */}
      <div className="section-head">
        <span className="section-title">Who joined, month by month</span>
        <span className="section-link">Last twelve months</span>
      </div>
      <div className="panel chartpanel">
        <JoinsChart data={a.growth} peak={a.peak} />
      </div>

      {/* ---- The two leaks ---- */}
      <div className="section-head">
        <span className="section-title">Where you are losing people</span>
        <span className="section-link">Both are a message away from fixing</span>
      </div>
      <div className="two">
        <section className="leak">
          <div className="leak-head">
            <span className="leak-n">{a.neverCame.length >= 6 ? '6+' : a.neverCame.length}</span>
            <div>
              <span className="leak-t">Joined, never turned up</span>
              <span className="leak-s">
                The quietest leak there is. They said yes once and nothing happened since.
              </span>
            </div>
          </div>
          <div className="who">
            {a.neverCame.map(({ person, detail }) => (
              <div className="who-row" key={person.id}>
                <span className={`av av-${person.color}`} style={{ width: 24, height: 24, fontSize: 9 }}>
                  {person.initials}
                </span>
                <span className="who-name">{person.name}</span>
                <span className="who-detail">{detail}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="leak">
          <div className="leak-head">
            <span className="leak-n warn">{a.drifted.length >= 6 ? '6+' : a.drifted.length}</span>
            <div>
              <span className="leak-t">Were coming, stopped</span>
              <span className="leak-s">
                Not seen in two months or more. These ones already liked it.
              </span>
            </div>
          </div>
          <div className="who">
            {a.drifted.map(({ person, detail }) => (
              <div className="who-row" key={person.id}>
                <span className={`av av-${person.color}`} style={{ width: 24, height: 24, fontSize: 9 }}>
                  {person.initials}
                </span>
                <span className="who-name">{person.name}</span>
                <span className="who-detail">{detail}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Link to="/members" className="jump">
        Open these in Members
        <ChevronIcon size={14} strokeWidth={2.4} />
      </Link>

      {/* ---- The room ---- */}
      <div className="section-head" style={{ marginTop: 26 }}>
        <span className="section-title">How the nights run</span>
        <span className="section-link">{a.nightsRun} already run</span>
      </div>
      <div className="panel">
        <div className="metric">
          <div className="metric-text">
            <span className="metric-t">Came back for a second night</span>
            <span className="metric-s">
              {a.cameAgain} of the {a.cameOnce + a.cameAgain} people who have turned up at all
              came again.
            </span>
          </div>
          <div className="meter">
            <span className="meter-fill" style={{ width: pct(a.returnRate) }} />
          </div>
          <span className="metric-n">{pct(a.returnRate)}</span>
        </div>

        <div className="metric">
          <div className="metric-text">
            <span className="metric-t">How full a night gets</span>
            <span className="metric-s">
              Averaging {Math.round(a.avgHeads)} people a night. {a.soldOut} sold out.
            </span>
          </div>
          <div className="meter">
            <span className="meter-fill" style={{ width: pct(a.avgFill) }} />
          </div>
          <span className="metric-n">{pct(a.avgFill)}</span>
        </div>

        <div className="metric">
          <div className="metric-text">
            <span className="metric-t">How much rests on the same ten people</span>
            <span className="metric-s">
              {a.coreNames.join(', ')} and seven others account for this much of all attendance. A
              room that leans too hard on its core feels shut to everyone else.
            </span>
          </div>
          <div className="meter">
            <span
              className={a.coreShare > 0.6 ? 'meter-fill warn' : 'meter-fill'}
              style={{ width: pct(a.coreShare) }}
            />
          </div>
          <span className="metric-n">{pct(a.coreShare)}</span>
        </div>

        <div className="metric">
          <div className="metric-text">
            <span className="metric-t">Who enters the competition</span>
            <span className="metric-s">
              {Math.round(a.compEntrants)} entrants on average, against {a.members} members.
            </span>
          </div>
          <div className="meter">
            <span className="meter-fill" style={{ width: pct(a.compShare) }} />
          </div>
          <span className="metric-n">{pct(a.compShare)}</span>
        </div>

        <div className="metric">
          <div className="metric-text">
            <span className="metric-t">Whether anyone reads the channel</span>
            <span className="metric-s">
              {a.avgReactions.toFixed(1)} reactions a post across {a.posts} posts. Reactions are
              the only signal members can send back, so a flat line means silence, not agreement.
            </span>
          </div>
          <div className="meter">
            <span className="meter-fill" style={{ width: pct(a.reachShare) }} />
          </div>
          <span className="metric-n">{pct(a.reachShare)}</span>
        </div>
      </div>

      <p className="roster-foot">
        Every figure here is counted from the same rows Members and Tickets read, so a number can
        never quietly disagree with the list it came from.
      </p>
    </div>
  )
}
