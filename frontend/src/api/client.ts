/* One way in and out of the API.
 *
 * Every call can fail, and the rule this app follows is that a server being
 * down means worse data, never a broken screen — so nothing here renders an
 * error. Callers pair a request with the local data they would have shown
 * anyway, and `useRemote` keeps that on screen until the real thing arrives.
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8085'

export class ApiError extends Error {
  // Declared and assigned rather than as constructor parameter properties:
  // those emit real code, which `erasableSyntaxOnly` forbids.
  status: number
  path: string

  constructor(status: number, path: string) {
    super(`${path} → ${status}`)
    this.status = status
    this.path = path
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal })
  if (!res.ok) throw new ApiError(res.status, path)
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal,
  })
  if (!res.ok) throw new ApiError(res.status, path)
  return res.json() as Promise<T>
}
