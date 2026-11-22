// Node module hook: reqochet's e2e scenarios import '../harness.mjs'; in this repository they get the Tauri harness.
import { pathToFileURL } from 'node:url'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const tauriHarness = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'harness-tauri.mjs')).href

export async function resolve(specifier, context, next) {
  if (specifier === '../harness.mjs' && context.parentURL?.includes('/upstream/e2e/scenarios/')) return { url: tauriHarness, shortCircuit: true }
  return next(specifier, context)
}
