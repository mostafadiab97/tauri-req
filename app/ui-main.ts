// The screens' web view: window.reqochet first, then reqochet's screens, unchanged.
import { invoke } from '@tauri-apps/api/core'
import './ui-bridge'
import '../upstream/src/renderer/src/main.tsx'

// test runs only (REQOCHET_TEST=calls): the shared calls test, then the result goes to REQOCHET_TEST_OUT
void invoke<{ test: string | null; test_data: number | null; core_mode: string }>('app_info').then((i) => {
  if (i.test === 'calls') void import('./calls-mode').then((m) => m.runCallsMode(i.test_data ?? 500, i.core_mode))
})
