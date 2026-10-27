# Fixes

A running list, newest last. One entry per thing reported, with what was actually wrong
underneath it — the symptom is rarely the cause and the cause is the part worth keeping.

Longer-lived context lives elsewhere: [`HANDOVER.md`](HANDOVER.md) for what is built and
what is left, [`infra/README.md`](infra/README.md) for deploying.

---

## 1. Host console was blank on the deployed site — **fixed**

*Reported 22 Oct. Commit `a002e69`.*

**Symptom:** the console authenticated, then showed a white page. No error on screen.
The member app on the same stack worked.

**Not the cause**, though all of it was checked first: the files were present in S3 under
the right prefix, hashes matched a clean local build, MIME types were right, the live
CloudFront config matched the template, invalidations completed, the API and database were
healthy.

**Cause:** two copies of React in one bundle. The console's components live in `host/`
but it imports a good deal from `@app` — the member app's source — and for those files
the nearest `node_modules` is the frontend's. A bare `react` import therefore resolved to
a different copy depending on which side of the workspace boundary a file sat on, and
both ended up bundled. React's hook dispatcher is module state: `react-dom` set it on one
copy while the components read the other, so every hook saw `null` and the app rendered
an empty root div.

**Why nobody caught it:** the dev server pre-bundles dependencies and collapses them to
one copy. Only production builds broke, so running the app the normal way could never
show it. The server logs confirmed it: no call to `/api/communities/:id/members` — the
console's first request — in the entire log history until the fix went out.

**Fix:** `resolve.dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom']` in
both host vite configs.

**Found by** running the built bundle under jsdom, since the page itself gives nothing to
read.

**Still open:** `host` locks React 19.3.0 and `frontend` locks 19.2.8 though both ask for
`^19.2.8`. Dedupe picks one, so the member app's components now run under a React they
were not installed against. Worth aligning.

---

## 2. Both apps looked empty — **fixed, and it will happen again**

*Reported 22 Oct, same session.*

**Symptom:** nothing on tonight, nothing on sale, a blank next-night tile. Looked like a
broken deploy.

**Cause:** the seeder rebases the mock world onto the moment it runs, so it ages. Local
and deployed had both gone past every event they held — zero upcoming.

**Fix:** reseeded both. The deployed reseed destroyed one real paid order
(`ord_jTyY9_c_QvlK`, catan-next-wed); it was backed up to CSV first and the row is in the
session transcript.

**This recurs.** It aged out again within five days. The reseed command and the two
queries that say whether it would destroy anyone's real activity are in
`infra/README.md`. Red backend tests after a break are usually this, not a regression.

---

## 3. No way to use your real location — **fixed**

*Reported 27 Oct.*

**Symptom:** tapping the location chip on the events page only offered the seven preset
areas. No "detect where I am".

**Cause:** `SIMULATED_LOCATION = true` in `state/location.tsx` made `request()` return
`null` immediately without touching `navigator.geolocation`, and the picker hid the
button entirely. The switch existed for a good reason — `MapScreen` asks for a position
automatically when it loads, and nobody opening a map should be met with a permission
prompt.

**Fix:** separated the two kinds of asking. `request(trigger)` takes `'auto'` or
`'user'`; `'auto'` stays suppressed while simulating, `'user'` always goes to the device,
because a tap is the person asking rather than a screen asking for them. The button is
now always shown, and a remembered device fix survives a reload instead of being
discarded — it can only be there because somebody asked for it.

Also: a denied permission now says so specifically, rather than offering the same "could
not get a fix" for a browser-level block as for a timeout.

---

## 4. Map not working on the deployed site — **open**

*Reported 27 Oct.*

**Symptom:** the map does not work on the CloudFront member app.

**Ruled out:** this is not geolocation. Positions are simulated and default to
Indiranagar, so the map has a centre whatever the browser says.

**The dependency:** the map is Mapbox, and `frontend/src/screens/MapScreen.tsx` reads
`VITE_MAPBOX_TOKEN` at build time. A missing or rejected token means no tiles.

**Known so far:** the token lives in `frontend/.env.local`, which is gitignored, and it
is baked into the lazy-loaded `MapScreen-*.js` chunk rather than the main bundle. The
local build has it. The deployed chunk has the same content hash as the local one, so it
should have it too — not yet verified directly, because the AWS session expired.

**Leading hypothesis:** the token is URL-restricted to localhost, so Mapbox rejects
requests from the CloudFront domain. The browser console would show a 401 or 403 from
`api.mapbox.com` and settle it.

**Noticed alongside:** `frontend/.env.example` is tracked and carries a *different*
Mapbox token, so that one is public on a public repo. Mapbox `pk.` tokens are meant to be
public, but an unrestricted one can be used by anyone against your account. Worth
restricting by URL or rotating.
