# TODO — before bots

Decisions come from the owner, table by table. The first two tables are BUILT and merged (branch `tickets-payments`, 15 Oct 2026); what is still open is marked `[ ]`.
Written 15 Oct 2026 from the first table (payments, tickets, QR, door). The location/maps/events
table and the bot-readiness table are still waiting on the owner's decisions.

How to work it: the owner will go in order, and independent items may be built in
parallel (separate agents or branches), as long as the order API changes below land
first or are agreed up front, since several items touch `backend/src/routes/orders.ts`.

---

## Decided: do

### Orders and payments (backend)

- [x] **Fix the order API.** `POST /api/events/:id/orders` must stop trusting the client.
      Today it accepts `state` from the request body (`orders.ts:23`), so anyone can mark
      their own order `paid`. The server decides the state; the client only asks to buy.
- [x] **Buy more than one ticket in one order.** Today it is one ticket per person
      (the route returns `already: true`). Add a quantity chosen at purchase time, with a
      sensible per-order cap, checked against capacity as a whole (not one at a time).
- [x] **Held orders and expiry.** A new order starts `held`, goes to `paid` when payment
      completes, and a held order that is not paid in time (`expires_at`) lets go of its
      seats. Needs a sweep (or expire-on-read) so held orders cannot block capacity forever.
- [x] **Payment reference, `paid_at` and a webhook route.** Add provider payment id,
      `paid_at`, and a webhook endpoint now, even though the real provider comes later, so
      Razorpay slots in without another schema change.
- [x] **Overselling.** The capacity check is not locked, so two simultaneous buyers can both
      take the last seat. Lock the event row (or take an advisory lock) inside the
      transaction, and count seats from `paid` plus unexpired `held`.
- [x] **Ticket refs.** Random, 8 characters, cryptographically random (not `Math.random`),
      retry on a unique-index collision, and the seeder must use the same generator
      (it currently writes sequential refs). A multi-ticket order needs one ref per ticket.
- [x] **Price in rupees, always.** INR only; no currency column. Keep storing paise
      (`price_paise`) and show rupees in the UI. Make INR explicit in one place rather than
      leaving it implied.

### Pay flow (frontend), mocked for now

- [x] Buy screen with a **quantity** choice, then a **"Click here to pay"** button.
- [x] Pressing it shows a short "processing" state of about 2 seconds, then
      **"Payment done"**, then moves on to the next step (the pass / confirmation).
- [x] This runs through the real order API (create held order, then confirm paid) with a
      **mock payment step**, so replacing it with Razorpay later changes only that one step.
- [x] Wire the frontend off `state/rsvp.tsx`'s fake state machine to `GET /api/orders` and
      the order API. *(Assumed: needed for the pay flow to be real. Confirm with the owner.)*
      Beware the trap in HANDOVER section B: one client `RsvpState` enum spans two tables.

### QR

- [x] **Real QR on the pass.** `Ticket.tsx:41` is drawn, not encoded, and cannot be
      scanned. Add a QR library and encode the server's ticket ref. The client encodes the
      ref; it does not fetch an image. One QR per ticket in a multi-ticket order.

---

## Decided: later

- [ ] Payment provider (Razorpay). The mock step above is built to be swapped out.
- [ ] "Interested" bookmark (`saved` table).

## Decided: not now

- No cash at the door.
- No refunds, cancellation or transfer. (Note: until cancel exists, a mistaken or abandoned
      order can only be released by expiry. That is another reason expiry is in.)

---

## Door (decided 15 Oct, second round)

- [x] **Scan by ticket ref, now.** The door takes a typed QR ref number; entering it marks
      that ticket **scanned** and shows it. This replaces the current scan that takes a
      `personId` (which let anyone scan anyone).
- [x] A ref already scanned is refused with "already scanned" (never counted twice).
- [x] Wire the host door screen (`host/src/state/door.tsx`, currently `holdersFor` mock
      from a hash) to the real endpoints, so the typed ref hits the server.
- [x] Per-ticket state: with several tickets per order, each ticket has its own ref and its
      own scanned state. Proposed: a `tickets` table (order, ref, scanned_at). The person's
      attendance for the night is recorded on their first scan; membership counters must not
      double count (see HANDOVER: the door works out what changed before it adds anything).
- Camera scanning and the offline holder list: **later**. The typed ref is the fallback
  that HANDOVER section C wanted anyway.

## Location, events and the rest (decided 15 Oct, second round)

- [x] **Simulated viewer position, for now.** The client sends a latitude and longitude with
      search, picked from a simulated source (a chosen Bengaluru area); the server uses it
      instead of the fixed Indiranagar `DEFAULT_LOCATION`. Real browser geolocation replaces
      the simulated source later, with no change to the server.
- [x] **Venue coordinates.** Keep them in the schema and seed, and treat a missing one as
      "unknown", not 0,0 (today it falls back to 0 and gives a huge distance).
- [x] **Event list from the server.** *Note:* HANDOVER section A already decided that lists
      reuse `/api/search` instead of a new listing endpoint (search already does the day
      labels, on-sale status and distances), so "event list" means pointing Tonight and the
      list screens at `/api/search`, not adding a new route.
- [x] Open point: dates. See "Questions" below.

### Fine as they are for now

- Event detail screens stay on mock data (so `GET /api/events/:id` is not needed yet).
- The client's "today" stays the 9th (Wed 9 Sep 2026).
- Community data stays mock.

### Later

- Travel time (not shown for now), the map (needs a Mapbox token), directions links, real
  browser geolocation.
- Bots: their scope will be decided later, so **everything in the bot-readiness table is
  parked**: API keys, roles, guarding `db:seed`/`db:reset`, backups, rate limits, write
  endpoints, tests.

### Still not decided

- Host sales and payout screens (mock).
- The door's host check (who may scan). Today any signed-in person can.
- Door camera and offline list (see Door, above: later).

## Questions to settle before starting

1. **Dates:** the client pretends it is 9 Sep 2026, but the seed rebases events onto the
   real clock and the server filters out past events. Real search results and mock event
   detail would disagree. Proposed: a server setting that freezes "now" at 9 Sep 2026
   (used by the date labels, the search filter and the seed), so everything agrees.
2. **Simulated location:** which areas should the picker offer, and where does it default?
   (The existing location picker has a hard-coded list of Bengaluru areas.)
3. **Door access:** leave scanning open to any signed-in person for now, or add a minimal
   "host only" check?
4. **Tickets table:** OK to add a `tickets` table (one row per ticket, with its own ref and
   scanned state) under each order?
5. **Order of work:** the order API change lands first, since the pay flow, QR and door all
   depend on it.
