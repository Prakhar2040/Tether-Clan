import { buildApp } from './app'
import { closeDb } from './db/client'

const app = await buildApp()

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
