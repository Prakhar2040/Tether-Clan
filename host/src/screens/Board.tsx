import { fetchBoard, localBoard } from '@app/api/leaderboard'
import { useRemote } from '@app/hooks/useRemote'
import { useHostCommunity } from '../state/host'
import { usePhotos } from '../state/photos'
import { useBoard } from '../state/board'
import BoardPreview from '../components/BoardPreview'
import { LockIcon } from '../components/icons'

export default function Board() {
  const { community } = useHostCommunity()
  const { photos, coverId } = usePhotos()
  const { config, dirty, set, revert, save } = useBoard()
  /* The same table the members see, from the same endpoint — the console
     showing a different ranking from the app would be worse than showing
     none. All time, because this page is about the season. */
  const { data: board } = useRemote(
    (signal) => fetchBoard(community.id, 'all', signal),
    localBoard(community.id, 'all'),
    [community.id],
  )
  const table = board.standings
  const comps = board.competitions

  /* What a member would actually open the tab on. The settings can send
     them to the latest month instead of the season, and that is a different
     table — so the preview is shown the one it is previewing. The server
     resolves "latest"; the newest competition's id is not known until it
     answers. */
  const opensOnSeason = config.opensOn === 'all' && config.allowAllTime
  const { data: monthBoard } = useRemote(
    (signal) => fetchBoard(community.id, 'latest', signal),
    localBoard(community.id, 'latest'),
    [community.id],
  )

  return (
    <div className="page split">
      <div className="split-main">
        <div className="editor-head">
          <span className="editor-note">
            One competition a month, and what those results add up to. It counts placings already
            earned — it never shows who is coming to anything.
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

        {/* The decision that governs every other one on this page. */}
        <section className={config.enabled ? 'bigswitch on' : 'bigswitch'}>
          <button
            className={config.enabled ? 'switch on' : 'switch'}
            onClick={() => set('enabled', !config.enabled)}
            role="switch"
            aria-checked={config.enabled}
            aria-label="Show the leaderboard"
          >
            <span className="switch-knob" />
          </button>
          <div className="bigswitch-text">
            <span className="bigswitch-t">
              {config.enabled ? 'The leaderboard is on' : 'No leaderboard'}
            </span>
            <span className="bigswitch-s">
              {config.enabled
                ? `Members get a Leaderboard tab between Photos and About, and can see where they sit among ${table.length} who have entered.`
                : 'The tab disappears. Members go straight from Photos to About, and results stay between you and whoever was in the room.'}
            </span>
          </div>
        </section>

        <section className={config.enabled ? 'optgroup' : 'optgroup dimmed'}>
          <div className="optgroup-head">
            <span>How it reads</span>
          </div>

          <div className="opt">
            <div className="opt-text">
              <span className="opt-name">Heading</span>
              <span className="opt-what">Sits above the top three.</span>
            </div>
            <div className="opt-body">
              <input
                value={config.title}
                disabled={!config.enabled}
                onChange={(e) => set('title', e.target.value)}
              />
              <span className="field-hint">
                “Most nights, all time” · “Wednesdays turned up to” · “Mornings run”
              </span>
            </div>
          </div>

          <div className="opt">
            <div className="opt-text">
              <span className="opt-name">What members land on</span>
              <span className="opt-what">
                The most recent result, or everything added up. A season table hides who actually
                won last time, so the latest is usually the honest default.
              </span>
            </div>
            <div className="opt-body">
              <div className="choice">
                <button
                  className={config.opensOn === 'latest' ? 'pick on' : 'pick'}
                  onClick={() => set('opensOn', 'latest')}
                  disabled={!config.enabled}
                >
                  Latest result
                  <span>{comps[0]?.dateLabel ?? '—'}</span>
                </button>
                <button
                  className={config.opensOn === 'all' ? 'pick on' : 'pick'}
                  onClick={() => set('opensOn', 'all')}
                  disabled={!config.enabled || !config.allowAllTime}
                >
                  All time
                  <span>{comps.length} competitions</span>
                </button>
              </div>
            </div>
          </div>

          <div className="opt">
            <button
              className={config.allowAllTime ? 'switch on' : 'switch'}
              onClick={() => {
                if (config.allowAllTime && config.opensOn === 'all') set('opensOn', 'latest')
                set('allowAllTime', !config.allowAllTime)
              }}
              disabled={!config.enabled}
              role="switch"
              aria-checked={config.allowAllTime}
              aria-label="Offer the all-time table"
            >
              <span className="switch-knob" />
            </button>
            <div className="opt-text">
              <span className="opt-name">Offer all time</span>
              <span className="opt-what">
                Adds an all-time row to the dropdown alongside every past date. Off, members only
                ever see one competition at a time.
              </span>
            </div>
            <span className={config.allowAllTime ? 'opt-state on' : 'opt-state'}>
              {config.allowAllTime ? 'In the list' : 'Hidden'}
            </span>
          </div>

          <div className="opt">
            <div className="opt-text">
              <span className="opt-name">What a placing is worth</span>
              <span className="opt-what">
                A podium should matter more than the gap between seventh and eighth, and entering
                at all should be worth something.
              </span>
            </div>
            <div className="opt-body">
              <div className="scoring">
                {(
                  [
                    ['win', '1st'],
                    ['second', '2nd'],
                    ['third', '3rd'],
                    ['entering', 'Entering'],
                  ] as [keyof typeof config, string][]
                ).map(([k, label]) => (
                  <label className="score" key={k}>
                    <span className="score-l">{label}</span>
                    <input
                      value={config[k] as number}
                      disabled={!config.enabled}
                      onChange={(e) => set(k as 'win', Math.max(0, Number(e.target.value) || 0))}
                    />
                    <span className="score-u">pts</span>
                  </label>
                ))}
              </div>
              <span className="field-hint">
                Fourth and fifth fall between third and entering. These only decide the all-time
                table — a single competition is ordered by where people finished.
              </span>
            </div>
          </div>

          <div className="opt">
            <button
              className={config.showEntered ? 'switch on' : 'switch'}
              onClick={() => set('showEntered', !config.showEntered)}
              disabled={!config.enabled}
              role="switch"
              aria-checked={config.showEntered}
              aria-label="Show how many entered"
            >
              <span className="switch-knob" />
            </button>
            <div className="opt-text">
              <span className="opt-name">Months entered</span>
              <span className="opt-what">
                Shows how many competitions somebody has actually turned out for, so a high score
                from one lucky month reads honestly.
              </span>
            </div>
            <span className={config.showEntered ? 'opt-state on' : 'opt-state'}>
              {config.showEntered ? 'Shown' : 'Hidden'}
            </span>
          </div>

          <div className="opt">
            <div className="opt-text">
              <span className="opt-name">How many places</span>
              <span className="opt-what">
                Everyone below still sees their own row pinned, so a short list never hides
                somebody from themselves.
              </span>
            </div>
            <div className="opt-body">
              <div className="stepper">
                <button
                  disabled={!config.enabled}
                  onClick={() => set('listLength', Math.max(5, config.listLength - 5))}
                >
                  −
                </button>
                <input
                  value={config.listLength}
                  disabled={!config.enabled}
                  onChange={(e) => set('listLength', Math.max(5, Number(e.target.value) || 5))}
                />
                <button
                  disabled={!config.enabled}
                  onClick={() => set('listLength', Math.min(table.length, config.listLength + 5))}
                >
                  +
                </button>
              </div>
              <span className="field-hint">of {table.length} ranked</span>
            </div>
          </div>
        </section>

        <div className="section-head" style={{ marginTop: 22 }}>
          <span className="section-title">Results so far</span>
          <span className="section-link">{comps.length} competitions · one a month</span>
        </div>
        <div className="panel">
          {comps.map((comp) => {
            const podium = comp.podium
            return (
              <div className="row" key={comp.id}>
                <span className="row-stub">
                  <span className="row-dow">{comp.monthLabel.split(' ')[0]}</span>
                  <span className="row-mon">{comp.monthLabel.split(' ')[1]}</span>
                </span>
                <span className="row-text">
                  <span className="row-title">{comp.name}</span>
                  <span className="row-meta">{comp.entrants} entered</span>
                </span>
                <span className="medals">
                  {podium.map((p) => (
                    <span className={`medal m${p.place}`} key={p.personId}>
                      <b>{p.place}</b>
                      {p.personId === 'you' ? 'You' : p.name.split(' ')[0]}
                    </span>
                  ))}
                </span>
              </div>
            )
          })}
        </div>
        <p className="roster-foot">
          Recording a new month’s result lands with Plans — a competition is a plan with places in
          it, and building two ways to say that would be a mistake.
        </p>

        <div className="principle">
          <LockIcon size={16} strokeWidth={2} />
          <div>
            <span className="principle-t">Results only, never a schedule</span>
            <span className="principle-s">
              The table counts competitions already run. It does not show who is entering the next
              one, because where somebody will be is still theirs to tell — that part has not
              changed.
            </span>
          </div>
        </div>
      </div>

      <aside className="split-side">
        <div className="side-head">
          <span className="side-title">What members see</span>
          <span className="side-note">Live · Leaderboard</span>
        </div>
        <BoardPreview
          community={community}
          board={opensOnSeason ? board : monthBoard}
          config={config}
          cover={photos.find((p) => p.id === coverId)?.src}
        />
      </aside>
    </div>
  )
}
