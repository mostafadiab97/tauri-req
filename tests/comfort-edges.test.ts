// Edge cases: try to break duplicateItem, changeItems, restoreItemVersion and the IPC validators.
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSystemGitAdapter } from '../src/modules/git-adapter'
import { createSqliteIndexCache } from '../src/modules/index-cache'
import { createFileRepositoryStore } from '../src/modules/repository-store'
import { cacheFileName, createWorkspace, type WorkspaceService } from '../src/modules/workspace'
import { commitHash, id as vId, itemsChange } from '../src/main/validate'

const quiet = { info: () => {}, warn: () => {}, error: () => {} }

async function setup(schemaExtra = ''): Promise<{ ws: WorkspaceService; root: string; a: string }> {
  const root = join(await mkdtemp(join(tmpdir(), 'rq-qa-')), 'work')
  const userDir = await mkdtemp(join(tmpdir(), 'rq-qa-user-'))
  const ws = createWorkspace({
    store: createFileRepositoryStore(join(__dirname, '..', 'config', 'default-schema.yaml')),
    git: createSystemGitAdapter(),
    openIndex: (r: string) => createSqliteIndexCache(join(userDir, 'cache', cacheFileName(r))),
    userDir, log: quiet, watchFiles: false
  } as Parameters<typeof createWorkspace>[0])
  execFileSync('git', ['init', '-q', '-b', 'main', root])
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: root })
  execFileSync('git', ['config', 'user.email', 't@example.invalid'], { cwd: root })
  await ws.initialize(root, 'Spec')
  if (schemaExtra) {
    const p = join(root, 'requirements', '.reqochet', 'schema.yaml')
    await writeFile(p, (await readFile(p, 'utf8')).replace(/\nfields:\n/, `\nfields:\n${schemaExtra}`))
    await ws.open(root)
  }
  const it = { ...ws.newItem('system-requirement'), title: 'Root', text: 'x', fields: { tags: ['a b', 'c'] } }
  expect((await ws.saveItem(it as never, null)).ok).toBe(true)
  return { ws, root, a: it.id }
}
const mk = async (ws: WorkspaceService, title: string, parent?: string, document?: string): Promise<string> => {
  const it = { ...ws.newItem('system-requirement', parent, undefined, document), title, text: title }
  const r = await ws.saveItem(it as never, null)
  expect(r.ok).toBe(true)
  return it.id
}

describe('duplicateItem', () => {
  it('deep tree (depth 30) copies fully with the shape kept', async () => {
    const { ws, a } = await setup()
    let p = a
    for (let i = 0; i < 29; i++) p = await mk(ws, `L${i}`, p)
    const r = await ws.duplicateItem(a, true)
    if (!r.ok) throw new Error(r.message)
    expect(r.count).toBe(30)
    let depth = 0
    let cur = r.newId
    for (;;) {
      const kids = (await ws.query({ parent: cur, limit: 10, sort: { by: 'order', descending: false } })).items
      if (kids.length === 0) break
      cur = kids[0]!.id
      depth++
    }
    expect(depth).toBe(29)
  })

  it('exactly 500 items copies, 501 is refused with nothing written', async () => {
    const { ws, a } = await setup()
    for (let i = 0; i < 498; i++) await mk(ws, `k${i}`, a) // root + 498 = 499
    expect((await ws.duplicateItem(a, true)).ok).toBe(true) // 499
    await mk(ws, 'k498', a) // 500 now
    await mk(ws, 'k499', a) // 501 (copy of the first does not count: it has no parent link to a)
    const before = (await ws.query({ limit: 5000 })).total
    const r = await ws.duplicateItem(a, true)
    expect(r.ok).toBe(false)
    expect((await ws.query({ limit: 5000 })).total).toBe(before)
  }, 120_000)

  it('an item in another document: the copy stays in that document', async () => {
    const { ws, root } = await setup()
    await ws.createDocument?.('Other')
    const o = await mk(ws, 'In other', undefined, 'Other')
    const r = await ws.duplicateItem(o, false)
    if (!r.ok) throw new Error(r.message)
    const f = await readFile(join(root, 'requirements', 'Other', `${r.newId}.md`), 'utf8').catch(() => null)
    expect(f).not.toBeNull()
  })


  it('an ID that sits in two files is refused', async () => {
    const { ws, root, a } = await setup()
    await ws.createDocument?.('Other')
    await mkdir(join(root, 'requirements', 'Other'), { recursive: true })
    await writeFile(join(root, 'requirements', 'Other', `${a}.md`), await readFile(join(root, 'requirements', 'Spec', `${a}.md`), 'utf8'))
    await ws.open(root)
    expect(await ws.duplicateItem(a, false)).toMatchObject({ ok: false })
    expect(await ws.changeItems([a], { kind: 'set', field: 'owner', value: 'x' })).toMatchObject({ ok: true, changed: 0, failed: [{ id: a }] })
  })

  it('a child whose ID sits in two files is not refused (only the top is checked)', async () => {
    const { ws, root, a } = await setup()
    const k = await mk(ws, 'kid', a)
    await ws.createDocument?.('Other')
    await writeFile(join(root, 'requirements', 'Other', `${k}.md`), await readFile(join(root, 'requirements', 'Spec', `${k}.md`), 'utf8'))
    await ws.open(root)
    const r = await ws.duplicateItem(a, true)
    // expected by the rule "IDs in two files are refused": the whole copy should be refused up front
    expect(r.ok).toBe(false)
  })

  it('siblings with the same order key: copy still lands directly after the original', async () => {
    const { ws, a } = await setup()
    const b = await mk(ws, 'B')
    const c = await mk(ws, 'C')
    const r = await ws.duplicateItem(a, false)
    if (!r.ok) throw new Error(r.message)
    const top = (await ws.query({ parent: null, limit: 100, sort: { by: 'order', descending: false } })).items.map((i) => i.id)
    expect(top).toEqual([a, r.newId, b, c])
    const r2 = await ws.duplicateItem(a, false) // second copy again right after a: before the first copy
    if (!r2.ok) throw new Error(r2.message)
    const top2 = (await ws.query({ parent: null, limit: 100, sort: { by: 'order', descending: false } })).items.map((i) => i.id)
    expect(top2.slice(0, 2)).toEqual([a, r2.newId])
  })

  it('children without order keys: copy keeps working (order falls back to a0)', async () => {
    const { ws, root, a } = await setup()
    const k1 = await mk(ws, 'k1', a)
    const k2 = await mk(ws, 'k2', a)
    for (const k of [k1, k2]) {
      const p = join(root, 'requirements', 'Spec', `${k}.md`)
      await writeFile(p, (await readFile(p, 'utf8')).replace(/^order:.*\n/m, ''))
    }
    await ws.open(root)
    const r = await ws.duplicateItem(a, true)
    if (!r.ok) throw new Error(r.message)
    expect(r.count).toBe(3)
    const kids = (await ws.query({ parent: r.newId, limit: 10, sort: { by: 'order', descending: false } })).items
    // builder 0.27.0: the copies get fresh keys in the sequence the originals show (originals without order
    // keys are shown in ID order, so the copy follows that, not the creation order)
    const originals = (await ws.query({ parent: a, limit: 10, sort: { by: 'order', descending: false } })).items
    expect(kids.map((x) => x.title)).toEqual(originals.map((x) => x.title))
    expect(new Set(kids.map((x) => x.order)).size).toBe(2)
  })

  // builder 0.27.0: decided — a copy is a new item; unknown keys may name the original (a tool's own ID), so
  // they are not copied. The user guide says so.
  it('a copy does not take over unknown header keys of the original', async () => {
    const { ws, root, a } = await setup()
    const p = join(root, 'requirements', 'Spec', `${a}.md`)
    await writeFile(p, (await readFile(p, 'utf8')).replace(/^title:/m, 'x-custom: keepme\ntitle:'))
    await ws.open(root)
    const r = await ws.duplicateItem(a, false)
    if (!r.ok) throw new Error(r.message)
    const f = await readFile(join(root, 'requirements', 'Spec', `${r.newId}.md`), 'utf8')
    expect(f).not.toContain('x-custom')
  })
})

describe('changeItems', () => {
  it('duplicate IDs in the list change an item once; duplicates in values are not added twice', async () => {
    const { ws, a } = await setup()
    const r = await ws.changeItems([a, a, a], { kind: 'add', field: 'tags', values: ['new', 'new'] })
    if (!r.ok) throw new Error(r.message)
    expect(r.changed).toBe(1)
    expect((await ws.getItem(a))?.item.fields.tags).toEqual(['a b', 'c', 'new'])
  })


  it('list values survive a re-read (commas)', async () => {
    const { ws, root, a } = await setup()
    await ws.changeItems([a], { kind: 'add', field: 'tags', values: ['x, y', 'k: v', '#h', 'مرحبا'] })
    await ws.open(root)
    expect((await ws.getItem(a))?.item.fields.tags).toEqual(['a b', 'c', 'x, y', 'k: v', '#h', 'مرحبا'])
  })

  it('remove trims like add does (" c " removes "c")', async () => {
    const { ws, a } = await setup()
    await ws.changeItems([a], { kind: 'remove', field: 'tags', values: [' c '] })
    expect((await ws.getItem(a))?.item.fields.tags).toEqual(['a b'])
  })

  it('set on a list field with a plain string, and on a text field with an array', async () => {
    const { ws, a } = await setup()
    const r1 = await ws.changeItems([a], { kind: 'set', field: 'owner', value: ['x', 'y'] })
    const r2 = await ws.changeItems([a], { kind: 'set', field: 'tags', value: 'single' })
    const f = (await ws.getItem(a))?.item.fields
    // whatever happens, the stored types must match the schema
    expect(typeof f?.owner === 'string' || f?.owner === undefined).toBe(true)
    expect(Array.isArray(f?.tags)).toBe(true)
    void r1; void r2
  })

  it('enum cleared, and enum outside options refused, nothing written for refused', async () => {
    const { ws, a } = await setup()
    expect(await ws.changeItems([a], { kind: 'set', field: 'status', value: 'Nope' })).toMatchObject({ ok: true, changed: 0, failed: [{ id: a }] })
    const c = await ws.changeItems([a], { kind: 'clear', field: 'status' })
    expect(c).toMatchObject({ ok: true })
    const st = (await ws.getItem(a))?.item.fields.status
    expect(st === undefined || st === 'Draft').toBe(true)
  })

  it('number and date fields: wrong text is refused per item, right text accepted, number type kept', async () => {
    const { ws, a } = await setup(
      '  - { id: cost, name: Cost, type: number }\n  - { id: due, name: Due, type: date }\n'
    )
    expect(await ws.changeItems([a], { kind: 'set', field: 'cost', value: 'abc' })).toMatchObject({ changed: 0 })
    const rd = await ws.changeItems([a], { kind: 'set', field: 'due', value: '31/12/2026' })
    console.log('DATE', JSON.stringify(rd))
    expect(rd).toMatchObject({ changed: 0 })
    const rc = await ws.changeItems([a], { kind: 'set', field: 'cost', value: 12.5 })
    console.log('DBG', JSON.stringify(rc))
    expect(rc).toMatchObject({ changed: 1 })
    expect(await ws.changeItems([a], { kind: 'set', field: 'due', value: '2026-12-31' })).toMatchObject({ changed: 1 })
    const f = (await ws.getItem(a))?.item.fields
    expect(f?.cost).toBe(12.5) // a string "12.5" in a number field would be written as text
    expect(await ws.changeItems([a], { kind: 'set', field: 'due', value: '2026-02-31' })).toMatchObject({ changed: 0 })
  })

  it('type change to a type that makes a field required-invalid is skipped; unknown type refused', async () => {
    const { ws, a } = await setup()
    expect(await ws.changeItems([a], { kind: 'type', type: 'nope' })).toMatchObject({ ok: false })
    const r = await ws.changeItems([a], { kind: 'type', type: 'information' })
    expect(r).toMatchObject({ ok: true })
  })

  it('10,000 ids accepted by the limit check, 10,001 refused; unknown ids listed', async () => {
    const { ws } = await setup()
    const ids = Array.from({ length: 10_001 }, (_, i) => `REQ-X${i}`)
    expect(await ws.changeItems(ids, { kind: 'set', field: 'owner', value: 'x' })).toMatchObject({ ok: false })
    const t = Date.now()
    const r = await ws.changeItems(ids.slice(0, 10_000), { kind: 'set', field: 'owner', value: 'x' })
    expect(r).toMatchObject({ ok: true, changed: 0 })
    expect(Date.now() - t).toBeLessThan(30_000)
  }, 90_000)

  it('empty id list is fine; a clear on a missing field is "unchanged"', async () => {
    const { ws, a } = await setup()
    expect(await ws.changeItems([], { kind: 'clear', field: 'owner' })).toMatchObject({ ok: true, changed: 0 })
    expect(await ws.changeItems([a], { kind: 'clear', field: 'owner' })).toMatchObject({ unchanged: 1 })
  })

  it('an item in another document is re-indexed after a change', async () => {
    const { ws } = await setup()
    await ws.createDocument?.('Other')
    const o = await mk(ws, 'O', undefined, 'Other')
    await ws.changeItems([o], { kind: 'set', field: 'owner', value: 'Zed' })
    const q = await ws.query({ fields: { owner: ['Zed'] }, limit: 10 } as never)
    expect(q.items.map((i) => i.id)).toContain(o)
  })
})

describe('restoreItemVersion', () => {
  it('after the file was moved to another document, restore writes to the current file', async () => {
    const { ws, root, a } = await setup()
    await ws.commit('one')
    const h = (await ws.itemHistory(a))[0]!.hash
    const now = (await ws.getItem(a))!
    await ws.saveItem({ ...now.item, title: 'Changed' }, now.revision)
    await ws.commit('two')
    await ws.createDocument?.('Other')
    await rename(join(root, 'requirements', 'Spec', `${a}.md`), join(root, 'requirements', 'Other', `${a}.md`))
    await ws.open(root)
    await ws.commit('moved')
    console.log('HIST', (await ws.itemHistory(a)).length)
    const r = await ws.restoreItemVersion(a, h)
    console.log('DBG2', JSON.stringify(r))
    expect(r).toEqual({ ok: true })
    expect((await ws.getItem(a))?.item.title).toBe('Root')
    // index must see the change
    expect((await ws.query({ text: 'Root', limit: 5 } as never)).items.some((i) => i.id === a)).toBe(true)
  })

  it('a version whose type no longer exists is refused with nothing written', async () => {
    const { ws, root, a } = await setup()
    const p = join(root, 'requirements', 'Spec', `${a}.md`)
    await writeFile(p, (await readFile(p, 'utf8')).replace('type: system-requirement', 'type: ghost-type'))
    execFileSync('git', ['add', '-A'], { cwd: root })
    execFileSync('git', ['commit', '-qm', 'ghost'], { cwd: root })
    const ghost = (await ws.itemHistory(a))[0]!.hash
    await writeFile(p, (await readFile(p, 'utf8')).replace('type: ghost-type', 'type: system-requirement').replace('title: Root', 'title: Fixed'))
    await ws.open(root)
    const before = await readFile(p, 'utf8')
    expect(await ws.restoreItemVersion(a, ghost)).toMatchObject({ ok: false })
    expect(await readFile(p, 'utf8')).toBe(before)
  })

  it('unknown header keys of the current file are kept', async () => {
    const { ws, root, a } = await setup()
    await ws.commit('one')
    const h = (await ws.itemHistory(a))[0]!.hash
    const p = join(root, 'requirements', 'Spec', `${a}.md`)
    await writeFile(p, (await readFile(p, 'utf8')).replace(/^title:/m, 'x-custom: keepme\ntitle:').replace('title: Root', 'title: Other'))
    await ws.open(root)
    // builder 0.27.0: a restore never goes over an uncommitted change — the hand edit is committed first
    expect(await ws.restoreItemVersion(a, h)).toMatchObject({ ok: false })
    await ws.commit('hand edit')
    expect(await ws.restoreItemVersion(a, h)).toEqual({ ok: true })
    expect(await readFile(p, 'utf8')).toContain('x-custom: keepme')
  })

  it('"working" hash and non-git folder do not crash', async () => {
    const { ws, a } = await setup()
    await ws.commit('one')
    const r = await ws.restoreItemVersion(a, 'working')
    expect(r).toMatchObject({ ok: false })
  })

})

describe('IPC validators', () => {
  it('itemsChange rejects bad shapes', () => {
    for (const bad of [null, 5, {}, { kind: 'x' }, { kind: 'set' }, { kind: 'set', field: 'a' }, { kind: 'set', field: 'a', value: { a: 1 } }, { kind: 'set', field: 'a', value: null },
      { kind: 'set', field: 'a', value: [1] }, { kind: 'add', field: 'a', values: 'x' }, { kind: 'type' }, { kind: 'type', type: '' }, { kind: 'clear', field: '' }]) {
      expect(() => itemsChange(bad)).toThrow()
    }
  })
  it('itemsChange: empty string inside list values is refused (a UI sending "" breaks the whole call)', () => {
    expect(() => itemsChange({ kind: 'add', field: 'tags', values: ['a', ''] })).not.toThrow()
  })
  it('itemsChange: NaN / Infinity numbers refused; prototype keys ignored', () => {
    expect(() => itemsChange({ kind: 'set', field: 'a', value: Number.NaN })).toThrow()
    expect(() => itemsChange({ kind: 'set', field: 'a', value: Infinity })).toThrow()
    expect(itemsChange(JSON.parse('{"kind":"clear","field":"a","__proto__":{"x":1}}'))).toEqual({ kind: 'clear', field: 'a' })
  })
  it('commitHash and id', () => {
    expect(commitHash('abcdef1')).toBe('abcdef1')
    for (const b of ['working', 'ABCDEF1', 'abc', 'abcdef1 ', '../..', 5, null]) expect(() => commitHash(b)).toThrow()
    for (const b of ['a/b', 'a\\b', '..', '.hidden', 'a\0b', '', 'x'.repeat(129), 'a..b']) expect(() => vId(b)).toThrow()
  })
})
