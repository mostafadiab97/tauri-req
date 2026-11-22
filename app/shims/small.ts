// node:crypto, node:os and node:path for reqochet's core (no Node in a web view).
import { sha1 } from '@noble/hashes/sha1'
import { sha256, sha224 } from '@noble/hashes/sha256'
import { sha512, sha384 } from '@noble/hashes/sha512'
import { md5 } from '@noble/hashes/legacy'
import { Buffer } from 'buffer'
import { info } from './env'

// ---------- crypto
const ALGOS = { sha1, sha256, sha224, sha512, sha384, md5 } as const
class Hash {
  private h
  constructor(algo: string) {
    const f = ALGOS[algo.toLowerCase().replace('-', '') as keyof typeof ALGOS]
    if (!f) throw new Error(`Digest method not supported: ${algo}`)
    this.h = f.create()
  }
  update(data: string | Uint8Array, encoding?: string): this {
    this.h.update(typeof data === 'string' ? Buffer.from(data, (encoding ?? 'utf8') as BufferEncoding) : data)
    return this
  }
  digest(encoding?: string): string | Buffer {
    const out = Buffer.from(this.h.digest())
    return encoding ? out.toString(encoding as BufferEncoding) : out
  }
}
export const createHash = (algo: string): Hash => new Hash(algo)
export const randomBytes = (n: number): Buffer => Buffer.from(crypto.getRandomValues(new Uint8Array(n)))
export function randomInt(a: number, b?: number): number {
  const [min, max] = b === undefined ? [0, a] : [a, b]
  const range = max - min
  const limit = Math.floor(0x100000000 / range) * range
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf)
  while ((buf[0] as number) >= limit)
  return min + ((buf[0] as number) % range)
}
export const randomUUID = (): string => crypto.randomUUID()
export const cryptoModule = { createHash, randomBytes, randomInt, randomUUID }

// ---------- os
export const tmpdir = (): string => (info.paths.temp ?? '').replace(/[\\/]$/, '')
export const homedir = (): string => info.paths.home ?? ''
export const platform = (): string => info.platform
export const arch = (): string => info.arch
export const EOL = navigator.userAgent.includes('Windows') ? '\r\n' : '\n'
export const hostname = (): string => 'localhost'
export const userInfo = (): { username: string; homedir: string } => ({ username: info.env.USERNAME ?? info.env.USER ?? '', homedir: homedir() })
export const osModule = { tmpdir, homedir, platform, arch, EOL, hostname, userInfo }
