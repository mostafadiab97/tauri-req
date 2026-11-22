// Builds reqochet's Tauri front end from the same src/ as the Electron app: index.html (the screens) and the core
// (as a Web Worker, or the core.html window), with Node's and Electron's modules answered by the shims in app/shims.
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const shim = (name: string): string => resolve(__dirname, 'app/shims', name)
const alias = [
  { find: /^(node:)?fs\/promises$/, replacement: shim('fs-promises.ts') },
  { find: /^(node:)?fs$/, replacement: shim('fs.ts') },
  { find: /^(node:)?path$/, replacement: shim('path.ts') },
  { find: /^(node:)?crypto$/, replacement: shim('crypto.ts') },
  { find: /^(node:)?os$/, replacement: shim('os.ts') },
  { find: /^(node:)?url$/, replacement: shim('url.ts') },
  { find: /^(node:)?child_process$/, replacement: shim('child_process.ts') },
  { find: /^node:sqlite$/, replacement: shim('sqlite.ts') },
  { find: /^(node:)?events$/, replacement: resolve(__dirname, 'node_modules/events/events.js') },
  { find: /^(node:)?buffer$/, replacement: resolve(__dirname, 'node_modules/buffer/index.js') },
  { find: /^electron$/, replacement: shim('electron.ts') },
  { find: /^electron-updater$/, replacement: shim('electron-updater.ts') }
]

export default defineConfig(({ mode }) => ({
  root: resolve(__dirname, 'app'),
  base: './',
  plugins: [react()],
  resolve: { alias },
  // the core reads process.env at run time (set up in app/shims/env.ts); Vite would otherwise put {} in its place
  define: { 'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'), 'process.env': 'globalThis.process.env' },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  server: { port: 5173, strictPort: true, fs: { allow: [resolve(__dirname, '..')] } },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'esnext',
    chunkSizeWarningLimit: 8000,
    rollupOptions: { input: { index: resolve(__dirname, 'app/index.html') } }
  }
}))
