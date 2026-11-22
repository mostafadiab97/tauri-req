// Window-level things the core (a worker) asks the screens' page to do with Tauri: dialogs, links, restart, updater.
// Runs in the screens' page (ui-bridge.ts answers the worker's 'host' messages with these).
import type { MessageOpts, OpenOpts, SaveOpts } from './shims/host'

export const hostOps = {
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
    await pendingUpdate?.download((ev: { event: string; data: { contentLength?: number } }) => {
      if (ev.event === 'Started') total = ev.data.contentLength ?? 0
    })
    return total
  },
  // Restart after an update (step 3): on Windows the installer ends this app, installs, and starts the new version
  // itself (Tauri's installer gets "/R" in passive and quiet mode). It starts it like Explorer does — with a fresh
  // environment and the same command-line arguments — so settings must never depend on environment variables.
  updaterInstall: async () => {
    await pendingUpdate?.install()
  }
}



// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pendingUpdate: any = null
