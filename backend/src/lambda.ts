import awsLambdaFastify from '@fastify/aws-lambda'
import { buildApp } from './app'

/* The Lambda entry point, behind a Function URL (payload format 2.0).
 *
 * The app is built once per container, not once per request: the promise is
 * created at load and awaited by every invocation, so a warm container skips
 * the route registration and a cold one pays for it a single time. Nothing
 * listens on a port here — the adapter turns the Function URL event into a
 * request on the same Fastify instance the local server uses. */
const proxy = (async () => awsLambdaFastify(await buildApp()))()

export const handler = async (event: unknown, context: unknown) => (await proxy)(event as never, context as never)
