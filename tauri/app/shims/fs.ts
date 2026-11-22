// node:fs for reqochet's core: the synchronous calls (few: existsSync, mkdirSync, the log file) and fs.watch.
import { coreJson } from './core'
import { EventEmitter } from 'events'
import { Buffer } from 'buffer'
import * as promisesApi from './fs-promises'
import { Dirent, Stats, encodingOf, syncCall, type Kind } from './fsbase'
import { norm, watchListeners } from './env'

export const promises = promisesApi
export const constants = promisesApi.constants

export const existsSync = (path: string): boolean => {
  try {
    return syncCall<boolean>({ op: 'exists', path: norm(String(path)) })
  } catch {
    return false
  }
}

export function readFileSync(path: string, opts?: unknown): string | Buffer {
  const encoding = encodingOf(opts)
  const r = syncCall<string>({ op: 'read', path: norm(String(path)), b64: !encoding })
  return encoding ? r : Buffer.from(r, 'base64')
}

const toData = (data: string | Uint8Array): { data: string; b64: boolean } =>
  typeof data === 'string' ? { data, b64: false } : { data: Buffer.from(data).toString('base64'), b64: true }

export const writeFileSync = (path: string, data: string | Uint8Array): void => void syncCall({ op: 'write', path: norm(String(path)), ...toData(data) })
export const appendFileSync = (path: string, data: string | Uint8Array): void => void syncCall({ op: 'append', path: norm(String(path)), ...toData(data) })
export const mkdirSync = (path: string, opts?: { recursive?: boolean }): string | undefined =>
  syncCall<string | null>({ op: 'mkdir', path: norm(String(path)), flag: !!opts?.recursive }) ?? undefined
export function readdirSync(path: string, opts?: { withFileTypes?: boolean }): string[] | Dirent[] {
  const list = syncCall<{ name: string; kind: Kind }[]>({ op: 'readdir', path: norm(String(path)) })
  return opts?.withFileTypes ? list.map((e) => new Dirent(e.name, e.kind, String(path))) : list.map((e) => e.name)
}
export function statSync(path: string, opts?: { throwIfNoEntry?: boolean }): Stats | undefined {
  try {
    const s = syncCall<{ size: number; mtimeMs: number; kind: Kind }>({ op: 'stat', path: norm(String(path)) })
    return new Stats(s.size, s.mtimeMs, s.kind)
  } catch (e) {
    if (opts?.throwIfNoEntry === false && (e as { code?: string }).code === 'ENOENT') return undefined
    throw e
  }
}
export const renameSync = (from: string, to: string): void => void syncCall({ op: 'rename', path: norm(String(from)), to: norm(String(to)) })
export const rmSync = (path: string, opts?: { recursive?: boolean; force?: boolean }): void => {
  try {
    syncCall({ op: 'rm', path: norm(String(path)), flag: !!opts?.recursive })
  } catch (e) {
    if (!opts?.force) throw e
  }
}
export const unlinkSync = (path: string): void => rmSync(path)
export const mkdtempSync = (prefix: string): string => norm(syncCall<string>({ op: 'mkdtemp', path: norm(String(prefix)) }))

let nextWatch = 1
/** fs.watch on one folder: changes arrive from Rust (notify) as { event, name }. */
export function watch(dir: string, _opts: unknown, listener?: (event: string, name: string | null) => void): EventEmitter & { close(): void } {
  const id = nextWatch++
  const w = new EventEmitter() as EventEmitter & { close(): void }
  let closed = false
  watchListeners.set(id, (p) => {
    if (closed) return
    if (p.event === 'error') w.emit('error', new Error('folder watch failed'))
    else listener?.(p.event, p.name)
  })
  coreJson('watch_start', { id, path: norm(String(dir)) }).catch((e) => w.emit('error', e))
  w.close = () => {
    closed = true
    watchListeners.delete(id)
    void coreJson('watch_stop', { id }).catch(() => {})
  }
  return w
}

export type FSWatcher = ReturnType<typeof watch>

export default { promises, constants, existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, statSync, renameSync, rmSync, unlinkSync, mkdtempSync, watch }
