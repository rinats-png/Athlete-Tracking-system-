import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * In manchen Umgebungen liegt Chromium bereits vorinstalliert an fester
 * Stelle und `playwright install` ist gesperrt. Ist der Pfad vorhanden, wird
 * er benutzt; sonst gelten die von Playwright verwalteten Browser.
 */
const preinstalledChromium = '/opt/pw-browsers/chromium'
const launchOptions = existsSync(preinstalledChromium)
  ? { executablePath: preinstalledChromium }
  : {}

/**
 * End-to-End-Konfiguration.
 *
 * Getestet wird gegen den Produktionsbuild, nicht gegen den Dev-Server: nur
 * dort greifen Code-Splitting, Service Worker und die tatsächlich
 * ausgelieferten Assets. Ein Fehler, der nur im Build auftritt, wäre sonst
 * unsichtbar.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'de-DE',
    trace: 'on-first-retry',
    launchOptions,
  },
  projects: [
    /**
     * Geräteprofile.
     *
     * Bewusst zwei Telefonprofile:
     *
     * `phone` benutzt eine Telefongrösse mit Touch, aber ohne Chromiums
     * Mobil-Emulation. Dort stimmen Layout- und sichtbarer Viewport überein —
     * die richtige Grundlage für Abläufe und Trefferflächen, weil Klicks
     * sonst an einem Emulationsartefakt scheitern statt an einem Fehler.
     *
     * `phone-split-viewport` benutzt das volle Pixel-7-Profil, in dem beide
     * Viewports um mehrere hundert Pixel auseinanderfallen. Genau dort
     * rutschte die Navigationsleiste unter den Bildschirmrand, deshalb läuft
     * die Navigationsprüfung ausdrücklich auch dagegen.
     */
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
      name: 'phone-split-viewport',
      testMatch: /navigation\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'phone-landscape',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 915, height: 412 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: false,
      },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
