// electron-updater's autoUpdater as reqochet's updater module uses it, answered by Tauri's updater: the feed is
// Tauri's (latest.json on the releases page, set in tauri.conf.json) and every update must carry a valid signature —
// an unsigned or changed installer is refused before it runs.
import { EventEmitter } from 'events'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

class AutoUpdater extends EventEmitter {
  autoDownload = true
  autoInstallOnAppQuit = true
  allowDowngrade = false
  allowPrerelease = false
  logger: { info(m: string): void; warn(m: string): void; error(m: string): void } | null = null
  private ready: Update | null = null

  setFeedURL(_opts: unknown): void {
    // the feed comes from tauri.conf.json (signed latest.json)
  }

  async checkForUpdates(): Promise<{ updateInfo: { version: string } } | null> {
    this.emit('checking-for-update')
    try {
      const update = await check()
      if (!update) {
        this.emit('update-not-available', { version: '' })
        return null
      }
      const info = { version: update.version, releaseDate: update.date ?? '', releaseNotes: update.body ?? '' }
      this.emit('update-available', info)
      if (this.autoDownload) await this.download(update, info)
      return { updateInfo: info }
    } catch (e) {
      this.logger?.error(String(e))
      this.emit('error', e instanceof Error ? e : new Error(String(e)))
      return null
    }
  }

  private async download(update: Update, info: { version: string }): Promise<void> {
    let total = 0
    let got = 0
    const start = Date.now()
    await update.download((ev) => {
      if (ev.event === 'Started') total = ev.data.contentLength ?? 0
      else if (ev.event === 'Progress') {
        got += ev.data.chunkLength
        const secs = Math.max(0.001, (Date.now() - start) / 1000)
        this.emit('download-progress', { percent: total ? (got / total) * 100 : 0, transferred: got, total, bytesPerSecond: got / secs })
      }
    })
    this.ready = update
    this.emit('update-downloaded', info)
  }

  async downloadUpdate(): Promise<void> {
    const update = await check()
    if (update) await this.download(update, { version: update.version })
  }

  /** Installs the downloaded update (on Windows the installer ends the app), then starts the new version. */
  quitAndInstall(): void {
    const u = this.ready
    if (!u) return
    void u.install().then(() => relaunch())
  }
}

export const autoUpdater = new AutoUpdater()
export default { autoUpdater }
