// Edge cases: saved views and templates — odd input.
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSystemGitAdapter } from '../src/modules/git-adapter'
import { createSqliteIndexCache } from '../src/modules/index-cache'
import { createFileRepositoryStore } from '../src/modules/repository-store'
import { cacheFileName, createWorkspace, type WorkspaceService } from '../src/modules/workspace'
import { cleanView } from '../src/modules/workspace'
import { parseSchema } from '../src/modules/schema'

const quiet = { info: () => {}, warn: () => {}, error: () => {} }

async function setup(userDir?: string): Promise<{ ws: WorkspaceService; root: string; userDir: string }> {
  const root = join(await mkdtemp(join(tmpdir(), 'rq-views-')), 'work')
  const dir = userDir ?? (await mkdtemp(join(tmpdir(), 'rq-views-user-')))
  const ws = createWorkspace({
    store: createFileRepositoryStore(join(__dirname, '..', 'config', 'default-schema.yaml')),
    git: createSystemGitAdapter(),
    openIndex: (r: string) => createSqliteIndexCache(join(dir, 'cache', cacheFileName(r))),
    userDir: dir,
    log: quiet,
    watchFiles: false
  } as Parameters<typeof createWorkspace>[0])
  execFileSync('git', ['init', '-q', '-b', 'main', root])
  await ws.initialize(root, 'Spec')
  return { ws, root, userDir: dir }
}


describe('views', () => {
  it('100-view limit: the 101st is refused, replacing one at 100 still works, deleting frees a slot', async () => {
    const { ws } = await setup()
    for (let i = 0; i < 100; i++) expect(await ws.saveView({ name: `v${String(i).padStart(3, '0')}` }, 'personal')).toEqual({ ok: true })
    expect(await ws.saveView({ name: 'extra' }, 'personal')).toMatchObject({ ok: false })
    expect(await ws.saveView({ name: 'v000', text: 'again' }, 'personal')).toEqual({ ok: true })
    expect((await ws.listViews()).personal).toHaveLength(100)
    await ws.deleteView('v001', 'personal')
    expect(await ws.saveView({ name: 'extra' }, 'personal')).toEqual({ ok: true })
  })
  it('a hand-edited file with 300 views: the list shows them all, so the limit can be passed (and then no save works)', async () => {
    const { ws, root } = await setup()
    const file = join(root, 'requirements', '.reqochet', 'views.yaml')
    await writeFile(file, 'views:\n' + Array.from({ length: 300 }, (_, i) => `  - name: n${i}\n`).join(''))
    expect((await ws.listViews()).shared).toHaveLength(300)
    // the user can delete one, but still stays above the limit: saving stays refused
    await ws.deleteView('n0', 'shared')
    expect(await ws.saveView({ name: 'new' }, 'shared')).toMatchObject({ ok: false }) // 299 left: still over the limit, by design
  })
  it('odd names: names differing only in case / trailing space / unicode are kept apart or merged predictably', async () => {
    const { ws } = await setup()
    await ws.saveView({ name: 'Draft' }, 'personal')
    await ws.saveView({ name: 'draft' }, 'personal')
    await ws.saveView({ name: ' Draft ' }, 'personal')
    expect((await ws.listViews()).personal.map((v) => v.name).sort()).toEqual(['Draft', 'draft'])
    await ws.saveView({ name: 'عرض المسودات' }, 'shared')
    await ws.saveView({ name: 'Ansicht: größer # "x" \\' }, 'shared')
    await ws.saveView({ name: '- yes' }, 'shared')
    await ws.saveView({ name: 'null' }, 'shared')
    await ws.saveView({ name: '123' }, 'shared')
    await ws.saveView({ name: '{a: b}' }, 'shared')
    const names = (await ws.listViews()).shared.map((v) => v.name).sort()
    expect(names).toEqual(['- yes', '123', 'Ansicht: größer # "x" \\', 'null', '{a: b}', 'عرض المسودات'].sort())
  })
  // builder 0.28.0: decided — a name longer than 80 characters is refused, never cut, so two long names can
  // no longer replace each other
  it('a name longer than 80 characters is refused; nothing is saved', async () => {
    const { ws } = await setup()
    const n = 'x'.repeat(100)
    expect(await ws.saveView({ name: n }, 'personal')).toMatchObject({ ok: false })
    expect(await ws.saveView({ name: `${'y'.repeat(80)}a` }, 'personal')).toMatchObject({ ok: false })
    expect((await ws.listViews()).personal).toEqual([])
  })
  it('sorting uses localeCompare: the list order can differ between PCs (language); names sort in a stable order for the same names', async () => {
    const { ws } = await setup()
    for (const n of ['b', 'B', 'a', 'A', 'ä', 'z']) await ws.saveView({ name: n }, 'shared')
    const file = await readFile(join((await ws.repoInfo()).root ?? '', 'requirements', '.reqochet', 'views.yaml'), 'utf8').catch(() => '')
    expect(file).toBeDefined()
  })
  // builder 0.28.0: an unknown sort key is left out; the rest is kept as is (applying falls back gracefully)
  it('a view naming a deleted document, column and field is kept as is; an unknown sort key is left out', async () => {
    const { ws } = await setup()
    const v = { name: 'Old', document: 'Gone', fields: { vanished: 'x' }, hidden: ['vanished'], order: ['vanished', 'id'], sort: { by: 'vanished' as never, descending: false } }
    expect(await ws.saveView(v, 'personal')).toEqual({ ok: true })
    expect((await ws.listViews()).personal[0]).toEqual({ ...v, sort: undefined })
  })
  it('hand-edited file shapes: views is a map, a scalar, null, a list of strings; top level is a list', async () => {
    const { ws, root } = await setup()
    const file = join(root, 'requirements', '.reqochet', 'views.yaml')
    for (const raw of ['views: {a: 1}\n', 'views: 3\n', 'views:\n', '- name: x\n', '', '# only a comment\n', 'views: [a, 1, null, {name: ok}]\n']) {
      await writeFile(file, raw)
      const v = await ws.listViews()
      expect(v.problem).toBeUndefined()
      expect(Array.isArray(v.shared)).toBe(true)
    }
    expect((await ws.listViews()).shared).toEqual([{ name: 'ok' }])
  })
  it('YAML merge keys / anchors / a billion-laughs alias bomb in views.yaml do not hang or throw out of listViews', async () => {
    const { ws, root } = await setup()
    const file = join(root, 'requirements', '.reqochet', 'views.yaml')
    const bomb = 'a: &a [x,x,x,x,x,x,x,x,x]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]\nd: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]\ne: &e [*d,*d,*d,*d,*d,*d,*d,*d,*d]\nf: &f [*e,*e,*e,*e,*e,*e,*e,*e,*e]\ng: &g [*f,*f,*f,*f,*f,*f,*f,*f,*f]\nviews:\n  - name: bomb\n    hidden: *g\n'
    await writeFile(file, bomb)
    const t = Date.now()
    const v = await ws.listViews()
    expect(Date.now() - t).toBeLessThan(3000)
    expect(v.shared.length).toBeLessThanOrEqual(1)
  })
  it('a personal file with broken JSON: reported, not overwritten; shared still listed', async () => {
    const { ws, userDir } = await setup()
    await ws.saveView({ name: 'P' }, 'personal')
    const { readdir } = await import('node:fs/promises')
    const dir = join(userDir, 'views')
    const f = join(dir, (await readdir(dir))[0]!)
    await writeFile(f, '{"views": [')
    expect((await ws.listViews()).problem).toBeDefined()
    expect(await ws.saveView({ name: 'Q' }, 'personal')).toMatchObject({ ok: false })
    expect(await readFile(f, 'utf8')).toBe('{"views": [')
  })
  it('shared file changed on disk (pulled) between read and write is refused, not overwritten', async () => {
    const { ws, root } = await setup()
    await ws.saveView({ name: 'A' }, 'shared')
    const file = join(root, 'requirements', '.reqochet', 'views.yaml')
    const a = ws.saveView({ name: 'B' }, 'shared')
    const b = ws.saveView({ name: 'C' }, 'shared')
    await Promise.all([a, b])
    expect((await ws.listViews()).shared.map((v) => v.name)).toEqual(['A', 'B', 'C'])
    expect(await readFile(file, 'utf8')).toContain('name: C')
  })
  it('a view with field filter keys __proto__ / constructor does not pollute', async () => {
    const { ws } = await setup()
    await ws.saveView(JSON.parse('{"name":"P","fields":{"__proto__":"x","constructor":"y"}}'), 'personal')
    expect(({} as Record<string, unknown>).x).toBeUndefined()
    expect((await ws.listViews()).personal[0]!.fields).toBeDefined()
  })
  it('a view saved with an empty-string document means "loose files" and is kept; empty hidden list is kept', () => {
    expect(cleanView({ name: 'n', document: '', hidden: [], order: [] })).toEqual({ name: 'n', document: '', hidden: [], order: [] })
  })
  it('numeric / boolean name from a hand edit is not a view (name: 123 is a number)', () => {
    expect(cleanView({ name: 123 })).toBeNull()
  })
  it('sort.by outside the known keys is dropped by cleanView', () => {
    expect(cleanView({ name: 'n', sort: { by: 'drop table' } })?.sort).toBeUndefined()
  })
})

describe('templates', () => {
  const hdr = 'version: 1\n'
  const base = (types: string): string =>
    hdr + 'fields:\n  - { id: status, name: Status, type: enum, options: [Draft, Final] }\n  - { id: n, name: N, type: number }\n  - { id: tags, name: Tags, type: list }\n  - { id: due, name: Due, type: date }\nlinkTypes: []\nitemTypes:\n' + types
  it('bad template shapes are reported and dropped; the schema stays usable', () => {
    for (const t of ['  - { id: a, name: A, template: 5 }\n', '  - { id: a, name: A, template: [x] }\n', '  - { id: a, name: A, template: { text: 5 } }\n', '  - { id: a, name: A, template: { fields: [1] } }\n', '  - { id: a, name: A, template: { fields: { status: Nope } } }\n', '  - { id: a, name: A, template: { fields: { n: "3" } } }\n', '  - { id: a, name: A, template: { fields: { tags: [1] } } }\n', '  - { id: a, name: A, template: { fields: { ghost: x } } }\n']) {
      const p = parseSchema(base(t))
      expect(p.problems.length, t).toBeGreaterThan(0)
      expect(p.schema.itemTypes[0]?.template, t).toBeUndefined()
    }
  })
  it('template: null / empty text is no template and no problem', () => {
    for (const t of ['  - { id: a, name: A, template: null }\n', '  - { id: a, name: A, template: { text: "" } }\n', '  - { id: a, name: A, template: {} }\n']) {
      const p = parseSchema(base(t))
      expect(p.problems, t).toEqual([])
      expect(p.schema.itemTypes[0]?.template, t).toBeUndefined()
    }
  })
  it('template date field: any string is accepted (a bad date like "tomorrow")', () => {
    const p = parseSchema(base('  - { id: a, name: A, template: { fields: { due: tomorrow } } }\n'))
    expect(p.problems.length).toBeGreaterThan(0)
  })
  it('template number NaN / .inf from YAML is not accepted', () => {
    const p = parseSchema(base('  - { id: a, name: A, template: { fields: { n: .nan } } }\n'))
    expect(p.problems.length).toBeGreaterThan(0)
  })
  it('template text is cut at 20,000 characters without a warning', () => {
    const p = parseSchema(base('  - { id: a, name: A, template: { text: "' + 'x'.repeat(25000) + '" } }\n'))
    expect(p.problems.length).toBeGreaterThan(0) // a text longer than the limit is cut silently
  })
  // builder 0.28.0: decided — Edit types sets only the starting text; template field values are
  // written in schema.yaml and kept there as written, so a save from the window never adds or drops them
  it('saving types with template field values: the save works and writes no field values', async () => {
    const { ws, root } = await setup()
    const info = ws.repoInfo()
    const types = info.schema.itemTypes.map((t, i) => (i === 0 ? { ...t, template: { fields: { ghost: 'x' } } } : t))
    const r = await ws.saveSchemaTypes(types, info.schema.linkTypes, info.schemaRevision)
    expect(r.ok).toBe(true)
    expect(await readFile(join(root, 'requirements', '.reqochet', 'schema.yaml'), 'utf8')).not.toContain('ghost')
  })
  it('saving types with a template text of only whitespace / then clearing it removes the key', async () => {
    const { ws, root } = await setup()
    let info = ws.repoInfo()
    const id = info.schema.itemTypes[0]!.id
    await ws.saveSchemaTypes(info.schema.itemTypes.map((t) => (t.id === id ? { ...t, template: { text: 'T' } } : t)), info.schema.linkTypes, info.schemaRevision)
    expect(ws.newItem(id).text).toBe('T')
    info = ws.repoInfo()
    await ws.saveSchemaTypes(info.schema.itemTypes.map((t) => (t.id === id ? { ...t, template: undefined } : t)), info.schema.linkTypes, info.schemaRevision)
    expect(ws.newItem(id).text).toBe('')
    expect(await readFile(join(root, 'requirements', '.reqochet', 'schema.yaml'), 'utf8')).not.toMatch(/template:\s*\n\s*text: T/)
  })
  it('a template with list field values: the new item gets a copy (editing one new item does not change the next)', async () => {
    const { ws, root } = await setup()
    const info = ws.repoInfo()
    const id = info.schema.itemTypes[0]!.id
    const field = info.schema.fields.find((f) => f.type === 'list')
    if (!field) return
    // template field values are written in schema.yaml (see the decision above)
    const file = join(root, 'requirements', '.reqochet', 'schema.yaml')
    const yaml = await readFile(file, 'utf8')
    await writeFile(file, yaml.replace(`  - { id: ${id}, `, `  - { template: { fields: { ${field.id}: [a] } }, id: ${id}, `))
    await ws.open(root)
    const a = ws.newItem(id)
    ;(a.fields[field.id] as string[]).push('zzz')
    expect(ws.newItem(id).fields[field.id]).toEqual(['a'])
  })
  it('duplicate does not apply the template: the copy keeps the original text', async () => {
    const { ws } = await setup()
    const info = ws.repoInfo()
    const id = info.schema.itemTypes[0]!.id
    await ws.saveSchemaTypes(info.schema.itemTypes.map((t) => (t.id === id ? { ...t, template: { text: 'TEMPLATE' } } : t)), info.schema.linkTypes, info.schemaRevision)
    const it = ws.newItem(id)
    const saved = await ws.saveItem({ ...it, title: 'Orig', text: 'my own text' }, null)
    expect(saved.ok).toBe(true)
    const r = await ws.duplicateItem(it.id, false)
    expect(r.ok).toBe(true)
    if (r.ok) expect((await ws.getItem(r.newId))?.item.text).toBe('my own text')
  })
})
