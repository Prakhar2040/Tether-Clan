# shared

The world, and the types that describe it.

This used to live in `frontend/src/data/`, where it was doing three jobs at
once and looked like the client's own data:

- the apps read it directly
- the backend seeds Postgres from it
- it is what search falls back to when the server is unreachable

It is none of those things exclusively, so it does not belong to any one of
them. Postgres is the source of truth now; this is the corpus that database is
filled from, and the fallback the apps keep so they still work offline.

**Nothing here may import a bundler asset.** The backend reads these modules
under plain Node, which cannot import a `.jpg`. Images are filenames; the
client resolves them (see `frontend/src/data/community.ts`).

It shrinks as endpoints replace it, domain by domain.
