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
| 6 — events | done — lists come from `/api/search` |
| 7 — orders, payments, the pass | done — mock pay flow, real QR |
| 8 — the door | partly — scan by typed ref only (see C) |

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
POST /api/events/:id/scan          POST /api/orders/:id/pay
POST /api/webhooks/payments
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
- `host/src/state/door.tsx` still carries `holdersFor`, which invented ticket holders
  from a hash. The door now reads real orders, so this is dead weight to delete.

---

## What is left

Sections A–E were outstanding at the last handover and are now largely built and
deployed, on the `tickets-payments` branch, merged here. What survives below is what is
genuinely still open — including three places where the implementation stopped short of
what was decided.

### A. Events — done

Lists are server-driven: `Tonight`, `MapScreen` and `DayOf` read `result.hydrated` from
`/api/search` when online and fall back to the mock when not.

**There is no `GET /api/events/:id`.** The detail screen works off what is already
loaded and renders `components/MissingEvent.tsx` when an event is not among it. That is
fine for a list-driven app but it means **a deep link to an event the client has not
already fetched shows "missing" rather than the event.** A shared ticket link is exactly
that case. Worth closing.

### B. Orders and payments — done, except the bookmark

`POST /api/orders/:id/pay` (mock mode) and `POST /api/webhooks/payments` both end in
`markPaid`, which is idempotent and handles an order that expired mid-payment. Swapping
in a real provider means writing the checkout call and mapping the webhook body —
nothing else moves. `PAYMENTS_MODE=mock` is the default; set it to anything else and the
mock endpoint 404s as if it never existed.

Refs are better than specified: crypto randomness, 8 characters from a 31-character
alphabet with `0/O` and `1/I/L` removed, collision-checked before insert, and a
forgiving `normaliseRef` for staff typing them by hand (`backend/src/lib/ref.ts`).

- [ ] **The `saved` table was never built.** "interested" is still a local-only
      bookmark — and it is `useState`, so it does not survive a page reload, let alone a
      new device. We decided it goes to the server so it follows the person and so there
      is some signal about demand that never converted. Still true, still undone.

**Trap, now real:** the client's `RsvpState` spans two tables. `going` is a live order;
`checked-in` / `attended` / `no-showed` are attendance rows; `cancelled` is a cancelled
order. `state/rsvp.tsx` and `state/rsvpState.ts` hold that translation.

### C. The door — scan works, the hard parts do not

Scanning by ticket ref is done and host-only (`POST /api/events/:id/scan`), and the
pass carries a real encoded QR (`frontend/src/components/Qr.tsx`, with a test).

Two decisions were not carried out, and together they are the difference between a demo
and something usable at a real door:

- [ ] **No camera.** Entry is by typed ref only. `BarcodeDetector` is native in
      Chrome/Android; **iOS Safari does not support it** and needs a wasm fallback. Right
      now a host reads the code off the screen and types it, which is the fallback, not
      the path.
- [ ] **No offline list.** The door calls the API per scan. The decision was that it
      downloads the night's holders when the screen opens, matches locally, and posts
      scans up as they happen or in a batch when signal returns. A basement with no bars
      currently means nobody gets in — and that was the reasoning behind choosing a
      fixed ref over a rotating token in the first place, so the ref design is already
      paying for a capability that is not there yet.

**Decided, and still right:** a fixed single-use ref, not a rotating signed token. The
server refuses a second scan, so a shared screenshot locks the real holder out rather
than letting two people in.

### D. Production readiness — mostly closed

The build and the Lambda handler exist; the API runs on Lambda behind a Function URL.
The database needs no password — the API signs in with a short-lived IAM token.

- [ ] **Auth is still the `x-user-id` header**, defaulting to the demo viewer `you`.
      Both deployed sites sit behind one shared HTTP basic password, which is a gate for
      showing people, not authentication. Anyone through that gate can be anyone.
- [ ] No real payment provider yet (see B).

### E. Deployed

Stack `tetherclan` in `ap-southeast-2`, defined in `infra/template.yaml`:

| | |
|---|---|
| member app | `https://d3aw7wbixww4u2.cloudfront.net` |
| host console | `https://d11c4xl9yedwf8.cloudfront.net` |
| API | Lambda + Function URL, reached at `/api/*` on both sites |
| sites | one S3 bucket, member app at the root, host console under `host/` |
| database | Aurora express cluster, **outside the stack** |

Both sites and the API sit behind one shared basic-auth password, enforced by CloudFront
Functions (`SpaRewrite` for the sites, `ApiGate` for `/api`), so nothing reaches S3 or
the Lambda without it. `SiteAuthB64` and `OriginSecret` are `NoEcho` parameters with no
defaults — no credential is committed. `OriginSecret` is sent by CloudFront as a header
so the Lambda's public URL refuses anyone who skips the CDN.

The database is deliberately not in the template: on the free plan Aurora can only be
created as an express cluster, which CloudFormation cannot make. The template's header
comment has the `aws rds create-db-cluster` line and the teardown command.

- [ ] **`infra/README.md` does not exist**, though `template.yaml` tells the reader to
      see it. The deploy procedure — building and zipping the Lambda, uploading it to
      the code bucket, syncing the two apps to `/` and `host/`, invalidating the
      distributions — **is written down nowhere.** Whoever deployed it did so from
      knowledge that is not in this repo. This is the biggest single gap in the handover.

Aurora DSQL was considered and rejected — it requires removing foreign keys and
sequences, and this schema depends on both, plus a partial unique index.

### F. Bots — still deferred

They will supply an API key. The endpoint now exists.

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
