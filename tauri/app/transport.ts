// How the core (a Web Worker inside the screens' page) talks:
//  - with the screens: postMessage (calls in, answers and pushes out)
//  - with Rust, for files, Git, folder watching and PDF: its own channel with the key it alone holds (shims/core.ts)
//  - for window-level things a worker cannot do (dialogs, updater, restart, closing): "host" calls the screens' page
//    makes for it with Tauri

type Msg = { type: string; id?: number; [k: string]: unknown }
let nextHost = 1
const hostWaiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>()
const handlers = new Map<string, (m: Msg) => void>()

self.addEventListener('message', (e: MessageEvent<Msg>) => {
  const m = e.data
  if (m.type === 'host-reply') {
    const w = hostWaiting.get(m.id as number)
    hostWaiting.delete(m.id as number)
    if (m.ok) w?.resolve(m.value)
    else w?.reject(m.error)
  } else handlers.get(m.type)?.(m)
})

/** A call the screens' page makes for the worker (Tauri window commands, dialogs, updater, …). */
export function hostCall<T>(op: string, args: unknown): Promise<T> {
  const id = nextHost++
  return new Promise<T>((resolve, reject) => {
    hostWaiting.set(id, { resolve: resolve as (v: unknown) => void, reject })
    ;(self as unknown as Worker).postMessage({ type: 'host', id, op, args })
  })
}

/** A Tauri window command (app_exit, show_main), made by the screens' page. */
export const windowCommand = <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => hostCall<T>('invoke', { cmd, args })

/** Messages from the screens: rpc calls, folder-watch events. */
export function onMessage(type: string, fn: (m: Msg) => void): void {
  handlers.set(type, fn)
}

export function post(m: Msg): void {
  ;(self as unknown as Worker).postMessage(m)
}
