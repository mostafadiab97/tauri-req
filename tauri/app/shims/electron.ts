// The parts of Electron's main-process API that reqochet's core uses (src/main/ipc.ts, pdf.ts, windowIcon.ts,
// closeForInstall.ts, the updater), answered by Tauri. ipcMain only collects the handlers; core-main.ts serves them.
import { coreBytes, coreJson } from './core'
import { windowCommand } from '../transport'
import { host, pushToScreens } from './host'
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
  send: (channel: string, ...args: unknown[]) => pushToScreens(channel, args),
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
  close: () => void windowCommand('app_exit', { code: 0 }),
  destroy: () => void windowCommand('app_exit', { code: 0 }),
  show: () => void windowCommand('show_main'),
  focus: noop,
  restore: noop,
  once: noop,
  on: noop,
  removeListener: noop,
  setIcon: (path: string) => void host('setWindowIcon', path).catch(() => {}),
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
        preferCSSPageSize: false,
        // Electron's printToPDF defaults: no tagged (accessibility structure) PDF and no outline. Chromium's own
        // call leaves this to the browser, which tags — 4.5× the file size and twice the time for 10,000 items.
        generateTaggedPDF: false,
        generateDocumentOutline: false
      }
      try {
        return Buffer.from(await coreBytes('pdf', { file: this.file, options }))
      } catch (e) {
        throw new Error((e as { message?: string })?.message ?? String(e), { cause: e })
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
  quit: () => void windowCommand('app_exit', { code: 0 }),
  exit: (code = 0) => void windowCommand('app_exit', { code }),
  relaunch: () => void host('relaunch'),
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
    const r = await host('dialogOpen', {
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
    const r = await host('dialogSave', { title: o.title, defaultPath: o.defaultPath, filters: filtersOf(o.filters) })
    return r ? { canceled: false, filePath: norm(r) } : { canceled: true }
  },
  async showMessageBox(a: unknown, b?: unknown): Promise<{ response: number; checkboxChecked: boolean }> {
    const o = lastArg<{ type?: string; buttons?: string[]; cancelId?: number; title?: string; message: string; detail?: string }>(a, b)
    const text = o.detail ? `${o.message}\n\n${o.detail}` : o.message
    const kind = o.type === 'error' ? 'error' : o.type === 'warning' ? 'warning' : 'info'
    const buttons = o.buttons ?? ['OK']
    if (buttons.length <= 1) {
      await host('dialogMessage', text, { title: o.title, kind, okLabel: buttons[0] })
      return { response: 0, checkboxChecked: false }
    }
    if (buttons.length === 2) {
      const yes = await host('dialogAsk', text, { title: o.title, kind, okLabel: buttons[0], cancelLabel: buttons[1] })
      return { response: yes ? 0 : 1, checkboxChecked: false }
    }
    // three buttons: yes / no / cancel
    const r = await host('dialogMessage', text, { title: o.title, kind, buttons: { yes: buttons[0] as string, no: buttons[1] as string, cancel: buttons[2] as string } })
    const response = r === buttons[0] || r === 'Yes' ? 0 : r === buttons[1] || r === 'No' ? 1 : 2
    return { response, checkboxChecked: false }
  },
  showMessageBoxSync(a: unknown, b?: unknown): number {
    // no synchronous dialogs in a web view: the safe answer (cancel)
    const o = lastArg<{ cancelId?: number }>(a, b)
    return o.cancelId ?? 0
  },
  showErrorBox(title: string, content: string): void {
    void host('dialogMessage', content, { title, kind: 'error' })
  }
}

export const shell = {
  openPath: async (p: string): Promise<string> => {
    try {
      await coreJson('open', { path: p, reveal: false })
      return ''
    } catch (e) {
      return (e as { message?: string })?.message ?? String(e)
    }
  },
  showItemInFolder: (p: string) => void coreJson('open', { path: p, reveal: true }).catch(() => {}),
  openExternal: (url: string) => host('openUrl', url)
}

/** Electron's nativeTheme: themeSource sets the title bar (Tauri's window theme); the system's own choice is asked
 * from the screens' page at start (systemDark) and kept up to date there. */
let themeSource: 'system' | 'light' | 'dark' = 'system'
let systemDark = false
export const refreshSystemDark = async (): Promise<void> => {
  systemDark = await host('prefersDark').catch(() => false)
}
export const nativeTheme = {
  get shouldUseDarkColors() {
    return themeSource === 'dark' || (themeSource === 'system' && systemDark)
  },
  get themeSource() {
    return themeSource
  },
  set themeSource(v: 'system' | 'light' | 'dark') {
    themeSource = v
    void host('setTheme', v === 'system' ? null : v).catch(() => {})
  },
  on: noop
}

export const net = { fetch: (input: RequestInfo, init?: RequestInit) => fetch(input, init) }
export const nativeImage = { createFromPath: (p: string) => ({ path: p, isEmpty: () => false }) }
export const session = { defaultSession: { setPermissionRequestHandler: noop, setPermissionCheckHandler: noop } }

export default { app, ipcMain, dialog, shell, BrowserWindow, nativeTheme, net, nativeImage, session }
