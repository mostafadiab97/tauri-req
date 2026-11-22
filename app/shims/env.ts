// Start-up for the core web view: what Node gave reqochet's core for free (process, Buffer, paths, SQLite) is set up
// here once, before any reqochet module is loaded (they read process.platform when they load).
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Buffer } from 'buffer'
import sqliteInit from '@sqlite.org/sqlite-wasm'

export interface Info {
  name: string
  version: string
  platform: string
  arch: string
  packaged: boolean
  pid: number
  env: Record<string, string>
  args: string[]
  paths: Record<string, string>
  test_out: string | null
  test: string | null
}

export let info: Info
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let sqlite3: any

/** Windows paths are kept with forward slashes inside the core (pathe); Windows accepts both. */
export const norm = (p: string): string => (info?.platform === 'win32' ? p.replace(/\\/g, '/') : p)

type Listener = (payload: { id: number; event: string; name: string | null }) => void
export const watchListeners = new Map<number, Listener>()

export async function initEnv(): Promise<void> {
  info = await invoke<Info>('app_info')
  for (const k of Object.keys(info.paths)) info.paths[k] = norm(info.paths[k] as string)
  const g = globalThis as Record<string, unknown>
  g.global = globalThis
  g.Buffer = Buffer
  // setImmediate on a message channel: timers in a hidden web view are slowed down (JSZip runs every step on it)
  const tasks = new Map<number, () => void>()
  let nextTask = 1
  const channel = new MessageChannel()
  channel.port1.onmessage = (e: MessageEvent<number>) => {
    const run = tasks.get(e.data)
    tasks.delete(e.data)
    run?.()
  }
  g.setImmediate = (fn: (...a: unknown[]) => void, ...args: unknown[]) => {
    const id = nextTask++
    tasks.set(id, () => fn(...args))
    channel.port2.postMessage(id)
    return id
  }
  g.clearImmediate = (id: number) => void tasks.delete(id)
  const chrome = /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? ''
  const noop = (): unknown => g.process
  g.process = {
    platform: info.platform,
    arch: info.arch,
    env: { ...info.env },
    argv: info.args,
    pid: info.pid,
    execPath: info.paths.exe,
    resourcesPath: info.paths.resources,
    versions: { node: '', electron: '', chrome, tauri: '2' },
    cwd: () => info.paths.home,
    getSystemVersion: () => (/Windows NT ([\d.]+)/.exec(navigator.userAgent)?.[1] ?? ''),
    nextTick: (fn: (...a: unknown[]) => void, ...args: unknown[]) => queueMicrotask(() => fn(...args)),
    on: noop,
    once: noop,
    off: noop,
    emitWarning: () => {},
    exit: (code = 0) => void invoke('app_exit', { code })
  }
  sqlite3 = await sqliteInit({ print: () => {}, printErr: () => {} })
  await listen<Parameters<Listener>[0]>('fswatch', (e) => watchListeners.get(e.payload.id)?.(e.payload))
}
