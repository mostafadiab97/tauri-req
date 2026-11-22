// Automatic-update test (REQOCHET_TEST=update, CI only): reqochet's own updater module, unchanged, checks the feed,
// downloads the signed update and installs it — exactly the path a user's click takes. Each step is appended to
// <user data>/update-test.log so the CI job can follow it across the restart into the new version.
import { appendFile, mkdir } from './shims/fs-promises'
import { join } from 'pathe'
import { info } from './shims/env'
import type { Services } from '../upstream/src/main/composition'

export async function runUpdateTest(services: Services, log: Services['log']): Promise<void> {
  const file = join(info.paths.userData as string, 'update-test.log')
  const note = (m: string): Promise<void> => appendFile(file, `${new Date().toISOString()} ${info.version} ${m}\n`).catch(() => {})
  await mkdir(info.paths.userData as string, { recursive: true }).catch(() => {})
  await note('started')
  const deadline = Date.now() + 240_000
  await services.updater.checkNow()
  for (;;) {
    const s = services.updater.current()
    if (s.state === 'ready') {
      await note(`downloaded ${'version' in s ? s.version : ''} — installing`)
      log.info('Update test: installing')
      services.updater.installAndRestart()
      return
    }
    if (s.state === 'up-to-date' || s.state === 'error' || s.state === 'disabled' || Date.now() > deadline) {
      await note(`final state ${JSON.stringify(s)}`)
      return
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}
