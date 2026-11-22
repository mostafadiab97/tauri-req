// node:fs/promises for reqochet's core, answered by the Rust commands in src-tauri/src/fsops.rs.
import { invoke } from './invoke'
import { Buffer } from 'buffer'
import { Dirent, Stats, dec, enc, encodingOf, toNodeError, type Kind } from './fsbase'
import { norm, info } from './env'
import { batched, b64, fromB64 } from './batch'

/** Bulk calls on (default) or off (REQOCHET_FS_BATCH=0, to measure the difference). */
const useBatch = (): boolean => info.env.REQOCHET_FS_BATCH !== '0'

const call = async <T>(cmd: string, args: Record<string, unknown>, path?: string): Promise<T> => {
  try {
    return await invoke<T>(cmd, args)
  } catch (e) {
    throw toNodeError(e, path)
  }
}

export async function readFile(path: string, opts?: unknown): Promise<string | Buffer> {
  const data = useBatch()
    ? new Uint8Array(fromB64(await batched<string>({ op: 'read', path: norm(String(path)) })))
    : new Uint8Array(await call<ArrayBuffer>('fs_read', { path: norm(String(path)) }, path))
  const encoding = encodingOf(opts)
  return encoding ? dec.decode(data) : Buffer.from(data.buffer, data.byteOffset, data.byteLength)
}

export async function writeFile(path: string, data: string | Uint8Array, opts?: unknown): Promise<void> {
  const flag = (typeof opts === 'object' && opts && (opts as { flag?: string }).flag) || 'w'
  const bytes = typeof data === 'string' ? enc.encode(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  if (useBatch()) return batched<void>({ op: 'write', path: norm(String(path)), data: b64(bytes), flag })
  try {
    await invoke('fs_write', bytes, { headers: { path: encodeURIComponent(norm(String(path))), flag: encodeURIComponent(flag) } })
  } catch (e) {
    throw toNodeError(e, path)
  }
}

export async function appendFile(path: string, data: string | Uint8Array): Promise<void> {
  return writeFile(path, data, { flag: 'a' })
}

export async function mkdir(path: string, opts?: { recursive?: boolean } | number): Promise<string | undefined> {
  const recursive = typeof opts === 'object' && !!opts?.recursive
  const r = useBatch() ? await batched<string | null>({ op: 'mkdir', path: norm(String(path)), recursive }) : await call<string | null>('fs_mkdir', { path: norm(String(path)), recursive }, path)
  return r ?? undefined
}

export async function readdir(path: string, opts?: { withFileTypes?: boolean } | string): Promise<string[] | Dirent[]> {
  const list = useBatch()
    ? await batched<{ name: string; kind: Kind }[]>({ op: 'readdir', path: norm(String(path)) })
    : await call<{ name: string; kind: Kind }[]>('fs_readdir', { path: norm(String(path)) }, path)
  if (typeof opts === 'object' && opts?.withFileTypes) return list.map((e) => new Dirent(e.name, e.kind, String(path)))
  return list.map((e) => e.name)
}

const statOf = async (path: string, link: boolean): Promise<Stats> => {
  const s = useBatch()
    ? await batched<{ size: number; mtimeMs: number; kind: Kind }>({ op: link ? 'lstat' : 'stat', path: norm(String(path)) })
    : await call<{ size: number; mtimeMs: number; kind: Kind }>('fs_stat', { path: norm(String(path)), link }, path)
  return new Stats(s.size, s.mtimeMs, s.kind)
}
export const stat = (path: string): Promise<Stats> => statOf(path, false)
export const lstat = (path: string): Promise<Stats> => statOf(path, true)

export async function access(path: string): Promise<void> {
  await statOf(path, false)
}

export const rename = (from: string, to: string): Promise<void> =>
  useBatch() ? batched({ op: 'rename', path: norm(String(from)), to: norm(String(to)) }) : call('fs_rename', { from: norm(String(from)), to: norm(String(to)) }, from)

export const rm = (path: string, opts?: { recursive?: boolean; force?: boolean }): Promise<void> =>
  useBatch()
    ? batched({ op: 'rm', path: norm(String(path)), recursive: !!opts?.recursive, force: !!opts?.force })
    : call('fs_rm', { path: norm(String(path)), recursive: !!opts?.recursive, force: !!opts?.force }, path)

export const unlink = (path: string): Promise<void> => call('fs_rm', { path: norm(String(path)), recursive: false, force: false }, path)

export const rmdir = (path: string): Promise<void> => call('fs_rmdir', { path: norm(String(path)) }, path)

/** mode 1 = COPYFILE_EXCL (fail when the target exists). */
export const copyFile = (from: string, to: string, mode = 0): Promise<void> =>
  call('fs_copy', { from: norm(String(from)), to: norm(String(to)), exclusive: (mode & 1) === 1 }, from)

export const cp = (from: string, to: string, opts?: { force?: boolean }): Promise<void> =>
  call('fs_cp', { from: norm(String(from)), to: norm(String(to)), force: opts?.force !== false }, from)

export const mkdtemp = async (prefix: string): Promise<string> => norm(await call<string>('fs_mkdtemp', { prefix: norm(String(prefix)) }, prefix))

export const constants = { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1, COPYFILE_EXCL: 1, COPYFILE_FICLONE: 2 }

export default { readFile, writeFile, appendFile, mkdir, readdir, stat, lstat, access, rename, rm, unlink, rmdir, copyFile, cp, mkdtemp, constants }
