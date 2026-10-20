import { expect, test } from '@playwright/test'
import { as, noHorizontalOverflow, routes, trackErrors } from './helpers'

// Runs on both the mobile and desktop-routes projects.

for (const [user, path, heading] of routes) {
  test(`${path} renders without errors, broken assets or horizontal overflow`, async ({ page }) => {
    const errors = trackErrors(page)
    const failed: string[] = []
    page.on('requestfailed', (r) => failed.push(r.url()))
    page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`))
    await as(page, user, path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading)
    await page.waitForLoadState('networkidle')
    await noHorizontalOverflow(page)
    expect(errors).toEqual([])
    expect(failed).toEqual([])
  })
}

test('unknown routes show a not-found page', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByRole('heading', { name: 'This page doesn’t exist' })).toBeVisible()
})

test('dashboard navigation works at this viewport', async ({ page, isMobile }) => {
  await as(page, 'u-maya', '/learn')
  if (isMobile) {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('dialog', { name: 'Navigation' }).getByRole('link', { name: 'Certificates' }).click()
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeHidden()
  } else {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Certificates' }).click()
  }
  await expect(page).toHaveURL(/\/learn\/certificates$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Certificates')
})

test('lesson curriculum is reachable at this viewport', async ({ page, isMobile }) => {
  await as(page, 'u-maya', '/learn/course/c-py-data/py-data-l8')
  if (isMobile) {
    await page.getByRole('button', { name: 'Show curriculum' }).click()
    await page.getByRole('dialog', { name: 'Course curriculum' }).getByRole('link', { name: /Grouping, aggregating/ }).click()
  } else {
    await page.getByRole('navigation', { name: 'Course curriculum' }).getByRole('link', { name: /Grouping, aggregating/ }).click()
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Grouping, aggregating and pivot tables')
})

test('admin theme editor fits this viewport', async ({ page }) => {
  await as(page, 'u-whitfield', '/admin/theme')
  await page.getByRole('tab', { name: 'Colors' }).click()
  await expect(page.locator('#primary-hex')).toBeVisible()
  await noHorizontalOverflow(page)
})
