// Changed screens only (W-05, the owner, 22 Nov 2026): a small fingerprint of every e2e screenshot, so the UI/UX
// reviewer looks only at screens that changed since the last release.
//   node tools/screens.mjs save      after a release's e2e run: writes e2e/screens.json (commit it with the release)
//   node tools/screens.mjs changed   lists screenshots in e2e/out that are new or look different from e2e/screens.json
// The fingerprint is a 32×32 difference hash: tiny rendering noise does not count, a moved or changed element does.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'

export const SIZE = 32
export const THRESHOLD = 3 // bits out of 1024 that may differ before a screen counts as changed
const MARGIN = 2 // grey levels: flat areas give steady 0 bits instead of flipping on noise

/** Difference hash of an RGBA image: grey 33×32 by box averaging, one bit per left/right neighbour pair (set when the right one is clearly lighter), as hex. */
export function fingerprint({ width, height, data }) {
  const cols = SIZE + 1
  const grey = new Float64Array(cols * SIZE)
  for (let gy = 0; gy < SIZE; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const x0 = Math.floor((gx * width) / cols)
      const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * width) / cols))
      const y0 = Math.floor((gy * height) / SIZE)
      const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * height) / SIZE))
      let sum = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      }
      grey[gy * cols + gx] = sum / ((x1 - x0) * (y1 - y0))
    }
  }
  let hex = ''
  for (let gy = 0; gy < SIZE; gy++) {
    for (let gx = 0; gx < SIZE; gx += 4) {
      let nibble = 0
      for (let b = 0; b < 4; b++) nibble = (nibble << 1) | (grey[gy * cols + gx + b + 1] - grey[gy * cols + gx + b] > MARGIN ? 1 : 0)
      hex += nibble.toString(16)
    }
  }
  return hex
}

/** How many bits differ between two fingerprints (a different size counts as fully different). */
export function distance(a, b) {
  if (!a || !b || a.length !== b.length) return SIZE * SIZE
  let bits = 0
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) {
      bits += x & 1
      x >>= 1
    }
  }
  return bits
}

/** Screens that are new or changed against the saved fingerprints, and those that disappeared. */
export function compare(saved, current) {
  const changed = []
  const added = []
  for (const [name, fp] of Object.entries(current)) {
    if (!(name in saved)) added.push(name)
    else if (distance(saved[name], fp) > THRESHOLD) changed.push(name)
  }
  const removed = Object.keys(saved).filter((n) => !(n in current))
  return { changed: changed.sort(), added: added.sort(), removed: removed.sort() }
}

export function fingerprintsOf(dir) {
  const out = {}
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) out[f.replace(/\.png$/, '')] = fingerprint(PNG.sync.read(readFileSync(join(dir, f))))
  return out
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tools/screens.mjs')) {
  const [cmd] = process.argv.slice(2)
  const manifest = join('e2e', 'screens.json')
  const current = fingerprintsOf(join('e2e', 'out'))
  if (cmd === 'save') {
    writeFileSync(manifest, JSON.stringify(current, null, 1) + '\n')
    console.log(`e2e/screens.json: ${Object.keys(current).length} screens`)
  } else if (cmd === 'changed') {
    const saved = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : {}
    const r = compare(saved, current)
    console.log(JSON.stringify(r, null, 1))
  } else {
    console.log('usage: node tools/screens.mjs save | changed')
  }
}
