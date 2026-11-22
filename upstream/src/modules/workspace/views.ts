// Saved views (0.28.0, theme 2 — B-2 a): a name for the table as it is set up now (document, search, filters,
// sort, columns, rows with text). Personal views stay on this PC; shared views live in the project's
// requirements/.reqochet/views.yaml and travel through Git with the requirements.
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { SavedView, SavedViews, ViewPlace } from '../../shared/api'
import { writeFileAtomic } from '../safe-files'
import type { WorkspaceContext } from './context'
import { T } from '../../shared/text'

export const VIEWS_FILE = 'views.yaml'
/** Views per place: a long list is not a menu any more. */
export const MAX_VIEWS = 100
const LINK_FILTERS = ['', 'suspect', 'none', 'incomplete', 'gaps'] as const
const SORT_KEYS: readonly string[] = ['id', 'type', 'title', 'order', 'number', 'relevance', 'text', 'links']

export function createViewOps(ctx: WorkspaceContext, opts: { userDir: string; cacheName: (root: string) => string }) {
  const personalFile = (root: string): string => join(opts.userDir, 'views', opts.cacheName(root).replace(/\.sqlite$/, '.json'))
  const sharedFile = (): string => {
    const s = ctx.need()
    return join(s.repo.folder, s.repo.metaDir, VIEWS_FILE)
  }

  /**
   * The views (cleaned, for the menu) and the file's own entries as written (`entries`): a save or delete changes only
   * the one entry by name and keeps every other entry, key and top-level key as it is.
   */
  async function read(place: ViewPlace): Promise<{ views: SavedView[]; raw: string | null; entries: unknown[]; data: Record<string, unknown> }> {
    const file = place === 'shared' ? sharedFile() : personalFile(ctx.need().repo.root)
    const raw = await readFile(file, 'utf8').catch(() => null)
    if (raw === null) return { views: [], raw, entries: [], data: {} }
    try {
      const parsed: unknown = place === 'shared' ? parseYaml(raw) : JSON.parse(raw)
      const data = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
      const entries = Array.isArray(data.views) ? (data.views as unknown[]) : []
      return { views: entries.map(cleanView).filter((v): v is SavedView => v !== null), raw, entries, data }
    } catch {
      // a broken file (a hand edit, a merge mark) shows no views; it is never overwritten without notice
      throw new Error(T.views.fileBroken(place === 'shared' ? `requirements/${ctx.need().repo.metaDir}/${VIEWS_FILE}` : file))
    }
  }

  async function write(place: ViewPlace, views: unknown[], rawBefore: string | null, data: Record<string, unknown>): Promise<void> {
    const file = place === 'shared' ? sharedFile() : personalFile(ctx.need().repo.root)
    // the file must still be as it was read (NFR-05): someone may have pulled or edited it meanwhile
    const now = await readFile(file, 'utf8').catch(() => null)
    if (now !== rawBefore) throw new Error(T.wsMsg.changedMeanwhile)
    if (place === 'personal') {
      await mkdir(join(opts.userDir, 'views'), { recursive: true })
      await writeFileAtomic(file, `${JSON.stringify({ ...data, views }, null, 2)}\n`)
    } else {
      await writeFileAtomic(file, `${T.views.fileComment}\n${stringifyYaml({ ...data, views }, { lineWidth: 0 })}`)
    }
  }

  return {
    async listViews(): Promise<SavedViews> {
      const out: SavedViews = { personal: [], shared: [] }
      for (const place of ['personal', 'shared'] as const) {
        try {
          out[place] = (await read(place)).views
        } catch (e) {
          out.problem = (e as Error).message
        }
      }
      return out
    },

    /** Saves (or replaces, by name) a view in one place. */
    async saveView(view: SavedView, place: ViewPlace): Promise<{ ok: true } | { ok: false; message: string }> {
      const clean = cleanView(view)
      if (!clean) return { ok: false, message: T.views.nameNeeded }
      try {
        const { raw, entries, data } = await read(place)
        const others = entries.filter((e) => nameOf(e) !== clean.name)
        if (others.length >= MAX_VIEWS) return { ok: false, message: T.views.tooMany(MAX_VIEWS) }
        // the same order on every PC (byte-wise, not the PC's language — C6), so Git sees no needless changes
        const sorted = [...others, clean].sort((a, b) => (nameOf(a) < nameOf(b) ? -1 : nameOf(a) > nameOf(b) ? 1 : 0))
        await write(place, sorted, raw, data)
        ctx.log.info(`Saved the ${place} view "${clean.name}"`)
        return { ok: true }
      } catch (e) {
        return { ok: false, message: (e as Error).message }
      }
    },

    async deleteView(name: string, place: ViewPlace): Promise<{ ok: true } | { ok: false; message: string }> {
      try {
        const { raw, entries, data } = await read(place)
        if (!entries.some((e) => nameOf(e) === name)) return { ok: true }
        await write(
          place,
          entries.filter((e) => nameOf(e) !== name),
          raw,
          data
        )
        ctx.log.info(`Deleted the ${place} view "${name}"`)
        return { ok: true }
      } catch (e) {
        return { ok: false, message: (e as Error).message }
      }
    }
  }
}

/**
 * A view as read from a file someone may have edited by hand: only the known keys, each with the right type; anything
 * else is left out. No name = not a view.
 */
export function cleanView(v: unknown): SavedView | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!name || name.length > 80) return null // never cut: two long names would replace each other
  const str = (x: unknown, max = 500): string | undefined => (typeof x === 'string' ? x.slice(0, max) : undefined)
  const strs = (x: unknown): string[] | undefined => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string').slice(0, 200) : undefined)
  const out: SavedView = { name }
  const document = str(o.document, 200)
  if (document !== undefined) out.document = document
  const text = str(o.text)
  if (text) out.text = text
  const types = str(o.types, 2000)
  if (types) out.types = types
  if (typeof o.links === 'string' && (LINK_FILTERS as readonly string[]).includes(o.links) && o.links !== '') out.links = o.links as SavedView['links']
  if (typeof o.fields === 'object' && o.fields !== null && !Array.isArray(o.fields)) {
    const f = Object.fromEntries(Object.entries(o.fields as Record<string, unknown>).filter(([k, x]) => typeof x === 'string' && x !== '' && k !== '' && k.length <= 120).slice(0, 50)) as Record<string, string>
    if (Object.keys(f).length > 0) out.fields = f
  }
  if (typeof o.sort === 'object' && o.sort !== null) {
    const s = o.sort as Record<string, unknown>
    // a known sort key or a field ("field:<id>"); anything else is left out
    if (typeof s.by === 'string' && (SORT_KEYS.includes(s.by) || /^field:[a-z0-9][a-z0-9-]{0,119}$/.test(s.by))) out.sort = { by: s.by as NonNullable<SavedView['sort']>['by'], descending: s.descending === true }
  }
  const hidden = strs(o.hidden)
  if (hidden) out.hidden = hidden
  const order = strs(o.order)
  if (order) out.order = order
  if (typeof o.oneLine === 'boolean') out.oneLine = o.oneLine
  return out
}

/** An entry's name as written (trimmed), or '' — entries without a name are kept but never matched. */
const nameOf = (e: unknown): string => (typeof e === 'object' && e !== null && typeof (e as { name?: unknown }).name === 'string' ? ((e as { name: string }).name.trim()) : '')
