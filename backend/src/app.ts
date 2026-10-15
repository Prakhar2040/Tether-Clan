import Fastify from 'fastify'
import cors from '@fastify/cors'
import { searchRoutes } from './routes/search'
import { orderRoutes } from './routes/orders'
import { membershipRoutes } from './routes/membership'
import { doorRoutes } from './routes/door'
import { communityRoutes } from './routes/communities'
import { postRoutes } from './routes/posts'
import { leaderboardRoutes } from './routes/leaderboard'
import { paymentRoutes } from './routes/payments'

/* The server without a socket on it. The local entry point listens on a port;
   the Lambda entry point hands requests to it directly. Both need the same
   routes, so they are registered once, here. */
export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } })

  /* Behind CloudFront the Lambda's own URL is public, so anyone who found it could
     skip the password CloudFront asks for. CloudFront stamps every request it forwards
     with a secret header; when a secret is configured, anything without it is refused.
     Locally there is no secret and no check. */
  const originSecret = process.env.ORIGIN_SECRET
  if (originSecret) {
    app.addHook('onRequest', async (req, reply) => {
      if (req.headers['x-origin-verify'] !== originSecret) {
        return reply.code(403).send({ error: 'forbidden' })
      }
    })
  }

  await app.register(cors, { origin: true })
  await app.register(searchRoutes)
  await app.register(orderRoutes)
  await app.register(paymentRoutes)
  await app.register(membershipRoutes)
  await app.register(doorRoutes)
  await app.register(communityRoutes)
  await app.register(postRoutes)
  await app.register(leaderboardRoutes)

  return app
}
