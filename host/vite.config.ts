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
  /* One React, not two.
   *
   * This app's components live here but it imports plenty from @app, whose nearest
   * node_modules is the member app's — so a bare `react` import resolved to a different
   * copy depending on which side of the boundary the file sat on. Two React instances
   * in one bundle means the dispatcher react-dom sets is not the one the components
   * read, every hook sees null, and the page renders nothing at all.
   *
   * Dev never showed it: the dev server pre-bundles dependencies and collapses them to
   * one copy, so only production builds broke. */
  resolve: {
    alias: { '@app': appSrc, '@shared': sharedSrc },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  server: { port: 8086, fs: { allow: [repoRoot] } },
})
