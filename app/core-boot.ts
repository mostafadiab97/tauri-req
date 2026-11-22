// What src/main/index.ts does in Electron, for Tauri: paths, services, the call handlers (src/main/ipc.ts, unchanged),
// updates. Window handling is Rust's (src-tauri/src/lib.rs).
import { emitTo, listen } from '@tauri-apps/api/event'
import { join } from 'pathe'
import { createServices, type Paths } from '../upstream/src/main/composition'
import { registerIpc } from '../upstream/src/main/ipc'
import { removeStalePdfFolders } from '../upstream/src/main/pdf'
import { Channels } from '../upstream/src/shared/api'
import { handlers, listeners, mainSender } from './shims/electron'
import { info } from './shims/env'

const paths: Paths = {
  configDir: join(info.paths.resources as string, 'config'),
  resourceDir: join(info.paths.resources as string, 'resources'),
  logDir: info.paths.logs as string,
  userDir: info.paths.userData as string,
  packaged: info.packaged
}

void removeStalePdfFolders()
const services = createServices(paths, info.version)
const { log } = services
log.info(`${info.name} ${info.version} starting — ${info.platform} ${info.arch}, Tauri, ${navigator.userAgent}, packaged=${info.packaged}`)
log.info(`Config folder: ${paths.configDir}`)
addEventListener('error', (e) => log.error('Unexpected error in core', e.error))
addEventListener('unhandledrejection', (e) => log.error('Unhandled promise rejection in core', e.reason))

registerIpc(services, paths)

const event = { sender: mainSender }
interface Rpc {
  id: number
  channel: string
  args: unknown[]
}
await listen<Rpc>('rpc', async ({ payload: { id, channel, args } }) => {
  const handler = handlers.get(channel)
  if (info.test === 'calls' && channel !== '__test') log.info(`Calls test: ${channel}`)
  if (!handler) {
    for (const l of listeners.get(channel) ?? []) l(event, ...args)
    return
  }
  try {
    const value = await handler(event, ...args)
    await emitTo('main', 'rpc-reply', { id, ok: true, value: value === undefined ? null : value })
  } catch (e) {
    // the same text Electron puts on an error that crosses the bridge (the screens strip this prefix)
    const msg = `Error invoking remote method '${channel}': ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`
    await emitTo('main', 'rpc-reply', { id, ok: false, error: msg })
  }
})
await listen('ui-hello', () => void emitTo('main', 'core-ready', {}))
await emitTo('main', 'core-ready', {})

services.updater.start((status) => {
  log.info(`Update status: ${JSON.stringify(status)}`)
  mainSender.send(Channels.updateStatusChanged, status)
})

// test hooks (only with REQOCHET_TEST set): the calls test's helper; the e2e harness answers dialogs through
// window.__electron (as it did through Electron's main process)
if (info.test) {
  ;(globalThis as Record<string, unknown>).__electron = await import('./shims/electron')
  if (info.test === 'calls') (await import('./test-hook')).registerTestHook()
}
if (info.test === 'update') void import('./update-test').then((m) => m.runUpdateTest(services, log))
