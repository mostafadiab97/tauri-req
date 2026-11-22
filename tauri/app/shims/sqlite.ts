// node:sqlite (DatabaseSync) for reqochet's index, on the official SQLite WebAssembly build (with FTS5): the same SQL
// runs unchanged. The index is only a cache: it lives in memory, is loaded from its file at open and written back
// when it is closed (a crash loses only the cache; reqochet rebuilds it from the files).
import { Buffer } from 'buffer'
import { sqlite3, norm } from './env'
import { syncCall } from './fsbase'
import { writeFile, mkdir } from './fs-promises'
import { dirname } from 'pathe'

type Value = string | number | bigint | null | Uint8Array
type Row = Record<string, Value>

const conv = (v: unknown): Value => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : (v as Value))

class StatementSync {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private s: any
  constructor(
    private owner: DatabaseSync,
    sql: string
  ) {
    this.s = owner.db.prepare(sql)
  }
  private bind(params: unknown[]): void {
    this.s.reset(true)
    if (params.length === 0) return
    const first = params[0]
    if (params.length === 1 && first && typeof first === 'object' && !(first instanceof Uint8Array)) {
      // named parameters: Node accepts bare names; the SQL uses $name, :name or @name
      const named: Record<string, Value> = {}
      for (const [k, v] of Object.entries(first)) {
        if (/^[$:@]/.test(k)) named[k] = conv(v)
        else for (const p of ['$', ':', '@']) if (this.s.getParamIndex(p + k)) named[p + k] = conv(v)
      }
      this.s.bind(named)
    } else this.s.bind(params.map(conv))
  }
  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    this.bind(params)
    this.s.step()
    this.s.reset()
    this.owner.dirty = true
    const db = this.owner.db
    return { changes: db.changes(), lastInsertRowid: Number(sqlite3.capi.sqlite3_last_insert_rowid(db.pointer)) }
  }
  get(...params: unknown[]): Row | undefined {
    this.bind(params)
    const row = this.s.step() ? (this.s.get({}) as Row) : undefined
    this.s.reset()
    return row
  }
  all(...params: unknown[]): Row[] {
    this.bind(params)
    const rows: Row[] = []
    while (this.s.step()) rows.push(this.s.get({}) as Row)
    this.s.reset()
    return rows
  }
  *iterate(...params: unknown[]): Generator<Row> {
    this.bind(params)
    try {
      while (this.s.step()) yield this.s.get({}) as Row
    } finally {
      this.s.reset()
    }
  }
}

export class DatabaseSync {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
  dirty = false
  private file: string | null
  private stmts: StatementSync[] = []
  isOpen = true
  constructor(file: string) {
    this.file = file === ':memory:' ? null : norm(file)
    this.db = new sqlite3.oo1.DB(':memory:')
    if (this.file) {
      try {
        const bytes = Buffer.from(syncCall<string>({ op: 'read', path: this.file, b64: true }), 'base64')
        if (bytes.length) {
          const capi = sqlite3.capi
          const p = sqlite3.wasm.allocFromTypedArray(bytes)
          const rc = capi.sqlite3_deserialize(this.db.pointer, 'main', p, bytes.length, bytes.length, capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_RESIZEABLE)
          if (rc !== 0) throw new Error(`deserialize ${rc}`)
        }
      } catch {
        // no index yet (or unreadable): start empty — reqochet fills it from the files
      }
    }
  }
  exec(sql: string): void {
    // WAL and synchronous settings mean nothing for an in-memory database
    this.db.exec(sql.replace(/PRAGMA\s+(journal_mode|synchronous)\s*=\s*\w+;?/gi, ''))
    this.dirty = true
  }
  prepare(sql: string): StatementSync {
    const s = new StatementSync(this, sql)
    this.stmts.push(s)
    return s
  }
  close(): void {
    if (!this.isOpen) return
    this.isOpen = false
    let bytes: Uint8Array | null = null
    if (this.file && this.dirty) {
      try {
        bytes = sqlite3.capi.sqlite3_js_db_export(this.db.pointer) as Uint8Array
      } catch {
        bytes = null
      }
    }
    this.db.close()
    if (bytes && this.file) {
      const file = this.file
      void mkdir(dirname(file), { recursive: true })
        .then(() => writeFile(file, bytes as Uint8Array))
        .catch(() => {})
    }
  }
}

export default { DatabaseSync }
