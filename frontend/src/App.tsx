import { Outlet, Route, Routes } from 'react-router-dom'
import { RsvpProvider } from './state/rsvp'
import { BuyProvider } from './components/BuySheet'
import { lazy, Suspense } from 'react'
import { FiltersProvider } from './state/filters'
import { CircleProvider } from './state/circle'
import { LocationProvider } from './state/location'
import { CommunitiesProvider } from './state/communities'

// Mapbox is a large dependency; only load it when the map is opened. A
// standalone build leaves it out entirely — it would treble the file, and it
// would mean shipping a Mapbox token inside something people pass around.
// The flag is read inline so the bundler can drop the unused branch.
function MapUnavailable() {
  return (
    <div className="screen">
      <div className="stub">
        <h2>The map isn't in this preview</h2>
        <p>
          It needs Mapbox, which would treble the size of this file. Everything else here is the
          real app.
        </p>
      </div>
    </div>
  )
}

const MapScreen = lazy(() =>
  import.meta.env.VITE_STANDALONE
    ? Promise.resolve({ default: MapUnavailable })
    : import('./screens/MapScreen'),
)

import { BottomBar } from './components/shared'
import { Splash } from './components/Splash'
import Tonight from './screens/Tonight'
import EventDetail from './screens/EventDetail'
import Community from './screens/Community'
import CommunityDetail from './screens/CommunityDetail'
import Ticket from './screens/Ticket'
import DayOf from './screens/DayOf'
import PostEvent from './screens/PostEvent'
import Plans from './screens/Plans'
import Profile from './screens/Profile'

function TabLayout() {
  return (
    <>
      <Outlet />
      <BottomBar />
    </>
  )
}

export default function App() {
  return (
    <RsvpProvider>
      <BuyProvider>
      <FiltersProvider>
      <CircleProvider>
      <LocationProvider>
      <CommunitiesProvider>
      <div className="shell">
        <Splash />
        <Routes>
          <Route element={<TabLayout />}>
            <Route path="/" element={<Community />} />
            <Route path="/events" element={<Tonight />} />
            <Route path="/plans" element={<Plans />} />
            <Route
              path="/map"
              element={
                <Suspense
                  fallback={
                    <div className="screen">
                      <div className="stub">
                        <p>Loading map…</p>
                      </div>
                    </div>
                  }
                >
                  <MapScreen />
                </Suspense>
              }
            />
            <Route path="/you" element={<Profile />} />
            {/* Inside the tab shell: going into a community must not strand
                you without the bottom bar. */}
            <Route path="/community/:id" element={<CommunityDetail />} />
            <Route path="/ticket/:id" element={<Ticket />} />
          </Route>
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/event/:id/live" element={<DayOf />} />
          <Route path="/event/:id/recap" element={<PostEvent />} />
        </Routes>
      </div>
      </CommunitiesProvider>
      </LocationProvider>
      </CircleProvider>
      </FiltersProvider>
      </BuyProvider>
    </RsvpProvider>
  )
}
