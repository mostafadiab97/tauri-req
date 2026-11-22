// Runs the shared calls test (tauri/e2e/calls-test.js) inside the screens' web view, through window.reqochet.
// Setting up repositories and answering dialogs goes to the core's test hook ('__test', only in test runs).
import { invoke } from '@tauri-apps/api/core'
import { runCalls } from '../e2e/calls-test.js'
import { send } from './ui-bridge'
import type { ReqochetApi } from '../../src/shared/api'

const hook = (op: string, ...args: unknown[]): Promise<unknown> => send('__test', [op, ...args])

/**
 * The owner's security condition: the screens' page must not reach files, Git or processes. Each check passes when
 * the page is REFUSED. (The page may connect to the core's address — index.html allows it — so it is Rust that refuses.)
 */
async function screensAreRefused(): Promise<{ name: string; ok: boolean; ms: number; note: string }[]> {
  const base = navigator.userAgent.includes('Windows') ? 'http://rqcore.localhost/' : 'rqcore://localhost/'
  const out: { name: string; ok: boolean; ms: number; note: string }[] = []
  // passes only on the refusal it expects: Rust's 403 for the channel, "command not found" for removed commands
  const check = async (name: string, attempt: () => Promise<string>, expect: RegExp = /^refused 403$/): Promise<void> => {
    let note: string
    try {
      note = await attempt()
    } catch (e) {
      note = `error: ${String((e as Error)?.message ?? e).slice(0, 120)}`
    }
    const ok = expect.test(note)
    out.push({ name: `security:${name}`, ok, ms: 0, note })
  }
  const status = async (r: Promise<Response>): Promise<string> => {
    const res = await r
    return res.status === 403 ? 'refused 403' : `ALLOWED ${res.status}`
  }
  const victim = navigator.userAgent.includes('Windows') ? 'C:/Windows/win.ini' : '/etc/hostname'
  // the old Tauri commands for files and Git no longer exist
  const gone = /^error: .*(not found|not allowed|denied)/i
  await check('invoke fs_read', async () => `ALLOWED ${String(await invoke('fs_read', { path: victim }))}`.slice(0, 80), gone)
  await check('invoke proc_run', async () => `ALLOWED ${JSON.stringify(await invoke('proc_run', { req: { file: 'git', args: ['--version'] } }))}`.slice(0, 80), gone)
  // the core's channel: no key, a wrong key, a second claim
  await check('core channel without key', () => status(fetch(`${base}read?path=${encodeURIComponent(victim)}`, { method: 'POST' })))
  await check('core channel with a wrong key', () => status(fetch(`${base}read?k=${'0'.repeat(64)}&path=${encodeURIComponent(victim)}`, { method: 'POST' })))
  await check('core channel: run git without key', () => status(fetch(`${base}run`, { method: 'POST', body: JSON.stringify({ file: 'git', args: ['--version'] }) })))
  await check('second key claim', () => status(fetch(`${base}claim`, { method: 'POST' })))
  await check('synchronous channel without key', async () => {
    const x = new XMLHttpRequest()
    x.open('POST', `${base}sync`, false)
    x.send(JSON.stringify({ op: 'read', path: victim }))
    return x.status === 403 ? 'refused 403' : `ALLOWED ${x.status}`
  })
  return out
}

export async function runCallsMode(dataCount: number, onlyData = false): Promise<void> {
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
      onlyData,
      // partial results after every call: a hang still leaves the calls done so far
      progress: (results: unknown) => invoke('test_report', { text: JSON.stringify({ engine: 'tauri', partial: true, results }), exit: false })
    })
    const batch = await hook('batchStats').catch(() => null)
    // the security checks count with the calls (each must be refused)
    if (!onlyData) result.results.push(...(await screensAreRefused()))
    text = JSON.stringify({ engine: 'tauri', coreMode: 'worker', userAgent: navigator.userAgent, batch, ...result }, null, 1)
  } catch (e) {
    text = JSON.stringify({ engine: 'tauri', crashed: `${String(e)}\n${String((e as Error)?.stack ?? '')}` })
  }
  await invoke('test_report', { text, exit: true })
}
