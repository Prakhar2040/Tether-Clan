import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Rail from './components/Rail'
import Soon from './components/Soon'
import Dashboard from './screens/Dashboard'
import About from './screens/About'
import Photos from './screens/Photos'
import Posts from './screens/Posts'
import Tickets from './screens/Tickets'
import Members from './screens/Members'
import Board from './screens/Board'
import Analytics from './screens/Analytics'
import Sales from './screens/Sales'
import Plans from './screens/Plans'
import Door from './screens/Door'
import { AboutProvider } from './state/about'
import { PhotosProvider } from './state/photos'
import { PostsProvider } from './state/posts'
import { TicketsProvider } from './state/tickets'
import { BadgesProvider } from './state/badges'
import { BoardProvider } from './state/board'
import { PlansProvider } from './state/plans'
import { DoorProvider } from './state/door'
import { HostProvider, useHostCommunity } from './state/host'
import { MembersProvider } from './state/members'
import { PlusIcon } from './components/icons'

const PAGES: Record<string, { title: string; sub: string; soon?: { title: string; body: string; points: string[] } }> = {
  '/': { title: 'Dashboard', sub: 'What is selling, what has run, what needs you' },
  '/plans': { title: 'Plans', sub: 'Everything a member can buy starts here' },
  '/door': { title: 'Door', sub: 'Who has arrived, and who has not' },
  '/posts': { title: 'Posts', sub: 'What you write into the room between plans' },
  '/tickets': { title: 'Tickets', sub: 'How tickets behave — the pass, the list, the rules' },
  '/analytics': { title: 'Analytics', sub: 'Whether the room is growing, and who is slipping away' },
  '/members': { title: 'Members', sub: 'Everyone in the room, and who keeps coming back' },
  '/photos': { title: 'Photos', sub: 'The gallery your members scroll' },
  '/board': { title: 'Leaderboard', sub: 'Who turns up most, and whether the room sees it' },
  '/about': { title: 'About page', sub: 'What members read, and where you write it' },
  '/sales': { title: 'Sales', sub: 'What moved, how full it got, and what the empty places cost' },
}

function Shell() {
  const { pathname } = useLocation()
  const { community } = useHostCommunity()
  const page = PAGES[pathname] ?? PAGES['/']

  return (
    <div className="console">
      <Rail />
      <main className="main">
        <header className="topbar">
          <div className="topbar-text">
            <h1 className="topbar-title">{page.title}</h1>
            <span className="topbar-sub">
              {community.name} · {page.sub}
            </span>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost" disabled>
              Preview as member
            </button>
            <button className="btn btn-primary" disabled>
              <PlusIcon size={15} strokeWidth={2.4} />
              New plan
            </button>
          </div>
        </header>
        <MembersProvider>
        <AboutProvider communityId={community.id}>
          <PhotosProvider communityId={community.id}>
            <PostsProvider communityId={community.id}>
              <TicketsProvider communityId={community.id}>
                <BadgesProvider communityId={community.id}>
                  <BoardProvider communityId={community.id}>
                    <PlansProvider communityId={community.id}>
                      <DoorProvider>
                        <Outlet />
                      </DoorProvider>
                    </PlansProvider>
                  </BoardProvider>
                </BadgesProvider>
              </TicketsProvider>
            </PostsProvider>
          </PhotosProvider>
        </AboutProvider>
        </MembersProvider>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <HostProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/board" element={<Board />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/door" element={<Door />} />
          <Route path="/members" element={<Members />} />
          {Object.entries(PAGES)
            .filter(([, p]) => p.soon)
            .map(([path, p]) => (
              <Route
                key={path}
                path={path}
                element={
                  <div className="page">
                    <Soon title={p.soon!.title} body={p.soon!.body} points={p.soon!.points} />
                  </div>
                }
              />
            ))}
        </Route>
      </Routes>
    </HostProvider>
  )
}
