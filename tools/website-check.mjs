// Website check (W-04 for the website, the owner, 22 Nov 2026): axe-core accessibility (WCAG 2.1 A/AA) on
// website/index.html in light and dark, plus screenshots at phone and desktop width for a look.
//   node tools/website-check.mjs        → website/check/a11y.md and website/check/*.png (git-ignored)
// Needs a Chromium for Playwright (in the cloud session `playwright` is installed; locally: npx playwright install chromium).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { AxeBuilder } from '@axe-core/playwright'
import { summarise } from '../e2e/a11y.mjs'

// the full `playwright` package matches the browsers installed with it (CommonJS lookup also finds a global install);
// otherwise the project's playwright-core with a browser installed by hand
const load = (name) => {
  try {
    return createRequire(import.meta.url)(name)
  } catch {
    return null
  }
}
const { chromium } = load('playwright') ?? load('playwright-core')
const page = pathToFileURL(resolve('website/index.html')).href
const out = resolve('website/check')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const lines = ['# Website accessibility (axe-core, WCAG 2.1 A/AA)', '', '| Mode | Impact | Rule | What it means | Elements | Examples |', '| --- | --- | --- | --- | --- | --- |']
let total = 0
for (const scheme of ['light', 'dark']) {
  for (const [label, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: 'reduce' })
    const tab = await ctx.newPage()
    await tab.goto(page, { waitUntil: 'load' })
    await tab.screenshot({ path: join(out, `${scheme}-${label}.png`), fullPage: false })
    const scroll = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (scroll > 0) lines.push(`| ${scheme}/${label} | serious | horizontal-scroll | The page is ${scroll}px wider than the screen | 1 | |`)
    if (label === 'desktop') {
      const found = summarise((await new AxeBuilder({ page: tab }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations)
      total += found.length
      for (const f of found) lines.push(`| ${scheme} | ${f.impact} | ${f.id} | ${f.help.replace(/\|/g, '/')} | ${f.count} | ${f.examples.join('; ').replace(/\|/g, '/').slice(0, 120)} |`)
    }
    await ctx.close()
  }
}
await browser.close()
writeFileSync(join(out, 'a11y.md'), lines.join('\n') + '\n')
console.log(`website/check/a11y.md: ${total} broken rule(s) over light and dark; screenshots in website/check/`)
