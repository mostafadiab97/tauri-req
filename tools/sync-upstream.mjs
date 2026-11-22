// Takes reqochet's screens and core from a PUBLIC copy of reqochet into upstream/ — never edited by hand.
//   node tools/sync-upstream.mjs <public copy folder>   replace upstream/ with the parts listed below
//   node tools/sync-upstream.mjs --check                fail if a file in upstream/ was changed by hand
// The public copy is made in the reqochet repository with `node tools/public-copy.mjs <folder>`, or is a clone of the
// public reqochet repository. Changes to the screens or the core are made in reqochet and synced here.
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const upstream = join(root, 'upstream')
const manifestFile = join(upstream, 'UPSTREAM.json')
const PARTS = ['src', 'config', 'resources', 'e2e', 'package.json', 'package-lock.json', 'LICENSE.md', 'THIRD-PARTY-NOTICES.txt', 'docs/USER-GUIDE.md', 'docs/images', 'samples', 'tools/generate-scenario-repo.mts']

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name)
    return d.isDirectory() ? files(p) : [p]
  })
const hashes = () =>
  Object.fromEntries(
    files(upstream)
      .filter((f) => f !== manifestFile)
      .map((f) => [relative(upstream, f).split('\\').join('/'), createHash('sha256').update(readFileSync(f)).digest('hex')])
      .sort(([a], [b]) => (a < b ? -1 : 1))
  )

if (process.argv[2] === '--check') {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
  const now = hashes()
  const changed = [...new Set([...Object.keys(manifest.files), ...Object.keys(now)])].filter((f) => manifest.files[f] !== now[f])
  if (changed.length) {
    console.error(`upstream/ differs from the synced public copy (${changed.length} files), e.g.:\n  ${changed.slice(0, 10).join('\n  ')}`)
    console.error('Change reqochet instead and sync again.')
    process.exit(1)
  }
  console.log(`upstream/ = public reqochet ${manifest.version} (${Object.keys(now).length} files, unchanged)`)
} else {
  const source = process.argv[2]
  if (!source || !existsSync(join(source, 'package.json'))) {
    console.error('Usage: node tools/sync-upstream.mjs <public copy folder> | --check')
    process.exit(1)
  }
  rmSync(upstream, { recursive: true, force: true })
  mkdirSync(upstream, { recursive: true })
  for (const part of PARTS) {
    const from = join(source, part)
    if (!existsSync(from)) continue
    mkdirSync(dirname(join(upstream, part)), { recursive: true })
    cpSync(from, join(upstream, part), { recursive: statSync(from).isDirectory() })
  }
  const version = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).version
  const manifest = { version, synced: new Date().toISOString().slice(0, 10), files: hashes() }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + '\n')
  console.log(`upstream/ now holds public reqochet ${version} (${Object.keys(manifest.files).length} files)`)
}
