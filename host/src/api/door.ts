import { API_BASE } from '@app/api/client'

/* The door, from the server. Host-only on the server side: every call names who is
 * asking with `x-user-id`. The console acts as the owner of the community it has open
 * (see state/host.tsx); VITE_HOST_USER_ID overrides that for a deploy or a test.
 *
 * Unlike the read slices, a scan must never be faked: when the server cannot be
 * reached `scanTicket` says so, and the screen shows that instead of a success. */

export interface DoorTicket {
  ref: string
  personId: string
  name: string
  scannedAt: string | null
}

export interface DoorView {
  event: { id: string; title: string; capacity: number }
  tickets: DoorTicket[]
  sold: number
  walkIns: { personId: string; name: string; scannedAt: string | null }[]
}

export type ScanOutcome =
  | { kind: 'ok'; ref: string; name: string; qty: number; scanned: number; scannedAt: string }
  | { kind: 'already'; name: string; scannedAt: string | null }
  | { kind: 'refused'; message: string }
  | { kind: 'unreachable' }

/** Who the console acts as. */
export const hostUserId = (ownerId: string | undefined): string | undefined =>
  (import.meta.env.VITE_HOST_USER_ID as string | undefined) || ownerId

const headers = (as: string | undefined): Record<string, string> => ({
  'content-type': 'application/json',
  ...(as ? { 'x-user-id': as } : {}),
})

export class DoorDenied extends Error {}

export async function fetchDoor(eventId: string, as: string | undefined, signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}/door`, {
    headers: headers(as),
    signal,
  })
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new DoorDenied(body.error ?? `Door unavailable (${res.status})`)
  }
  if (!res.ok) throw new Error(`door → ${res.status}`)
  return (await res.json()) as DoorView
}

export async function scanTicket(
  eventId: string,
  ref: string,
  as: string | undefined,
): Promise<ScanOutcome> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}/scan`, {
      method: 'POST',
      headers: headers(as),
      body: JSON.stringify({ ref }),
    })
  } catch {
    return { kind: 'unreachable' }
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, any>
  if (res.ok) {
    return {
      kind: 'ok',
      ref: body.ticket.ref,
      name: body.person.name,
      qty: body.order.qty,
      scanned: body.order.scanned,
      scannedAt: body.scannedAt,
    }
  }
  if (res.status === 409 && body.error === 'Already scanned') {
    return { kind: 'already', name: body.person?.name ?? 'Someone', scannedAt: body.scannedAt ?? null }
  }
  return { kind: 'refused', message: body.error ?? `The server said ${res.status}` }
}
