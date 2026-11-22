// @vitest-environment jsdom
// 0.26.0: a tab row has one Tab stop and its chosen tab points to the content shown after it.
import { describe, expect, it } from 'vitest'
import { rovingTabs } from '../../src/renderer/src/lib/keys'

describe('tab rows (0.26.0)', () => {
  it('one Tab stop; the chosen tab controls the panel after the row, and follows a new choice', async () => {
    document.body.innerHTML = '<div><div role="tablist"><button role="tab" aria-selected="true">A</button><button role="tab" aria-selected="false">B</button></div><div class="body">content</div></div>'
    const list = document.querySelector<HTMLElement>('[role="tablist"]')
    rovingTabs(list)
    const [a, b] = [...document.querySelectorAll<HTMLElement>('[role="tab"]')]
    const panel = document.querySelector<HTMLElement>('.body')
    expect(a?.tabIndex).toBe(0)
    expect(b?.tabIndex).toBe(-1)
    expect(panel?.getAttribute('role')).toBe('tabpanel')
    expect(a?.getAttribute('aria-controls')).toBe(panel?.id)
    expect(panel?.getAttribute('aria-labelledby')).toBe(a?.id)
    a?.setAttribute('aria-selected', 'false')
    b?.setAttribute('aria-selected', 'true')
    await new Promise((r) => setTimeout(r, 0))
    expect(b?.getAttribute('aria-controls')).toBe(panel?.id)
    expect(a?.hasAttribute('aria-controls')).toBe(false)
    expect(panel?.getAttribute('aria-labelledby')).toBe(b?.id)
  })
  it('content with a role of its own is left alone', () => {
    document.body.innerHTML = '<div><div role="tablist"><button role="tab" aria-selected="true">A</button></div><table role="grid"></table></div>'
    rovingTabs(document.querySelector<HTMLElement>('[role="tablist"]'))
    expect(document.querySelector('table')?.getAttribute('role')).toBe('grid')
  })
  it('marked panes: the visible one is the panel, a hidden one is not', async () => {
    document.body.innerHTML = '<div role="dialog"><div class="bar"><div role="tablist"><button role="tab" aria-selected="true">A</button><button role="tab" aria-selected="false">B</button></div><select></select></div><div data-tabpanel class="is-hidden" id="pb">B</div><div data-tabpanel id="pa">A</div></div>'
    rovingTabs(document.querySelector<HTMLElement>('[role="tablist"]'))
    const [a, b] = [...document.querySelectorAll<HTMLElement>('[role="tab"]')]
    expect(document.querySelector('select')?.hasAttribute('role')).toBe(false)
    expect(document.getElementById('pa')?.getAttribute('role')).toBe('tabpanel')
    expect(document.getElementById('pb')?.hasAttribute('role')).toBe(false)
    expect(a?.getAttribute('aria-controls')).toBe('pa')
    a?.setAttribute('aria-selected', 'false')
    b?.setAttribute('aria-selected', 'true')
    document.getElementById('pa')?.classList.add('is-hidden')
    document.getElementById('pb')?.classList.remove('is-hidden')
    await new Promise((r) => setTimeout(r, 0))
    expect(b?.getAttribute('aria-controls')).toBe('pb')
    expect(document.getElementById('pa')?.hasAttribute('role')).toBe(false)
  })
})
