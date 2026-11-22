// Runs the shared calls test (e2e-tauri/calls-test.js) inside the screens' web view, through window.reqochet.
// Setting up repositories and answering dialogs goes to the core's test hook ('__test', only in test runs).
import { invoke } from '@tauri-apps/api/core'
import { emitTo, listen } from '@tauri-apps/api/event'
import { runCalls } from '../e2e-tauri/calls-test.js'
import type { ReqochetApi } from '../upstream/src/shared/api'

let next = 1_000_000
const pending = new Map<number, (r: { ok: boolean; value?: unknown; error?: string }) => void>()
void listen<{ id: number; ok: boolean; value?: unknown; error?: string }>('rpc-reply', ({ payload }) => pending.get(payload.id)?.(payload))
const hook = (op: string, ...args: unknown[]): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const id = next++
    pending.set(id, (r) => (r.ok ? resolve(r.value) : reject(new Error(r.error))))
    void emitTo('core', 'rpc', { id, channel: '__test', args: [op, ...args] })
  })

export async function runCallsMode(): Promise<void> {
  await new Promise((r) => setTimeout(r, 3000)) // let the start screen settle
  const api = (window as unknown as { reqochet: ReqochetApi }).reqochet
  let text: string
  try {
    const result = await runCalls(api, {
      tmp: (name: string) => hook('tmp', name),
      git: (cwd: string, args: string[]) => hook('git', cwd, args),
      write: (path: string, content: string) => hook('write', path, content),
      answer: (a: unknown) => hook('answer', a)
    })
    text = JSON.stringify({ engine: 'tauri', userAgent: navigator.userAgent, ...result }, null, 1)
  } catch (e) {
    text = JSON.stringify({ engine: 'tauri', crashed: `${String(e)}\n${String((e as Error)?.stack ?? '')}` })
  }
  await invoke('test_report', { text, exit: true })
}
