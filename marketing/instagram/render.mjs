// Rendert alle marketing/instagram/posts/*.html nach png/ (1080×1350, 4:5).
//   node marketing/instagram/render.mjs            alle Posts
//   node marketing/instagram/render.mjs 07 12      nur die Nummern 07 und 12
import { chromium } from '@playwright/test'
import { readdirSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const postsDir = join(here, 'posts')
const outDir = join(here, 'png')
mkdirSync(outDir, { recursive: true })

const only = process.argv.slice(2)
const files = readdirSync(postsDir)
  .filter((f) => f.endsWith('.html'))
  .filter((f) => only.length === 0 || only.some((n) => f.startsWith(n)))
  .sort()

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const context = await browser.newContext({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 1,
})
// Google Fonts ist im HTML verlinkt, damit ein Browser mit Netz sie zieht. Beim
// Rendern wird die Anfrage abgebrochen, sonst blockiert ein hängender Proxy den
// Seitenaufbau — die Schriften kommen ohnehin lokal aus fonts/.
// GOOGLE_FONTS=1 lässt die Anfrage durch.
if (!process.env.GOOGLE_FONTS) {
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort())
}
const page = await context.newPage()
for (const file of files) {
  const url = pathToFileURL(resolve(postsDir, file)).href
  await page.goto(url, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const loaded = await page.evaluate(() =>
    ['Saira Condensed', 'IBM Plex Sans', 'IBM Plex Mono'].map(
      (f) => `${f}:${document.fonts.check(`16px "${f}"`)}`,
    ),
  )
  const overflow = await page.evaluate(() => {
    const bad = []
    document.querySelectorAll('.post *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width && (r.right > 1081 || r.bottom > 1351 || r.left < -1 || r.top < -1)) bad.push(el.tagName + '.' + el.className)
    })
    return bad.slice(0, 5)
  })
  const lines = await page.evaluate(() => {
    const h = document.querySelector('h1')
    return Math.round(h.getBoundingClientRect().height / (parseFloat(getComputedStyle(h).fontSize) * 0.98))
  })
  const out = join(outDir, file.replace(/\.html$/, '.png'))
  await page.screenshot({ path: out, fullPage: false })
  console.log(file, loaded.join(' '), 'h1-lines=' + lines, lines > 3 ? 'TOO-MANY-LINES' : '', overflow.length ? 'OVERFLOW ' + overflow.join(',') : '')
}
await browser.close()
