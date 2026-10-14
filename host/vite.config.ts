import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// The host console is a separate app, but it reads the attendee app's types
// and data rather than forking them — this repo already has one divergent
// copy of the model (backend/src/data/seed.ts) and does not need a third.
const sharedSrc = fileURLToPath(new URL('../shared/src', import.meta.url))
const appSrc = fileURLToPath(new URL('../frontend/src', import.meta.url))
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@app': appSrc, '@shared': sharedSrc } },
  server: { port: 8086, fs: { allow: [repoRoot] } },
})
