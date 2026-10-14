import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared/src', import.meta.url)) } },
  plugins: [react()],
  server: { port: 8084, strictPort: true },
})
