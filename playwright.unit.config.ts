import { defineConfig } from '@playwright/test'

// Pure business-logic tests: no browser, no server.
export default defineConfig({ testDir: './tests/unit', reporter: [['list']] })
