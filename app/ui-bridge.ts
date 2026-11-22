// window.reqochet for the screens (what src/preload/index.ts does in Electron): every call of the contract in
// src/shared/api.ts is sent to the hidden core web view as an event and answered by it.
import { invoke } from '@tauri-apps/api/core'
import { emitTo, listen } from '@tauri-apps/api/event'
import { Channels, type InvokeMethod, type ReqochetApi, type UpdateStatus } from '../upstream/src/shared/api'

let nextId = 1
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
let markReady: () => void
const coreReady = new Promise<void>((r) => (markReady = r))

void listen<{ id: number; ok: boolean; value?: unknown; error?: string }>('rpc-reply', ({ payload }) => {
  const p = pending.get(payload.id)
  if (!p) return
  pending.delete(payload.id)
  if (payload.ok) p.resolve(payload.value === null ? undefined : payload.value)
  else p.reject(new Error(payload.error))
})
void listen('core-ready', () => markReady())
void emitTo('core', 'ui-hello', {})

const send = async (channel: string, args: unknown[]): Promise<unknown> => {
  await coreReady
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    void emitTo('core', 'rpc', { id, channel, args })
  })
}

const pushListeners = new Map<string, Set<(...a: unknown[]) => void>>()
void listen<{ channel: string; args: unknown[] }>('push', ({ payload }) => {
  for (const l of pushListeners.get(payload.channel) ?? []) l(...payload.args)
})

const special = new Set<string>(['onUpdateStatus', 'reportUiError', 'updateStatusChanged'])
const invokers = Object.fromEntries(
  (Object.keys(Channels) as (keyof typeof Channels)[])
    .filter((name) => !special.has(name))
    .map((name) => [name, (...args: unknown[]) => send(Channels[name as InvokeMethod], args)])
) as Pick<ReqochetApi, InvokeMethod>

const api: ReqochetApi = {
  ...invokers,
  reportUiError: (message) => void emitTo('core', 'rpc', { id: 0, channel: Channels.reportUiError, args: [message] }),
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
