import { useRef, useState } from 'react'
import type { SavedView, SavedViews, ViewPlace } from '../../../shared/api'
import { T } from '../../../shared/text'
import { Icon } from '../components/icons'
import { errorMessage, useModalKeys } from '../lib/hooks'

/** Save the table as it is set up now under a name, for me or for the team (0.28.0). */
export function SaveViewDialog(props: { current: Omit<SavedView, 'name'>; views: SavedViews; onDone: (saved: { name: string; place: ViewPlace } | null) => void }) {
  const [name, setName] = useState('')
  const [place, setPlace] = useState<ViewPlace>('personal')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = (): void => {
    if (!busy) props.onDone(null)
  }
  useModalKeys(panel, close)
  const clean = name.trim()
  const replaces = props.views[place].some((v) => v.name === clean)
  const run = async (): Promise<void> => {
    if (!clean) return setError(T.views.nameNeeded)
    setBusy(true)
    const r = await window.reqochet.saveView({ ...props.current, name: clean }, place).catch((e: unknown) => ({ ok: false as const, message: errorMessage(e) }))
    setBusy(false)
    if (r.ok) props.onDone({ name: clean, place })
    else setError(r.message)
  }
  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={panel} tabIndex={-1} className="modal__panel modal__panel--narrow" role="dialog" aria-modal="true" aria-labelledby="view-save-title">
        <header className="modal__header">
          <div>
            <h2 className="modal__title" id="view-save-title">
              {T.views.saveTitle}
            </h2>
            <p className="muted">{T.views.saveIntro}</p>
          </div>
          <button type="button" className="icon-btn" aria-label={T.common.close} onClick={close} disabled={busy}>
            <Icon name="close" />
          </button>
        </header>
        <form
          className="modal__body"
          onSubmit={(e) => {
            e.preventDefault()
            void run()
          }}
        >
          <label className="field">
            <span className="field__label">{T.views.name}</span>
            <input className="input" value={name} maxLength={80} list="view-names" disabled={busy} onChange={(e) => setName(e.target.value)} />
            <datalist id="view-names">
              {props.views[place].map((v) => (
                <option key={v.name} value={v.name} />
              ))}
            </datalist>
            {replaces && <span className="muted-inline">{T.views.replaceHint}</span>}
          </label>
          <fieldset className="choice">
            <legend className="field__label">{T.views.where}</legend>
            <label className="check">
              <input type="radio" name="view-place" checked={place === 'personal'} disabled={busy} onChange={() => setPlace('personal')} />
              {T.views.wherePersonal}
            </label>
            <label className="check">
              <input type="radio" name="view-place" checked={place === 'shared'} disabled={busy} onChange={() => setPlace('shared')} />
              {T.views.whereShared}
            </label>
          </fieldset>
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
        </form>
        <footer className="modal__footer actions">
          <button type="button" className="btn" onClick={close} disabled={busy}>
            {T.common.cancel}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void run()} disabled={busy || !clean}>
            {T.views.save}
          </button>
        </footer>
      </div>
    </div>
  )
}

/** Delete a saved view: one button per view, grouped by where it is kept. */
export function DeleteViewDialog(props: { views: SavedViews; onDone: (deleted: { name: string; place: ViewPlace } | null) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = (): void => {
    if (!busy) props.onDone(null)
  }
  useModalKeys(panel, close)
  const remove = async (name: string, place: ViewPlace): Promise<void> => {
    setBusy(true)
    const r = await window.reqochet.deleteView(name, place).catch((e: unknown) => ({ ok: false as const, message: errorMessage(e) }))
    setBusy(false)
    if (r.ok) props.onDone({ name, place })
    else setError(r.message)
  }
  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={panel} tabIndex={-1} className="modal__panel modal__panel--narrow" role="dialog" aria-modal="true" aria-labelledby="view-delete-title">
        <header className="modal__header">
          <h2 className="modal__title" id="view-delete-title">
            {T.views.deleteTitle}
          </h2>
          <button type="button" className="icon-btn" aria-label={T.common.close} onClick={close} disabled={busy}>
            <Icon name="close" />
          </button>
        </header>
        <div className="modal__body">
          {(['personal', 'shared'] as const).map((place) =>
            props.views[place].length === 0 ? null : (
              <section key={place} className="views__group" aria-label={place === 'personal' ? T.views.personal : T.views.shared}>
                <h3 className="field__label">{place === 'personal' ? T.views.personal : T.views.shared}</h3>
                <ul className="views__list">
                  {props.views[place].map((v) => (
                    <li key={v.name}>
                      <button type="button" className="btn btn--danger-outline" disabled={busy} onClick={() => void remove(v.name, place)}>
                        <Icon name="trash" /> {T.views.deleteButton(v.name)}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          )}
          {props.views.personal.length + props.views.shared.length === 0 && <p className="muted">{T.views.none}</p>}
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="modal__footer actions">
          <button type="button" className="btn" onClick={close} disabled={busy}>
            {T.common.close}
          </button>
        </footer>
      </div>
    </div>
  )
}
