// @vitest-environment jsdom
// Edge cases: useModalKeys in a real React tree: Esc, escape:false, Tab wrap, focus back, panel that appears later.
import { createElement, useRef, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useModalKeys } from '../../src/renderer/src/lib/hooks'
import { rovingTabs } from '../../src/renderer/src/lib/keys'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(HTMLElement.prototype, 'offsetParent', { get() { return this.parentElement } }) // jsdom has no layout

function Dlg(p: { onClose: () => void; escape?: boolean }): ReactElement {
  const panel = useRef<HTMLDivElement>(null)
  useModalKeys(panel, p.onClose, { escape: p.escape })
  return createElement('div', { ref: panel, tabIndex: -1, id: 'p' }, createElement('div', { className: 'modal__body' }, createElement('input', { id: 'a' }), createElement('button', { id: 'b', disabled: true }, 'x')), createElement('button', { id: 'c' }, 'ok'))
}
const key = (el: Element, k: string, shiftKey = false): void => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true }))

describe('useModalKeys (0.26.0)', () => {
  it('focus goes in, Esc closes, Tab wraps over enabled controls only, focus returns', async () => {
    document.body.innerHTML = '<button id="opener">open</button><div id="root"></div>'
    const opener = document.getElementById('opener') as HTMLElement
    opener.focus()
    const close = vi.fn()
    const root = createRoot(document.getElementById('root') as HTMLElement)
    await act(async () => root.render(createElement(Dlg, { onClose: close })))
    expect(document.activeElement?.id).toBe('a')
    const c = document.getElementById('c') as HTMLElement
    c.focus()
    key(c, 'Tab')
    expect(document.activeElement?.id).toBe('a') // wraps; the disabled b is skipped
    key(document.getElementById('a') as HTMLElement, 'Tab', true)
    expect(document.activeElement?.id).toBe('c')
    key(c, 'Escape')
    expect(close).toHaveBeenCalledTimes(1)
    await act(async () => root.unmount())
    expect(document.activeElement?.id).toBe('opener')
  })
  it('escape:false leaves Esc to the dialog', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const close = vi.fn()
    const root = createRoot(document.getElementById('root') as HTMLElement)
    await act(async () => root.render(createElement(Dlg, { onClose: close, escape: false })))
    key(document.getElementById('a') as HTMLElement, 'Escape')
    expect(close).not.toHaveBeenCalled()
    await act(async () => root.unmount())
  })
  it('opener removed while the dialog is open: closing does not throw', async () => {
    document.body.innerHTML = '<button id="opener">o</button><div id="root"></div>'
    ;(document.getElementById('opener') as HTMLElement).focus()
    const root = createRoot(document.getElementById('root') as HTMLElement)
    await act(async () => root.render(createElement(Dlg, { onClose: () => undefined })))
    document.getElementById('opener')?.remove()
    await act(async () => root.unmount())
    expect(true).toBe(true)
  })
})

describe('rovingTabs edges (0.26.0)', () => {
  it('no tab chosen: no tab keeps a stale aria-controls', async () => {
    document.body.innerHTML = '<div><div role="tablist"><button role="tab" aria-selected="true">A</button><button role="tab" aria-selected="false">B</button></div><div>c</div></div>'
    rovingTabs(document.querySelector('[role="tablist"]'))
    const [a] = [...document.querySelectorAll('[role="tab"]')]
    a?.setAttribute('aria-selected', 'false')
    await new Promise((r) => setTimeout(r, 0))
    expect(a?.hasAttribute('aria-controls')).toBe(false)
  })
  it('two tab rows get different ids; the content swapped for a new element is wired again', async () => {
    document.body.innerHTML = '<div><div role="tablist"><button role="tab" aria-selected="true">A</button></div><p id="one">1</p></div><div><div role="tablist"><button role="tab" aria-selected="true">A</button></div><p>2</p></div>'
    for (const l of document.querySelectorAll<HTMLElement>('[role="tablist"]')) rovingTabs(l)
    const ids = [...document.querySelectorAll('[role="tab"]')].map((t) => t.id)
    expect(new Set(ids).size).toBe(2)
    const first = document.querySelector('[role="tablist"]')?.parentElement as HTMLElement
    first.querySelector('#one')?.remove()
    const fresh = document.createElement('p')
    first.appendChild(fresh)
    await new Promise((r) => setTimeout(r, 0))
    expect(fresh.getAttribute('role')).toBe('tabpanel')
  })
})
