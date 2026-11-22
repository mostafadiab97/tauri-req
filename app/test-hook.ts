// Core-side test hook (registered only when REQOCHET_TEST is set): temporary folders, git, files, dialog answers.
import { join } from 'pathe'
import { execFile } from './shims/child_process'
import { mkdtemp, writeFile } from './shims/fs-promises'
import { tmpdir } from './shims/small'
import { dialog, handlers } from './shims/electron'

export function registerTestHook(): void {
  const open: string[] = []
  const save: string[] = []
  let message = 0
  dialog.showOpenDialog = async () => (open.length ? { canceled: false, filePaths: [open.shift() as string] } : { canceled: true, filePaths: [] })
  dialog.showSaveDialog = async () => (save.length ? { canceled: false, filePath: save.shift() as string } : { canceled: true })
  dialog.showMessageBox = async () => ({ response: message, checkboxChecked: false })
  handlers.set('__test', async (_e, op, ...args) => {
    switch (op) {
      case 'tmp':
        return mkdtemp(join(tmpdir(), `rq-${String(args[0])}-`))
      case 'git':
        return new Promise((resolve, reject) =>
          execFile('git', args[1] as string[], { cwd: args[0] as string, env: (globalThis as unknown as { process: { env: Record<string, string> } }).process.env }, (err, stdout) => (err ? reject(err) : resolve(stdout)))
        )
      case 'write':
        return writeFile(args[0] as string, args[1] as string)
      case 'answer': {
        const a = args[0] as { open?: string[]; save?: string[]; message?: number }
        if (a.open) open.splice(0, open.length, ...a.open)
        if (a.save) save.splice(0, save.length, ...a.save)
        if (a.message !== undefined) message = a.message
        return null
      }
    }
    throw new Error(`unknown test op ${String(op)}`)
  })
}
