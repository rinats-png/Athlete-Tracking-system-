import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * Eigene Konfiguration für die Mockup-Aufnahmen.
 *
 * Bewusst getrennt von `playwright.config.ts`: die Aufnahmen sind keine
 * Prüfung. Sie liefen sonst in allen fünf Geräteprofilen mit und würden
 * jeden Testlauf um Minuten verlängern. Zwei Profile genügen — Telefon und
 * Schreibtisch —, weil die App dazwischen ihr Layout wechselt.
 */
const preinstalledChromium = '/opt/pw-browsers/chromium'
const launchOptions = existsSync(preinstalledChromium)
  ? { executablePath: preinstalledChromium }
  : {}

export default defineConfig({
  testDir: './mockups',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 900_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'de-DE',
    launchOptions,
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: false,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
