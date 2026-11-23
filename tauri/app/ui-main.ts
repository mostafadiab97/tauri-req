// The screens' web view: window.reqochet first, then reqochet's screens, unchanged.
import { invoke } from '@tauri-apps/api/core'
import './ui-bridge'
import '../../src/renderer/src/main.tsx'

// test runs only (REQOCHET_TEST=calls): the shared calls test, then the result goes to REQOCHET_TEST_OUT
void invoke<{ test: string | null; test_data: number | null; probe_repo: string | null; probe_pdf: string | null }>('app_info').then((i) => {
  if (i.test === 'calls' || i.test === 'data' || i.test === 'probe')
    void import('./calls-mode').then((m) => m.runCallsMode(i.test_data ?? 500, i.test === 'data', { repo: i.probe_repo ?? undefined, pdf: i.probe_pdf ?? undefined }))
})
