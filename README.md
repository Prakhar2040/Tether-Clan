# Tether Clan

Community activities in Bengaluru — the nights a group actually runs, and the people who
keep turning up to them.

Three surfaces over one server:

| | |
|---|---|
| `frontend/` | the member app — what's on, your tickets, your rooms |
| `host/` | the owner's console — the roster, the door, the board, the money |
| `backend/` | Fastify over Postgres, serving both |
| `shared/` | the types and the seed corpus all three agree on |

## Running it

[`SETUP.md`](SETUP.md) has the full walkthrough — prerequisites, the environment file,
and what to do when something looks broken. The short version:

```sh
cd backend
npm install
npm run db:up        # Postgres 17 in Docker, host port 5433
npm run db:reset     # migrate, then seed
npm start            # :8085

cd ../frontend && npm install && npm run dev
cd ../host     && npm install && npm run dev
```

Both apps work with the server down — every screen keeps its local copy underneath and
says so rather than showing a spinner.

The seeded world is rebased onto whenever you seed it, so a night two days out stays two
days out. Leave it a day and yesterday's "tonight" is in the past; reseed to freshen it.

## What it is opinionated about

- Members never see who else is coming. Attendee lists belong to the host.
- No vacancy counts — on sale, or sold out, nothing between.
- The channel runs one way: the owner posts, members react. No replies.
- The leaderboard is competition results, not attendance.
- You belong to one or two communities on purpose, not a feed of all of them.

## Where things stand

[`HANDOVER.md`](HANDOVER.md) has what is wired, what is still on the mock, what is left,
and the reasoning behind the decisions that are easy to argue with later.
