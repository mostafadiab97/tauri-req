// node:child_process for reqochet's core: execFile and spawn, answered by Rust (src-tauri/src/procs.rs), which starts
// only `git`. Standard input is collected first and handed over whole — the core always writes it at once.
import { invoke } from '@tauri-apps/api/core'
import { EventEmitter } from 'events'
import { Buffer } from 'buffer'
import { norm } from './env'

interface RunRes {
  code: number | null
  stdout: string
  stderr: string
  killed: boolean
  too_much: boolean
  spawn_error: string | null
}

interface Opts {
  cwd?: string
  env?: Record<string, string | undefined>
  timeout?: number
  maxBuffer?: number
  encoding?: string
}

const run = (file: string, args: string[], o: Opts, input: Uint8Array | null): Promise<RunRes> =>
  invoke<RunRes>('proc_run', {
    req: {
      file,
      args: args.map(String),
      cwd: o.cwd ? norm(o.cwd) : null,
      env: Object.fromEntries(Object.entries(o.env ?? {}).filter(([, v]) => v !== undefined)) as Record<string, string>,
      input: input ? Buffer.from(input).toString('base64') : null,
      timeout_ms: o.timeout ?? null,
      max_buffer: o.maxBuffer ?? null
    }
  })

class Stdin extends EventEmitter {
  chunks: Uint8Array[] = []
  ended = false
  constructor(private onEnd: () => void) {
    super()
  }
  write(data: string | Uint8Array): boolean {
    if (!this.ended) this.chunks.push(typeof data === 'string' ? Buffer.from(data, 'utf8') : data)
    return true
  }
  end(data?: string | Uint8Array): void {
    if (this.ended) return
    if (data !== undefined) this.write(data)
    this.ended = true
    this.onEnd()
  }
  get data(): Uint8Array | null {
    return this.chunks.length ? Buffer.concat(this.chunks) : null
  }
}

type Cb = (error: (Error & Record<string, unknown>) | null, stdout: string, stderr: string) => void

export function execFile(file: string, args: string[] = [], opts: Opts | Cb = {}, cb?: Cb): EventEmitter & { stdin: Stdin; kill(): void } {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  const o = opts
  const child = new EventEmitter() as EventEmitter & { stdin: Stdin; kill(): void }
  let started = false
  const start = (): void => {
    if (started) return
    started = true
    run(file, args, o, child.stdin.data).then(
      (r) => {
        const stdout = Buffer.from(r.stdout, 'base64').toString('utf8')
        const stderr = Buffer.from(r.stderr, 'base64').toString('utf8')
        if (r.spawn_error) {
          const e = Object.assign(new Error(r.spawn_error), { code: /ENOENT/.test(r.spawn_error) ? 'ENOENT' : 'EACCES', errno: -2, syscall: `spawn ${file}`, path: file })
          child.emit('error', e)
          return cb?.(e, '', '')
        }
        let error: (Error & Record<string, unknown>) | null = null
        if (r.too_much) error = Object.assign(new Error('stdout maxBuffer length exceeded'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' })
        else if (r.killed) error = Object.assign(new Error(`Command failed: ${file} ${args.join(' ')}`), { killed: true, signal: 'SIGTERM', code: null })
        else if (r.code !== 0) error = Object.assign(new Error(`Command failed: ${file} ${args.join(' ')}\n${stderr}`), { code: r.code, killed: false, signal: null })
        child.emit('exit', r.code)
        child.emit('close', r.code)
        cb?.(error, stdout, stderr)
      },
      (e) => cb?.(Object.assign(new Error(String((e as { message?: string })?.message ?? e)), {}), '', '')
    )
  }
  child.stdin = new Stdin(start)
  child.kill = () => {}
  // execFile's caller writes input right after the call (same turn); then the process starts
  queueMicrotask(start)
  return child
}

/** spawn: output arrives as one 'data' chunk when the process has finished. */
export function spawn(file: string, args: string[] = [], opts: Opts = {}): EventEmitter & { stdin: Stdin; stdout: EventEmitter; stderr: EventEmitter; kill(): void; pid: number } {
  const child = new EventEmitter() as EventEmitter & { stdin: Stdin; stdout: EventEmitter; stderr: EventEmitter; kill(): void; pid: number }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.pid = 0
  let started = false
  const start = (): void => {
    if (started) return
    started = true
    run(file, args, opts, child.stdin.data).then(
      (r) => {
        if (r.spawn_error) {
          child.emit('error', Object.assign(new Error(r.spawn_error), { code: 'ENOENT' }))
          return
        }
        const out = Buffer.from(r.stdout, 'base64')
        const err = Buffer.from(r.stderr, 'base64')
        if (out.length) child.stdout.emit('data', out)
        if (err.length) child.stderr.emit('data', err)
        child.stdout.emit('end')
        child.emit('exit', r.code, r.killed ? 'SIGTERM' : null)
        child.emit('close', r.code, r.killed ? 'SIGTERM' : null)
      },
      (e) => child.emit('error', e)
    )
  }
  child.stdin = new Stdin(start)
  child.kill = () => {}
  // spawn's input is written right after the call (git cat-file --batch): start after this turn with what was written
  queueMicrotask(start)
  return child
}

export function execFileSync(): never {
  throw new Error('execFileSync is not available in the Tauri core')
}

export default { execFile, spawn, execFileSync }
