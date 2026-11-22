# tauri-req — reqochet on Tauri (proof of concept)

A playground that checks whether reqochet (its public repository is `reqochet`, same owner) can run on **Tauri** (Windows' own WebView2 + a Rust
core) instead of Electron, with a much smaller installer — **without changing reqochet's screens or core**.

## How it works

- `upstream/` is a copy of the **public** reqochet (screens, core, e2e scenarios), never edited here:
  `node tools/sync-upstream.mjs <public copy>` replaces it, `--check` (in CI) fails on any hand edit.
- Two web views share one Rust process (`src-tauri/`):
  - **main** shows reqochet's screens, unchanged. It reaches the core only through `window.reqochet`
    (`app/ui-bridge.ts`), like Electron's preload.
  - **core** (hidden) runs reqochet's core, unchanged. Its Node and Electron imports are answered by small shims
    (`app/shims/`): files, Git and folder watching by Rust commands; the search index by the official SQLite
    WebAssembly build (same SQL, FTS5); dialogs, opening files and updates by Tauri plugins; PDF printing by
    WebView2's own Chromium call (the one Electron uses). Only the core web view may call the file and Git commands.
- Updates are Tauri's: every update must carry a valid signature, or it is refused.

## Proof (CI, `.github/workflows/proof.yml`, Windows)

1. Builds the installer (0.1.0 and 0.1.1) and measures its size.
2. **Calls test** (`e2e-tauri/calls-test.js`): every `window.reqochet` call against a fresh Git repository — the same
   test runs on Electron as the baseline (`e2e-tauri/calls-electron.mjs`).
3. Memory at the start screen, next to the public Electron reqochet.
4. reqochet's own **e2e scenarios**, unchanged, driving WebView2 over its DevTools port (`e2e-tauri/harness-tauri.mjs`).
5. **Automatic update** 0.1.0 → 0.1.1 with a throwaway signing key, then a changed installer that must be refused.

Local: `npm ci`, `npm run icons`, `npx tauri build` (Windows: WebView2; Linux: WebKitGTK — PDF export is Windows-only here).

## Licence

reqochet's licence (PolyForm Shield 1.0.0), see `LICENSE.md`.
