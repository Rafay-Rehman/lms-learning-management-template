import { defineConfig, devices } from '@playwright/test'

// Runs against the production build (vite preview) so tests cover what ships.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4191', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npx vite preview --port 4191 --strictPort',
    url: 'http://localhost:4191',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /responsive\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ },
    { name: 'desktop-routes', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testMatch: /responsive\.spec\.ts/ },
  ],
})
