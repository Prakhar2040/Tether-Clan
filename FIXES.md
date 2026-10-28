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

**14. The logo flies into the room** · 27 Oct · *feature*

Going into a community, the mark in the header morphs into Tether at the head of the
channel. Two elements on two screens sharing one `view-transition-name` — the browser does
the morph and cross-fades the rest.

CSS and one router prop rather than measuring rectangles by hand, and where the API is
missing the navigation just happens. Disabled under reduced motion.

---

**15. Community tile names unreadable over bright covers** · 27 Oct

White text on a photo of a white building and a pale sky. The scrim faded to about a tenth
of its strength by the height the name sits at — fine over a dark cover, hopeless over the
run club's.

First attempt deepened the scrim, which worked — name went from 2.8:1 to 8.9:1 — but
dimmed the photograph so much it stopped being worth having.

So the card was split instead: picture on top at full strength, words below on a deep blue
block. A white band under a photo is what made an earlier version of this read as two
things stacked, and the navy matches the tab bar, so it reads as the app holding the
picture rather than a caption pasted underneath. Only the category stays on the image, in
a pill carrying its own background. Name now 11.5:1, members and rating 6.9:1.

The invisible link layer had to move out of the cover at the same time, or the name and
the next plan would not have been tappable.

**16. Tether branding inside a community page** · 27 Oct

The lockup now sits in the community page's header too — it is still Tether in there, not
a page belonging to the community.

It is marked a `passenger`: the mark that flies into the channel is the one on the screen
you came *from*, and a view-transition name must belong to exactly one element per page or
the whole transition is cancelled.

---

**17. "Quiet in Your location tonight"** · 27 Oct

Two faults in one screenshot, both from a device fix on an office network that blocks
location.

*The name.* "Your location" is a UI label, and the app reads it into sentences — "Quiet in
Your location tonight", "Tell me when Your location wakes up". A fix now gets
reverse-geocoded to the area it landed in, so it reads "Chandana" or "Indiranagar".
Smallest level first; `place` only ever answers "Bengaluru", which is true of everything
here.

*The dead end.* The empty state offered notifications and hosting but no way to look
somewhere else — and when the stored position is wrong, that is the only thing worth
offering. It now leads with "Looking in the wrong place? Change it", opening the picker.

*The claim itself.* "Quiet in Indiranagar tonight" was being said over a position nobody
had confirmed — the startup default. There is always something on somewhere; what was
actually true is that the app did not know where you were. It now says so and asks,
rather than reporting the city as empty on the strength of a guess.

---

**18. Every plan belongs to a room, and 13 new rooms to hold them** · 27 Oct · *feature*

18 of 31 events belonged to nobody. Two of those were always somebody's — `catan-next-wed`
is at Dice District and the Saturday long run is a Cubbon Park run — and had just never
been linked. The other 16 got 13 new communities, grouped where it made sense: both
badminton nights into one club, both football nights into one side, both pottery tasters
into one studio.

Each has an owner with their own voice, highlights, house rules and two posts. 1,079
memberships are generated in the seeder, because `roster.ts` only knows the original four
and the API counts live memberships rather than trusting `memberCount` — without them
every new room would have read as empty.

11 of 13 got covers; chess and yoga found nothing on-subject and fall back to their brand
colour rather than a broken file.

**19. Event cards rebuilt as community tiles** · 27 Oct · *feature*

Same object, different words: picture on top at full strength, words below on the same
blue. A night has a time, a distance and a price where a room has members and a rating.

Only 12 events have art of their own, so the picture falls back to the community's cover —
which is honest, since it is a photograph of the people running it — and to the room's
colour beyond that. 29 of 31 get a real photograph.

---

**20. Event covers showed a flat colour instead of the photo** · 27 Oct

`communityOf` was re-exported straight from the shared data layer, where `coverImage` is a
*filename* — correct for the seeder, useless to a browser. Cards asked for
`url(community-football.jpg)`, got a 404, and fell back to the brand colour, which looks
identical to a room that simply has no cover.

The client now re-exports a resolved version that looks the record up in the mapped
communities. Verified in the rendered DOM rather than by eye: covers come out as
`community-openmic-C4R1kFRn.jpg`.

The host row was also rendering as underlined link text; the whole row is the target and
the chevron says so.

---

**21. Event cards roll through pictures** · 28 Oct · *feature*

The same cross-fade the community tile has. A card shows the night's own art, then the
room's cover, then the room's gallery — most plans have no art of their own, so what rolls
is mostly photographs of the people running it.

The behaviour moved into `useRollingShots` and both feeds call it, rather than a second
copy that would drift in timing, in the pause on hover, and in the reduced-motion branch.

Only one card in nine currently has more than one picture: the thirteen newer rooms have
covers but no galleries yet, so their nights show a single image. The mechanism is in
place and fills in as those arrive.

---

**22. There was no moment to join a community** · 28 Oct · *feature*

The Community tab says "join one from a plan you go to — that's the only way in, and it's
the point", and nothing in the app implemented it. The only way to join was an ungated
button on a room's page, pressable by somebody who had never attended anything. The recap
screen — the one moment the rule describes — never mentioned the community at all.

The recap now asks how the night was, offers an optional note once there is a rating to
attach it to, and then offers the room: "They run this one. Join and you'll hear about the
next before anyone else."

The invitation sits behind the rating rather than beside it. The rating is the thing
somebody has earned the right to be asked for, and answering it is what makes the
invitation read as a consequence of the evening rather than an advert at the end of it.

Also: the stars started on four. A rating the app filled in for you is not a rating, and
this one feeds the host's score.

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
