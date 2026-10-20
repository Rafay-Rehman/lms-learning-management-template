// Dev-only screenshot helper: node shot.mjs <path> <name> [width] [dark] [userId]
import { chromium } from '@playwright/test'
const [, , path = '/', name = 'shot', width = '1440', dark = '', user = ''] = process.argv
const out = '/tmp/claude-1000/-home-dell-templates/5b0c858f-70c2-44a2-87df-569470f3933c/scratchpad/shots/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, colorScheme: dark ? 'dark' : 'light' })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))
await page.goto('http://localhost:5191/')
if (user) {
  await page.evaluate((u) => { const d = JSON.parse(localStorage.getItem('lectern:data')); if (d) { d.currentUserId = u; localStorage.setItem('lectern:data', JSON.stringify(d)) } }, user)
}
if (dark) await page.evaluate(() => localStorage.setItem('lectern:prefs', JSON.stringify({ mode: 'dark' })))
await page.goto('http://localhost:5191' + path)
await page.waitForTimeout(1200)
await page.screenshot({ path: out + name + '.png', fullPage: process.env.FULL === '1' })
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors')
await browser.close()
