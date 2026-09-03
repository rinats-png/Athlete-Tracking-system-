import { expect, test } from '@playwright/test'
import { openDemo, openGuest } from './helpers'

/**
 * Analyse, Verlauf und Profil (Konzept §19–§27) als Abläufe.
 */

test.describe('Analyse', () => {
  test('beantwortet: wo stark, wo Potenzial, was als Nächstes', async ({ page }) => {
    await openDemo(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: /Wo bin ich stark/ })).toBeVisible()
    await expect(page.getByText('Deine Stärken')).toBeVisible()
    await expect(page.getByText('Grösstes Potenzial')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Empfehlung', exact: true })).toBeVisible()
    await expect(page.getByText('Begründung')).toBeVisible()
    // Ein Profil je Sportart: Hauptsportart und die weitere aus dem Demobestand.
    await expect(page.getByText(/Performance-Profil · Functional Fitness/)).toBeVisible()
    await expect(page.getByText(/Performance-Profil · Halbmarathon/)).toBeVisible()
    await expect(page.getByText('Benchmarking')).toBeVisible()
    await expect(page.getByText('Vertiefung')).toBeVisible()
  })

  test('die Community sagt ehrlich, dass es noch keine Daten gibt', async ({ page }) => {
    await openGuest(page)
    await page.goto('/community', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Noch keine Vergleichsdaten')).toBeVisible()
    await expect(page.getByText(/keine Daten — statt einer erfundenen Zahl/)).toBeVisible()
  })
})

test.describe('Verlauf', () => {
  test('zeigt Zeiträume, erste und letzte Messung und die Entwicklung', async ({ page }) => {
    await openDemo(page)
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Entwicklung' })).toBeVisible()
    for (const label of ['1 Monat', '3 Monate', '6 Monate', '1 Jahr', 'Gesamt']) {
      await expect(page.getByRole('radio', { name: label })).toBeVisible()
    }
    // Genau: die Journey darüber trägt einen Knoten «Erste Messung», und
    // gemeint sind hier die Beschriftungen der Kennzahlen darunter.
    await expect(page.getByText('Erste', { exact: true })).toBeVisible()
    await expect(page.getByText('Letzte', { exact: true })).toBeVisible()
    await expect(page.getByText(/Verbessert|Verschlechtert|Stabil|Noch zu wenige/)).toBeVisible()
    // Ein enger Zeitraum ohne Messung sagt das, statt ein leeres Diagramm zu zeigen.
    await page.getByRole('radio', { name: '1 Monat' }).click()
    await expect(page.getByText('In diesem Zeitraum liegt keine Messung.')).toBeVisible()
  })

  test('der Kalender zeigt den Monat mit Wochentagen und lässt blättern', async ({ page }) => {
    await openDemo(page)
    await page.goto('/verlauf/kalender', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Mo', { exact: true })).toBeVisible()
    await expect(page.getByText('So', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Vormonat' }).click()
    await expect(page.getByRole('button', { name: 'Vormonat' })).toBeVisible()
  })

  test('Erinnerungen sind aus, bis man sie einschaltet — dann stehen die fälligen Tests', async ({ page }) => {
    await openDemo(page)
    await page.goto('/verlauf/erinnerungen', { waitUntil: 'domcontentloaded' })
    // Der Demobestand hat Erinnerungen an; ausschalten und wieder einschalten.
    const box = page.getByRole('checkbox', { name: 'Erinnerungen aktivieren' })
    await box.uncheck()
    await expect(page.getByText('Nichts ist fällig.')).toBeVisible()
    await box.check()
    await expect(page.getByText(/wurde seit \d+ Wochen nicht mehr getestet/).first()).toBeVisible()
  })
})

test.describe('Profil', () => {
  test('Sportarten: Hauptsportart und weitere lassen sich ändern', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Hauptsportart ändern' }).click()
    await page.getByRole('button', { name: /^Boxen/ }).click()
    await expect(page.getByRole('link', { name: 'Boxen' })).toBeVisible()
    await page.getByRole('button', { name: 'Sportart hinzufügen' }).click()
    await page.getByRole('button', { name: /^Marathon/ }).click()
    await expect(page.getByRole('link', { name: 'Marathon' })).toBeVisible()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('baseline.data.v1') ?? '{}').athletes[0].profile)
    expect(stored.disciplineId).toBe('boxing')
    expect(stored.additionalDisciplineIds).toEqual(['marathon'])
  })

  test('das Ziel lässt sich wählen und abwählen', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    const option = page.getByRole('button', { name: 'HYROX-Ziel' })
    await option.click()
    await expect(option).toHaveAttribute('aria-pressed', 'true')
    await option.click()
    await expect(page.getByText('Kein Ziel gewählt')).toBeVisible()
  })
})
