import Fastify from 'fastify'
import cors from '@fastify/cors'
import { searchRoutes } from './routes/search'
import { orderRoutes } from './routes/orders'
import { membershipRoutes } from './routes/membership'
import { doorRoutes } from './routes/door'
import { communityRoutes } from './routes/communities'
import { postRoutes } from './routes/posts'
import { leaderboardRoutes } from './routes/leaderboard'
import { closeDb } from './db/client'

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } })

await app.register(cors, { origin: true })
await app.register(searchRoutes)
await app.register(orderRoutes)
await app.register(membershipRoutes)
await app.register(doorRoutes)
await app.register(communityRoutes)
await app.register(postRoutes)
await app.register(leaderboardRoutes)

const port = Number(process.env.PORT ?? 8085)
await app.listen({ port, host: '0.0.0.0' })

/* Let go of the database on the way out.
 *
 * Without this, a restart leaves connections open until the server notices
 * they are gone, and an Aurora cluster will not pause while anything is still
 * holding one. It also makes `tsx watch` restarts clean rather than leaving a
 * trail of sockets behind. */
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info(`${signal} — closing`)
    await app.close()
    await closeDb()
    process.exit(0)
  })
}
