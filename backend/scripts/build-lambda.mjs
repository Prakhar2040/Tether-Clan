import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'

/* One file, everything inside it. Lambda cold-start cost is mostly reading
   node_modules off disk, so the bundle is the whole app and nothing else is
   shipped. `@shared/*` resolves through tsconfig paths. The banner gives the
   ESM output a `require`, which pg and Fastify still reach for internally. */
mkdirSync('dist/lambda', { recursive: true })

await build({
  entryPoints: ['src/lambda.ts'],
  outfile: 'dist/lambda/index.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  minifySyntax: true,
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
})

// Without this Node treats a lone .mjs as ESM anyway, but the marker keeps any
// tool that inspects the folder from guessing.
writeFileSync('dist/lambda/package.json', JSON.stringify({ type: 'module' }) + '\n')
