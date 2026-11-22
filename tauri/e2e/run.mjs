// Runs reqochet's e2e scenarios (e2e/scenarios, unchanged) against the Tauri build.
//   REQOCHET_TAURI_EXE=<path to the Tauri exe> node tauri/e2e/run.mjs [name prefixes…]
// Writes tauri/e2e/out/e2e-results.json (per scenario: passed, checks passed/failed, seconds).
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..') // the repository root (reqochet's e2e/scenarios)
const dir = join(repoRoot, 'e2e', 'scenarios')
const wanted = process.argv.slice(2)
const all = readdirSync(dir).filter((f) => f.endsWith('.e2e.mjs') && (wanted.length === 0 || wanted.some((w) => f.startsWith(w))))
const PARALLEL = Number(process.env.E2E_PARALLEL ?? 3)
mkdirSync(join(here, 'out'), { recursive: true })

const results = []
const run = (file) =>
  new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(process.execPath, ['--import', pathToFileURL(join(here, 'register.mjs')).href, join(dir, file)], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    const timer = setTimeout(() => child.kill(), 5 * 60_000) // a scenario may take at most 5 minutes
    child.on('exit', (code) => {
      clearTimeout(timer)
      const secs = Math.round((Date.now() - started) / 1000)
      console.log(`\n===== ${file} (${secs} s) =====\n${out.trim()}`)
      const lines = out.split(/\r?\n/)
      const passed = lines.filter((l) => l.startsWith('  ✓')).length
      const failedLines = lines.filter((l) => l.includes('✗'))
      results.push({ file, ok: code === 0, passed, failed: failedLines.length, secs, firstFailures: failedLines.slice(0, 5), tail: code === 0 ? [] : lines.slice(-12) })
      resolve()
    })
  })

const queue = [...all]
await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => { while (queue.length) await run(queue.shift()) }))
results.sort((a, b) => (a.file < b.file ? -1 : 1))
writeFileSync(join(here, 'out', 'e2e-results.json'), JSON.stringify(results, null, 1))
console.log('\nE2E summary (Tauri):')
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.file}  (${r.passed} checks passed, ${r.failed} failed, ${r.secs} s)`)
const failed = results.filter((r) => !r.ok).length
console.log(failed === 0 ? 'All E2E scenarios passed' : `${failed} of ${results.length} scenario(s) failed`)
