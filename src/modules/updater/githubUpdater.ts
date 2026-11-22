import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app, net } from 'electron'
import { autoUpdater } from 'electron-updater'
import { parse as parseYaml } from 'yaml'
import type { UpdateStatus } from '../../shared/api'
import type { UpdateService } from './index'
import { checkInstaller, isOwnReleaseUrl, releaseTagOf, newerRelease, parseReleases, revertTargets, type ReleaseInfo } from './versions'
import { T } from '../../shared/text'

interface Deps {
  /** Only an installed build can update itself; in development the updater is inert. */
  enabled: boolean
  log: { info(m: string): void; warn(m: string): void; error(m: string, e?: unknown): void }
  /** Where "updates paused at version X" is remembered (survives reinstalling; 0.14.1). */
  holdFile: string
  /** The installed app's app-update.yml (provider github, repo) — the release feed to list versions from. */
  updateConfigFile: string
}

const SIX_HOURS = 6 * 60 * 60 * 1000

export function createGithubUpdater({ enabled, log, holdFile, updateConfigFile }: Deps): UpdateService {
  // Going back to an earlier version (0.14.1) writes a hold file first, so the installed older version does not update
  // itself straight back. A hold for another version than the running one is stale (the user installed by hand): drop it.
  const readHold = (): string | null => {
    try {
      const v = (JSON.parse(readFileSync(holdFile, 'utf8')) as { version?: unknown }).version
      return typeof v === 'string' ? v : null
    } catch {
      return null
    }
  }
  let held = readHold()
  if (held && held !== app.getVersion()) {
    rmSync(holdFile, { force: true })
    held = null
  }

  let status: UpdateStatus = !enabled ? { state: 'disabled', reason: 'only the installed Windows app updates itself' } : held ? { state: 'held', version: held } : { state: 'idle' }
  let notify: (s: UpdateStatus) => void = () => {}
  const set = (s: UpdateStatus): void => {
    status = s
    notify(s)
  }

  if (enabled) {
    // Release feed: GitHub Releases configured in electron-builder.yml ("publish").
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = { info: (m) => log.info(`Updater: ${m}`), warn: (m) => log.warn(`Updater: ${m}`), error: (m) => log.error(`Updater: ${m}`), debug: () => {} }
    autoUpdater.on('checking-for-update', () => set({ state: 'checking' }))
    autoUpdater.on('update-not-available', () => set({ state: 'up-to-date', checkedAt: new Date().toISOString() }))
    autoUpdater.on('update-available', (info) => set({ state: 'downloading', version: info.version, percent: 0 }))
    autoUpdater.on('download-progress', (p) => {
      if (status.state === 'downloading') set({ ...status, percent: Math.round(p.percent) })
    })
    autoUpdater.on('update-downloaded', (info) => set({ state: 'ready', version: info.version }))
    autoUpdater.on('error', (e) => {
      log.error('Update check failed', e)
      // the releases feed failed (8 Nov 2026: GitHub answered it with 502 for hours): ask GitHub's API instead, once
      if (!triedApi) {
        triedApi = true
        void viaApi().then(
          (ok) => ok || set({ state: 'error', message: T.coreMsg.updateCheckFailed }),
          (e2) => {
            log.warn(`Update check through the API failed too: ${String(e2)}`)
            set({ state: 'error', message: T.coreMsg.updateCheckFailed })
          }
        )
        return
      }
      // Offline is normal for reqochet; report it gently.
      set({ state: 'error', message: T.coreMsg.updateCheckFailed })
    })
  }

  // The fallback: the newest release from GitHub's API (another service than the releases feed); its update file
  // (latest.yml) is then read straight from that release's downloads.
  let triedApi = false
  let feedChanged = false
  let fallbackRunning = false
  const viaApi = async (): Promise<boolean> => {
    fallbackRunning = true
    try {
      return await viaApiNow()
    } finally {
      fallbackRunning = false
    }
  }
  const viaApiNow = async (): Promise<boolean> => {
    const { owner, repo } = feedConfig()
    const res = await net.fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=30`, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) throw new Error(`GitHub API answered ${res.status}`)
    const target = newerRelease(parseReleases(await res.json()), app.getVersion())
    if (!target) {
      log.info('Update check through the API: up to date')
      set({ state: 'up-to-date', checkedAt: new Date().toISOString() })
      return true
    }
    log.info(`Update check through the API: ${target.version} — reading its update file from the release`)
    if (!/^\d+\.\d+\.\d+$/.test(target.version)) throw new Error(`unexpected release version ${target.version}`)
    autoUpdater.setFeedURL({ provider: 'generic', url: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/download/v${target.version}` })
    feedChanged = true
    await autoUpdater.checkForUpdates()
    return true
  }
  const feedConfig = (): { owner: string; repo: string } => {
    const feed = parseYaml(readFileSync(updateConfigFile, 'utf8')) as { owner?: unknown; repo?: unknown } | null
    if (typeof feed?.owner !== 'string' || typeof feed.repo !== 'string') throw new Error('no GitHub release feed configured')
    return { owner: feed.owner, repo: feed.repo }
  }

  const checkNow = async (): Promise<void> => {
    if (!enabled || held || fallbackRunning) return // the API fallback is still working
    // every check starts with the normal releases feed again
    triedApi = false
    if (feedChanged) {
      autoUpdater.setFeedURL({ provider: 'github', ...feedConfig() })
      feedChanged = false
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      /* reported through the 'error' event */
    }
  }

  let releases: ReleaseInfo[] = []
  const listEarlier = async (): Promise<ReleaseInfo[]> => {
    const feed = feedConfig()
    const releasesUrl = `https://api.github.com/repos/${encodeURIComponent(feed.owner)}/${encodeURIComponent(feed.repo)}/releases?per_page=100`
    const res = await net.fetch(releasesUrl, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
    releases = parseReleases(await res.json())
    return revertTargets(releases, app.getVersion())
  }

  return {
    start(onStatus) {
      notify = onStatus
      if (!enabled) return
      void checkNow()
      setInterval(() => void checkNow(), SIX_HOURS).unref()
    },
    checkNow,
    installAndRestart() {
      if (status.state === 'ready') autoUpdater.quitAndInstall(true, true)
    },
    current: () => status,
    listEarlier,
    async installEarlier(version, closeWindow) {
      if (!enabled) return { ok: false, message: T.coreMsg.onlyInstalled }
      let dir: string | null = null
      try {
        const target = (releases.length ? revertTargets(releases, app.getVersion()) : await listEarlier()).find((r) => r.version === version)
        if (!target) return { ok: false, message: T.coreMsg.notAVersion(version) }
        // only from this app's own releases, checked against the SHA-512 published with
        // that release before it runs, saved in a new folder with a random name (no predictable file to swap)
        const feed = feedConfig()
        const tag = releaseTagOf(target.installerUrl)
        if (
          !isOwnReleaseUrl(target.installerUrl, feed.owner, feed.repo, target.installerName) ||
          !isOwnReleaseUrl(target.checksumsUrl, feed.owner, feed.repo, 'latest.yml') ||
          !tag ||
          releaseTagOf(target.checksumsUrl) !== tag
        ) {
          log.error(`Going back to ${version} refused: not a download from this app's releases`)
          throw new Error(T.coreMsg.installerNotVerified(version))
        }
        log.info(`Going back to version ${version}: downloading ${target.installerUrl}`)
        const download = async (url: string) => {
          // a time limit, so a stalled download does not keep the window waiting for ever
          const res = await net.fetch(url, { signal: AbortSignal.timeout(10 * 60_000) }).catch((e: unknown) => {
            log.error(`Going back to ${version}: ${url} could not be downloaded`, e)
            return null
          })
          if (!res?.ok) {
            if (res) log.error(`Going back to ${version}: ${url} answered ${res.status}`)
            throw new Error(T.coreMsg.installerNotDownloaded(version))
          }
          return res
        }
        const bytes = Buffer.from(await (await download(target.installerUrl)).arrayBuffer())
        const sums = await (await download(target.checksumsUrl)).text()
        const check = checkInstaller(bytes, sums, target.installerName)
        if (!check.ok) {
          log.error(`Going back to ${version} refused: ${check.reason}`)
          throw new Error(T.coreMsg.installerNotVerified(version))
        }
        log.info(`Going back to ${version}: the installer matches its published SHA-512`)
        if (closeWindow && !(await closeWindow())) {
          log.info(`Going back to ${version} stopped: the user kept editing`)
          return { ok: false, message: '', canceled: true }
        }
        // written only now, right before it runs, into a new folder with a random name (no predictable file to swap)
        dir = mkdtempSync(join(tmpdir(), `${app.getName()}-rollback-`))
        const file = join(dir, target.installerName)
        writeFileSync(file, bytes, { flag: 'wx' })
        // silent install over the current version, then start the app again (electron-builder's NSIS options);
        // updates are paused only once the installer really started
        const child = spawn(file, ['/S', '--force-run'], { detached: true, stdio: 'ignore' })
        const started = await new Promise<boolean>((resolve) => {
          child.once('spawn', () => resolve(true))
          child.once('error', (e) => {
            log.error('The installer could not be started', e)
            resolve(false)
          })
        })
        if (!started) {
          throw new Error('the installer could not be started')
        }
        child.unref()
        dir = null // the installer runs from it now: never removed from here on
        writeFileSync(holdFile, JSON.stringify({ version, since: new Date().toISOString() }))
        log.info(`Updates paused at ${version}; the installer is running`)
        setTimeout(() => app.quit(), 500)
        return { ok: true }
      } catch (e) {
        log.error(`Going back to ${version} failed`, e)
        if (dir) rmSync(dir, { recursive: true, force: true }) // nothing left behind when it did not start
        return { ok: false, message: (e as Error).message }
      }
    },
    async resume() {
      rmSync(holdFile, { force: true })
      held = null
      log.info('Automatic updates resumed')
      set(enabled ? { state: 'idle' } : status)
      await checkNow()
    }
  }
}
