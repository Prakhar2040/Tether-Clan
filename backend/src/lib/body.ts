import type { FastifyReply } from 'fastify'
import type { ZodType } from 'zod'

/* Checking what actually arrived.
 *
 * TypeScript types are gone by the time a request lands — they describe what
 * the code expects, not what the network sent. Anything crossing the wire has
 * to be checked at runtime or it is only a hope with a type annotation on it.
 * Bots will be posting here shortly and will get it wrong; better a 400 that
 * says which field than a row of nulls nobody notices for a week.
 */
export function parse<T>(schema: ZodType<T>, input: unknown, reply: FastifyReply): T | null {
  const out = schema.safeParse(input ?? {})
  if (out.success) return out.data
  reply.code(400).send({
    error: 'That request did not make sense',
    problems: out.error.issues.map((i) => ({
      field: i.path.join('.') || '(body)',
      says: i.message,
    })),
  })
  return null
}
