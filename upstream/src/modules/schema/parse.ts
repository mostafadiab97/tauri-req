import { parse as parseYaml } from 'yaml'
import type { CoverageRule, FieldDef, FieldType, ItemTypeDef, LinkTypeDef, ParsedSchema, SchemaProblem } from './index'
import type { FieldValue, Schema } from '../../shared/domain'

/** Properties every item has; a schema may not redefine them as fields. */
export const BUILT_IN_PROPERTIES = ['id', 'type', 'title', 'parent', 'order', 'links', 'text'] as const

const FIELD_TYPES: FieldType[] = ['text', 'enum', 'list', 'number', 'date']
const ID_RE = /^[a-z][a-z0-9-]*$/

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined)
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/

/** Translated names: `{ ar: 'الحالة' }`. Anything else is reported and left out. */
function labelsOf(v: unknown, path: string, add: (path: string, message: string) => void, keysAreLanguages = true): Record<string, string> | undefined {
  if (v === undefined || v === null) return undefined // an empty "labels:" = no labels
  if (!isObj(v)) {
    add(path, 'Must be a mapping of language to text, e.g. "{ ar: الحالة }".')
    return undefined
  }
  const out: Record<string, string> = {}
  for (const [lang, text] of Object.entries(v)) {
    const t = str(text)
    if ((keysAreLanguages && !LANG_RE.test(lang)) || t === undefined) add(`${path}.${lang}`, keysAreLanguages ? 'Must be a language code (e.g. ar) with a text.' : 'Must be a text.')
    else out[lang] = t
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Limits for coverage rules: one SQL query checks them all. */
export const MAX_RULES = 100
export const MAX_FROM = 20

export function parseSchema(text: string): ParsedSchema {
  const problems: SchemaProblem[] = []
  const add = (path: string, message: string): void => void problems.push({ path, message })

  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (e) {
    add('', `Not valid YAML: ${(e as Error).message}`)
    raw = {}
  }
  if (!isObj(raw)) {
    add('', 'The schema must be a YAML mapping (key: value).')
    raw = {}
  }
  const root = raw as Obj
  const list = (key: string): unknown[] => {
    const v = root[key]
    if (v === undefined) return []
    if (!Array.isArray(v)) {
      add(key, 'Must be a list.')
      return []
    }
    return v
  }

  // ---- item types
  const itemTypes: ItemTypeDef[] = []
  list('itemTypes').forEach((v, i) => {
    const p = `itemTypes[${i}]`
    if (!isObj(v)) return add(p, 'Must be a mapping with id and name.')
    const id = str(v.id)
    if (!id || !ID_RE.test(id)) return add(`${p}.id`, 'Must be lower-case letters, digits and dashes, e.g. "system-requirement".')
    if (itemTypes.some((t) => t.id === id)) return add(`${p}.id`, `Duplicate item type "${id}".`)
    // Since 0.9.0 IDs do not depend on the type (all are REQ-…), so a "prefix" in older schemas is ignored.
    const short = str(v.short)
    const labels = labelsOf(v.labels, `${p}.labels`, add)
    // required fields: a list of field ids; checked against the field list below
    const required = Array.isArray(v.required) ? v.required.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : undefined
    if (v.required !== undefined && !Array.isArray(v.required)) add(`${p}.required`, 'Must be a list of field ids, e.g. [status, priority].')
    // 0.28.0 (A8): a template — a starting text and field values; the field values are checked against the fields below
    let template: ItemTypeDef['template']
    if (v.template !== undefined && v.template !== null) {
      if (!isObj(v.template)) add(`${p}.template`, 'Must be a mapping, e.g. "template: { text: Steps }".')
      else {
        const t: NonNullable<ItemTypeDef['template']> = {}
        if (typeof v.template.text === 'string') {
          if (v.template.text.length > 20_000) add(`${p}.template.text`, 'At most 20,000 characters.')
          else if (v.template.text !== '') t.text = v.template.text
        } else if (v.template.text !== undefined) add(`${p}.template.text`, 'Must be text.')
        if (isObj(v.template.fields)) t.fields = v.template.fields as Record<string, FieldValue>
        else if (v.template.fields !== undefined) add(`${p}.template.fields`, 'Must be a mapping of field id to value.')
        if (t.text !== undefined || t.fields !== undefined) template = t
      }
    }
    itemTypes.push({ id, name: str(v.name) ?? id, requirement: v.requirement !== false, ...(short ? { short } : {}), ...(labels ? { labels } : {}), ...(required && required.length ? { required } : {}), ...(template ? { template } : {}) })
  })
  if (itemTypes.length === 0) add('itemTypes', 'At least one valid item type is needed.')

  // ---- fields
  const fields: FieldDef[] = []
  list('fields').forEach((v, i) => {
    const p = `fields[${i}]`
    if (!isObj(v)) return add(p, 'Must be a mapping with id, name and type.')
    const id = str(v.id)
    if (!id || !ID_RE.test(id)) return add(`${p}.id`, 'Must be lower-case letters, digits and dashes, e.g. "safety-level".')
    if ((BUILT_IN_PROPERTIES as readonly string[]).includes(id)) return add(`${p}.id`, `"${id}" is a built-in property and cannot be a field.`)
    if (fields.some((f) => f.id === id)) return add(`${p}.id`, `Duplicate field "${id}".`)
    const type = (str(v.type) ?? 'text') as FieldType
    if (!FIELD_TYPES.includes(type)) return add(`${p}.type`, `Unknown type "${String(v.type)}". Use one of: ${FIELD_TYPES.join(', ')}.`)
    const field: FieldDef = { id, type, name: str(v.name) ?? id }
    if (type === 'enum') {
      const options = Array.isArray(v.options) ? v.options.map((o) => String(o).trim()).filter(Boolean) : []
      if (options.length === 0) return add(`${p}.options`, 'An enum field needs a list of options.')
      field.options = [...new Set(options)]
    }
    const labels = labelsOf(v.labels, `${p}.labels`, add)
    if (labels) field.labels = labels
    if (v.optionLabels !== undefined && v.optionLabels !== null) {
      if (!isObj(v.optionLabels)) add(`${p}.optionLabels`, 'Must be a mapping of language to choices, e.g. "{ ar: { Draft: مسودة } }".')
      else {
        const byLang: Record<string, Record<string, string>> = {}
        for (const [lang, m] of Object.entries(v.optionLabels)) {
          const l = LANG_RE.test(lang) ? labelsOf(m, `${p}.optionLabels.${lang}`, add, false) : (add(`${p}.optionLabels.${lang}`, 'Must be a language code, e.g. ar.'), undefined)
          if (l) byLang[lang] = l
        }
        if (Object.keys(byLang).length > 0) field.optionLabels = byLang
      }
    }
    if (v.default !== undefined) {
      const d = String(v.default)
      if (field.options && !field.options.includes(d)) add(`${p}.default`, `Default "${d}" is not one of the options; ignored.`)
      else field.default = d
    }
    fields.push(field)
  })

  // ---- link types
  // required fields must be fields of the schema (built-in: title, text)
  itemTypes.forEach((t, i) =>
    (t.required ?? []).forEach((r) => {
      if (r !== 'title' && r !== 'text' && !fields.some((f) => f.id === r)) add(`itemTypes[${i}].required`, `"${r}" is not a field.`)
    })
  )
  const linkTypes: LinkTypeDef[] = []
  list('linkTypes').forEach((v, i) => {
    const p = `linkTypes[${i}]`
    if (!isObj(v)) return add(p, 'Must be a mapping with id, name and reverseName.')
    const id = str(v.id)
    if (!id || !ID_RE.test(id)) return add(`${p}.id`, 'Must be lower-case letters, digits and dashes, e.g. "verifies".')
    if (linkTypes.some((l) => l.id === id)) return add(`${p}.id`, `Duplicate link type "${id}".`)
    const name = str(v.name) ?? id
    const labels = labelsOf(v.labels, `${p}.labels`, add)
    const reverseLabels = labelsOf(v.reverseLabels, `${p}.reverseLabels`, add)
    linkTypes.push({ id, name, reverseName: str(v.reverseName) ?? `${name} (reverse)`, ...(labels ? { labels } : {}), ...(reverseLabels ? { reverseLabels } : {}) })
  })

  // ---- feature switches set by the team: `features: { branches: false }`; unknown names are kept (a newer
  // reqochet may know them), values other than true/false/on/off are reported
  let features: Record<string, boolean> | undefined
  if (root.features !== undefined) {
    if (!isObj(root.features)) add('features', 'Must be a mapping, e.g. "features: { branches: false }".')
    else {
      features = {}
      for (const [k, val] of Object.entries(root.features)) {
        const b = val === true || val === 'on' ? true : val === false || val === 'off' ? false : undefined
        if (b === undefined) add(`features.${k}`, 'Must be true or false.')
        else features[k] = b
      }
    }
  }

  // ---- coverage rules (theme 1b): `rules:` missing = never decided; `rules: []` = none
  let rules: CoverageRule[] | undefined
  // a value that is not a list is reported and counts as "never decided", not as "none" (of 0.20.0)
  if (root.rules !== undefined && root.rules !== null && !Array.isArray(root.rules)) add('rules', 'Must be a list of rules.')
  else if (root.rules !== undefined && root.rules !== null) {
    rules = []
    list('rules').forEach((v, i) => {
      const p = `rules[${i}]`
      // a pulled schema could hold thousands: SQLite refuses a query that large
      if (i >= MAX_RULES) return i === MAX_RULES ? add('rules', `At most ${MAX_RULES} rules; the rest are ignored.`) : undefined
      if (!isObj(v)) return add(p, 'Must be a mapping with type, link, direction and min.')
      const type = str(v.type)
      const link = str(v.link)
      if (!type || !itemTypes.some((t) => t.id === type)) return add(`${p}.type`, `Unknown item type "${String(v.type)}".`)
      if (!link || !linkTypes.some((l) => l.id === link)) return add(`${p}.link`, `Unknown link type "${String(v.link)}".`)
      const direction = v.direction === 'outgoing' ? 'outgoing' : v.direction === 'incoming' || v.direction === undefined ? 'incoming' : undefined
      if (!direction) return add(`${p}.direction`, 'Must be incoming or outgoing.')
      const fromRaw = v.from === undefined || v.from === null ? [] : Array.isArray(v.from) ? v.from : [v.from]
      // every entry must be a type name; a repeated one counts once
      if (fromRaw.some((x) => str(x) === undefined)) return add(`${p}.from`, 'Must be a list of item type names.')
      if (fromRaw.length > MAX_FROM) return add(`${p}.from`, `At most ${MAX_FROM} item types.`)
      const from = [...new Set(fromRaw.map((x) => str(x) as string))]
      const unknown = from.filter((f) => !itemTypes.some((t) => t.id === f))
      if (unknown.length) return add(`${p}.from`, `Unknown item type "${unknown.join('", "')}".`)
      const min = v.min === undefined ? 1 : typeof v.min === 'number' && Number.isInteger(v.min) && v.min >= 1 && v.min <= 99 ? v.min : undefined
      if (min === undefined) return add(`${p}.min`, 'Must be a whole number from 1 to 99.')
      const level = v.level === 'error' ? 'error' : v.level === 'warning' || v.level === undefined ? 'warning' : undefined
      if (!level) return add(`${p}.level`, 'Must be warning or error.')
      const id = str(v.id) ?? `${type}-${link}-${direction}`
      if (!ID_RE.test(id)) return add(`${p}.id`, 'Must be lower-case letters, digits and dashes.')
      if (rules?.some((r) => r.id === id)) return add(`${p}.id`, `Duplicate rule "${id}".`)
      rules?.push({ id, type, link, direction, ...(from.length ? { from } : {}), min, level })
    })
  }

  const version = typeof root.version === 'number' ? root.version : 1
  // ---- 0.28.0 writing help
  let writing: Schema['writing']
  if (root.writing !== undefined && root.writing !== null) {
    if (!isObj(root.writing)) add('writing', 'Must be a mapping, e.g. "writing: { requirementWord: shall }".')
    else {
      const w = root.writing
      writing = {}
      if (typeof w.hints === 'boolean') writing.hints = w.hints
      else if (w.hints !== undefined) add('writing.hints', 'Must be true or false.')
      const word = str(w.requirementWord)
      if (word) writing.requirementWord = word.slice(0, 40)
      if (Array.isArray(w.vagueWords)) writing.vagueWords = w.vagueWords.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim().slice(0, 60)).slice(0, 500)
      else if (w.vagueWords !== undefined) add('writing.vagueWords', 'Must be a list of words.')
    }
  }
  // template field values: known fields, valid values (a bad one is reported and left out)
  for (const t of itemTypes) {
    if (!t.template?.fields) continue
    const ok: Record<string, FieldValue> = {}
    for (const [k, val] of Object.entries(t.template.fields)) {
      const f = fields.find((x) => x.id === k)
      // the same rules a saved item must pass: a real date, a finite number
      const good =
        f &&
        ((f.type === 'enum' && typeof val === 'string' && (f.options ?? []).includes(val)) ||
          (f.type === 'text' && typeof val === 'string') ||
          (f.type === 'date' && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val) && !Number.isNaN(Date.parse(`${val}T00:00:00Z`)) && new Date(`${val}T00:00:00Z`).toISOString().startsWith(val)) ||
          (f.type === 'number' && typeof val === 'number' && Number.isFinite(val)) ||
          (f.type === 'list' && Array.isArray(val) && val.every((x) => typeof x === 'string')))
      if (good) ok[k] = val as FieldValue
      else add(`itemTypes.${t.id}.template.fields.${k}`, f ? `Not a valid value for "${f.name}".` : `Unknown field "${k}".`)
    }
    if (Object.keys(ok).length > 0) t.template.fields = ok
    else delete t.template.fields
    if (t.template.text === undefined && t.template.fields === undefined) delete t.template
  }
  return { schema: { version, itemTypes, fields, linkTypes, ...(features ? { features } : {}), ...(rules ? { rules } : {}), ...(writing ? { writing } : {}) }, problems }
}
