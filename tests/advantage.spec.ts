import { expect, test, type Page } from '@playwright/test'
import { emptyData } from '../src/lib/store/schema'
import type { StoredResult } from '../src/lib/store/localStore'
import { blockFonts, openDemo, openGuest } from './helpers'

/**
 * Der unfaire Vorteil in der Oberfläche: Anforderungslücke, Wettkampf als
 * Rahmen, das Berichtsangebot im Moment der belegten Veränderung, die Flächen
 * für den Trainer. Diese Fälle prüfen, dass jedes Signal mit seinem Grund
 * erscheint — und dass die App nirgends sagt, WAS zu trainieren ist.
 */

const result = (slug: string, day: string, score: number): StoredResult =>
  ({
    id: `${slug}-${day}`,
    testSlug: slug,
    performedAt: `${day}T09:00:00.000Z`,
    values: { gripKg: score },
    metrics: {},
    score,
    bodyWeightKg: 80,
    ageYears: 28,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    photo: null,
    createdAt: `${day}T09:00:00.000Z`,
  }) as StoredResult

/** Ein eingerichteter Bestand mit vorgegebenen Messungen, direkt in den Speicher. */
async function openSeeded(page: Page, results: StoredResult[]) {
  await blockFonts(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const seeded = emptyData()
  seeded.athletes[0].profile.onboardingCompletedAt = '2026-01-01T00:00:00.000Z'
  seeded.athletes[0].profile.sex = 'male'
  seeded.athletes[0].profile.birthDate = '1998-01-01'
  seeded.athletes[0].results = results
  await page.evaluate(
    ({ store }) => {
      localStorage.clear()
      localStorage.setItem('kydon.theme', 'dark')
      localStorage.setItem('kydon.locale', 'de')
      localStorage.setItem('kydon.intro', 'off')
      localStorage.setItem(
        'kydon.account.v1',
        JSON.stringify({ name: 'Prueflauf', email: 'pruef@baseline.test', role: 'athlete', planId: null, createdAt: '2026-01-01T00:00:00.000Z' }),
      )
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
      localStorage.setItem('kydon.mode', 'guest')
    },
    { store: seeded },
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
}

test.describe('Anforderungslücke und Wettkampf auf der Übersicht', () => {
  test('der Demobestand zeigt die Rangfolge, den Wettkampf und die Fläche zwischen den Tests', async ({ page }) => {
    await openDemo(page)
    const lever = page.getByTestId('lever-panel')
    await expect(lever).toBeVisible()
    await expect(lever.getByText('Anforderungslücke')).toBeVisible()
    await expect(lever.getByText(/Hebel \d+/).first()).toBeVisible()
    // Die App sagt WO, nicht WAS.
    await expect(lever.getByText(/Was dort zu tun ist, entscheidest du/)).toBeVisible()

    const competition = page.getByTestId('competition-panel')
    await expect(competition.getByText('Landesmeisterschaft')).toBeVisible()
    await expect(competition.getByText('Grundlage')).toBeVisible()
    await expect(competition.getByText('Formcheck')).toBeVisible()
    await expect(competition.getByText(/nimmt an, dass nichts anders wird/)).toBeVisible()

    await expect(page.getByTestId('between-panel')).toBeVisible()
  })

  test('die Analyse zeigt die ganze Rangfolge samt Rechenweg', async ({ page }) => {
    await openDemo(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
    const lever = page.getByTestId('lever-panel')
    await expect(lever.getByText(/Anforderungshöhe der Disziplin/)).toBeVisible()
    await expect(lever.getByText(/Voreinstellung dieser App/)).toBeVisible()
  })

  test('ohne Wettkampf führt die Fläche ins Profil, und ein Datum dort macht den Rahmen', async ({ page }) => {
    await openGuest(page)
    await expect(page.getByTestId('competition-panel')).toHaveCount(0) // ohne Messungen: leere Übersicht
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    const settings = page.getByTestId('competition-settings')
    const inSixtyDays = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
    await settings.getByLabel('Datum').fill(inSixtyDays)
    await settings.getByLabel('Bezeichnung').fill('Vereinsmeisterschaft')
    await expect(settings.getByRole('button', { name: 'Wettkampf entfernen' })).toBeVisible()

    // Mit einer Messung ist die Übersicht da — und der Wettkampf darauf.
    await page.goto('/tests/standing_broad_jump', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/Sprungweite|Weite|Distanz/).first().fill('2.40')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const competition = page.getByTestId('competition-panel')
    await expect(competition.getByText('Vereinsmeisterschaft')).toBeVisible()
    await expect(competition.getByText(/in \d+ Tagen/)).toBeVisible()
  })
})

test.describe('Das Berichtsangebot im Moment der Veränderung', () => {
  const steady = ['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'].map((d, i) => result('grip_strength', d, 50 + (i % 2)))

  test('eine belegte Veränderung bekommt das Angebot, im Bericht festgehalten zu werden', async ({ page }) => {
    const jump = result('grip_strength', '2026-05-05', 62)
    await openSeeded(page, [...steady, jump])
    await page.goto(`/ergebnis/${jump.id}`, { waitUntil: 'domcontentloaded' })
    const offer = page.getByTestId('proven-offer')
    await expect(offer).toBeVisible()
    await expect(offer.getByRole('link', { name: 'Im Bericht festhalten' })).toHaveAttribute('href', '/bericht')
    await expect(page.getByTestId('noise-advantage')).toHaveCount(0)
  })

  test('innerhalb der Schwankung gibt es kein Angebot, dafür den benannten Vorteil', async ({ page }) => {
    const same = result('grip_strength', '2026-05-05', 50.5)
    await openSeeded(page, [...steady, same])
    await page.goto(`/ergebnis/${same.id}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('noise-advantage')).toBeVisible()
    await expect(page.getByTestId('proven-offer')).toHaveCount(0)
  })
})

test.describe('Zwischen den Tests', () => {
  test('Schlaf und Belastung lassen sich als Beobachtung erfassen — ohne Bewertung', async ({ page }) => {
    await openGuest(page)
    await page.goto('/beobachtung', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Beobachtungswerte', { exact: true }).selectOption('sleep_h')
    await page.getByLabel('Wert', { exact: true }).fill('7.5')
    await page.getByRole('button', { name: 'Wert erfassen' }).click()
    await expect(page.getByRole('heading', { name: 'Schlafdauer' })).toBeVisible()
    for (const wort of ['Schwach', 'Durchschnitt', 'Elite']) {
      await expect(page.getByText(wort, { exact: true })).toHaveCount(0)
    }
  })
})

test.describe('Trainerflächen', () => {
  async function enableCoach(page: Page) {
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: 'Trainer' }).click()
    await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Mara Vogt')
  }

  test('Verfügbarkeit und Neuzugang stehen mit ihren Gründen im Trainerbereich', async ({ page }) => {
    await openGuest(page)
    await enableCoach(page)
    await page.goto('/trainer', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('availability-panel').getByText(/keine Freigabe, keine Sperre/)).toBeVisible()
    await expect(page.getByTestId('availability-panel').getByText(/drei Selbsteinschätzungen/)).toBeVisible()
    await expect(page.getByTestId('newcomer-panel')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Gruppen-Heatmap' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Wirksamkeitsnachweis' })).toBeVisible()
  })

  test('die Heatmap und der Nachweis sagen, was ihnen fehlt, statt leer zu bleiben', async ({ page }) => {
    await openGuest(page)
    await enableCoach(page)
    await page.goto('/trainer/heatmap', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Sobald zwei Athleten gemessen sind/)).toBeVisible()
    await expect(page.getByText(/entscheidet der Trainer/)).toBeVisible()
    await page.goto('/trainer/nachweis', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/nichts zu belegen/)).toBeVisible()
    await expect(page.getByText(/keine Ursache/)).toBeVisible()
  })

  test('ein Neuzugang erscheint nach seiner ersten Messung, eingeordnet', async ({ page }) => {
    await openGuest(page)
    await enableCoach(page)
    await page.goto('/tests/standing_broad_jump', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/Sprungweite|Weite|Distanz/).first().fill('2.40')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')
    await page.goto('/trainer', { waitUntil: 'domcontentloaded' })
    const row = page.getByTestId('newcomer-row')
    await expect(row).toHaveCount(1)
    await expect(row.getByText('Mara Vogt')).toBeVisible()
    await expect(row.getByText(/seit 0 Tagen · 1 Messungen/)).toBeVisible()
  })
})
