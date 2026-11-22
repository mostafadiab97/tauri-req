// "Go back to an earlier version" runs an installer only when it comes from this
// app's own releases and matches the SHA-512 published with it in that release's latest.yml.
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { checkInstaller, isOwnReleaseUrl, parseReleases, releaseTagOf } from '../src/modules/updater'

const bytes = new TextEncoder().encode('pretend installer bytes')
const sha = createHash('sha512').update(bytes).digest('base64')
const yml = (name: string, hash: string): string =>
  `version: 1.0.0\nfiles:\n  - url: ${name}\n    sha512: ${hash}\n    size: ${bytes.length}\npath: ${name}\nsha512: ${hash}\nreleaseDate: '2026-11-17T15:00:00.000Z'\n`

describe('checking an older installer before it runs', () => {
  it('accepts the installer whose SHA-512 the release published', () => {
    expect(checkInstaller(bytes, yml('reqochet-Setup-1.0.0.exe', sha), 'reqochet-Setup-1.0.0.exe')).toEqual({ ok: true })
  })
  it('refuses a changed or damaged download', () => {
    const other = new TextEncoder().encode('pretend installer bytes, changed')
    expect(checkInstaller(other, yml('reqochet-Setup-1.0.0.exe', sha), 'reqochet-Setup-1.0.0.exe').ok).toBe(false)
    expect(checkInstaller(bytes.slice(0, 5), yml('reqochet-Setup-1.0.0.exe', sha), 'reqochet-Setup-1.0.0.exe').ok).toBe(false)
  })
  it('refuses when the checksum file does not name this installer, is unreadable or empty', () => {
    expect(checkInstaller(bytes, yml('other-Setup-1.0.0.exe', sha), 'reqochet-Setup-1.0.0.exe').ok).toBe(false)
    expect(checkInstaller(bytes, 'files: [unclosed', 'reqochet-Setup-1.0.0.exe').ok).toBe(false)
    expect(checkInstaller(bytes, '', 'reqochet-Setup-1.0.0.exe').ok).toBe(false)
  })
  it('downloads only from the own repository\'s releases', () => {
    expect(isOwnReleaseUrl('https://github.com/Owner/Repo/releases/download/v1.0.0/reqochet-Setup-1.0.0.exe', 'owner', 'repo')).toBe(true)
    expect(isOwnReleaseUrl('https://github.com/other/repo/releases/download/v1.0.0/x.exe', 'owner', 'repo')).toBe(false)
    expect(isOwnReleaseUrl('https://github.com/owner/repo-evil/releases/download/v1.0.0/x.exe', 'owner', 'repo')).toBe(false)
    expect(isOwnReleaseUrl('https://github.com/owner/repo/releases/download/../../other/x.exe', 'owner', 'repo')).toBe(false)
    expect(isOwnReleaseUrl('https://evil.example/owner/repo/releases/download/v1/x.exe', 'owner', 'repo')).toBe(false)
  })
  it('never offers a release without its checksum file', () => {
    const rel = (assets: Array<{ name: string; browser_download_url: string }>) => ({ tag_name: 'v1.0.0', published_at: '', draft: false, prerelease: false, assets })
    const exe = { name: 'reqochet-Setup-1.0.0.exe', browser_download_url: 'https://github.com/o/r/releases/download/v1.0.0/reqochet-Setup-1.0.0.exe' }
    expect(parseReleases([rel([exe])])).toEqual([])
    const r = parseReleases([rel([exe, { name: 'latest.yml', browser_download_url: 'https://github.com/o/r/releases/download/v1.0.0/latest.yml' }])])
    expect(r[0]).toMatchObject({ installerName: 'reqochet-Setup-1.0.0.exe', checksumsUrl: 'https://github.com/o/r/releases/download/v1.0.0/latest.yml' })
  })

  it('refuses encoded dots, other hosts and ports, and a file name that is not the installer', () => {
    const base = 'https://github.com/owner/repo/releases/download/v1.0.0/'
    expect(isOwnReleaseUrl(`${base}%2e%2e/%2e%2e/other/x.exe`, 'owner', 'repo')).toBe(false)
    expect(isOwnReleaseUrl('https://github.com/owner/repo/releases/download/%2E%2E/x.exe', 'owner', 'repo')).toBe(false)
    expect(isOwnReleaseUrl('https://github.com:8443/owner/repo/releases/download/v1/x.exe', 'owner', 'repo')).toBe(false)
    expect(isOwnReleaseUrl(`https://user${'@'}github.com/owner/repo/releases/download/v1/x.exe`, 'owner', 'repo')).toBe(false)
    expect(isOwnReleaseUrl('not a url', 'owner', 'repo')).toBe(false)
    expect(isOwnReleaseUrl(`${base}reqochet-Setup-1.0.0.exe`, 'owner', 'repo', 'reqochet-Setup-1.0.0.exe')).toBe(true)
    expect(isOwnReleaseUrl(`${base}other.exe`, 'owner', 'repo', 'reqochet-Setup-1.0.0.exe')).toBe(false)
    expect(releaseTagOf(`${base}latest.yml`)).toBe('v1.0.0')
    expect(releaseTagOf('nonsense')).toBe('')
  })

  it('does not break on odd entries in the checksum file', () => {
    const bytes = new Uint8Array([1, 2, 3])
    const sha = createHash('sha512').update(bytes).digest('base64')
    expect(checkInstaller(bytes, 'files:\n  - null\n  - 7\n', 'a.exe').ok).toBe(false)
    expect(checkInstaller(bytes, `files:\n  - null\n  - url: a.exe\n    sha512: ${sha}\n`, 'a.exe').ok).toBe(true)
  })
})
