// Runs the shared calls test in the Tauri build: the app starts with REQOCHET_TEST=calls, runs calls-test.js inside
// its screens' web view and writes the result file, then ends.
//   REQOCHET_TAURI_EXE=<exe> node e2e-tauri/calls-run.mjs [out.json]
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { summarize } from './calls-report.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const exe = process.env.REQOCHET_TAURI_EXE
const out = process.argv[2] ?? join(here, 'out', 'calls-tauri.json')
mkdirSync(dirname(out), { recursive: true })
const userData = mkdtempSync(join(tmpdir(), 'rq-calls-user-'))
const started = Date.now()
const child = spawn(exe, [], { stdio: 'inherit', env: { ...process.env, REQOCHET_TEST: 'calls', REQOCHET_TEST_OUT: out, REQOCHET_USER_DATA: userData } })
const timer = setTimeout(() => child.kill(), 9 * 60_000)
await new Promise((r) => child.on('exit', r))
clearTimeout(timer)
console.log(`app ran ${Math.round((Date.now() - started) / 1000)} s`)
const partial = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null
if (!partial || partial.partial) {
  if (partial) {
    const last = partial.results.at(-1)
    console.log(`Stopped after ${partial.results.length} checks; last finished: ${last?.name}`)
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=Calls test stopped (Tauri)::after ${partial.results.length} checks (${partial.results.filter((r) => r.ok).length} passed); last finished: ${last?.name}`)
  }
  console.log('::error title=Calls test::no result file — the app did not finish the test')
  const log = join(userData, 'logs', 'reqochet.log')
  const tail = existsSync(log) ? readFileSync(log, 'utf8').trim().split(/\r?\n/).slice(-30) : ['(no log file)']
  console.log(`log tail (${log}):\n${tail.join('\n')}`)
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Calls test log tail::${tail.join(' %0A ').replace(/::/g, ': :').slice(0, 3500)}`)
  process.exit(1)
}
const result = JSON.parse(readFileSync(out, 'utf8'))
summarize(result, 'Tauri')
// the PDF really is a PDF (the call only reports ok)
if (result.out) {
  const pdf = join(result.out, 'items.pdf')
  const bytes = existsSync(pdf) ? readFileSync(pdf) : null
  const ok = !!bytes && bytes.subarray(0, 5).toString() === '%PDF-'
  console.log(`PDF file: ${ok ? `valid, ${bytes.length} bytes` : bytes ? 'not a PDF' : 'missing'}`)
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=PDF export (Tauri)::${ok ? `valid PDF, ${bytes.length} bytes` : 'no valid PDF written'}`)
}
