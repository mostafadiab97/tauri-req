// "Go back to an earlier version": which published versions a user may install instead of the
// current one. Pure functions, unit-tested in tests/versions-0.14.1.test.ts and tests/rollback-check-1.0.1.test.ts.
import { createHash } from 'node:crypto'
import { parse as parseYaml } from 'yaml'

/**
 * The oldest version one can go back to. Older versions do not know "updates paused", so they would update
 * themselves straight back to the newest one — and versions before 0.16 are ReqMan, another app (the rename).
 */
export const OLDEST_REVERT_TARGET = '0.16.0'

export interface ReleaseInfo {
  version: string
  date: string
  /** Download address of the Windows installer. */
  installerUrl: string
  /** The installer's file name (as listed in the release's latest.yml). */
  installerName: string
  /** Download address of the release's latest.yml: the installer's SHA-512, checked before it runs (1.0.1). */
  checksumsUrl: string
}

/** Compares "1.2.3" versions: negative when a < b. Pre-release suffixes are ignored. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0)
  const pb = b.replace(/^v/, '').split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
  return 0
}

/** Reads the GitHub "list releases" answer: published (not draft, not pre-release) versions with an installer. */
export function parseReleases(json: unknown): ReleaseInfo[] {
  if (!Array.isArray(json)) return []
  const out: ReleaseInfo[] = []
  for (const r of json as Array<Record<string, unknown>>) {
    if (r.draft === true || r.prerelease === true || typeof r.tag_name !== 'string') continue
    const assets = Array.isArray(r.assets) ? (r.assets as Array<Record<string, unknown>>) : []
    const exe = assets.find((a) => typeof a.name === 'string' && /^[\w.-]+-Setup-[\d.]+\.exe$/.test(a.name))
    if (!exe || typeof exe.browser_download_url !== 'string' || !exe.browser_download_url.startsWith('https://github.com/')) continue
    // without the release's checksum file an installer cannot be checked, so it is never offered (1.0.1)
    const sums = assets.find((a) => a.name === 'latest.yml')
    if (!sums || typeof sums.browser_download_url !== 'string' || !sums.browser_download_url.startsWith('https://github.com/')) continue
    out.push({
      version: r.tag_name.replace(/^v/, ''),
      date: typeof r.published_at === 'string' ? r.published_at : '',
      installerUrl: exe.browser_download_url,
      installerName: exe.name as string,
      checksumsUrl: sums.browser_download_url
    })
  }
  return out
}

/**
 * The release to update to when the releases feed failed (GitHub answered the feed with 502):
 * the newest published release with an installer, if it is newer than `current`; null = up to date. Pure.
 */
export function newerRelease(releases: ReleaseInfo[], current: string): ReleaseInfo | null {
  const newest = [...releases].sort((a, b) => compareVersions(b.version, a.version))[0]
  return newest && compareVersions(newest.version, current) > 0 ? newest : null
}

/** Versions older than `current` and not older than OLDEST_REVERT_TARGET, newest first. */
export function revertTargets(releases: ReleaseInfo[], current: string, oldest = OLDEST_REVERT_TARGET): ReleaseInfo[] {
  return releases
    .filter((r) => compareVersions(r.version, current) < 0 && compareVersions(r.version, oldest) >= 0)
    .sort((a, b) => compareVersions(b.version, a.version))
}

/**
 * True when `url` is a download from this app's own release repository (`https://github.com/<owner>/<repo>/releases/
 * download/…`, owner and repo compared without case, as GitHub does) — nothing else is downloaded to run (1.0.1).
 */
export function isOwnReleaseUrl(url: string, owner: string, repo: string, fileName?: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  // compare the parsed, normalised path (encoded dots and the like cannot step out of the release folder)
  if (u.protocol !== 'https:' || u.hostname !== 'github.com' || u.port || u.username || u.password || /%2e|%2f|%5c/i.test(url)) return false
  const parts = u.pathname.split('/')
  // ['', owner, repo, 'releases', 'download', tag, file]
  const [first, o = '', r = '', releases, download, tag, file = ''] = parts
  if (parts.length !== 7 || first !== '' || o.toLowerCase() !== owner.toLowerCase() || r.toLowerCase() !== repo.toLowerCase()) return false
  if (releases !== 'releases' || download !== 'download' || !tag || !file) return false
  return fileName === undefined || decodeURIComponent(file) === fileName
}

/** The release tag folder of a release download address ('' when it is not one). */
export function releaseTagOf(url: string): string {
  try {
    return new URL(url).pathname.split('/')[5] ?? ''
  } catch {
    return ''
  }
}

/**
 * Checks a downloaded installer against the SHA-512 its release published in latest.yml (electron-builder writes the
 * file name and the base64 SHA-512 there; the normal update path checks the same value). Pure: bytes and texts in.
 */
export function checkInstaller(bytes: Uint8Array, latestYml: string, fileName: string): { ok: true } | { ok: false; reason: string } {
  let doc: unknown
  try {
    doc = parseYaml(latestYml)
  } catch {
    return { ok: false, reason: 'the checksum file could not be read' }
  }
  const d = (typeof doc === 'object' && doc !== null ? doc : {}) as { files?: unknown; path?: unknown; sha512?: unknown }
  const files = (Array.isArray(d.files) ? (d.files as unknown[]) : []).filter((f): f is { url?: unknown; sha512?: unknown } => typeof f === 'object' && f !== null)
  const entry = files.find((f) => f.url === fileName)
  const expected = typeof entry?.sha512 === 'string' ? entry.sha512 : d.path === fileName && typeof d.sha512 === 'string' ? d.sha512 : null
  if (!expected) return { ok: false, reason: `the checksum file does not list ${fileName}` }
  const actual = createHash('sha512').update(bytes).digest('base64')
  return actual === expected ? { ok: true } : { ok: false, reason: 'the download does not match its published checksum' }
}
