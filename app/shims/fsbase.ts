// Shared parts of the fs shims: errors with Node's codes, Stats and Dirent, the synchronous channel.
import { info } from './env'

export interface RustErr {
  code: string
  message: string
}

export function toNodeError(e: unknown, path?: string): Error & { code?: string; path?: string } {
  if (e instanceof Error) return e
  const r = (typeof e === 'string' ? { code: 'EIO', message: e } : e) as RustErr
  const err = new Error(r?.message ?? String(e)) as Error & { code?: string; path?: string; errno?: number; syscall?: string }
  err.code = r?.code ?? 'EIO'
  if (path) err.path = path
  return err
}

export type Kind = 'file' | 'dir' | 'symlink' | 'other'

export class Stats {
  constructor(
    public size: number,
    public mtimeMs: number,
    private kind: Kind
  ) {}
  get mtime(): Date {
    return new Date(this.mtimeMs)
  }
  get ctimeMs(): number {
    return this.mtimeMs
  }
  get birthtimeMs(): number {
    return this.mtimeMs
  }
  isFile(): boolean {
    return this.kind === 'file'
  }
  isDirectory(): boolean {
    return this.kind === 'dir'
  }
  isSymbolicLink(): boolean {
    return this.kind === 'symlink'
  }
}

export class Dirent {
  constructor(
    public name: string,
    private kind: Kind,
    public parentPath = ''
  ) {}
  isFile(): boolean {
    return this.kind === 'file'
  }
  isDirectory(): boolean {
    return this.kind === 'dir'
  }
  isSymbolicLink(): boolean {
    return this.kind === 'symlink'
  }
}

export const enc = new TextEncoder()
export const dec = new TextDecoder()

export const encodingOf = (opts: unknown): string | undefined =>
  typeof opts === 'string' ? opts : ((opts as { encoding?: string } | undefined)?.encoding ?? undefined)

/** The few synchronous calls go over a synchronous request to the app's own protocol (no Node in a web view). */
export function syncCall<T>(req: Record<string, unknown>): T {
  const url = info.platform === 'win32' ? 'http://rqsync.localhost/' : 'rqsync://localhost/'
  const x = new XMLHttpRequest()
  x.open('POST', url, false)
  x.setRequestHeader('Content-Type', 'text/plain')
  x.send(JSON.stringify(req))
  const r = JSON.parse(x.responseText) as { ok?: T; err?: RustErr }
  if (r.err) throw toNodeError(r.err, String(req.path ?? ''))
  return r.ok as T
}
