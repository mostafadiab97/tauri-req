// Daily comfort (0.27.0, theme 2): duplicate an item (optionally with the items below it) and change many
// items at once. Every write is conflict-checked against the file as it was read (NFR-05); nothing is committed.
import type { Item, ItemsChange, ItemsChangeResult } from '../../shared/api'
import { generateId, keyBetween, validateItem } from '../items'
import { ConflictError } from '../repository-store'
import type { Session, WorkspaceContext } from './context'
import { queryAll } from './context'
import type { StructureOps } from './structure'
import { T } from '../../shared/text'

/** Items one duplicate may copy (a whole document is exported or branched, not duplicated). */
export const MAX_DUPLICATE = 500
/** Items one "change many" may touch. */
export const MAX_CHANGE = 10_000

export function createComfortOps(ctx: WorkspaceContext, structure: StructureOps) {
  const { log } = ctx

  /**
   * A copy of the item right below it, at its level, with a new ID: title, type, text and fields; links are **not**
   * copied (a copy would claim traces nobody checked). Fields that have a default (Status → Draft) start at it:
   * a copy has not been reviewed. With `withChildren` the items below come along, keeping their shape.
   */
  async function duplicateItem(id: string, withChildren: boolean): Promise<{ ok: true; newId: string; count: number } | { ok: false; message: string }> {
    const s = ctx.need()
    if (s.index.pathsOf(id).length > 1) return { ok: false, message: T.wsMsg.idInTwoFiles(id, s.index.pathsOf(id).length) }
    const root = s.index.get(id)
    if (!root) return { ok: false, message: T.wsMsg.missing(id) }
    // the items to copy, parents before children
    const order: string[] = [id]
    if (withChildren) {
      for (let k = 0; k < order.length; k++) {
        const kids = queryAll(s.index, { parent: order[k] as string, sort: { by: 'order', descending: false } }).map((x) => x.id)
        order.push(...kids)
        if (order.length > MAX_DUPLICATE) return { ok: false, message: T.comfort.tooManyToCopy(MAX_DUPLICATE) }
      }
    }
    // one ID in two files anywhere in the copy: which file to copy is unclear
    const twice = order.find((x) => s.index.pathsOf(x).length > 1)
    if (twice) return { ok: false, message: T.wsMsg.idInTwoFiles(twice, s.index.pathsOf(twice).length) }
    const taken = new Set<string>()
    const newIdOf = new Map<string, string>()
    for (const old of order) {
      const fresh = generateId((x) => s.index.get(x) !== undefined || taken.has(x))
      taken.add(fresh)
      newIdOf.set(old, fresh)
    }
    // the copies below keep the originals' sequence with fresh keys (files without order: kept no sequence)
    const keyOf = new Map<string, string>()
    const lastKey = new Map<string, string | null>()
    for (const old of order.slice(1)) {
      const parent = s.index.get(old)?.parent ?? ''
      const k = keyBetween(lastKey.get(parent) ?? null, null)
      keyOf.set(old, k)
      lastKey.set(parent, k)
    }
    const written: string[] = []
    try {
      for (const old of order) {
        const r = await s.repo.readItem(old)
        if (!r || !r.ok) throw new Error(T.wsMsg.unreadable(old))
        const top = old === id
        const copy: Item = {
          id: newIdOf.get(old) as string,
          type: r.item.type,
          title: r.item.title,
          fields: startFields(s, r.item.fields),
          links: [],
          text: r.item.text,
          extra: {},
          document: s.index.get(old)?.document ?? root.document ?? '',
          // the top copy goes right below the original; the others keep their place under their copied parent
          ...(top ? (root.parent ? { parent: root.parent } : {}) : { parent: newIdOf.get(r.item.parent ?? '') as string }),
          order: top ? structure.orderAfter(s, id) : (keyOf.get(old) as string)
        }
        const bad = validateItem(copy, s.repo.schema).filter((x) => x.severity === 'error')
        if (bad.length > 0) throw new Error(bad.map((x) => x.message).join(' '))
        await s.repo.writeItem(copy, { expectedRevision: null })
        written.push(s.repo.itemPath(copy.id, copy.document))
      }
    } catch (e) {
      // what was written stays (each file is whole and valid); the reply says how far it got
      await s.index.syncPaths(s.repo, written)
      log.error(`Duplicating ${id} failed after ${written.length} item(s)`, e)
      return { ok: false, message: T.comfort.copyFailed(written.length, (e as Error).message) }
    }
    await s.index.syncPaths(s.repo, written)
    const newId = newIdOf.get(id) as string
    log.info(`Duplicated ${id} → ${newId} (${written.length} item(s))`)
    return { ok: true, newId, count: written.length }
  }

  /** A copy's fields: those with a default start at it (a copy is not reviewed yet), the others as in the original. */
  function startFields(s: Session, fields: Item['fields']): Item['fields'] {
    const out: Item['fields'] = {}
    for (const [k, v] of Object.entries(fields)) out[k] = Array.isArray(v) ? [...v] : v
    for (const f of s.repo.schema.fields) if (f.default !== undefined) out[f.id] = f.default
    return out
  }

  /**
   * One change for many items (A14): a field set or cleared, words added to or removed from a list field, or the type.
   * Each item is read, changed, checked and written on its own: one that changed on disk meanwhile, or that the change
   * would make invalid, is skipped and listed; the others are written.
   */
  async function changeItems(ids: string[], change: ItemsChange): Promise<ItemsChangeResult> {
    const s = ctx.need()
    const unique = [...new Set(ids)]
    if (unique.length > MAX_CHANGE) return { ok: false, message: T.comfort.tooManyToChange(MAX_CHANGE) }
    const schema = s.repo.schema
    if (change.kind === 'type' && !schema.itemTypes.some((t) => t.id === change.type)) return { ok: false, message: T.coreMsg.unknownType(change.type) }
    if (change.kind !== 'type') {
      const f = schema.fields.find((x) => x.id === change.field)
      if (!f) return { ok: false, message: T.comfort.unknownField(change.field) }
      if ((change.kind === 'add' || change.kind === 'remove') && f.type !== 'list') return { ok: false, message: T.comfort.notAList(f.name) }
    }
    let changed = 0
    let unchanged = 0
    const failed: { id: string; message: string }[] = []
    const touched: string[] = []
    for (const id of unique) {
      try {
        if (s.index.pathsOf(id).length > 1) throw new Error(T.wsMsg.idInTwoFiles(id, s.index.pathsOf(id).length))
        const r = await s.repo.readItem(id)
        if (!r || !r.ok) throw new Error(T.wsMsg.unreadable(id))
        const next = apply(r.item, change)
        if (JSON.stringify(next) === JSON.stringify(r.item)) {
          unchanged++
          continue
        }
        const bad = validateItem(next, schema).filter((x) => x.severity === 'error')
        if (bad.length > 0) throw new Error(bad.map((x) => x.message).join(' '))
        await s.repo.writeItem(next, { expectedRevision: r.revision })
        touched.push(s.repo.itemPath(id))
        changed++
      } catch (e) {
        failed.push({ id, message: e instanceof ConflictError ? T.wsMsg.changedMeanwhile : (e as Error).message })
      }
    }
    await s.index.syncPaths(s.repo, touched)
    log.info(`Changed ${changed} item(s) (${change.kind}); ${unchanged} already so, ${failed.length} skipped`)
    return { ok: true, changed, unchanged, failed }
  }

  return { duplicateItem, changeItems }
}

/** The item with one change made (pure; the caller checks and writes it). */
export function apply(item: Item, change: ItemsChange): Item {
  const fields = { ...item.fields }
  switch (change.kind) {
    case 'type':
      return { ...item, type: change.type }
    case 'set':
      if (change.value === '' || (Array.isArray(change.value) && change.value.length === 0)) delete fields[change.field]
      else fields[change.field] = change.value
      return { ...item, fields }
    case 'clear':
      delete fields[change.field]
      return { ...item, fields }
    case 'add': {
      const now = listOf(fields[change.field])
      const more = [...new Set(change.values.map((x) => x.trim()).filter((x) => x !== '' && !now.includes(x)))]
      if (more.length > 0) fields[change.field] = [...now, ...more]
      return { ...item, fields }
    }
    case 'remove': {
      const now = listOf(fields[change.field])
      const gone = new Set(change.values.map((x) => x.trim()))
      const left = now.filter((x) => !gone.has(x))
      if (left.length === now.length) return item
      if (left.length > 0) fields[change.field] = left
      else delete fields[change.field]
      return { ...item, fields }
    }
  }
}

const listOf = (v: Item['fields'][string] | undefined): string[] => (Array.isArray(v) ? v : v === undefined || v === '' ? [] : [String(v)])
