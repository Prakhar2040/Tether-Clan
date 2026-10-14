# Setting up a machine

From nothing to all four workspaces running and verified. Written to be followed by a
person or handed to a coding agent.

Read [`README.md`](README.md) first for what the thing is, then
[`HANDOVER.md`](HANDOVER.md) before changing anything — it records what is wired to the
API, what is still on the mock deliberately, what is left, and the reasoning behind the
decisions that look arguable from the outside. Those decisions are not open questions.

## You will need

- **Node 20+** and npm
- **Docker Desktop**, running — Postgres lives in it
- **AWS CLI 2.32.0 or later**, only when you get to deployment

## 1. Clone

```sh
git clone https://github.com/Prakhar2040/Tether-Clan.git
cd Tether-Clan
```

## 2. Install

There is no root `package.json` — the workspaces install separately. `shared/` has no
dependencies of its own.

```sh
cd backend   && npm install
cd ../frontend && npm install
cd ../host   && npm install
cd ..
```

## 3. Environment

`backend/.env` is gitignored, so it does not arrive with the clone. The defaults in the
example are correct for local work:

```sh
cp backend/.env.example backend/.env
```

```
DATABASE_URL=postgres://tetherclan:tetherclan@localhost:5433/tetherclan
PORT=8085
```

Port **5433**, not 5432 — so it does not collide with a Postgres you already run.

## 4. Database

```sh
cd backend
npm run db:up      # Postgres 17 in Docker
npm run db:reset   # migrate, then seed
```

The seed is destructive and deterministic: it truncates, then inserts. It also **rebases
the mock world onto whenever you run it**, so a night two days out stays two days out and
"Tonight 7:30 PM" really is tonight at half seven.

Expected output ends:

```
media        7
people       279
venues       12
communities  4
memberships  526
series       2
events       31  (18 belong to no community)
orders       386  (the rows `going` was standing for)
posts        23
poll options 10  | votes 180
reactions    1137
photos       7
competitions 32  | results 260

attendance left empty — it comes from running the door.
```

## 5. Verify

```sh
cd backend
npx tsc --noEmit
npx vitest run                                    # 37 passing
npm start                                         # :8085
curl -s localhost:8085/api/health

cd ../frontend
npx tsc -p tsconfig.app.json --noEmit && npx vite build && npm run dev

cd ../host
npx tsc -p tsconfig.app.json --noEmit && npx vite build && npm run dev
```

Both apps run with the server down — every screen keeps its local copy underneath and
reports `offline` rather than showing a spinner. So an app that renders is not by itself
proof the backend is up; check `/api/health`.

## 6. AWS — only when deploying

Nothing is provisioned yet. **Do not copy credentials from another machine**; there are
no long-lived access keys to copy.

```sh
aws login                    # opens a browser; --remote gives a URL and code instead
aws sts get-caller-identity
aws configure get region     # must be ap-southeast-2
```

A session lasts 12 hours and renews for 90 days without going back to the browser.

## When something looks broken

**Backend search tests failing.** Almost always a stale seed, not a regression. The
seeded world is rebased onto the moment you seeded it, so a day later yesterday's
"tonight" is in the past and search correctly stops returning it. Run `npm run db:seed`
before investigating anything else.

**`connect ECONNREFUSED ... 5433`.** Docker is not running, or `npm run db:up` was never
run in `backend/`.

**Apps render but every screen says offline.** The backend is down, or `VITE_API_URL`
points somewhere wrong. Default is `http://localhost:8085`.

**`Cannot find package '@shared/...'` in a test.** Vitest does not read tsconfig paths;
`backend/vitest.config.ts` spells the alias out. A new test runner needs the same.

**`git push` rejected with 403.** The credential in your keychain is for a different
GitHub account than the repo owner. `HANDOVER.md` has no say in this one — either get
added as a collaborator, or put the username in the remote URL so the keychain files a
second credential: `https://<user>@github.com/...`.
