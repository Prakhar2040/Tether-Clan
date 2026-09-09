import Fastify from 'fastify'
import cors from '@fastify/cors'
import { searchRoutes } from './routes/search'

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } })

await app.register(cors, { origin: true })
await app.register(searchRoutes)

const port = Number(process.env.PORT ?? 8085)
await app.listen({ port, host: '0.0.0.0' })
