// The parts of Electron's main-process API that reqochet's core uses (src/main/ipc.ts, pdf.ts, windowIcon.ts,
// closeForInstall.ts, the updater), answered by Tauri. ipcMain only collects the handlers; core-main.ts serves them.
import { invoke } from '@tauri-apps/api/core'
import { emitTo } from '@tauri-apps/api/event'
import * as dlg from '@tauri-apps/plugin-dialog'
import * as opener from '@tauri-apps/plugin-opener'
import { relaunch } from '@tauri-apps/plugin-process'
import { Buffer } from 'buffer'
import { info, norm } from './env'

type Handler = (e: unknown, ...args: unknown[]) => unknown
export const handlers = new Map<string, Handler>()
export const listeners = new Map<string, Handler[]>()

export const ipcMain = {
  handle: (channel: string, fn: Handler) => void handlers.set(channel, fn),
  removeHandler: (channel: string) => void handlers.delete(channel),
  on: (channel: string, fn: Handler) => void listeners.set(channel, [...(listeners.get(channel) ?? []), fn])
}

const noop = (): void => {}

/** The screens' window, as the core sees it (Electron's BrowserWindow for the main window). */
const mainWebContents = {
  id: 1,
  send: (channel: string, ...args: unknown[]) => void emitTo('main', 'push', { channel, args }),
  on: noop,
  once: noop,
  removeListener: noop,
  getURL: () => '',
  isDestroyed: () => false
}
const mainWindow = {
  id: 1,
  webContents: mainWebContents,
  isDestroyed: () => false,
  isMinimized: () => false,
  close: () => void invoke('app_exit', { code: 0 }),
  destroy: () => void invoke('app_exit', { code: 0 }),
  show: () => void invoke('show_main'),
  focus: noop,
  restore: noop,
  once: noop,
  on: noop,
  removeListener: noop,
  setIcon: noop, // the window icon follows the installer's icon in this proof
  setTitle: noop
}
export const mainSender = mainWebContents

/** Hidden windows that print an HTML file to PDF (src/main/pdf.ts) — the printing itself is Rust (pdf.rs). */
class PrintWindow {
  private file = ''
  private destroyed = false
  webContents = {
    on: noop,
    setWindowOpenHandler: noop,
    printToPDF: async (o: {
      pageSize?: string
      printBackground?: boolean
      displayHeaderFooter?: boolean
      headerTemplate?: string
      footerTemplate?: string
      margins?: { top?: number; bottom?: number; left?: number; right?: number }
      landscape?: boolean
    }): Promise<Buffer> => {
      const options = {
        paperWidth: 8.27,
        paperHeight: 11.69,
        landscape: !!o.landscape,
        printBackground: !!o.printBackground,
        displayHeaderFooter: !!o.displayHeaderFooter,
        headerTemplate: o.headerTemplate ?? '',
        footerTemplate: o.footerTemplate ?? '',
        marginTop: o.margins?.top ?? 0.4,
        marginBottom: o.margins?.bottom ?? 0.4,
        marginLeft: o.margins?.left ?? 0.4,
        marginRight: o.margins?.right ?? 0.4,
        preferCSSPageSize: false
      }
      try {
        return Buffer.from(await invoke<ArrayBuffer>('pdf_print', { file: this.file, options }))
      } catch (e) {
        throw new Error((e as { message?: string })?.message ?? String(e))
      }
    }
  }
  constructor(_opts?: unknown) {}
  async loadFile(file: string): Promise<void> {
    this.file = file.replace(/\//g, info.platform === 'win32' ? '\\' : '/')
  }
  isDestroyed(): boolean {
    return this.destroyed
  }
  destroy(): void {
    this.destroyed = true
  }
  static fromWebContents(): typeof mainWindow {
    return mainWindow
  }
  static getAllWindows(): (typeof mainWindow)[] {
    return [mainWindow]
  }
  static getFocusedWindow(): typeof mainWindow {
    return mainWindow
  }
}
export const BrowserWindow = PrintWindow

export const app = {
  getName: () => info.name,
  getVersion: () => info.version,
  getPath: (name: string) => info.paths[name] ?? info.paths.userData,
  getAppPath: () => info.paths.resources,
  getLocale: () => navigator.language,
  get isPackaged() {
    return info.packaged
  },
  quit: () => void invoke('app_exit', { code: 0 }),
  exit: (code = 0) => void invoke('app_exit', { code }),
  relaunch: () => void relaunch(),
  on: noop,
  once: noop,
  whenReady: () => Promise.resolve(),
  requestSingleInstanceLock: () => true
}

type Filter = { name: string; extensions: string[] }
const filtersOf = (f?: Filter[]): Filter[] | undefined => f?.map((x) => ({ name: x.name, extensions: x.extensions }))
const lastArg = <T>(a: unknown, b: unknown): T => (b === undefined ? a : b) as T

/** Native dialogs (tauri-plugin-dialog). The e2e harness replaces these functions, as it did in Electron. */
export const dialog = {
  async showOpenDialog(a: unknown, b?: unknown): Promise<{ canceled: boolean; filePaths: string[] }> {
    const o = lastArg<{ title?: string; defaultPath?: string; filters?: Filter[]; properties?: string[] }>(a, b)
    const r = await dlg.open({
      title: o.title,
      defaultPath: o.defaultPath,
      filters: filtersOf(o.filters),
      directory: !!o.properties?.includes('openDirectory'),
      multiple: !!o.properties?.includes('multiSelections')
    })
    const paths = r === null ? [] : Array.isArray(r) ? r : [r]
    return { canceled: paths.length === 0, filePaths: paths.map(norm) }
  },
  async showSaveDialog(a: unknown, b?: unknown): Promise<{ canceled: boolean; filePath?: string }> {
    const o = lastArg<{ title?: string; defaultPath?: string; filters?: Filter[] }>(a, b)
    const r = await dlg.save({ title: o.title, defaultPath: o.defaultPath, filters: filtersOf(o.filters) })
    return r ? { canceled: false, filePath: norm(r) } : { canceled: true }
  },
  async showMessageBox(a: unknown, b?: unknown): Promise<{ response: number; checkboxChecked: boolean }> {
    const o = lastArg<{ type?: string; buttons?: string[]; cancelId?: number; title?: string; message: string; detail?: string }>(a, b)
    const text = o.detail ? `${o.message}\n\n${o.detail}` : o.message
    const kind = o.type === 'error' ? 'error' : o.type === 'warning' ? 'warning' : 'info'
    const buttons = o.buttons ?? ['OK']
    if (buttons.length <= 1) {
      await dlg.message(text, { title: o.title, kind, okLabel: buttons[0] })
      return { response: 0, checkboxChecked: false }
    }
    if (buttons.length === 2) {
      const yes = await dlg.ask(text, { title: o.title, kind, okLabel: buttons[0], cancelLabel: buttons[1] })
      return { response: yes ? 0 : 1, checkboxChecked: false }
    }
    // three buttons: yes / no / cancel
    const r = await dlg.message(text, { title: o.title, kind, buttons: { yes: buttons[0] as string, no: buttons[1] as string, cancel: buttons[2] as string } })
    const response = r === buttons[0] || r === 'Yes' ? 0 : r === buttons[1] || r === 'No' ? 1 : 2
    return { response, checkboxChecked: false }
  },
  showMessageBoxSync(a: unknown, b?: unknown): number {
    // no synchronous dialogs in a web view: the safe answer (cancel)
    const o = lastArg<{ cancelId?: number }>(a, b)
    return o.cancelId ?? 0
  },
  showErrorBox(title: string, content: string): void {
    void dlg.message(content, { title, kind: 'error' })
  }
}

export const shell = {
  openPath: async (p: string): Promise<string> => {
    try {
      await opener.openPath(p)
      return ''
    } catch (e) {
      return String(e)
    }
  },
  showItemInFolder: (p: string) => void opener.revealItemInDir(p).catch(() => {}),
  openExternal: (url: string) => opener.openUrl(url)
}

export const nativeTheme = {
  get shouldUseDarkColors() {
    return matchMedia('(prefers-color-scheme: dark)').matches
  },
  themeSource: 'system',
  on: noop
}

export const net = { fetch: (input: RequestInfo, init?: RequestInit) => fetch(input, init) }
export const nativeImage = { createFromPath: (p: string) => ({ path: p, isEmpty: () => false }) }
export const session = { defaultSession: { setPermissionRequestHandler: noop, setPermissionCheckHandler: noop } }

export default { app, ipcMain, dialog, shell, BrowserWindow, nativeTheme, net, nativeImage, session }
