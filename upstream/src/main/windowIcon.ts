import { app, nativeTheme } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** The colour mode chosen in the app's Appearance switch. */
export type AppMode = 'system' | 'light' | 'dark' | 'ember'

/**
 * The window's title bar and icon (0.25.0): the icon must stand out on the title bar — a
 * white tile on a dark title bar, the dark tile on a light one. The title bar's colour is Windows' choice unless the app
 * sets `nativeTheme.themeSource`, so the app's mode now sets it too: Light → light bar, Dark and Ember → dark bar,
 * System → Windows decides. Windows uses the same icon on the taskbar; it cannot be different there.
 */
export function windowIcon(dark: boolean = nativeTheme.shouldUseDarkColors): string {
  const file = dark ? 'reqochet-icon-light-256.png' : 'reqochet-icon-256.png'
  return join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'resources', 'brand', 'icon', 'png', file)
}

/** What the title bar follows for an app mode. */
export function themeSourceFor(mode: AppMode): 'system' | 'light' | 'dark' {
  return mode === 'system' ? 'system' : mode === 'light' ? 'light' : 'dark'
}

/** Sets the title bar colour for the app mode and the icon that stands out on it. */
export function applyWindowMode(win: { setIcon(path: string): void }, mode: AppMode, remember = rememberMode): void {
  nativeTheme.themeSource = themeSourceFor(mode)
  win.setIcon(windowIcon(nativeTheme.shouldUseDarkColors))
  remember(mode)
}

/**
 * The last mode is kept in a small file, so the next start shows the right title bar and icon at once — before the
 * window has loaded and told its mode. Losing the file only means one start with Windows' colours.
 */
const modeFile = (): string => join(app.getPath('userData'), 'window-mode.txt')
function rememberMode(mode: AppMode): void {
  try {
    mkdirSync(app.getPath('userData'), { recursive: true }) // the first start
    writeFileSync(modeFile(), mode, 'utf8')
  } catch {
    /* not important enough to stop anything */
  }
}

/** Sets the title bar for the remembered mode before the first window opens. */
export function startWindowMode(): void {
  try {
    const m = readFileSync(modeFile(), 'utf8').trim()
    if (m === 'system' || m === 'light' || m === 'dark' || m === 'ember') nativeTheme.themeSource = themeSourceFor(m)
  } catch {
    /* first start: Windows decides */
  }
}
