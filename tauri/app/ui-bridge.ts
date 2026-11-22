// window.reqochet for the screens (what src/preload/index.ts does in Electron): every call of the contract in
// src/shared/api.ts goes to the core — a Web Worker started here — and is answered by it. This page also makes the
// window-level Tauri calls the worker cannot make itself ("host" calls: dialogs, updater, restart, closing).
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Channels, type InvokeMethod, type ReqochetApi, type UpdateStatus } from '../../src/shared/api'
import { hostOps } from './host-ops'

let nextId = 1
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
let markReady: () => void
const coreReady = new Promise<void>((r) => (markReady = r))

const answer = (payload: { id: number; ok: boolean; value?: unknown; error?: string }): void => {
  const p = pending.get(payload.id)
  if (!p) return
  pending.delete(payload.id)
  if (payload.ok) p.resolve(payload.value === null ? undefined : payload.value)
  else p.reject(new Error(payload.error))
}

const pushListeners = new Map<string, Set<(...a: unknown[]) => void>>()
const pushed = (channel: string, args: unknown[]): void => {
  for (const l of pushListeners.get(channel) ?? []) l(...args)
}

type HostMsg = { type: 'host'; id: number; op: string; args: unknown }
async function runHost(m: HostMsg): Promise<unknown> {
  if (m.op === 'invoke') {
    const a = m.args as { cmd: string; args?: never; headers: Record<string, string> | null }
    return invoke(a.cmd, a.args, a.headers ? { headers: a.headers } : undefined)
  }
  const fn = (hostOps as Record<string, (...x: unknown[]) => Promise<unknown>>)[m.op]
  if (!fn) throw new Error(`unknown host call ${m.op}`)
  return fn(...(m.args as unknown[]))
}

// the core: a Web Worker started before the screens draw (it claims its key from Rust first — src-tauri/src/core.rs)
const worker = new Worker(new URL('./core-main.ts', import.meta.url), { type: 'module', name: 'reqochet-core' })
worker.onmessage = (e: MessageEvent<{ type: string; [k: string]: unknown }>) => {
  const m = e.data
  if (m.type === 'rpc-reply') answer(m as never)
  else if (m.type === 'core-ready') markReady()
  else if (m.type === 'push') pushed(m.channel as string, m.args as unknown[])
  else if (m.type === 'host') {
    const h = m as unknown as HostMsg
    runHost(h).then(
      (value) => worker.postMessage({ type: 'host-reply', id: h.id, ok: true, value }),
      (error) => worker.postMessage({ type: 'host-reply', id: h.id, ok: false, error: { code: (error as { code?: string })?.code, message: (error as Error)?.message ?? String(error) } })
    )
  }
}
// folder-watch events from Rust come to this page; the core needs them
void listen('fswatch', (e) => worker.postMessage({ type: 'fswatch', payload: e.payload }))

/** One call to the core (also used by the calls test for its '__test' helper). */
export const send = async (channel: string, args: unknown[]): Promise<unknown> => {
  await coreReady
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker.postMessage({ type: 'rpc', id, channel, args })
  })
}
const fire = (channel: string, args: unknown[]): void => {
  void coreReady.then(() => worker.postMessage({ type: 'rpc', id: 0, channel, args }))
}

const special = new Set<string>(['onUpdateStatus', 'reportUiError', 'updateStatusChanged'])
const invokers = Object.fromEntries(
  (Object.keys(Channels) as (keyof typeof Channels)[])
    .filter((name) => !special.has(name))
    .map((name) => [name, (...args: unknown[]) => send(Channels[name as InvokeMethod], args)])
) as Pick<ReqochetApi, InvokeMethod>

const api: ReqochetApi = {
  ...invokers,
  reportUiError: (message) => fire(Channels.reportUiError, [message]),
  // a web view does not reveal where a dropped file lives (Electron's webUtils.getPathForFile has no Tauri twin
  // while HTML drag and drop is used for rows): the screens then offer the file picker
  pathOfDroppedFile: () => '',
  onUpdateStatus: (listener) => {
    const set = pushListeners.get(Channels.updateStatusChanged) ?? new Set()
    pushListeners.set(Channels.updateStatusChanged, set)
    const l = (s: unknown): void => listener(s as UpdateStatus)
    set.add(l)
    return () => set.delete(l)
  }
}

;(window as unknown as { reqochet: ReqochetApi }).reqochet = api

// show the window once the screens have drawn (Electron's ready-to-show)
requestAnimationFrame(() => setTimeout(() => void invoke('show_main'), 50))
