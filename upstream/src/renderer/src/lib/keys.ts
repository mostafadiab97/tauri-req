// Arrow keys that follow the reading direction: in Arabic (right-to-left) the right arrow goes back.
import type { KeyboardEvent } from 'react'
import { isRtlDocument } from './language'

/** "forward" / "back" for the left and right arrows in the window's reading direction; null for other keys. */
export function arrowDirection(key: string): 'forward' | 'back' | null {
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null
  const right = key === 'ArrowRight'
  return right !== isRtlDocument() ? 'forward' : 'back'
}

/**
 * Keyboard for a row of tabs (put it on the element with role="tablist"): the arrows move to the next or previous tab
 * in the reading direction, Home and End to the first and last; the tab is focused and chosen.
 */
export function onTabListKeyDown(e: KeyboardEvent<HTMLElement>): void {
  const tabs = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])')]
  if (tabs.length < 2) return
  const at = tabs.indexOf(document.activeElement as HTMLElement)
  if (at < 0) return
  const dir = arrowDirection(e.key)
  const to = dir === 'forward' ? (at + 1) % tabs.length : dir === 'back' ? (at - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1
  if (to < 0) return
  e.preventDefault()
  tabs[to]?.focus()
  tabs[to]?.click()
}

/**
 * For the element with role="tablist" (as `ref={rovingTabs}`): only the chosen tab is a Tab stop, the others are
 * reached with the arrows — kept in step whenever the chosen tab changes.
 */
export function rovingTabs(list: HTMLElement | null): void {
  if (!list) return
  // the shown content is the element right after the tab row (or one marked data-tabpanel next to it): it becomes the
  // tabpanel of the chosen tab, so a screen reader can go from the tab to its content
  const base = list.id || `tabs-${++tabRows}`
  const sync = (): void => {
    // a screen can mark its panes with data-tabpanel (the visible one is the panel) when the content is not right
    // after the row — the Traceability toolbar, the Types dialog's two mounted panes (R2)
    const scope = list.closest<HTMLElement>('[role="dialog"], section, .trace') ?? list.parentElement
    const marked = [...(scope?.querySelectorAll<HTMLElement>('[data-tabpanel]') ?? [])]
    const panel = marked.length > 0 ? (marked.find((p) => !p.classList.contains('is-hidden') && !p.hidden) ?? null) : (list.nextElementSibling as HTMLElement | null)
    for (const p of marked) if (p !== panel && p.getAttribute('role') === 'tabpanel') p.removeAttribute('role')
    let n = 0
    for (const tab of list.querySelectorAll<HTMLElement>('[role="tab"]')) {
      const chosen = tab.getAttribute('aria-selected') === 'true'
      const want = chosen ? '0' : '-1'
      if (tab.getAttribute('tabindex') !== want) tab.setAttribute('tabindex', want)
      if (!tab.id) tab.id = `${base}-tab-${n}`
      n++
      if (chosen && panel && (!panel.hasAttribute('role') || panel.getAttribute('role') === 'tabpanel')) {
        if (!panel.id) panel.id = `${base}-panel`
        if (panel.getAttribute('role') !== 'tabpanel') panel.setAttribute('role', 'tabpanel')
        if (panel.getAttribute('aria-labelledby') !== tab.id) panel.setAttribute('aria-labelledby', tab.id)
        if (tab.getAttribute('aria-controls') !== panel.id) tab.setAttribute('aria-controls', panel.id)
      } else if (tab.hasAttribute('aria-controls') && !chosen) tab.removeAttribute('aria-controls')
    }
  }
  sync()
  new MutationObserver(sync).observe(list, { subtree: true, attributes: true, attributeFilter: ['aria-selected'], childList: true })
  // the content after the row is swapped when another tab is chosen
  const scope = list.closest<HTMLElement>('[role="dialog"], section, .trace') ?? list.parentElement
  if (scope) new MutationObserver(sync).observe(scope, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
}
let tabRows = 0

/** The controls of a toolbar that take part in its arrow keys: marked with data-toolbar-item, enabled and visible. */
function toolbarItems(bar: HTMLElement): HTMLElement[] {
  return [...bar.querySelectorAll<HTMLElement>('[data-toolbar-item]')].filter((el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null)
}

/**
 * Keyboard for a toolbar (role="toolbar", 0.23.0): the bar is one Tab stop; ← → (in the reading
 * direction), Home and End move between its controls. Inside the search box the arrows move the cursor as usual, and
 * open menus keep their own keys.
 */
export function onToolbarKeyDown(e: KeyboardEvent<HTMLElement>): void {
  const target = e.target as HTMLElement
  if (target.closest('[role="menu"], [role="dialog"], form')) return
  const dir = arrowDirection(e.key)
  if (!dir && e.key !== 'Home' && e.key !== 'End') return
  if (target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return
  if (target instanceof HTMLInputElement) {
    // the search box: the arrows move the cursor; at its end (or start) they leave it along the bar (C-3)
    const end = target.selectionStart === target.value.length && target.selectionEnd === target.value.length
    const start = target.selectionStart === 0 && target.selectionEnd === 0
    if (!((dir === 'forward' && end) || (dir === 'back' && start))) return
  }
  const items = toolbarItems(e.currentTarget)
  const at = items.indexOf(target)
  if (at < 0) return
  const to = dir === 'forward' ? at + 1 : dir === 'back' ? at - 1 : e.key === 'Home' ? 0 : items.length - 1
  const next = items[(to + items.length) % items.length]
  if (!next) return
  e.preventDefault()
  next.focus()
}

/** Keeps exactly one control of a toolbar in the Tab order — the one focused last (or the first). */
export function rovingToolbar(bar: HTMLElement | null, current?: HTMLElement): void {
  if (!bar) return
  const items = toolbarItems(bar)
  const keep = current && items.includes(current) ? current : (items.find((el) => el.tabIndex === 0 && el.dataset['roving'] === 'on') ?? items[0])
  for (const el of items) {
    el.tabIndex = el === keep ? 0 : -1
    el.dataset['roving'] = el === keep ? 'on' : ''
  }
}
