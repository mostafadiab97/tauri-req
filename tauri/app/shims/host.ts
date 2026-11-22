// Things only a page with the Tauri bridge can do (dialogs, opening links, restarting, the updater): the core is a
// worker, so it asks the screens' page (host-ops.ts) — and tells the screens things (Electron's webContents.send).
import { hostCall, post } from '../transport'
import type { hostOps } from '../host-ops'

type DialogFilter = { name: string; extensions: string[] }
export interface OpenOpts { title?: string; defaultPath?: string; filters?: DialogFilter[]; directory?: boolean; multiple?: boolean }
export interface SaveOpts { title?: string; defaultPath?: string; filters?: DialogFilter[] }
export interface MessageOpts { title?: string; kind?: 'info' | 'warning' | 'error'; okLabel?: string; cancelLabel?: string; buttons?: { yes: string; no: string; cancel: string } }
export type HostOps = typeof hostOps

export function host<K extends keyof HostOps>(op: K, ...args: Parameters<HostOps[K]>): Promise<Awaited<ReturnType<HostOps[K]>>> {
  return hostCall(op, args)
}

/** A message to the screens (Electron's webContents.send). */
export function pushToScreens(channel: string, args: unknown[]): void {
  post({ type: 'push', channel, args })
}
