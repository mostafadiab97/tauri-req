// Every Rust call of the core goes through here: when one is still unanswered after 10 s, the core log gets a line
// with all calls still waiting (to find a stall without a debugger).
import { invoke as tauriInvoke, type InvokeArgs, type InvokeOptions } from '@tauri-apps/api/core'

const waiting = new Map<number, { cmd: string; since: number }>()
let next = 1

export async function invoke<T>(cmd: string, args?: InvokeArgs, options?: InvokeOptions): Promise<T> {
  const id = next++
  waiting.set(id, { cmd, since: Date.now() })
  const timer = setTimeout(() => {
    const log = (globalThis as { __rqLog?: { warn(m: string): void } }).__rqLog
    const list = [...waiting.values()].map((w) => `${w.cmd} ${Math.round((Date.now() - w.since) / 1000)}s`).join(', ')
    log?.warn(`Slow Rust call: ${cmd} (waiting: ${list})`)
  }, 10_000)
  try {
    return await tauriInvoke<T>(cmd, args, options)
  } finally {
    clearTimeout(timer)
    waiting.delete(id)
  }
}
