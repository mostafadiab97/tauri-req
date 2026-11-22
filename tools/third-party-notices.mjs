// Writes THIRD-PARTY-NOTICES.txt: the licence text of every library the app ships (the production dependencies and
// theirs). The build bundles their code without their copyright lines, so the notices travel in this file instead,
// next to the app (electron-builder extraResources) and in the repository. Electron and
// Chromium bring their own notices (LICENSE.electron.txt, LICENSES.chromium.html in the installed app).
// Run after a dependency change:  node tools/third-party-notices.mjs   (a test checks the file is up to date)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Libraries the bundler copies into the app (src/ imports them). */
export const BUNDLED = ['react', 'react-dom', '@tanstack/react-virtual', 'marked', 'diff', 'exceljs', 'jszip', 'saxes']

/** Fonts bundled into the window, with their licence files. */
export const FONTS = [{ name: 'Source Serif 4 (font)', licence: 'src/renderer/src/assets/fonts/source-serif-4/OFL.txt' }]

export function collectNotices(root = '.') {
  // the lock file says exactly which package versions are installed and where (no `npm ls`: it depends on the state
  // of node_modules); a dependency resolves like Node does: the nearest node_modules folder upwards
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')).packages
  const pkg0 = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  // shipped: the runtime dependencies, and the libraries the build bundles into the app (they are devDependencies
  // because the bundler copies their code in) — keep this list in step with what src/ imports
  const roots = [...Object.keys(pkg0.dependencies ?? {}), ...BUNDLED]
  const resolve = (from, name) => {
    for (let base = from; ; base = base.includes('/node_modules/') ? base.slice(0, base.lastIndexOf('/node_modules/')) : '') {
      const key = base ? `${base}/node_modules/${name}` : `node_modules/${name}`
      if (lock[key]) return key
      if (!base) return null
    }
  }
  const seen = new Map()
  const walk = (key) => {
    if (!key || seen.has(key)) return
    const entry = lock[key]
    const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)
    seen.set(key, { name, version: entry.version, path: join(root, key) })
    for (const dep of [...Object.keys(entry.dependencies ?? {}), ...Object.keys(entry.optionalDependencies ?? {})]) walk(resolve(key, dep))
  }
  for (const r of roots) walk(resolve('', r))
  // one entry per library and licence text (two versions of one library with the same licence count once)
  const unique = new Map([...seen.values()].map((p) => [p.name, p]))
  const parts = []
  for (const p of [...unique.values()].filter((p) => existsSync(p.path)).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const pkg = JSON.parse(readFileSync(join(p.path, 'package.json'), 'utf8'))
    const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'see the package')
    const file = existsSync(p.path) ? readdirSync(p.path).find((f) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(f)) : undefined
    const text = file ? readFileSync(join(p.path, file), 'utf8').replace(/\r\n?/g, '\n').trim() : `(no licence file in the package; licence: ${license})`
    // no version number: a Dependabot update of a library keeps the notices valid; a new library or licence does not
    parts.push(`${p.name} — ${license}\n${'-'.repeat(60)}\n${text}\n`)
  }
  // fonts the window ships (SIL OFL 1.1 asks for the licence to travel with the font)
  for (const font of FONTS) parts.push(`${font.name} — SIL OFL 1.1\n${'-'.repeat(60)}\n${readFileSync(join(root, font.licence), 'utf8').replace(/\r\n?/g, '\n').trim()}\n`)
  return `Third-party notices for reqochet\n\nreqochet ships the following libraries. Their licences require these notices to travel with every copy.\n\n${parts.join('\n')}`
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('third-party-notices.mjs')) {
  writeFileSync('THIRD-PARTY-NOTICES.txt', collectNotices())
  console.log('THIRD-PARTY-NOTICES.txt written')
}
