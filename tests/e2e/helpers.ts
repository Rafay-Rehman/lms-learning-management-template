import { expect, type Page } from '@playwright/test'

/** Collects console errors and uncaught exceptions for the page's lifetime. */
export function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** Seeds the demo (first visit) and switches to a demo account before navigating. */
export async function as(page: Page, userId: string, path = '/') {
  await page.goto('/verify')
  await page.waitForFunction(() => localStorage.getItem('lectern:data'))
  await page.evaluate((u) => {
    const d = JSON.parse(localStorage.getItem('lectern:data')!)
    d.currentUserId = u
    localStorage.setItem('lectern:data', JSON.stringify(d))
  }, userId)
  await page.goto(path)
}

export async function stored(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('lectern:data') ?? 'null'))
}

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'page should not scroll horizontally').toBeLessThanOrEqual(1)
}

export const main = (page: Page) => page.locator('main')
export const toast = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

export const routes: [string, string, string][] = [
  ['u-maya', '/', 'Learn something'],
  ['u-maya', '/courses', 'Course catalog'],
  ['u-maya', '/courses/py-data', 'Python for Data Analysis'],
  ['u-maya', '/verify', 'Verify a certificate'],
  ['u-maya', '/learn', 'Maya'],
  ['u-maya', '/learn/explore', 'Explore Courses'],
  ['u-maya', '/learn/calendar', 'Learning Calendar'],
  ['u-maya', '/learn/assessments', 'Quizzes & Assessments'],
  ['u-maya', '/learn/quizzes/q-py-1', 'Check your understanding'],
  ['u-maya', '/learn/assignments/as-1', 'Bike trip analysis report'],
  ['u-maya', '/learn/certificates', 'Certificates'],
  ['u-maya', '/learn/history', 'Learning History'],
  ['u-maya', '/learn/notifications', 'Notifications'],
  ['u-maya', '/learn/profile', 'My Profile'],
  ['u-maya', '/learn/settings', 'Settings'],
  ['u-maya', '/learn/course/c-py-data/py-data-l8', 'Tidy data'],
  ['u-maya', '/learn/course/c-py-data/overview', 'Python for Data Analysis'],
  ['u-okafor', '/teach', 'Welcome back'],
  ['u-okafor', '/teach/courses', 'My Courses'],
  ['u-okafor', '/teach/builder?course=c-py-data', 'Python for Data Analysis'],
  ['u-okafor', '/teach/students', 'Student Management'],
  ['u-okafor', '/teach/quizzes/q-py-final', 'final assessment'],
  ['u-okafor', '/teach/assignments/as-1', 'Bike trip analysis report'],
  ['u-okafor', '/teach/grades', 'Grading'],
  ['u-okafor', '/teach/analytics', 'Learning Analytics'],
  ['u-okafor', '/teach/announcements', 'Announcements'],
  ['u-whitfield', '/admin', 'Platform overview'],
  ['u-whitfield', '/admin/analytics', 'Platform Analytics'],
  ['u-whitfield', '/admin/subjects', 'Subjects'],
  ['u-whitfield', '/admin/subjects/sub-data120', 'Data Analysis'],
  ['u-whitfield', '/admin/terms', 'Terms / Semesters'],
  ['u-whitfield', '/admin/students', 'Students'],
  ['u-whitfield', '/admin/enrollments', 'Enrollments'],
  ['u-whitfield', '/admin/question-bank', 'Question Bank'],
  ['u-whitfield', '/admin/grades', 'Grades & Results'],
  ['u-whitfield', '/admin/certificates', 'Certificates'],
  ['u-whitfield', '/admin/reports', 'Reports & Exports'],
  ['u-whitfield', '/admin/theme', 'Theme & Branding'],
  ['u-whitfield', '/admin/website', 'Website Appearance'],
  ['u-whitfield', '/admin/navigation', 'Navigation & Menu Settings'],
]
