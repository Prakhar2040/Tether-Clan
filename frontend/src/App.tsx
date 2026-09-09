import { Outlet, Route, Routes } from 'react-router-dom'
import { RsvpProvider } from './state/rsvp'
import { lazy, Suspense } from 'react'
import { FiltersProvider } from './state/filters'
import { CircleProvider } from './state/circle'

// Mapbox is a large dependency; only load it when the map is opened.
const MapScreen = lazy(() => import('./screens/MapScreen'))
import { BottomBar } from './components/shared'
import Tonight from './screens/Tonight'
import EventDetail from './screens/EventDetail'
import Circle from './screens/Circle'
import DayOf from './screens/DayOf'
import PostEvent from './screens/PostEvent'
import Plans from './screens/Plans'
import Stub from './screens/Stub'

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
      <FiltersProvider>
      <CircleProvider>
      <div className="shell">
        <Routes>
          <Route element={<TabLayout />}>
            <Route path="/" element={<Tonight />} />
            <Route path="/circle" element={<Circle />} />
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
            <Route path="/you" element={<Stub title="Your profile" />} />
          </Route>
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/event/:id/live" element={<DayOf />} />
          <Route path="/event/:id/recap" element={<PostEvent />} />
        </Routes>
      </div>
      </CircleProvider>
      </FiltersProvider>
    </RsvpProvider>
  )
}
