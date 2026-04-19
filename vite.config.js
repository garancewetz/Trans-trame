import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // gl-bench's `browser` field points at a UMD build without a default
      // export; force the ESM entry.
      {
        find: 'gl-bench',
        replacement: fileURLToPath(new URL('./node_modules/gl-bench/dist/gl-bench.module.js', import.meta.url)),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
    ],
  },
  // Vite's esbuild pre-bundle mangles luma.gl shader uniform declarations
  // (UniformStore throws on `Object.entries(undefined)`). Ship them as-is,
  // but pre-bundle `random` + `seedrandom` so their CJS interop is resolved
  // (otherwise the ESM default import of CJS seedrandom fails).
  optimizeDeps: {
    exclude: [
      '@cosmos.gl/graph',
      '@luma.gl/core',
      '@luma.gl/engine',
      '@luma.gl/webgl',
      '@luma.gl/shadertools',
    ],
    include: ['random', 'seedrandom'],
  },
})
