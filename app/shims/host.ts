// Things only a page with the Tauri bridge can do (dialogs, opening links, restarting, telling the screens):
// done directly in the core window, or asked of the screens' page when the core is a Web Worker.
import { emitTo } from '@tauri-apps/api/event'
import { inWorker, hostCall, post } from '../transport'

type DialogFilter = { name: string; extensions: string[] }
export interface OpenOpts { title?: string; defaultPath?: string; filters?: DialogFilter[]; directory?: boolean; multiple?: boolean }
export interface SaveOpts { title?: string; defaultPath?: string; filters?: DialogFilter[] }
export interface MessageOpts { title?: string; kind?: 'info' | 'warning' | 'error'; okLabel?: string; cancelLabel?: string; buttons?: { yes: string; no: string; cancel: string } }

const direct = {
  dialogOpen: async (o: OpenOpts) => (await import('@tauri-apps/plugin-dialog')).open(o),
  dialogSave: async (o: SaveOpts) => (await import('@tauri-apps/plugin-dialog')).save(o),
  dialogMessage: async (text: string, o: MessageOpts) => (await import('@tauri-apps/plugin-dialog')).message(text, o as never),
  dialogAsk: async (text: string, o: MessageOpts) => (await import('@tauri-apps/plugin-dialog')).ask(text, o as never),
  openUrl: async (url: string) => (await import('@tauri-apps/plugin-opener')).openUrl(url),
  relaunch: async () => (await import('@tauri-apps/plugin-process')).relaunch(),
  // updater (worker mode: the screens' page keeps the update object between the calls)
  updaterCheck: async () => {
    const u = await (await import('@tauri-apps/plugin-updater')).check()
    pendingUpdate = u
    return u ? { version: u.version, date: u.date ?? '', body: u.body ?? '' } : null
  },
  updaterDownload: async () => {
    let total = 0
    await pendingUpdate?.download((ev) => {
      if (ev.event === 'Started') total = ev.data.contentLength ?? 0
    })
    return total
  },
  updaterInstall: async () => {
    await pendingUpdate?.install()
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pendingUpdate: any = null
export type HostOps = typeof direct
export const hostOps = direct

export function host<K extends keyof HostOps>(op: K, ...args: Parameters<HostOps[K]>): ReturnType<HostOps[K]> {
  if (inWorker) return hostCall(op, args) as ReturnType<HostOps[K]>
  return (direct[op] as (...a: unknown[]) => ReturnType<HostOps[K]>)(...args)
}

/** A message to the screens (Electron's webContents.send). */
export function pushToScreens(channel: string, args: unknown[]): void {
  if (inWorker) post({ type: 'push', channel, args })
  else void emitTo('main', 'push', { channel, args })
}
