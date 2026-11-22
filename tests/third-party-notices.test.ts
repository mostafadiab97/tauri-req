// THIRD-PARTY-NOTICES.txt must list every library the app ships: it is regenerated with
// `node tools/third-party-notices.mjs` after a dependency change, and BUNDLED must cover every library src/ imports.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain .mjs tool without types
import { BUNDLED, collectNotices } from '../tools/third-party-notices.mjs'

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]))

describe('third-party notices', () => {
  it('cover every library imported by the app', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> }
    const shipped = new Set([...Object.keys(pkg.dependencies), ...(BUNDLED as string[]), 'electron'])
    const imported = new Set<string>()
    for (const f of files('src').filter((x) => /\.(ts|tsx)$/.test(x))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/from '((?:@[^/']+\/)?[^./'][^/']*)/g)) if (!m[1]!.startsWith('node:')) imported.add(m[1]!)
    }
    expect([...imported].filter((n) => !shipped.has(n))).toEqual([])
  })
  it('the file is up to date', { timeout: 60_000 }, () => {
    expect(readFileSync('THIRD-PARTY-NOTICES.txt', 'utf8').replace(/\r\n/g, '\n')).toBe(collectNotices())
  })
})
