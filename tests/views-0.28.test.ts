// 0.28.0 saved views: personal views on this PC, shared views in requirements/.reqochet/views.yaml.
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

const view = { name: 'Open safety', document: 'Spec', text: 'door', types: 'system-requirement', links: 'suspect' as const, fields: { status: 'Draft' }, sort: { by: 'title' as const, descending: true }, hidden: ['owner'], order: ['id', 'title'], oneLine: true }

describe('0.28.0 saved views', () => {
  it('a personal view is kept on this PC only; a shared one in the project file', async () => {
    const { ws, root } = await setup()
    expect(await ws.listViews()).toEqual({ personal: [], shared: [] })
    expect(await ws.saveView(view, 'personal')).toEqual({ ok: true })
    expect(await ws.saveView({ ...view, name: 'Team: all drafts', oneLine: false }, 'shared')).toEqual({ ok: true })
    const v = await ws.listViews()
    expect(v.personal).toEqual([view])
    expect(v.shared.map((x) => x.name)).toEqual(['Team: all drafts'])
    const file = await readFile(join(root, 'requirements', '.reqochet', 'views.yaml'), 'utf8')
    expect(file).toMatch(/^# Saved views shared with the team/)
    expect(file).toContain('name: "Team: all drafts"')
    // the shared file is a change Git sees (it travels with commit and push)
    expect((await ws.gitState()).changes.some((c) => c.path.endsWith('views.yaml'))).toBe(true)
  })
  it('the same name replaces; delete removes; the list stays sorted', async () => {
    const { ws } = await setup()
    await ws.saveView({ name: 'B' }, 'personal')
    await ws.saveView({ name: 'A', text: 'x' }, 'personal')
    await ws.saveView({ name: 'A', text: 'y' }, 'personal')
    expect((await ws.listViews()).personal).toEqual([{ name: 'A', text: 'y' }, { name: 'B' }])
    expect(await ws.deleteView('A', 'personal')).toEqual({ ok: true })
    expect((await ws.listViews()).personal.map((x) => x.name)).toEqual(['B'])
    expect(await ws.deleteView('nope', 'personal')).toEqual({ ok: true })
  })
  it('a name is needed', async () => {
    const { ws } = await setup()
    expect(await ws.saveView({ name: '   ' }, 'shared')).toMatchObject({ ok: false })
  })
  it('a broken shared file shows no shared views, says so, and is never overwritten', async () => {
    const { ws, root } = await setup()
    const file = join(root, 'requirements', '.reqochet', 'views.yaml')
    await writeFile(file, 'views: [\n<<<<<<< HEAD\n')
    const v = await ws.listViews()
    expect(v.shared).toEqual([])
    expect(v.problem).toMatch(/views\.yaml/)
    expect(await ws.saveView({ name: 'X' }, 'shared')).toMatchObject({ ok: false })
    expect(await readFile(file, 'utf8')).toContain('<<<<<<< HEAD')
  })
  it('a hand-edited view keeps only what it understands', () => {
    expect(cleanView({ name: ' Mine ', links: 'weird', fields: { status: 'Draft', priority: 3, '': 'x' }, sort: { by: 'title' }, hidden: ['a', 2], extra: true })).toEqual({
      name: 'Mine',
      fields: { status: 'Draft' },
      sort: { by: 'title', descending: false },
      hidden: ['a']
    })
    expect(cleanView({ text: 'no name' })).toBeNull()
    expect(cleanView('x')).toBeNull()
  })
})

describe('0.28.0 templates per type (A8)', () => {
  it('a new test case starts with the template text; saving the types keeps and changes it', async () => {
    const { ws } = await setup()
    const tc = ws.newItem('test-case')
    expect(tc.text).toMatch(/^Preconditions:\n\nSteps:\n1\. /)
    expect(tc.fields.status).toBe('Draft') // the field default still applies
    expect(ws.newItem('system-requirement').text).toBe('')
    const info = ws.repoInfo()
    const types = info.schema.itemTypes.map((t) => (t.id === 'system-requirement' ? { ...t, template: { text: 'The <system> shall …' } } : t))
    const r = await ws.saveSchemaTypes(types, info.schema.linkTypes, info.schemaRevision)
    expect(r.ok).toBe(true)
    expect(ws.newItem('system-requirement').text).toBe('The <system> shall …')
    expect(ws.newItem('test-case').text).toMatch(/^Preconditions:/)
  })
})

describe('0.28.0 code review fixes', () => {
  it('C1: the window call keeps the starting text, so Edit types can save it', async () => {
    const { itemTypeDefs } = await import('../src/main/validate')
    expect(itemTypeDefs([{ id: 'test-case', name: 'Test Case', requirement: true, template: { text: 'Steps:' } }])[0]?.template).toEqual({ text: 'Steps:' })
    expect(itemTypeDefs([{ id: 'test-case', name: 'Test Case', template: { text: '' } }])[0]?.template).toBeUndefined()
    expect(() => itemTypeDefs([{ id: 'test-case', name: 'Test Case', template: 'x' }])).toThrow()
  })
  it('C2: saving the types changes only the starting text; template field values stay as written', async () => {
    const { ws, root } = await setup()
    const file = join(root, 'requirements', '.reqochet', 'schema.yaml')
    const yaml = await readFile(file, 'utf8')
    await writeFile(file, yaml.replace('template: { text: "Preconditions:', 'template: { fields: { renamed-field: x }, text: "Preconditions:'))
    await ws.open(root)
    const info = ws.repoInfo()
    const types = info.schema.itemTypes.map((t) => (t.id === 'test-case' ? { ...t, template: { text: 'New start' } } : t))
    expect((await ws.saveSchemaTypes(types, info.schema.linkTypes, info.schemaRevision)).ok).toBe(true)
    const after = await readFile(file, 'utf8')
    expect(after).toContain('renamed-field: x')
    expect(after).toMatch(/text: "?New start/)
  })
  it('C3: a shared views file keeps entries and keys this version does not know', async () => {
    const { ws, root } = await setup()
    const file = join(root, 'requirements', '.reqochet', 'views.yaml')
    await writeFile(file, 'owner-note: keep me\nviews:\n  - name: Old\n    future-key: 1\n  - nameless: true\n')
    expect(await ws.saveView({ name: 'New' }, 'shared')).toEqual({ ok: true })
    const after = await readFile(file, 'utf8')
    expect(after).toContain('owner-note: keep me')
    expect(after).toContain('future-key: 1')
    expect(after).toContain('nameless: true')
    expect(await ws.deleteView('Old', 'shared')).toEqual({ ok: true })
    expect(await readFile(file, 'utf8')).not.toContain('future-key')
  })
})
