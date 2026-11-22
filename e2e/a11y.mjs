// Accessibility check at every e2e screenshot (W-04, the owner, 22 Nov 2026): axe-core tests the visible window against
// WCAG 2.1 A/AA. Report-only for now: results go to e2e/out/a11y/<screenshot>.json and one summary e2e/out/a11y.md;
// a scenario never fails because of them. When the screens are clean, `A11Y_STRICT=1` will make new problems fail.
// Set `A11Y=0` to skip (e.g. when measuring speed).
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { AxeBuilder } from '@axe-core/playwright'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Short form of axe's result: one entry per broken rule, with how many elements and two examples. */
export function summarise(violations) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? 'unknown',
    help: v.help,
    count: v.nodes.length,
    examples: v.nodes.slice(0, 2).map((n) => n.target.join(' '))
  }))
}

/** Checks the page and writes `<dir>/<name>.json`. Never throws: a broken check must not break a scenario. */
export async function checkA11y(page, name, dir) {
  if (process.env.A11Y === '0') return null
  try {
    // legacy mode runs inside the window itself: Electron cannot open the extra blank page the normal mode needs
    const result = await new AxeBuilder({ page }).withTags(TAGS).setLegacyMode(true).analyze()
    const found = summarise(result.violations)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(found, null, 1))
    return found
  } catch (e) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${name}.json`), JSON.stringify([{ id: 'axe-error', impact: 'unknown', help: String(e).slice(0, 200), count: 0, examples: [] }]))
    return null
  }
}

const ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3, unknown: 4 }

/** One Markdown table over all screenshots: rule, impact, help, how many screens and elements, example screens. */
export function report(dir) {
  let files
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch {
    return '# Accessibility (axe-core)\n\nNo results.\n'
  }
  const rules = new Map()
  for (const f of files) {
    const screen = f.replace(/\.json$/, '')
    for (const v of JSON.parse(readFileSync(join(dir, f), 'utf8'))) {
      const r = rules.get(v.id) ?? { ...v, screens: [], elements: 0 }
      r.screens.push(screen)
      r.elements += v.count
      rules.set(v.id, r)
    }
  }
  const rows = [...rules.values()].sort((a, b) => ORDER[a.impact] - ORDER[b.impact] || b.screens.length - a.screens.length)
  const lines = [
    '# Accessibility (axe-core, WCAG 2.1 A/AA)',
    '',
    `${files.length} screenshots checked, ${rows.length} rule(s) broken. Report-only (W-04).`,
    '',
    '| Impact | Rule | What it means | Screens | Elements | Example screens |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${r.impact} | ${r.id} | ${r.help.replace(/\|/g, '/').replace(/\s+/g, ' ')} | ${r.screens.length} | ${r.elements} | ${r.screens.slice(0, 3).join(', ')} |`)
  ]
  return lines.join('\n') + '\n'
}

export function resetA11y(dir) {
  rmSync(dir, { recursive: true, force: true })
}
