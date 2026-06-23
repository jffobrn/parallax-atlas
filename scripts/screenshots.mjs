/**
 * Generate the documentation screenshots into docs/images/.
 *
 * It drives the built app in headless Chrome and captures the three stage views,
 * the deep-zoom lightbox, the publish dialog, and the published artifact.
 * Requires `puppeteer-core` (a dev dependency) and a local Chrome/Chromium.
 *
 * Usage:
 *   npm run build
 *   python3 -m http.server 8099 -d dist
 *   CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     node scripts/screenshots.mjs http://localhost:8099
 */

import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import puppeteer from 'puppeteer-core'

const URL_BASE = process.argv[2] || 'http://localhost:8099'
const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'images')
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickWhere(page, selector, source) {
  await page.evaluate((sel, src) => {
    const rx = new RegExp(src, 'i')
    const el = [...document.querySelectorAll(sel)].find((e) => rx.test(e.textContent || ''))
    if (!el) throw new Error('not found: ' + sel + ' /' + src + '/')
    el.click()
  }, selector, source)
}
const view = (page, name) => clickWhere(page, '.seg button', '^' + name + '$')
const click = (page, name) => clickWhere(page, 'button', name)
const row = (page, src) => clickWhere(page, '.rail .row, .row', src)

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox', '--disable-setuid-sandbox',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage', '--user-data-dir=/tmp/atchrome', '--window-size=1440,900',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL_BASE, { waitUntil: 'networkidle0', timeout: 60000 })
await page.waitForSelector('.topbar', { timeout: 30000 })
await page.evaluate(() => window.dispatchEvent(new Event('resize')))
await sleep(5000)

const shot = async (name) => {
  await page.screenshot({ path: join(OUT, name) })
  console.log('wrote', name)
}

// 1. Plate: the Mnemosyne montage board (default view).
await shot('01-plate.png')

// 2. Graph: the relations as a force-directed network.
await view(page, 'Graph')
await sleep(2800)
await shot('02-graph.png')

// 3. Map: camera positions and the resection crossing.
await view(page, 'Map')
await page.evaluate(() => window.dispatchEvent(new Event('resize')))
await sleep(3500)
await shot('03-map.png')

// 4. The deep-zoom lightbox: close looking with metadata, annotations, relations.
await view(page, 'Plate')
await sleep(1200)
await row(page, 'mural from the south-west')
await sleep(700)
await click(page, 'Look closely')
await page.waitForSelector('.osd-host', { timeout: 20000 })
await sleep(2200)
await shot('04-lightbox.png')
await page.keyboard.press('Escape')
await sleep(700)

// 5. The publish dialog: what crosses the consent boundary.
await click(page, '^Publish$')
await page.waitForSelector('.publish-grid', { timeout: 30000 })
await sleep(2500)
await shot('05-publish-dialog.png')

// 6. The published artifact itself, rendered standalone.
const html = await page.$eval('.publish-frame', (f) => f.getAttribute('srcdoc'))
const art = await browser.newPage()
await art.setViewport({ width: 1040, height: 1100, deviceScaleFactor: 2 })
await art.setContent(html, { waitUntil: 'networkidle0' })
await sleep(800)
await art.screenshot({ path: join(OUT, '06-published-artifact.png') })
console.log('wrote 06-published-artifact.png')

await browser.close()
console.log('done')
