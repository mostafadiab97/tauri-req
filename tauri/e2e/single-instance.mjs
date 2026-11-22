// One reqochet per data folder, with the real program: a second start with the same data folder quits at once (after
// asking the first to show its window); a start with another data folder runs normally.
//   REQOCHET_TAURI_EXE=<exe> node tauri/e2e/single-instance.mjs
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const exe = process.env.REQOCHET_TAURI_EXE
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const start = (userData) => spawn(exe, [], { stdio: 'ignore', env: { ...process.env, REQOCHET_USER_DATA: userData } })
const exitWithin = (p, ms) =>
  new Promise((resolve) => {
    if (p.exitCode !== null) return resolve(p.exitCode)
    const t = setTimeout(() => resolve('still running'), ms)
    p.on('exit', (c) => {
      clearTimeout(t)
      resolve(c)
    })
  })

let failures = 0
const check = (ok, what) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${what}`)
  if (!ok) failures++
}

const dir = mkdtempSync(join(tmpdir(), 'rq-single-'))
const first = start(dir)
for (let i = 0; i < 120 && !existsSync(join(dir, 'instance.json')); i++) await sleep(250)
check(existsSync(join(dir, 'instance.json')), 'the first instance is running (instance.json written)')
const second = start(dir)
const code = await exitWithin(second, 15_000)
check(code === 0, `a second start with the same data folder quits at once (exit ${code})`)
check(first.exitCode === null, 'the first instance is still running')
const other = start(mkdtempSync(join(tmpdir(), 'rq-single-other-')))
const otherCode = await exitWithin(other, 5_000)
check(otherCode === 'still running', `a start with another data folder runs normally (${otherCode})`)
for (const p of [first, second, other]) if (p.exitCode === null) p.kill()
console.log(failures === 0 ? 'Single instance: all checks passed' : `Single instance: ${failures} check(s) failed`)
if (process.env.GITHUB_ACTIONS) console.log(`::${failures ? 'error' : 'notice'} title=Single instance (Tauri)::${failures ? `${failures} check(s) failed` : 'a second start with the same data folder quits; another data folder runs normally'}`)
process.exit(failures ? 1 : 0)
