# reqochet on Tauri (preview)

The second build target of reqochet (the owner's decision A, 22 Nov 2026): the **same `src/`** as the Electron app,
with Tauri (Windows' own WebView2 + a small Rust program) in place of Electron. Electron stays the real reqochet; this
folder changes nothing in its build (`npm run check` and `npm run build` at the repository root do not look in here).
Background and measurements: `docs/reviews/2026-11-18-tauri-plan.md` → "Proof result".

## How it works

- **Screens:** `src/renderer`, unchanged. `app/ui-bridge.ts` provides `window.reqochet` (what the Electron preload does).
- **Core:** `src/main` and `src/modules`, unchanged, run in a **Web Worker** in the same window (design C: the screen
  never waits for it). Their Node and Electron imports are answered by `app/shims/`: files, Git (`git` only), folder
  watching and PDF printing by Rust (`src-tauri/src/`); concurrent file calls go to Rust together (`fs_batch`);
  dialogs, links and updates by Tauri plugins, which the screens' page runs for the worker (`app/host-ops.ts`); the
  search index by the official SQLite WebAssembly build (same SQL).
- **Security (the owner's condition):** the screens cannot reach files, Git or processes. The worker claims a random
  key from Rust once, when it starts (before the screens draw); Rust hands it out only once and refuses every file,
  Git, process, folder-watch and PDF call without it (`src-tauri/src/core.rs`, address `rqcore://…`). There are no
  Tauri commands for these calls, so the screens have no other way in. Checked by Rust tests (`cargo test`) and by
  the calls test from the screens' page (7 "security:" checks that must be refused).
- **Updates:** Tauri's updater; every update must carry a valid signature.

## Commands (in this folder)

```
npm install                       # Tauri-only packages; the rest comes from the repository root (npm ci there first)
npx tauri build --debug --no-bundle   # quick build: src-tauri/target/debug/
npx tauri build                   # installer (Windows: NSIS)
npm run typecheck
(cd src-tauri && cargo test --lib)   # the core-key rules
REQOCHET_TAURI_EXE=<exe> npm run test:calls   # every window.reqochet call (e2e/calls-test.js; Electron: e2e/calls-electron.mjs)
REQOCHET_TAURI_EXE=<exe> npm run test:e2e     # reqochet's own e2e scenarios over WebView2's DevTools port (Windows)
```

Linux builds use WebKitGTK; PDF export is Windows-only here.

## Lint

`npm run lint` (this folder's `eslint.config.mjs`): the repository's rules plus the module boundaries — reqochet's
modules only through their public entry, and the screens' side (`ui-*.ts`, `host-ops.ts`, `calls-mode.ts`) never
imports core code or the core's shims.

## Preview identity

"reqochet-dev (Tauri preview)": app ID `com.reqochet.dev.tauripreview`, program `reqochet-dev-tauri-preview.exe`,
installed per user in `%LOCALAPPDATA%\reqochet-dev (Tauri preview)`, settings in
`%APPDATA%\reqochet-dev-tauri-preview` — all different from the Electron reqochet-dev, so both install side by side.

## Restart after an update

On Windows the updater runs the signed installer (passive: a small progress window), which ends the app, installs and
starts the new version itself. It starts it like Explorer does — fresh environment, same command-line arguments — so
nothing may depend on environment variables (they are for tests only).

## Windows check

`ci/windows-check.yml`: lint, typecheck, Rust tests, installer, calls test (with the screens-refused checks),
50,000 items against the Electron app built from the same commit, reqochet's e2e scenarios, update 0.0.1 → 0.0.2 with
restart and a changed installer that must be refused. Started by hand; to run it, copy it into `.github/workflows/`
of the repository that should run it.
