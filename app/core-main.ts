// The hidden core web view: sets up the Node-like surroundings, then loads reqochet's core (unchanged) and serves the
// screens' window.reqochet calls, which arrive as Tauri events from the main web view.
import { initEnv } from './shims/env'

await initEnv()
await import('./core-boot')
