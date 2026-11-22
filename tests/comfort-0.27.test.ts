// 0.27.0 daily comfort: duplicate an item, change many items at once, restore one item's old version.
import { execFileSync } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSystemGitAdapter } from '../src/modules/git-adapter'
import { createSqliteIndexCache } from '../src/modules/index-cache'
import { createFileRepositoryStore } from '../src/modules/repository-store'
import { cacheFileName, createWorkspace, type WorkspaceService } from '../src/modules/workspace'

const quiet = { info: () => {}, warn: () => {}, error: () => {} }

async function setup(): Promise<{ ws: WorkspaceService; root: string; a: string; a1: string; a2: string; b: string }> {
  const root = join(await mkdtemp(join(tmpdir(), 'rq-comfort-')), 'work')
  const userDir = await mkdtemp(join(tmpdir(), 'rq-comfort-user-'))
  const ws = createWorkspace({
    store: createFileRepositoryStore(join(__dirname, '..', 'config', 'default-schema.yaml')),
    git: createSystemGitAdapter(),
    openIndex: (r: string) => createSqliteIndexCache(join(userDir, 'cache', cacheFileName(r))),
    userDir,
    log: quiet,
    watchFiles: false
  } as Parameters<typeof createWorkspace>[0])
  execFileSync('git', ['init', '-q', '-b', 'main', root])
  execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: root })
  execFileSync('git', ['config', 'user.email', 't@example.invalid'], { cwd: root })
  await ws.initialize(root, 'Spec')
  const save = async (type: string, title: string, parent?: string, extra: Record<string, unknown> = {}): Promise<string> => {
    const it = { ...ws.newItem(type, parent), title, text: `${title} text`, ...extra }
    const r = await ws.saveItem(it as never, null)
    expect(r.ok).toBe(true)
    return it.id
  }
  const a = await save('system-requirement', 'Door lock', undefined, { fields: { status: 'Approved', priority: 'High', tags: ['door'] } })
  const a1 = await save('system-requirement', 'Lock in 2 s', a, { fields: { status: 'Approved' } })
  const a2 = await save('system-requirement', 'Unlock on crash', a)
  const b = await save('test-case', 'Door test')
  expect((await ws.addLink(b, 'verifies', a)).ok).toBe(true)
  expect((await ws.addLink(a1, 'refines', a)).ok).toBe(true)
  return { ws, root, a, a1, a2, b }
}

const top = async (ws: WorkspaceService): Promise<string[]> => (await ws.query({ parent: null, limit: 100, sort: { by: 'order', descending: false } })).items.map((i) => i.id)

describe('0.27.0 duplicate', () => {
  it('a copy right below, new ID, no links, Status back to its default, other fields kept', async () => {
    const { ws, a, b } = await setup()
    const r = await ws.duplicateItem(a, false)
    if (!r.ok) throw new Error(r.message)
    expect(r.count).toBe(1)
    expect(r.newId).not.toBe(a)
    expect(await top(ws)).toEqual([a, r.newId, b])
    const copy = (await ws.getItem(r.newId))?.item
    expect(copy?.title).toBe('Door lock')
    expect(copy?.text).toBe('Door lock text')
    expect(copy?.fields).toMatchObject({ status: 'Draft', priority: 'High', tags: ['door'] })
    expect(copy?.links).toEqual([])
    expect((await ws.getItem(r.newId))?.childCount).toBe(0)
    expect((await ws.getItem(r.newId))?.incoming).toEqual([]) // the test verifies the original only
  })
  it('with the items below: the same shape under the copy, their links to each other not copied either', async () => {
    const { ws, a, a1, a2 } = await setup()
    const r = await ws.duplicateItem(a, true)
    if (!r.ok) throw new Error(r.message)
    expect(r.count).toBe(3)
    const kids = (await ws.query({ parent: r.newId, limit: 10, sort: { by: 'order', descending: false } })).items
    expect(kids.map((k) => k.title)).toEqual(['Lock in 2 s', 'Unlock on crash'])
    expect(kids.every((k) => k.id !== a1 && k.id !== a2)).toBe(true)
    expect((await ws.getItem(kids[0]?.id ?? ''))?.item.links).toEqual([])
    expect((await ws.query({ parent: a, limit: 10 })).total).toBe(2) // the originals stay
  })
  it('a child copy goes right below the child, under the same parent', async () => {
    const { ws, a, a1, a2 } = await setup()
    const r = await ws.duplicateItem(a1, false)
    if (!r.ok) throw new Error(r.message)
    expect((await ws.query({ parent: a, limit: 10, sort: { by: 'order', descending: false } })).items.map((i) => i.id)).toEqual([a1, r.newId, a2])
  })
})

describe('0.27.0 change many items', () => {
  it('sets a choice, skips the ones already so, and writes nothing else', async () => {
    const { ws, a, a1, a2 } = await setup()
    const r = await ws.changeItems([a, a1, a2], { kind: 'set', field: 'status', value: 'Approved' })
    expect(r).toEqual({ ok: true, changed: 1, unchanged: 2, failed: [] })
    expect((await ws.getItem(a2))?.item.fields.status).toBe('Approved')
    expect((await ws.getItem(a))?.item.links).toEqual([]) // untouched
  })
  it('a value the field does not allow is refused per item, nothing written', async () => {
    const { ws, a, a1 } = await setup()
    const r = await ws.changeItems([a, a1], { kind: 'set', field: 'status', value: 'Maybe' })
    if (!r.ok) throw new Error(r.message)
    expect(r.changed).toBe(0)
    expect(r.failed.map((f) => f.id).sort()).toEqual([a, a1].sort())
    expect((await ws.getItem(a))?.item.fields.status).toBe('Approved')
  })
  it('adds and removes words in a list field; clears a field; an empty value clears too', async () => {
    const { ws, a, a1 } = await setup()
    expect(await ws.changeItems([a, a1], { kind: 'add', field: 'tags', values: ['safety', 'door'] })).toMatchObject({ changed: 2 })
    expect((await ws.getItem(a))?.item.fields.tags).toEqual(['door', 'safety'])
    expect((await ws.getItem(a1))?.item.fields.tags).toEqual(['safety', 'door'])
    expect(await ws.changeItems([a, a1], { kind: 'remove', field: 'tags', values: ['door'] })).toMatchObject({ changed: 2 })
    expect((await ws.getItem(a))?.item.fields.tags).toEqual(['safety'])
    expect(await ws.changeItems([a], { kind: 'clear', field: 'priority' })).toMatchObject({ changed: 1 })
    expect((await ws.getItem(a))?.item.fields.priority).toBeUndefined()
    expect(await ws.changeItems([a1], { kind: 'set', field: 'owner', value: 'Bob' })).toMatchObject({ changed: 1 })
    expect(await ws.changeItems([a1], { kind: 'set', field: 'owner', value: '' })).toMatchObject({ changed: 1 })
    expect((await ws.getItem(a1))?.item.fields.owner).toBeUndefined()
  })
  it('changes the type; refuses words for a field that is not a list, and unknown fields or types', async () => {
    const { ws, a2 } = await setup()
    expect(await ws.changeItems([a2], { kind: 'type', type: 'software-requirement' })).toMatchObject({ changed: 1 })
    expect((await ws.getItem(a2))?.item.type).toBe('software-requirement')
    expect(await ws.changeItems([a2], { kind: 'add', field: 'status', values: ['x'] })).toMatchObject({ ok: false })
    expect(await ws.changeItems([a2], { kind: 'set', field: 'nope', value: 'x' })).toMatchObject({ ok: false })
    expect(await ws.changeItems([a2], { kind: 'type', type: 'nope' })).toMatchObject({ ok: false })
  })
  it('a hand edit not yet indexed is kept (each file is read again before writing); a missing item is named', async () => {
    const { ws, root, a } = await setup()
    // a hand edit the index has not seen yet still counts: each file is read again right before writing
    const path = join(root, 'requirements', 'Spec', `${a}.md`)
    const { readFile } = await import('node:fs/promises')
    await writeFile(path, (await readFile(path, 'utf8')).replace('priority: High', 'priority: Low'))
    const r = await ws.changeItems([a, 'REQ-NOTHERE'], { kind: 'set', field: 'owner', value: 'Ann' })
    if (!r.ok) throw new Error(r.message)
    expect(r.changed).toBe(1)
    expect((await ws.getItem(a))?.item.fields).toMatchObject({ owner: 'Ann', priority: 'Low' }) // the hand edit is kept
    expect(r.failed.map((f) => f.id)).toEqual(['REQ-NOTHERE'])
  })
})

describe('0.27.0 restore one item’s old version', () => {
  it('brings back title, type, text and fields; place and links stay; an uncommitted change', async () => {
    const { ws, a, a1 } = await setup()
    expect((await ws.commit('first')).ok).toBe(true)
    const first = (await ws.itemHistory(a1))[0]?.hash ?? ''
    const now = await ws.getItem(a1)
    if (!now) throw new Error('missing')
    expect((await ws.saveItem({ ...now.item, title: 'Lock in 1 s', text: 'changed', fields: { status: 'Review', owner: 'Zoe' } }, now.revision)).ok).toBe(true)
    expect((await ws.commit('second')).ok).toBe(true)
    const r = await ws.restoreItemVersion(a1, first)
    expect(r).toEqual({ ok: true })
    const back = (await ws.getItem(a1))?.item
    expect(back?.title).toBe('Lock in 2 s')
    expect(back?.text).toBe('Lock in 2 s text')
    expect(back?.fields).toEqual({ status: 'Approved' })
    expect(back?.parent).toBe(a)
    expect(back?.links.map((l) => l.target)).toEqual([a])
    expect((await ws.gitState()).changes.length).toBe(1)
    expect(await ws.restoreItemVersion(a1, 'deadbeef')).toMatchObject({ ok: false })
    // the restore is uncommitted now: a second restore over it is refused
    const again = await ws.restoreItemVersion(a1, first)
    expect(again.ok).toBe(false)
    expect(again.ok ? '' : again.message).toMatch(/uncommitted change/)
    // after committing, a short hash works too
    expect((await ws.commit('restored')).ok).toBe(true)
    const second = (await ws.itemHistory(a1))[1]?.hash ?? ''
    expect(await ws.restoreItemVersion(a1, second.slice(0, 8))).toEqual({ ok: true })
    expect((await ws.getItem(a1))?.item.title).toBe('Lock in 1 s')
  })
})

describe('0.27.0 window-call checks', () => {
  it('itemsChange and commitHash refuse bad input; empty words are dropped', async () => {
    const v = await import('../src/main/validate')
    expect(v.itemsChange({ kind: 'add', field: 'tags', values: ['a', ' ', ''] })).toEqual({ kind: 'add', field: 'tags', values: ['a'] })
    expect(v.itemsChange({ kind: 'type', type: 'test-case' })).toEqual({ kind: 'type', type: 'test-case' })
    for (const bad of [null, { kind: 'drop', field: 'x' }, { kind: 'set', field: '' }, { kind: 'add', field: 'tags', values: 'a' }]) expect(() => v.itemsChange(bad)).toThrow()
    expect(v.commitHash('a'.repeat(40))).toBe('a'.repeat(40))
    for (const bad of ['abc', 'ABCDEF12', 'zzzzzzzz', 7]) expect(() => v.commitHash(bad)).toThrow()
  })
})
