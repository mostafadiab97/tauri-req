// reqochet's e2e harness for the Tauri build: everything comes from upstream/e2e/harness.mjs except launch(), which
// starts the Tauri app and drives its WebView2 over the DevTools port (Playwright connectOverCDP). The scenarios'
// "main process" calls (answering dialogs, exit) run in the hidden core web view, on the Electron shim there.
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { outDir, temp } from '../upstream/e2e/harness.mjs'

export * from '../upstream/e2e/harness.mjs'

const exe = process.env.REQOCHET_TAURI_EXE
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launch({ openPath, userData = temp('user'), prefix = '' } = {}) {
  if (!exe) throw new Error('REQOCHET_TAURI_EXE is not set')
  const port = 9300 + Math.floor(Math.random() * 600)
  const proc = spawn(exe, [], {
    stdio: 'ignore',
    env: {
      ...process.env,
      REQOCHET_CDP_PORT: String(port),
      REQOCHET_USER_DATA: userData,
      REQOCHET_TEST: 'e2e'
    }
  })
  let browser
  for (let i = 0; i < 240 && !browser; i++) {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`).catch(() => null)
    if (!browser) await sleep(500)
  }
  if (!browser) throw new Error(`no DevTools connection on port ${port}`)
  const find = async (part) => {
    for (let i = 0; i < 240; i++) {
      // the screens are the app page that is not the core (its address may be just the app root)
      const isApp = (u) => /^(https?:\/\/tauri\.localhost|tauri:\/\/localhost)/.test(u)
      const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (part === 'core.html' ? p.url().includes(part) : isApp(p.url()) && !p.url().includes('core.html')))
      if (page) return page
      await sleep(500)
    }
    throw new Error(`no page ${part}`)
  }
  const core = await find('core.html')
  const win = await find('index.html')
  await core.waitForFunction(() => !!globalThis.__electron, null, { timeout: 120_000 })
  // Electron's app.evaluate(fn, arg) gave fn the electron module; here it gets the shim in the core web view.
  // (A string expression: DevTools evaluation is not bound by the page's script policy.)
  const app = {
    evaluate: (fn, arg) => core.evaluate(`(${fn.toString()})(globalThis.__electron, ${JSON.stringify(arg ?? null)})`),
    process: () => proc
  }
  if (openPath) await app.evaluate(({ dialog }, path) => void (dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })), openPath)
  await win.setViewportSize({ width: 1400, height: 860 })
  await win.waitForLoadState('domcontentloaded', { timeout: 120_000 }).catch(() => {})
  await win.locator('.splash').waitFor({ state: 'detached', timeout: 120_000 }).catch(() => {})
  let failures = 0
  return {
    app,
    win,
    core,
    userData,
    check(cond, what) {
      console.log(`${cond ? '  ✓' : '  ✗'} ${prefix}${what}`)
      if (!cond) failures++
    },
    fail() {
      failures++
    },
    get failures() {
      return failures
    },
    shot: (name) => win.screenshot({ path: join(outDir, `${name}.png`) }),
    openFiles: (...paths) =>
      app.evaluate(({ dialog }, list) => {
        const queue = [...list]
        dialog.showOpenDialog = async () => (queue.length ? { canceled: false, filePaths: [queue.shift()] } : { canceled: true, filePaths: [] })
      }, paths),
    answerMessageBox: (response) =>
      app.evaluate(({ dialog }, r) => {
        dialog.showMessageBox = async () => ({ response: r, checkboxChecked: false })
      }, response),
    saveAs: (file) =>
      app.evaluate(({ dialog }, f) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath: f })
      }, file),
    close: async () => {
      await app.evaluate(({ app: a }) => a.exit(0)).catch(() => {})
      await browser.close().catch(() => {})
      await sleep(300)
      if (proc.exitCode === null) proc.kill()
    }
  }
}
