# Fixes

Newest last. Symptom, then what it actually was.

What is built and what is left: [`HANDOVER.md`](HANDOVER.md). Deploying: [`infra/README.md`](infra/README.md).

---

**1. Host console blank on the deployed site** · 22 Oct

Two copies of React in one bundle, so every hook read a null dispatcher and nothing
mounted. The console imports from `@app`, whose nearest `node_modules` is the member
app's, so `react` resolved differently either side of the workspace boundary. Fixed with
`resolve.dedupe` in both host vite configs.

Dev servers collapse duplicate deps to one copy, so only production builds broke — it had
never worked deployed.

---

**2. Both apps looked empty** · 22 Oct

Not a deploy problem. The seeder rebases the world onto whenever it runs, so it ages out;
every event had gone past. Reseeded.

**This recurs** — it aged out again within five days. Red backend tests after a break are
usually this. The reseed command, and the queries that say whether it would destroy
anything real, are in `infra/README.md`.

---

**3. No way to use your real location** · 27 Oct

`SIMULATED_LOCATION` made `request()` return null without asking the device, and the
button was hidden. That switch existed so `MapScreen` couldn't throw a permission prompt
at someone who only opened a map.

Split the two cases: `request('auto')` stays silent while simulating, `request('user')`
always asks. A tap is the person asking, not a screen asking for them.

---

**4. Map dead on the deployed site** · 27 Oct

The Mapbox token, which is baked in at build time and lands in the lazy `MapScreen-*.js`
chunk. The deployed one didn't work from the CloudFront origin — restricted or revoked,
never confirmed which. Replaced it, checked against the Mapbox API from three origins
first, redeployed.

---

**5. App scrolled the page, not itself, on a laptop** · 27 Oct

`.shell` is `min-height: 100dvh` with a fixed bottom bar — correct on a phone, where
document scrolling is what lets the browser hide its own chrome. On a laptop it means a
column taller than the window.

Added a `@media (min-width: 480px)` frame that scrolls internally. Phones unchanged.

---

**6. "Use my current location" gave the wrong place** · 27 Oct

Three causes, found one at a time.

- It asked for the *worst* answer available: coarse source, cached fixes up to five
  minutes old, and `finish()` on the first callback so the roughest one won. Now asks for
  GPS, refuses cached fixes, keeps the best seen.
- **It failed silently.** Every error but an outright refusal was discarded, so a device
  with no position left your previous pick on screen — which looks exactly like it
  detecting that place. Every code is handled now and says which it was.
- The real cause was the **corporate network**. macOS locates itself by asking Apple to
  resolve nearby wifi access points, and that request was blocked. A hotspot fixed it
  instantly: ±35m. It will break again on that network, but it says so now.

Accuracy is shown beside the place name, because a position you can't see the error bars
on is one you can't judge.

---

**7. Location search instead of seven fixed areas** · 27 Oct · *feature*

Mapbox geocoding, clamped to a tight Bengaluru box, ranked outward from where you are,
areas above streets. Names like "Mg Rd Opposite Indira Canteen Behind Bolas" are dropped —
Mapbox's Indian street data is full of directions pretending to be places.

Keystrokes abort the previous request, and a failed one falls back to filtering the seven
old areas by name, so it still works offline — they are no longer buttons, just the
fallback.

---

## Before production

- [ ] **Restrict the Mapbox token.** It's the account's Default public token, which Mapbox
      won't let you URL-restrict; a dedicated one needs a payment method. A `pk.` token
      can only read map data, so the exposure is someone spending your map loads — fine
      behind a shared password, not fine in public.
- [ ] **Align React versions.** `host` locks 19.3.0, `frontend` 19.2.8, both asking for
      `^19.2.8`. Dedupe picks one, so the member app's components run under a React they
      weren't installed against.
