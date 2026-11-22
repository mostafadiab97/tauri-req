// Node module hook: reqochet's e2e scenarios import '../harness.mjs'; run through tauri/e2e/run.mjs they get the Tauri harness.
import { pathToFileURL } from 'node:url'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const tauriHarness = pathToFileURL(join(here, 'harness-tauri.mjs')).href
// reqochet's own scenarios (e2e/scenarios at the repository root)
const scenarios = pathToFileURL(join(here, '..', '..', 'e2e', 'scenarios')).href + '/'

export async function resolve(specifier, context, next) {
  if (specifier === '../harness.mjs' && context.parentURL?.startsWith(scenarios)) return { url: tauriHarness, shortCircuit: true }
  return next(specifier, context)
}
