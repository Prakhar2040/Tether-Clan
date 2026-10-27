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

Mapbox's Search Box API, clamped to a tight Bengaluru box and ranked outward from where
you are.

Took two goes. The Geocoding API has **no POIs**, so "Phoenix Marketcity" returned nothing
and "Adarsh Palm Retreat" fell through to whichever road half-matched — a search that
looks like it worked and puts you somewhere else. Within Search Box, `/forward` is for
complete queries: it returns nothing for "koram" and a café for "indiran". `/suggest` is
the one for someone still typing, with `/retrieve` for coordinates once a line is picked.

Keystrokes abort the previous request, and a failed one falls back to filtering the seven
old areas by name, so it still works offline — they are no longer buttons, just the
fallback.

**On the delay:** Mapbox is 600-800ms from Bengaluru and that part is fixed. What helped
was asking sooner (two characters, 120ms pause instead of 250ms), caching answers so
backspacing costs nothing, and leaving the previous results on screen with a "Searching…"
line rather than blanking the list.

---

**8. Events sorted by distance** · 27 Oct · *already were*

They have been nearest-first all along whenever there is no search term — the distance
just wasn't on screen, so the order looked arbitrary. Cards now show it ("300 m",
"2.1 km"), rounded hard because the position behind it can be a few hundred metres out.

Typing a search still gives relevance order rather than distance.

---

**9. Events and map showed different results** · 27 Oct

The filter state was already shared — the Map just ignored most of it, applying only the
time window. Search for something on Events, switch to Map, and you got a different set of
nights with no explanation.

The predicate now lives in `state/filters.tsx` and both screens call it, so they cannot
drift. The map names the active search in its header rather than counting filters
("2 filters" doesn't explain an empty map, "queer night" does) and says so over the canvas
when nothing matches.

---

**10. Only Dice District looked like a real community** · 27 Oct

Not a broken page — the tabs were all there. Sketchbook and Sarjapur had **zero posts and
zero photos**, so opening one gave an empty channel and nothing else.

Filled in: 8 posts each for the two empty rooms (pinned welcome, a poll, reactions, some
tied to their real events), and photographs for all three thin rooms, plus covers for the
two that had none. The About content — owner bios, highlights, house rules — was already
written for all four.

Images came from Openverse. The first pass picked the first thing that downloaded, which
gave the sketching club a photo called "Drown" and the cycling club "just a quick snooze";
the picker now requires the title or tags to match the subject, requires landscape at
700px+, and refuses to use one image twice. Three slots never found anything decent, so
they were dropped rather than shipped — three good photos beat five with two that look
wrong. Provenance and licences are in `frontend/src/assets/CREDITS.md`.

---

**11. Community page lost its Posts/Tickets/Photos/About tabs** · 27 Oct

Caused by fix #5. Making the app a fixed-height frame on a laptop turned `.screen` into
a flex column with a constrained height, and flex items shrink.

A flex item is normally protected from being squashed below its content by its automatic
minimum size — but that protection is switched off for any item whose own overflow is not
visible. The tab bar scrolls sideways so five tabs fit, so it had no protection and
collapsed to zero height, leaving just its bottom border: a hairline where the tabs used
to be.

Fixed at the source rather than one element at a time: nothing in the screen's top-level
stack may shrink now. Growing is untouched. The photo strip in About had the same hazard
and would have been next.

---

**12. "Only owners and admins can post" sat on top of the posts** · 27 Oct

It was `position: fixed` above the tab bar with nothing reserving space for it, so it
covered whatever you were reading — a poll option, in the screenshot that reported it.

Moved into the flow at the head of the channel, which is where a compose box would be and
therefore where you look when wondering why there isn't one. A rule that never changes
does not need to follow you down the page: read once, scrolls away.

---

**13. Tether speaks at the head of the channel** · 27 Oct · *feature*

The read-only notice became a message from Tether — logo mark, name, and a tip that
rotates every eight seconds. Same information, read as part of the room rather than as a
warning label.

Deliberately not the floating bot that was first asked for: motion played *at* someone
over the thing they are reading is what the previous fix had just removed. This cannot
overlap anything, stops ticking when scrolled out of view, and settles on one tip under
reduced motion.

The tips are contextual, not random — each answers something people get wrong: where the
ticket lives, what the leaderboard counts, that nobody sees who else is coming.

**Caught while building it:** an unguarded `new IntersectionObserver` took the whole page
blank where the API is absent. An optimisation should never be able to do that; it now
falls back to rotating without it.

---

## Before production

- [ ] **Restrict the Mapbox token.** It's the account's Default public token, which Mapbox
      won't let you URL-restrict; a dedicated one needs a payment method. A `pk.` token
      can only read map data, so the exposure is someone spending your map loads — fine
      behind a shared password, not fine in public.
- [ ] **Replace the placeholder photographs.** The images for Cubbon, Sketchbook and
      Sarjapur are other people's work under non-commercial or no-derivatives licences
      that this project does not comply with. Fine behind a shared password, not fine in
      public. `frontend/src/assets/CREDITS.md` lists every one.
- [ ] **Align React versions.** `host` locks 19.3.0, `frontend` 19.2.8, both asking for
      `^19.2.8`. Dedupe picks one, so the member app's components run under a React they
      weren't installed against.
