# TetherClan — where things stand

Last updated 14 Oct 2026. Written at a clean point: everything below typechecks in all
three workspaces, both apps build, and 37 backend tests pass.

---

## The shape of it

Four workspaces. `frontend/` is the member app, `host/` is the owner's console,
`backend/` is one Fastify server for both, `shared/` is the seed corpus and the types
all three agree on.

Path aliases: `@shared → shared/src` (all three), `@app → frontend/src` (host only).
Nothing in `shared/` may import a bundler asset — the backend loads it under plain Node,
and Node cannot import a `.jpg`. That is why `shared/src/community.data.ts` holds image
*filenames* and `frontend/src/data/community.ts` resolves them.

Postgres 17 in Docker on host port **5433**. `npm run db:reset` in `backend/` migrates
and reseeds. The seed is destructive and deterministic.

---

## Standing product rules

These are decisions, not accidents. Do not "fix" them.

- Members never see who else is coming. Attendee lists are host-only.
- No vacancy counts. On sale, or sold out — nothing between.
- The channel is one-way: the owner posts, members react. No replies.
- No waitlists.
- The leaderboard is competition results, not attendance.
- The dashboard is read-only. Tiles link out; they do not act.
- A person belongs to one or two communities, deliberately — not a feed of all of them.

---

## Wired to the API

| Slice | State |
|---|---|
| 0 — fetch helper with offline fallback | done (`useRemote`) |
| 1 — communities | done |
| 2 — posts, polls, reactions | done |
| 3 — photos | done |
| 4 — leaderboard | done (both apps) |
| 5 — host roster | done |

Endpoints now live:

```
GET  /api/health
GET  /api/search  /api/search/suggestions  /api/search/stats
GET  /api/communities              GET /api/communities/:id
GET  /api/communities/:id/photos   GET /api/communities/:id/posts
GET  /api/communities/:id/members  GET /api/communities/:id/leaderboard?scope=
POST /api/communities/:id/join     POST /api/communities/:id/leave
GET  /api/memberships              GET /api/me/results
POST /api/events/:id/orders        GET /api/orders
POST /api/events/:id/attendance    GET /api/events/:id/door
POST /api/posts/:id/reactions/:emoji
POST /api/posts/:id/vote/:optionId
```

`useRemote(load, fallback, deps)` is the pattern every slice uses: `data` starts as the
mock, is replaced if the server answers, and sets `offline` if it does not. There is no
loading state to design and no blank screen when the API is down.

---

## Still on the mock, and fine there

The user has confirmed these are acceptable as they are:

- The host console's communities, events, photos and posts (it reads `@app/data/community`).
- `host/src/lib/churn.ts`, which invents departures. `memberships.leftAt` could answer
  for real.
- `host/src/state/door.tsx` — `holdersFor` invents ticket holders from a hash. This one
  goes away with the door work below.

---

## What is left

### A. Events — not started

- [ ] `GET /api/events/:id` for the detail screen.
- [ ] Point `EventDetail`, `Tonight`, `MapScreen`, `DayOf`, `PostEvent` at the server.

**Decided:** the *lists* reuse `/api/search` rather than a new listing endpoint. Search
already computes travel minutes from the viewer's position, the day labels and the
on-sale/sold-out status; a parallel listing would be a second copy of all of it, free to
drift. Only the single-event fetch is new.

### B. Tickets — not started

- [ ] `GET /api/orders` feeds `Plans` and the pass.
- [ ] The join button calls `POST /api/events/:id/orders` (the transactional capacity
      check already exists there).
- [ ] A `saved` table — person, event, when — for the "interested" bookmark.
- [ ] Ticket refs: random, 8 chars, **including the seeder**.

**Decided:** no payment yet. `POST /orders` writes `paid` directly; the `held` path waits
for a provider.

**Decided:** "interested" is a bookmark, not an RSVP — it shows on Tonight and the event
page and `Plans` deliberately excludes it. It goes to the server so it follows you
between devices, and so there is some signal about demand that never converted.

**Trap:** the client's `RsvpState` is one enum that will span two tables. `going` is a
live order; `checked-in` / `attended` / `no-showed` are attendance rows; `cancelled` is a
cancelled order. The translation layer in `state/rsvp.tsx` is where the bugs will be.

### C. The pass and the door — not started

- [ ] Real QR encoding on the pass. `Ticket.tsx:41` is currently drawn, not encoded, and
      says so. The client encodes the server's ref; it does not fetch an image.
- [ ] Camera on the door: `BarcodeDetector` is native in Chrome/Android. **iOS Safari
      does not support it** — needs a wasm fallback.
- [ ] Typed-ref fallback for a cracked screen or a dead phone.
- [ ] The door downloads the night's holder list on open, matches scans locally, and
      posts them up as they happen or in a batch when signal returns.

**Decided:** a fixed single-use ref, not a rotating signed token. The reasoning: the door
must work in a basement with no signal, which means the door holds the authoritative
list, which means the code does not need to be signed. The server refuses a second scan,
so a shared screenshot locks the real holder out rather than letting two people in. For a
community club that is the right trade.

**Note:** 386 seeded orders already have real refs, so the door can be built before the
purchase flow exists. The complete loop (buy → pass → scan) needs B first.

### D. Before anything deploys — deferred by the user

- [ ] No build. `npm start` runs `tsx` on the source; there is no `build` script, no `dist/`.
- [ ] No Lambda handler. Fastify needs an adapter for a Function URL. `pg.Pool` is
      already Lambda-aware (`src/db/client.ts`).
- [ ] No payment provider, no payment-reference column, no held-order expiry.
- [ ] Secrets: `DATABASE_URL` lives in `backend/.env`.
- [ ] Auth is the `x-user-id` header, defaulting to the demo viewer `you`. Deliberate,
      and the right shape for bots; not for real users.

### E. Deploy — nothing provisioned

Aurora Serverless v2 (PostgreSQL, min 0 ACU) + Lambda Function URL + S3/CloudFront, all
in `ap-southeast-2`. Verified empty: 0 buckets, 0 functions, 0 clusters, $100 credits
intact.

Aurora DSQL was considered and rejected — it requires removing foreign keys and
sequences, and this schema depends on both, plus a partial unique index.

### F. Bots — deferred by the user

They will supply an API key. Needs the AWS endpoint first.

---

## Decisions worth not re-litigating

**Attendance is a counter on the membership, not a query.** `memberships.attended`,
`no_shows` and `last_seen_at` are seeded from the roster and incremented by the door
inside a transaction. The history they stand for is longer than this database will ever
hold — a club that has run two years arrives with two years of nights behind it, and the
events table holds nothing like that much. `attendance` still records individual nights
and answers the question the counters cannot: which ones.

Because they cannot be recomputed, double-counting is a real hazard. `routes/door.ts`
works out what actually changed before it adds anything. Verified: one scan 18→19, a
double tap stays 19, correcting to no-show gives 18 and 1 missed, re-scanning returns to
19 and 0.

**The scoring rule lives in `shared/src/points.ts`,** imported by both the server and the
offline client, so the two cannot drift. A SQL `CASE` would have been a second copy.
The server ranks in JS over a community's result rows — about eighty today. When that
stops being true, points become a stored column on `results` and the tally becomes a sum.

**`competitions.held_on` is a `date`,** the only non-`timestamptz` column in the schema.
A competition is a day on the club's calendar; what time the first game started is
neither recorded nor shown, and storing an instant would mean inventing an hour.

**Labels are derived server-side** (`src/lib/when.ts`) because the product is one city.
Endpoints send the instant *alongside* the label, so a tab left open overnight can
re-derive.

---

## Traps that have already cost time

- **Do not sample brand colours off the rendered PDF slides.** Page 6 is the spec:
  `#15477C` blue, `#FDBE50` amber, `#E9712A` orange, `#070808` ink. The rendered pages
  give different values and caused one wrong change.
- **`erasableSyntaxOnly`** forbids constructor parameter properties. Declare fields.
- **Canvas has no CSS cascade.** `strokeStyle = 'var(--blue)'` silently paints black.
- **CSS transforms on SVG children are in viewBox user units, not pixels.**
- **`:not()` contributes its argument's specificity.** A `*:not(.a):not(.b)` rule beat a
  single-class rule and broke a layout.
- **zsh does not word-split unquoted variables** — building AWS CLI flags in a variable
  fails. Write them literally.
- **Vitest does not read tsconfig paths.** `backend/vitest.config.ts` spells out
  `@shared` so a test touching `src/routes` resolves.
- **`npx tsx -e` cannot do top-level await** (cjs eval). Wrap in an async `main()`.
- **The seeded world ages.** The seeder rebases the mock onto whenever it runs, so a
  day later yesterday's "tonight" is in the past and nine search tests go red —
  correctly, since search excludes past events. `npm run db:seed` fixes it. Red tests
  after a break are usually a stale seed, not a regression.
- The seeder's `pick()` must stay bounded by the pool length, not by `n` — a stride of 7
  over 210 names only ever reaches 30 of them and spun forever.

---

## Known data oddity

`catan-next-wed` is a Dice District event that is not linked to the community in the mock.
