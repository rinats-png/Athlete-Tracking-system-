import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'
import { openDemo } from '../tests/helpers'

/**
 * Aufnahmen «Training starten» (keine Prüfung): Heute, Bereich Training,
 * Kraft mit Fokus und Pausenring, Leiste «Training läuft», Rundenuhr, Lauf,
 * Kamera-Auswahl, Zusammenfassung.
 *
 * Aufruf: VITE_TRAINING_PLAN=preview npx playwright test -c playwright.mockups.config.ts mockups/training-start.spec.ts --project=phone
 */
const OUT = process.env.SHOTS ?? 'mockups/out/training-start'

test('Training starten: alle Ansichten', async ({ page, context }) => {
  mkdirSync(OUT, { recursive: true })
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 48.1, longitude: 11.5, accuracy: 5 })
  await openDemo(page)
  const shot = async (name: string) => {
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/${name}.png` })
  }
  const clear = () => page.evaluate(() => localStorage.removeItem('kydon.workout.active.v1'))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await shot('1-heute')
  await page.goto('/plan', { waitUntil: 'domcontentloaded' })
  await shot('2-training')

  await page.goto('/plan/frei/neu', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('free-search').fill('Kniebeuge')
  await page.locator('[data-testid^="free-add-"]').first().click()
  await page.getByTestId('free-build-start').click()
  await page.getByTestId('setlog-focus').scrollIntoViewIfNeeded()
  await shot('3-kraft')
  await page.getByTestId('setlog-focus-reps').fill('5')
  await page.getByTestId('setlog-done-set').click()
  await shot('4-pause')
  await page.getByTestId('setlog-rest-skip').click()
  await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
  await shot('5-leiste')
  await page.getByTestId('active-workout-back').click()
  await page.getByTestId('free-rpe-7').click()
  await page.getByTestId('free-save').click()
  await page.getByTestId('workout-summary').waitFor()
  await shot('6-zusammenfassung')

  await clear()
  await page.goto('/plan/uhr', { waitUntil: 'domcontentloaded' })
  await shot('7-uhr-einstellen')
  await page.getByTestId('clock-start').click()
  await page.getByTestId('clock-skip').click()
  await shot('8-uhr-runde')

  await clear()
  await page.goto('/plan/lauf', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('run-mode-intervals').click()
  await page.getByTestId('run-start').click()
  await shot('9-lauf')

  await clear()
  await page.goto('/plan/kamera', { waitUntil: 'domcontentloaded' })
  await shot('10-kamera')
})
