import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// One file, openable from disk. Every asset becomes a data URI and the whole
// bundle lands in a single chunk, so there is nothing left to fetch.
export default defineConfig({
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared/src', import.meta.url)) } },
  plugins: [react()],
  base: './',
  define: { 'import.meta.env.VITE_STANDALONE': 'true' },
  build: {
    outDir: 'dist-standalone',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rolldownOptions: { output: { inlineDynamicImports: true } },
  },
})
