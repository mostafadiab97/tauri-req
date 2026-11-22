// ESLint for the Tauri preview (run in this folder: npm run lint). The repository's own config skips tauri/; this one
// applies the same rules and module boundaries (NFR-12) to the Tauri layer:
//  1. reqochet's modules only through their public entry (src/modules/<name> or …/index) — never their internals.
//  2. The screens' side (ui-*.ts, host-ops.ts, calls-mode.ts) never imports core code (src/main, src/modules) or the
//     core's shims: it reaches the core only through window.reqochet, like the Electron renderer.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

const moduleInternals = {
  group: ['**/modules/*/*', '!**/modules/*/index', '!**/modules/*/index.ts'],
  message: 'Import a module only through its public entry (modules/<name>). Internals are private — see docs/ARCHITECTURE.md.'
}

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'src-tauri/**', 'e2e/out/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    languageOptions: { globals: { ...globals.browser, ...globals.worker, ...globals.node } },
    rules: {
      'no-restricted-imports': ['error', { patterns: [moduleInternals] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    // the screens' side: no core code, no shims (only window.reqochet, shared types and the screens themselves)
    files: ['app/ui-*.ts', 'app/host-ops.ts', 'app/calls-mode.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            moduleInternals,
            {
              group: ['**/src/main/**', '**/src/modules/**', './shims/*', '!./shims/host', 'electron', 'node:*'],
              message: 'The screens must not use core code: call window.reqochet (src/shared/api.ts) instead.'
            }
          ]
        }
      ]
    }
  }
)
