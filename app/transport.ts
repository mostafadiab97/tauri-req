// Where the core runs: in the hidden "core" web view (window) or in a Web Worker inside the screens' web view
// (worker, experiment). The core code is the same; only how it talks changes:
//  - window: Tauri events to and from the screens, Tauri calls directly
//  - worker: postMessage to and from the screens' page, which also makes the Tauri calls for it ("host" calls),
//    because a worker has no Tauri bridge of its own
import { invoke as tauriInvoke, type InvokeArgs, type InvokeOptions } from '@tauri-apps/api/core'

export const inWorker = typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== 'undefined' && typeof window === 'undefined'

type Msg = { type: string; id?: number; [k: string]: unknown }
let nextHost = 1
const hostWaiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>()
const handlers = new Map<string, (m: Msg) => void>()

if (inWorker) {
  self.addEventListener('message', (e: MessageEvent<Msg>) => {
    const m = e.data
    if (m.type === 'host-reply') {
      const w = hostWaiting.get(m.id as number)
      hostWaiting.delete(m.id as number)
      if (m.ok) w?.resolve(m.value)
      else w?.reject(m.error)
    } else handlers.get(m.type)?.(m)
  })
}

/** A call the screens' page makes for the worker (Tauri commands, dialogs, updater, …). */
export function hostCall<T>(op: string, args: unknown, transfer: Transferable[] = []): Promise<T> {
  const id = nextHost++
  return new Promise<T>((resolve, reject) => {
    hostWaiting.set(id, { resolve: resolve as (v: unknown) => void, reject })
    ;(self as unknown as Worker).postMessage({ type: 'host', id, op, args }, transfer)
  })
}

export function invoke<T>(cmd: string, args?: InvokeArgs, options?: InvokeOptions): Promise<T> {
  if (!inWorker) return tauriInvoke<T>(cmd, args, options)
  const transfer = args instanceof Uint8Array ? [] : []
  return hostCall<T>('invoke', { cmd, args, headers: (options?.headers as Record<string, string>) ?? null }, transfer)
}

/** Messages from the screens (worker mode): rpc calls, folder-watch events, … */
export function onMessage(type: string, fn: (m: Msg) => void): void {
  handlers.set(type, fn)
}

export function post(m: Msg): void {
  ;(self as unknown as Worker).postMessage(m)
}
