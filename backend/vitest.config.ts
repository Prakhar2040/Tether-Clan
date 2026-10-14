import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/* `@shared` is a tsconfig path, which tsx honours and vitest does not — so
   it is spelled out again here. Without it a test that reaches anything
   under src/routes fails to resolve rather than to assert. */
export default defineConfig({
  resolve: {
    alias: { '@shared': resolve(import.meta.dirname, '../shared/src') },
  },
})
