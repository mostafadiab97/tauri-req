// 0.25.0: the window icon must stand out on the title bar — a white tile on a dark title
// bar, the dark tile on a light one. The app's mode now also sets the title bar's colour (nativeTheme.themeSource).
import { existsSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

const nativeTheme = { themeSource: 'system', shouldUseDarkColors: true }
vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => process.cwd() }, nativeTheme }))
const { windowIcon, themeSourceFor, applyWindowMode } = await import('../src/main/windowIcon')

describe('title bar and window icon (0.25.0)', () => {
  it('white tile on a dark bar, dark tile on a light bar', () => {
    expect(windowIcon(true)).toMatch(/reqochet-icon-light-256\.png$/)
    expect(windowIcon(false)).toMatch(/reqochet-icon-256\.png$/)
  })
  it('the app mode decides the title bar; Ember is a dark bar; System leaves it to Windows', () => {
    expect(themeSourceFor('light')).toBe('light')
    expect(themeSourceFor('dark')).toBe('dark')
    expect(themeSourceFor('ember')).toBe('dark')
    expect(themeSourceFor('system')).toBe('system')
  })
  it('applying a mode sets the bar and an icon that stands out on it', () => {
    const set = vi.fn()
    nativeTheme.shouldUseDarkColors = false // what Electron reports after themeSource = light
    applyWindowMode({ setIcon: set }, 'light')
    expect(nativeTheme.themeSource).toBe('light')
    expect(set).toHaveBeenLastCalledWith(expect.stringMatching(/reqochet-icon-256\.png$/))
    nativeTheme.shouldUseDarkColors = true
    applyWindowMode({ setIcon: set }, 'ember')
    expect(nativeTheme.themeSource).toBe('dark')
    expect(set).toHaveBeenLastCalledWith(expect.stringMatching(/reqochet-icon-light-256\.png$/))
  })
  it('both icon files exist', () => {
    expect(existsSync(windowIcon(true)) && existsSync(windowIcon(false))).toBe(true)
  })
})

describe('0.26.0: stale PDF print folders are removed at start', () => {
  it('removes only old reqochet-pdf-* folders', async () => {
    const { mkdtemp, mkdir, readdir, utimes } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    vi.doMock('electron', () => ({ app: { isPackaged: false, getAppPath: () => process.cwd() }, nativeTheme, BrowserWindow: class {} }))
    const { removeStalePdfFolders } = await import('../src/main/pdf')
    const dir = await mkdtemp(join(tmpdir(), 'rq-stale-'))
    for (const n of ['reqochet-pdf-old', 'reqochet-pdf-new', 'other-old']) await mkdir(join(dir, n))
    const old = new Date(Date.now() - 2 * 3_600_000)
    await utimes(join(dir, 'reqochet-pdf-old'), old, old)
    await utimes(join(dir, 'other-old'), old, old)
    expect(await removeStalePdfFolders(dir)).toBe(1)
    expect((await readdir(dir)).sort()).toEqual(['other-old', 'reqochet-pdf-new'])
  })
})

describe('0.26.0: the title bar mode is remembered for the next start', () => {
  it('writes the mode and the next start reads it back', async () => {
    const { mkdtemp } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = join(await mkdtemp(join(tmpdir(), 'rq-mode-')), 'not-yet-made')
    vi.resetModules()
    const theme = { themeSource: 'system', shouldUseDarkColors: false }
    vi.doMock('electron', () => ({ app: { isPackaged: false, getAppPath: () => process.cwd(), getPath: () => dir }, nativeTheme: theme }))
    const m = await import('../src/main/windowIcon')
    m.applyWindowMode({ setIcon: () => {} }, 'ember')
    theme.themeSource = 'system'
    m.startWindowMode()
    expect(theme.themeSource).toBe('dark')
    m.applyWindowMode({ setIcon: () => {} }, 'light')
    m.startWindowMode()
    expect(theme.themeSource).toBe('light')
  })
})
