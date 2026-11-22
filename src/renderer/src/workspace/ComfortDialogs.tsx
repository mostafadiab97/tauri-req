import { useRef, useState } from 'react'
import type { ItemsChange } from '../../../shared/api'
import type { FieldValue, Schema } from '../../../shared/domain'
import { T } from '../../../shared/text'
import { Icon } from '../components/icons'
import { errorMessage, useModalKeys } from '../lib/hooks'
import { fieldLabel, optionLabel, typeName } from '../lib/schema'

/**
 * Duplicate (0.27.0), asked only when the item has items below it: copy them too or not. An item without
 * children is copied at once, without this dialog.
 */
export function DuplicateDialog(props: { id: string; childCount: number; onDone: (result: { newId: string; count: number } | null) => void; onError: (message: string) => void }) {
  const [withChildren, setWithChildren] = useState(true)
  const [busy, setBusy] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const close = (): void => {
    if (!busy) props.onDone(null)
  }
  useModalKeys(panel, close)
  const run = async (): Promise<void> => {
    setBusy(true)
    const r = await window.reqochet.duplicateItem(props.id, withChildren).catch((e: unknown) => ({ ok: false as const, message: errorMessage(e) }))
    setBusy(false)
    if (r.ok) props.onDone({ newId: r.newId, count: r.count })
    else props.onError(r.message)
  }
  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={panel} tabIndex={-1} className="modal__panel modal__panel--narrow" role="dialog" aria-modal="true" aria-labelledby="dup-title">
        <header className="modal__header">
          <div>
            <h2 className="modal__title" id="dup-title">
              {T.comfort.duplicateTitle}
            </h2>
            <p className="muted">{T.comfort.duplicateIntro(props.id)}</p>
          </div>
          <button type="button" className="icon-btn" aria-label={T.common.close} onClick={close} disabled={busy}>
            <Icon name="close" />
          </button>
        </header>
        <div className="modal__body">
          <label className="check">
            <input type="checkbox" checked={withChildren} onChange={(e) => setWithChildren(e.target.checked)} />
            {T.comfort.withChildren(props.childCount)}
          </label>
        </div>
        <footer className="modal__footer actions">
          <button type="button" className="btn" onClick={close} disabled={busy}>
            {T.common.cancel}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void run()} disabled={busy}>
            {T.comfort.duplicateButton}
          </button>
        </footer>
      </div>
    </div>
  )
}

/** What the "Change many items" dialog can change: the type, or one schema field. */
const TYPE = '\u0000type'

/**
 * Change many items at once (0.27.0, A14): the type or one field, for the items chosen in the table. Each item is
 * checked and written on its own; the result lists any that were skipped. Nothing is committed.
 */
export function ChangeItemsDialog(props: { schema: Schema; ids: string[]; onDone: (changed: boolean) => void }) {
  const { schema } = props
  const [what, setWhat] = useState<string>(schema.fields[0]?.id ?? TYPE)
  const [value, setValueRaw] = useState('')
  // nothing is sent before a value was chosen or typed: an empty value clears the field, so it must be meant
  const [touched, setTouched] = useState(false)
  const setValue = (v: string): void => {
    setValueRaw(v)
    setTouched(true)
  }
  const [listMode, setListMode] = useState<'set' | 'add' | 'remove'>('add')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ text: string; failed: { id: string; message: string }[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = (): void => {
    if (!busy) props.onDone(result !== null)
  }
  useModalKeys(panel, close)
  const field = schema.fields.find((f) => f.id === what)
  const isType = what === TYPE

  const change = (): ItemsChange | null => {
    if (isType) return value ? { kind: 'type', type: value } : null
    if (!field) return null
    if (field.type === 'list') {
      const words = value
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean)
      if (listMode === 'set') return { kind: 'set', field: field.id, value: words }
      return words.length > 0 ? { kind: listMode, field: field.id, values: words } : null
    }
    const v: FieldValue = field.type === 'number' && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : value.trim()
    return { kind: 'set', field: field.id, value: v }
  }
  const run = async (): Promise<void> => {
    const c = change()
    if (!c) return
    setBusy(true)
    setError(null)
    const r = await window.reqochet.changeItems(props.ids, c).catch((e: unknown) => ({ ok: false as const, message: errorMessage(e) }))
    setBusy(false)
    if (!r.ok) setError(r.message)
    else setResult({ text: T.comfort.result(r.changed, r.unchanged), failed: r.failed })
  }

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={panel} tabIndex={-1} className="modal__panel modal__panel--narrow" role="dialog" aria-modal="true" aria-labelledby="change-title">
        <header className="modal__header">
          <div>
            <h2 className="modal__title" id="change-title">
              {T.comfort.changeTitle(props.ids.length)}
            </h2>
            <p className="muted">{T.comfort.noCommit}</p>
          </div>
          <button type="button" className="icon-btn" aria-label={T.common.close} onClick={close} disabled={busy}>
            <Icon name="close" />
          </button>
        </header>
        <div className="modal__body">
          <label className="field">
            <span className="field__label">{T.comfort.what}</span>
            <select
              className="input"
              value={what}
              disabled={busy}
              onChange={(e) => {
                setWhat(e.target.value)
                setValueRaw('')
                setTouched(false)
                setResult(null)
              }}
            >
              <option value={TYPE}>{T.comfort.typeOption}</option>
              {schema.fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {fieldLabel(f)}
                </option>
              ))}
            </select>
          </label>
          {isType ? (
            <label className="field">
              <span className="field__label">{T.comfort.newValue}</span>
              <select className="input" value={value} disabled={busy} onChange={(e) => setValue(e.target.value)}>
                <option value="" />
                {schema.itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {typeName(schema, t.id)}
                  </option>
                ))}
              </select>
            </label>
          ) : field?.type === 'enum' ? (
            <label className="field">
              <span className="field__label">{T.comfort.newValue}</span>
              <select className="input" value={value} disabled={busy} onChange={(e) => setValue(e.target.value)}>
                <option value="">{T.comfort.emptyClears}</option>
                {(field.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {optionLabel(field, o)}
                  </option>
                ))}
              </select>
            </label>
          ) : field?.type === 'list' ? (
            <>
              <fieldset className="choice">
                <legend className="field__label">{T.comfort.listHow}</legend>
                {(['add', 'remove', 'set'] as const).map((m) => (
                  <label key={m} className="check">
                    <input type="radio" name="list-mode" checked={listMode === m} disabled={busy} onChange={() => setListMode(m)} />
                    {m === 'add' ? T.comfort.listAdd : m === 'remove' ? T.comfort.listRemove : T.comfort.listSet}
                  </label>
                ))}
              </fieldset>
              <label className="field">
                <span className="field__label">{T.comfort.listWords}</span>
                <input className="input" value={value} disabled={busy} onChange={(e) => setValue(e.target.value)} />
              </label>
            </>
          ) : (
            <label className="field">
              <span className="field__label">{T.comfort.newValue}</span>
              <input className="input" value={value} disabled={busy} type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'} onChange={(e) => setValue(e.target.value)} />
              <span className="muted-inline">{T.comfort.emptyClears}</span>
            </label>
          )}
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
          {result && (
            <div className={result.failed.length > 0 ? 'notice notice--warn' : 'notice notice--ok'} role="status">
              <p>{result.text}</p>
              {result.failed.length > 0 && (
                <>
                  <p>{T.comfort.failedList(result.failed.length)}</p>
                  <ul className="change-items__failed">
                    {result.failed.slice(0, 20).map((f) => (
                      <li key={f.id}>
                        <span className="tree__id">{f.id}</span> — {f.message}
                      </li>
                    ))}
                  </ul>
                  {result.failed.length > 20 && <p>{T.comfort.moreSkipped(result.failed.length - 20)}</p>}
                </>
              )}
            </div>
          )}
        </div>
        <footer className="modal__footer actions">
          <button type="button" className="btn" onClick={close} disabled={busy}>
            {T.common.close}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void run()} disabled={busy || !touched || change() === null}>
            {T.comfort.apply}
          </button>
        </footer>
      </div>
    </div>
  )
}
