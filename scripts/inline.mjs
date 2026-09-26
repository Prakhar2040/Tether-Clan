// Folds a Vite build into one HTML file: the stylesheet becomes a <style>,
// the module becomes an inline <script>, and nothing is left to fetch.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [dist, out, title] = process.argv.slice(2)
let html = readFileSync(join(dist, 'index.html'), 'utf8')
const assets = readdirSync(join(dist, 'assets'))

const js = assets.filter((f) => f.endsWith('.js'))
const css = assets.filter((f) => f.endsWith('.css'))
if (js.length !== 1) throw new Error(`expected one js chunk, found ${js.length}: ${js}`)

html = html.replace(
  /<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/g,
  () => `<style>\n${css.map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n')}\n</style>`,
)
html = html.replace(
  /<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/,
  () => `<script type="module">\n${readFileSync(join(dist, 'assets', js[0]), 'utf8')}\n</script>`,
)

if (/(?:src|href)="[^"]*assets\//.test(html)) throw new Error('an asset reference survived inlining')
writeFileSync(out, html)

const mb = (Buffer.byteLength(html) / 1048576).toFixed(2)
console.log(`${title}: ${out} — ${mb} MB, self-contained`)
