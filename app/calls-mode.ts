// Runs the shared calls test (e2e-tauri/calls-test.js) inside the screens' web view, through window.reqochet.
// Setting up repositories and answering dialogs goes to the core's test hook ('__test', only in test runs).
import { invoke } from '@tauri-apps/api/core'
import { runCalls } from '../e2e-tauri/calls-test.js'
import { send } from './ui-bridge'
import type { ReqochetApi } from '../upstream/src/shared/api'

const hook = (op: string, ...args: unknown[]): Promise<unknown> => send('__test', [op, ...args])

export async function runCallsMode(dataCount: number, mode: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 3000)) // let the start screen settle
  const api = (window as unknown as { reqochet: ReqochetApi }).reqochet
  let text: string
  try {
    const result = await runCalls(api, {
      tmp: (name: string) => hook('tmp', name),
      git: (cwd: string, args: string[]) => hook('git', cwd, args),
      write: (path: string, content: string) => hook('write', path, content),
      answer: (a: unknown) => hook('answer', a),
      dataCount,
      // partial results after every call: a hang still leaves the calls done so far
      progress: (results: unknown) => invoke('test_report', { text: JSON.stringify({ engine: 'tauri', partial: true, results }), exit: false })
    })
    const batch = await hook('batchStats').catch(() => null)
    text = JSON.stringify({ engine: 'tauri', coreMode: mode, userAgent: navigator.userAgent, batch, ...result }, null, 1)
  } catch (e) {
    text = JSON.stringify({ engine: 'tauri', crashed: `${String(e)}\n${String((e as Error)?.stack ?? '')}` })
  }
  await invoke('test_report', { text, exit: true })
}
