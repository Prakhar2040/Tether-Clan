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

## 4. Map not working on the deployed site — **fixed**

*Reported 27 Oct.*

**Symptom:** the map did not work on the deployed member app. Worked locally.

**Not geolocation.** Positions are simulated and default to Indiranagar, so the map
always has a centre whatever the browser says.

**Cause:** the Mapbox token. `MapScreen.tsx` reads `VITE_MAPBOX_TOKEN` at build time and
it is baked into the lazy-loaded `MapScreen-*.js` chunk. The token the deployed build
carried did not work from the CloudFront origin. The precise reason is unconfirmed —
restricted to localhost, or revoked — because that token only ever lived in `.env.local`,
which has since been overwritten, and the old deployed chunk sits behind the password
gate.

**Fix:** replaced it with the account's Default public token, verified against the Mapbox
API from three origins before deploying — no referer, the CloudFront domain and
localhost all returned 200. Rebuilt and deployed.

**Not a leak, contrary to an earlier note here:** `frontend/.env.example` contains the
placeholder `your_mapbox_public_token_here`, not a real token. Nothing to rotate.

---

## 5. App scrolled the page instead of itself on a laptop — **fixed**

*Reported 27 Oct.*

**Symptom:** on a desktop browser you had to scroll the whole page to reach the bottom of
the app, and it never looked phone-shaped.

**Cause:** `.shell` is `min-height: 100dvh` with the bottom bar `position: fixed`. That
is the correct model on a phone — the document scrolls, and it is what lets a mobile
browser hide its own chrome as you scroll, which an inner scroller cannot do. On a laptop
the same model means a column taller than the window, so the page scrolls and the bar
sits at the bottom of the window rather than of the app.

**Fix:** a `@media (min-width: 480px)` block — wider than the app's own 430px — that
turns the shell into a fixed-height frame scrolling internally. Below that width nothing
changes at all, so phones keep the behaviour they should have.

The pieces that matter: `.screen` needs `min-height: 0` as well as `overflow-y: auto`,
because a flex child's default `min-height: auto` floors it at its content height and the
overflow escapes upward regardless; `.tabbar` goes from `fixed` to `absolute` so it
anchors to the frame instead of the window; and `.map-screen` and `.dayof`, which sized
themselves to the viewport, now mean the frame.

Checked first that nothing calls `window.scrollTo` or listens for `scroll` on the window
— either would have gone quiet once the document stopped scrolling.

---

## TODO before production

- [ ] **Restrict the Mapbox token.** The account currently has one token, the Default
      public token, and Mapbox does not allow URL restrictions on that one — its URLs
      column reads N/A. Restricting it means creating a dedicated token, and Mapbox asks
      for a payment method to do that, so it is deferred deliberately.

      A `pk.` token is meant to ship in client code and cannot do anything but read map
      data, so the exposure is bounded: someone who lifts it from the bundle can spend
      this account's map loads, nothing more. That is acceptable for a demo behind a
      shared password and is not acceptable once the apps are public.

      When the time comes: create a token scoped to `styles:read` and `fonts:read`, with
      URL restrictions for the real domain and `http://localhost:5173`, put it in
      `frontend/.env.local`, rebuild and deploy. Nothing in the code changes.

- [ ] **The token carries no payment method**, so it is on capped free usage ("Usage
      limited" in the Mapbox console). If the map stops abruptly, check Statistics there
      before looking for a bug.
