// The Electron baseline of the shared calls test: the same calls-test.js in reqochet's Electron build.
//   node e2e-tauri/calls-electron.mjs <built reqochet checkout (npm run build done)> [out.json]
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { runCalls } from './calls-test.js'
import { summarize } from './calls-report.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const app = process.argv[2]
const out = process.argv[3] ?? join(here, 'out', 'calls-electron.json')
// <app> is either a reqochet checkout with `npm run build` done, or an installed reqochet .exe
const packaged = app.toLowerCase().endsWith('.exe')
const require = createRequire(packaged ? import.meta.url : join(app, 'package.json'))
const { _electron } = require('playwright-core')
const user = join(packaged ? process.env.RUNNER_TEMP ?? dirname(app) : join(app, '..'), `rq-calls-electron-user-${Date.now()}`)
const linux = process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu'] : []
const e = packaged
  ? await _electron.launch({ executablePath: app, args: [`--user-data-dir=${user}`] })
  : await _electron.launch({ executablePath: require('electron'), args: ['.', `--user-data-dir=${user}`, ...linux], cwd: app })
const win = await e.firstWindow()
await win.waitForLoadState('domcontentloaded')
await new Promise((r) => setTimeout(r, 3000))
// the env helpers run in Electron's main process (Node), like the core-side test hook in Tauri
await e.evaluate(({ dialog }) => {
  const g = globalThis
  g.__open = []
  g.__save = []
  dialog.showOpenDialog = async () => (g.__open.length ? { canceled: false, filePaths: [g.__open.shift()] } : { canceled: true, filePaths: [] })
  dialog.showSaveDialog = async () => (g.__save.length ? { canceled: false, filePath: g.__save.shift() } : { canceled: true })
  dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false })
})
const env = {
  tmp: (name) => e.evaluate((_x, n) => { const fs = process.getBuiltinModule('fs'); const os = process.getBuiltinModule('os'); const p = process.getBuiltinModule('path'); return fs.mkdtempSync(p.join(os.tmpdir(), `rq-${n}-`)) }, name),
  git: (cwd, args) => e.evaluate((_x, [c, a]) => process.getBuiltinModule('child_process').execFileSync('git', a, { cwd: c, encoding: 'utf8' }), [cwd, args]),
  write: (path, text) => e.evaluate((_x, [p, t]) => process.getBuiltinModule('fs').writeFileSync(p, t), [path, text]),
  dataCount: Number(process.env.REQOCHET_TEST_DATA ?? 500),
  answer: (a) => e.evaluate((_x, a2) => { const g = globalThis; if (a2.open) g.__open = [...a2.open]; if (a2.save) g.__save = [...a2.save] }, a)
}
// runCalls runs here in Node and calls window.reqochet through the page, one call at a time (same order as Tauri)
const api = new Proxy({}, {
  get: (_t, name) => (...args) =>
    name === 'onUpdateStatus' ? win.evaluate(() => typeof window.reqochet.onUpdateStatus(() => {})).then((t) => (t === 'function' ? () => {} : null))
      : win.evaluate(([n, a]) => Promise.resolve(window.reqochet[n](...a)), [name, args])
})
globalThis.performance ??= { now: () => Date.now() }
const result = await runCalls(api, env)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ engine: 'electron', ...result }, null, 1))
summarize(result, 'Electron')
await e.evaluate(({ app: a }) => a.exit(0)).catch(() => {})
process.exit(0)
