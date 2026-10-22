import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const appSrc = fileURLToPath(new URL('../frontend/src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: './',
  // One React, not two — see vite.config.ts.
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared/src', import.meta.url)), '@app': appSrc },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  define: { 'import.meta.env.VITE_STANDALONE': 'true' },
  build: {
    outDir: 'dist-standalone',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rolldownOptions: { output: { inlineDynamicImports: true } },
  },
})
