// The core's own channel to Rust (src-tauri/src/core.rs): rqcore://localhost/<call>?k=<key>. The key is claimed once,
// when the worker starts; Rust refuses every call without it, so the screens cannot use this channel.
import { toNodeError, type RustErr } from './fsbase'

const base = navigator.userAgent.includes('Windows') ? 'http://rqcore.localhost/' : 'rqcore://localhost/'
let key = ''

/** Claims the key (only the first claim of an app run gets it). */
export async function claimKey(): Promise<void> {
  const r = await fetch(`${base}claim`, { method: 'POST' })
  if (!r.ok) throw new Error('reqochet core: the core key was refused (already claimed)')
  key = await r.text()
}

const url = (call: string, query: Record<string, string> = {}): string =>
  `${base}${call}?${new URLSearchParams({ k: key, ...query }).toString()}`

/** Trips to Rust per call name (the calls test reads it to see how many trips one action makes). */
export const tripStats: Record<string, number> = {}
const waiting = new Map<number, { call: string; since: number }>()
let next = 1

async function send(call: string, body: BodyInit | null, query?: Record<string, string>, path?: string): Promise<Response> {
  const id = next++
  tripStats[call] = (tripStats[call] ?? 0) + 1
  waiting.set(id, { call, since: Date.now() })
  // a call still unanswered after 10 s: the log gets every waiting call (finds a stall without a debugger)
  const timer = setTimeout(() => {
    const log = (globalThis as { __rqLog?: { warn(m: string): void } }).__rqLog
    const list = [...waiting.values()].map((w) => `${w.call} ${Math.round((Date.now() - w.since) / 1000)}s`).join(', ')
    log?.warn(`Slow Rust call: ${call} (waiting: ${list})`)
  }, 10_000)
  try {
    // plain text or raw bytes, no custom headers: the browser sends it without a CORS pre-check
    const r = await fetch(url(call, query), { method: 'POST', body })
    if (!r.ok) throw toNodeError((await r.json().catch(() => ({ code: 'EIO', message: r.statusText }))) as RustErr, path)
    return r
  } finally {
    clearTimeout(timer)
    waiting.delete(id)
  }
}

export async function coreJson<T>(call: string, args?: unknown, path?: string): Promise<T> {
  const r = await send(call, args === undefined ? null : JSON.stringify(args), undefined, path)
  return (await r.json()) as T
}

export async function coreBytes(call: string, args: unknown, query?: Record<string, string>, path?: string): Promise<Uint8Array> {
  const r = await send(call, args === null ? null : JSON.stringify(args), query, path)
  return new Uint8Array(await r.arrayBuffer())
}

export async function coreWrite(path: string, bytes: Uint8Array, flag: string): Promise<void> {
  await send('write', bytes as unknown as BodyInit, { path, flag }, path)
}

/** The few synchronous calls (existsSync, the log file, …): a synchronous request, allowed in a worker. */
export function coreSync<T>(req: Record<string, unknown>): T {
  tripStats[`sync:${String(req.op)}`] = (tripStats[`sync:${String(req.op)}`] ?? 0) + 1
  const x = new XMLHttpRequest()
  x.open('POST', url('sync'), false)
  x.send(JSON.stringify(req))
  if (x.status !== 200) throw toNodeError(JSON.parse(x.responseText || '{}') as RustErr)
  const r = JSON.parse(x.responseText) as { ok?: T; err?: RustErr }
  if (r.err) throw toNodeError(r.err, String(req.path ?? ''))
  return r.ok as T
}
