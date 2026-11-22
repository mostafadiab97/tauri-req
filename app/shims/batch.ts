// Bulk Rust calls without changing reqochet's core: file calls the core has in flight at the same time (it reads a
// folder's files many at once and the data test writes all items at once) are gathered for one turn of the event
// loop and sent to Rust as one `fs_batch` call, which runs them on several threads (as Node's thread pool did).
import { Buffer } from 'buffer'
import { invoke } from './invoke'
import { toNodeError } from './fsbase'

export interface BatchOp {
  op: 'read' | 'write' | 'stat' | 'lstat' | 'readdir' | 'rename' | 'rm' | 'mkdir'
  path: string
  to?: string
  data?: string
  flag?: string
  recursive?: boolean
  force?: boolean
}

let queue: { op: BatchOp; resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = []
let scheduled = false
export const batchStats = { calls: 0, ops: 0 }

const flush = async (): Promise<void> => {
  scheduled = false
  const items = queue
  queue = []
  for (let i = 0; i < items.length; i += 2000) {
    const part = items.slice(i, i + 2000)
    batchStats.calls++
    batchStats.ops += part.length
    try {
      const res = await invoke<({ ok: unknown } | { err: { code: string; message: string } })[]>('fs_batch', { ops: part.map((p) => p.op) })
      res.forEach((r, j) => {
        const it = part[j]
        if (!it) return
        if ('err' in r) it.reject(toNodeError(r.err, it.op.path))
        else it.resolve(r.ok)
      })
    } catch (e) {
      for (const it of part) it.reject(toNodeError(e, it.op.path))
    }
  }
}

export function batched<T>(op: BatchOp): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ op, resolve: resolve as (v: unknown) => void, reject })
    if (!scheduled) {
      scheduled = true
      // after this turn's microtasks: every call issued "together" is in the queue
      ;(globalThis as unknown as { setImmediate(f: () => void): void }).setImmediate(() => void flush())
    }
  })
}

export const b64 = (data: Uint8Array): string => Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64')
export const fromB64 = (s: string): Buffer => Buffer.from(s, 'base64')
