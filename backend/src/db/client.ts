import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import * as schema from './schema'

/* Two ways to reach the database.
 *
 * Locally it is a connection string to the Docker Postgres. On AWS the free plan only
 * offers Aurora "express" clusters, which have no password at all: you sign in with an
 * IAM token that lasts fifteen minutes, handed over as the password. So when
 * DB_IAM_AUTH is set the pool is given the host, user and database separately and a
 * function that fetches a fresh token each time it opens a connection. The token is
 * signed by the Lambda's own role, so nothing secret is stored anywhere. */
const iam = process.env.DB_IAM_AUTH === '1'
const url = process.env.DATABASE_URL
if (!iam && !url) throw new Error('DATABASE_URL is not set — copy backend/.env.example to backend/.env')

function iamConnection(): PoolConfig {
  const host = process.env.DB_HOST
  const user = process.env.DB_USER ?? 'postgres'
  const region = process.env.AWS_REGION
  if (!host || !region) throw new Error('DB_IAM_AUTH needs DB_HOST and AWS_REGION')
  const port = Number(process.env.DB_PORT ?? 5432)
  const signer = new Signer({ hostname: host, port, username: user, region })
  return {
    host,
    port,
    user,
    database: process.env.DB_NAME ?? 'postgres',
    password: () => signer.getAuthToken(),
    // The gateway presents a certificate from a public CA, so Node's own trust store
    // is enough; no bundle to ship.
    ssl: { rejectUnauthorized: true },
  }
}

/* A pool sized for where it is actually running.
 *
 * A long-lived server wants a handful of connections it can hand out
 * concurrently. Lambda wants the opposite: each container serves one request
 * at a time, so a pool of ten is nine sockets that will never be used, times
 * however many containers are warm. Two things go wrong at once — Aurora at
 * its floor has few connections to give, and idle connections are precisely
 * what stops it pausing, so the database you chose for scaling to zero never
 * gets to.
 */
const onLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)

/* Aurora requires TLS; the local Docker container does not offer it. Decided
   from the host rather than NODE_ENV, which is about builds, not databases. */
function sslFor(connectionString: string) {
  if (process.env.DATABASE_SSL === 'off') return false
  if (/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString)) return false
  const caFile = process.env.DATABASE_CA_FILE
  return caFile
    ? { ca: readFileSync(caFile, 'utf8'), rejectUnauthorized: true }
    : { rejectUnauthorized: true }
}

export const pool = new Pool({
  ...(iam ? iamConnection() : { connectionString: url!, ssl: sslFor(url!) }),
  // One per container on Lambda: more cannot be used, and each one held open
  // is a reason the database stays awake.
  max: onLambda ? 1 : 10,
  // Let go quickly when idle so the cluster can scale down. Locally, holding
  // a connection across requests is just faster.
  idleTimeoutMillis: onLambda ? 5_000 : 30_000,
  // A paused cluster takes roughly fifteen seconds to resume, so the first
  // request after an idle spell must be allowed to wait for it.
  connectionTimeoutMillis: 20_000,
  // Do not keep a Lambda container alive purely because a socket is open.
  allowExitOnIdle: onLambda,
})

/* A connection error on an idle client is not a request failure — it is the
   pool noticing the far end went away, which is routine when the database
   pauses underneath you. Logging it beats an unhandled 'error' event taking
   the process down. */
pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message)
})

export const db = drizzle(pool, { schema })
export { schema }

/** Close every connection. Call on shutdown so nothing is left holding the
 *  cluster awake. */
export const closeDb = () => pool.end()
