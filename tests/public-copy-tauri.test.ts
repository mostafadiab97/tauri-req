// tools/public-copy.mjs --with-tauri (CTO, 22 Nov 2026): tauri/ goes only into the Tauri playground's copy; the
// public reqochet copy stays without it.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { chooseFiles, parseRules } from '../tools/public-copy.mjs'

const rules = parseRules(readFileSync('tools/public-files.txt', 'utf8'))
const sample = ['src/main/index.ts', 'package.json', '.github/workflows/release.yml', 'tauri/app/ui-main.ts', 'tauri/src-tauri/src/core.rs', 'tauri/ci/windows-check.yml']

describe('public copy and the Tauri preview', () => {
  it('leaves tauri/ out of the normal public copy', () => {
    const { chosen, renamed } = chooseFiles(sample, rules)
    expect(chosen.some((f) => f.startsWith('tauri/'))).toBe(false)
    expect(renamed).toEqual([])
    expect(chosen).toContain('src/main/index.ts')
  })

  it('adds tauri/ and its Windows check workflow with --with-tauri', () => {
    const { chosen, renamed } = chooseFiles(sample, rules, { withTauri: true })
    expect(chosen).toEqual(expect.arrayContaining(['tauri/app/ui-main.ts', 'tauri/src-tauri/src/core.rs', 'src/main/index.ts']))
    expect(renamed).toEqual([{ from: 'tauri/ci/windows-check.yml', to: '.github/workflows/tauri-windows-check.yml' }])
    // the playground must not build or release reqochet
    expect(chosen.some((f) => f.startsWith('.github/workflows/'))).toBe(false)
  })

  it('keeps the normal copy the same as before for the real file list', () => {
    const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
    const without = chooseFiles(tracked, rules).chosen
    const withTauri = chooseFiles(tracked, rules, { withTauri: true }).chosen
    expect(without.some((f) => f.startsWith('tauri/'))).toBe(false)
    expect(withTauri.filter((f) => !f.startsWith('tauri/'))).toEqual(without.filter((f) => !f.startsWith('.github/workflows/')))
  })
})
