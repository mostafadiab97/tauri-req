// electron-updater's autoUpdater as reqochet's updater module uses it, answered by Tauri's updater. The core is a
// worker, so the screens' page talks to the updater for it (host-ops.ts); the steps and events stay electron-updater's.
// The feed is Tauri's (latest.json, set in tauri.conf.json) and every update must carry a valid signature — an
// unsigned or changed installer is refused before it runs.
import { EventEmitter } from 'events'
import { host } from './host'
import { info } from './env'

class AutoUpdater extends EventEmitter {
  autoDownload = true
  autoInstallOnAppQuit = true
  allowDowngrade = false
  allowPrerelease = false
  logger: { info(m: string): void; warn(m: string): void; error(m: string): void } | null = null
  private ready = false

  setFeedURL(_opts: unknown): void {
    // the feed comes from tauri.conf.json (signed latest.json)
  }

  async checkForUpdates(): Promise<{ updateInfo: { version: string } } | null> {
    this.emit('checking-for-update')
    if (!(info as unknown as { update_feed?: boolean }).update_feed) {
      // this build has no update feed (the owner's preview): new versions come as a new installer
      this.logger?.info('No update feed in this build')
      this.emit('update-not-available', { version: '' })
      return null
    }
    try {
      const u = await host('updaterCheck')
      if (!u) {
        this.emit('update-not-available', { version: '' })
        return null
      }
      const info = { version: u.version, releaseDate: u.date, releaseNotes: u.body }
      this.emit('update-available', info)
      if (this.autoDownload) await this.download(info)
      return { updateInfo: info }
    } catch (e) {
      this.logger?.error(String(e))
      this.emit('error', e instanceof Error ? e : new Error(String((e as { message?: string })?.message ?? e)))
      return null
    }
  }

  private async download(info: { version: string }): Promise<void> {
    const total = await host('updaterDownload')
    this.emit('download-progress', { percent: 100, transferred: total, total, bytesPerSecond: 0 })
    this.ready = true
    this.emit('update-downloaded', info)
  }

  async downloadUpdate(): Promise<void> {
    const u = await host('updaterCheck')
    if (u) await this.download({ version: u.version })
  }

  /** Installs the downloaded update, then starts the new version (on Windows the installer ends this app first). */
  quitAndInstall(): void {
    if (this.ready) void host('updaterInstall')
  }
}

export const autoUpdater = new AutoUpdater()
export default { autoUpdater }
