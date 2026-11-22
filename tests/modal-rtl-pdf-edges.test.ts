// Edge cases: useModalKeys (Esc, focus, Tab), the Word right-to-left detection, removeStalePdfFolders, rovingTabs edges.
import { mkdir, mkdtemp, readdir, symlink, utimes, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'

async function docxXml(texts: { title: string; text: string }[]): Promise<string> {
  const { itemsToDocx } = await import('../src/modules/import-export')
  const items = texts.map((t, i) => ({ item: { id: `REQ-000000${i}`, type: 'system-requirement', title: t.title, text: t.text, number: '', links: [], fields: {} }, depth: 0, incoming: [] }))
  const data = { schema: { itemTypes: [{ id: 'system-requirement', name: 'Req', requirement: true }], linkTypes: [], fields: [] }, name: 'n', baseline: '', commit: '', date: '', author: '', items, columns: ['id', 'title', 'text'], trace: [], revisions: [] }
  const zip = await JSZip.loadAsync(await itemsToDocx(data as never))
  return (await zip.file('word/document.xml')?.async('string')) ?? ''
}
const bidiBefore = (xml: string, text: string): boolean => new RegExp(`<w:bidi/></w:pPr><w:r><w:t xml:space="preserve">${text}`).test(xml)

describe('0.26.0 Word right-to-left detection (rtlText)', () => {
  it('digits first, then Arabic, is right to left; Latin first is not', async () => {
    const xml = await docxXml([{ title: 'T', text: '1. قفل الباب\n\nREQ-1 قفل' }])
    expect(bidiBefore(xml, '1\\. قفل')).toBe(true)
    expect(bidiBefore(xml, 'REQ-1')).toBe(false)
  })
  it('DEFECT: an English text that starts with an Arabic-Indic digit must stay left to right', async () => {
    const xml = await docxXml([{ title: 'T', text: '٣ doors must lock' }])
    expect(bidiBefore(xml, '٣ doors')).toBe(false) // the regex lets the digit (U+0663, not a letter) count as an Arabic letter
  })
  it('DEFECT: an English text that starts with an Arabic comma / punctuation must stay left to right', async () => {
    const xml = await docxXml([{ title: 'T', text: '، the door locks' }])
    expect(bidiBefore(xml, '، the door')).toBe(false)
  })
  it('a Hebrew text is right to left', async () => {
    expect(bidiBefore(await docxXml([{ title: 'T', text: 'שלום עולם' }]), 'שלום')).toBe(true)
  })
})

describe('0.26.0 removeStalePdfFolders edges', () => {
  it('keeps files, keeps a folder of exactly one hour, never follows a link out, copes with a missing folder', async () => {
    vi.doMock('electron', () => ({ BrowserWindow: class {} }))
    const { removeStalePdfFolders } = await import('../src/main/pdf')
    const dir = await mkdtemp(join(tmpdir(), 'rq-stale2-'))
    const outside = await mkdtemp(join(tmpdir(), 'rq-outside-'))
    await writeFile(join(outside, 'keep.txt'), 'x')
    const now = Date.now()
    await writeFile(join(dir, 'reqochet-pdf-file'), 'x') // a file, not a folder
    await mkdir(join(dir, 'reqochet-pdf-edge'))
    await symlink(outside, join(dir, 'reqochet-pdf-link'))
    const old = new Date(now - 5 * 3_600_000)
    await utimes(join(dir, 'reqochet-pdf-file'), old, old)
    await utimes(join(dir, 'reqochet-pdf-edge'), new Date(now - 3_600_000 + 5), new Date(now - 3_600_000 + 5))
    await removeStalePdfFolders(dir, now)
    expect(await readdir(outside)).toEqual(['keep.txt']) // the target of the link is untouched
    const left = await readdir(dir)
    expect(left).toContain('reqochet-pdf-file')
    expect(left).toContain('reqochet-pdf-edge')
    expect(await removeStalePdfFolders(join(dir, 'nope'), now)).toBe(0)
  })
})

describe('0.26.0 dialogs: Esc must not close while busy', () => {
  const src = (f: string): string => readFileSync(join(__dirname, '..', 'src', 'renderer', 'src', 'workspace', f), 'utf8')
  it('SuspectLinksDialog.tsx guards Esc with !busy', () => expect(src('SuspectLinksDialog.tsx')).toMatch(/useModalKeys\(panel, \(\) => !busy/))
  // builder 0.26.0: Merge and Import do not close on Esc at all — it would drop the answers or
  // the column mapping; Cancel closes them
  for (const f of ['MergeDialog.tsx', 'ImportDialog.tsx']) {
    it(`${f} leaves Esc alone`, () => expect(src(f)).toMatch(/useModalKeys\(panel, \(\) => undefined, \{ escape: false \}\)/))
  }
  it('ExportDialog guards Esc, the backdrop and Close while an export runs', () => {
    expect(src('ExportDialog.tsx')).not.toMatch(/useModalKeys\(panel, props\.onClose\)/)
  })
})
