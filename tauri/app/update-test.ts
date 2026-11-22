// Automatic-update test (REQOCHET_TEST=update, CI only): reqochet's own updater module, unchanged, checks the feed,
// downloads the signed update and installs it — exactly the path a user's click takes. Each step is appended to
// <user data>/update-test.log so the CI job can follow it across the restart into the new version.
import { appendFile, mkdir } from './shims/fs-promises'
import { join } from 'pathe'
import { info } from './shims/env'
import type { Services } from '../../src/main/composition'

export async function runUpdateTest(services: Services, log: Services['log']): Promise<void> {
  const file = join(info.paths.userData as string, 'update-test.log')
  const note = async (m: string): Promise<void> => {
    log.info(`Update test: ${info.version} ${m}`)
    await appendFile(file, `${new Date().toISOString()} ${info.version} ${m}\n`).catch((e) => log.warn(`Update test: note not written: ${String(e)}`))
  }
  await mkdir(info.paths.userData as string, { recursive: true }).catch(() => {})
  await note('started')
  const deadline = Date.now() + 240_000
  let lastCheck = Date.now()
  await services.updater.checkNow()
  let seen = ''
  for (;;) {
    const s = services.updater.current()
    if (s.state !== seen) await note(`state ${JSON.stringify(s)}`)
    seen = s.state
    if (s.state === 'ready') {
      await note(`downloaded ${'version' in s ? s.version : ''} — installing`)
      services.updater.installAndRestart()
      return
    }
    if (Date.now() > deadline) {
      await note(`gave up in state ${JSON.stringify(s)}`)
      return
    }
    // the start-up check may have run before the feed was reachable: ask again now and then
    if ((s.state === 'up-to-date' || s.state === 'error' || s.state === 'idle') && Date.now() - lastCheck > 15_000) {
      lastCheck = Date.now()
      await services.updater.checkNow()
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}
