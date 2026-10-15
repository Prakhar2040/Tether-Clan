/* One way in and out of the API.
 *
 * Every call can fail, and the rule this app follows is that a server being
 * down means worse data, never a broken screen — so nothing here renders an
 * error. Callers pair a request with the local data they would have shown
 * anyway, and `useRemote` keeps that on screen until the real thing arrives.
 */

/* Where the API lives.
 *
 * Deployed, the site and the API share one address (CloudFront forwards /api/* to the
 * server), so the base is empty and a call is just `/api/...`. While developing, the server
 * is on its own port. Decided from the build mode rather than a variable that has to be set:
 * an unset variable used to fall through to localhost in production, and because every call
 * degrades quietly to the local copy, nothing looked wrong. VITE_API_URL still wins when set. */
export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8085')

export class ApiError extends Error {
  // Declared and assigned rather than as constructor parameter properties:
  // those emit real code, which `erasableSyntaxOnly` forbids.
  status: number
  path: string
  // The server's own `{error}` sentence, when it sent one.
  detail?: string

  constructor(status: number, path: string, detail?: string) {
    super(`${path} → ${status}`)
    this.status = status
    this.path = path
    this.detail = detail
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
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b: { error?: unknown }) => (typeof b.error === 'string' ? b.error : undefined))
      .catch(() => undefined)
    throw new ApiError(res.status, path, detail)
  }
  return res.json() as Promise<T>
}
