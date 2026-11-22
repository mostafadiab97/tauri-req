// W-04 (the owner, 22 Nov 2026): the e2e accessibility report — axe results per screenshot, summed per rule.
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { report, summarise } from '../e2e/a11y.mjs'

describe('accessibility report', () => {
  it('keeps one short entry per broken rule', () => {
    const found = summarise([{ id: 'color-contrast', impact: 'serious', help: 'Enough contrast', nodes: [{ target: ['.a'] }, { target: ['.b'] }, { target: ['.c'] }] }])
    expect(found).toEqual([{ id: 'color-contrast', impact: 'serious', help: 'Enough contrast', count: 3, examples: ['.a', '.b'] }])
  })

  it('sums rules over screens, worst impact first, and survives a missing folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'a11y-'))
    writeFileSync(join(dir, 'one.json'), JSON.stringify([{ id: 'label', impact: 'minor', help: 'Labels', count: 1, examples: [] }]))
    writeFileSync(join(dir, 'two.json'), JSON.stringify([{ id: 'aria-required-attr', impact: 'critical', help: 'ARIA | attrs', count: 4, examples: [] }, { id: 'label', impact: 'minor', help: 'Labels', count: 2, examples: [] }]))
    const md = report(dir)
    expect(md).toContain('2 screenshots checked, 2 rule(s) broken')
    const lines = md.split('\n').filter((l) => l.startsWith('| critical') || l.startsWith('| minor'))
    expect(lines[0]).toContain('aria-required-attr')
    expect(lines[0]).toContain('ARIA / attrs')
    expect(lines[1]).toMatch(/\| label \| Labels \| 2 \| 3 \|/)
    expect(report(join(dir, 'missing'))).toContain('No results')
  })
})
