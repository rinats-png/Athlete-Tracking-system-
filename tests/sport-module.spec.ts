import { expect, test } from '@playwright/test'
import { SPORT_MODULES, moduleFor } from '../src/data/sportModules'
import { criticalSpeed, moduleReadout } from '../src/domain/sportModule'
import { TEST_CATALOG } from '../src/data/testCatalog'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * Sportmodule.
 *
 * Vier Zusagen:
 *
 *   1. Jede Kennzahl eines Moduls kommt aus einem Test, den es gibt — und
 *      dieser Test bildet sie auch wirklich. Ein Modul kann nichts
 *      versprechen, was nirgends gemessen wird.
 *   2. Nicht gemessen ist nicht null (§89).
 *   3. Die Veränderung ist eine Zahl, kein Urteil.
 *   4. Die kritische Geschwindigkeit entsteht nur, wenn das Modell passt —
 *      sonst gibt es keine Zahl statt einer falschen.
 */

const result = (testSlug: string, performedAt: string, metrics: Record<string, number>, values: Record<string, number> = {}): StoredResult => ({
  id: `${testSlug}-${performedAt}`,
  testSlug,
  performedAt,
  values,
  metrics,
  score: null,
  bodyWeightKg: 80,
  ageYears: 30,
  sex: 'male',
  assessmentId: null,
  attempts: [],
  attemptSelection: null,
  context: { equipment: '', surface: '', temperatureC: null, timeOfDay: null, trainingStatus: '' },
  photo: null,
  createdAt: performedAt,
})

test.describe('Die Module', () => {
  test('elf Module, jedes mit Kennzahlen', () => {
    expect(SPORT_MODULES).toHaveLength(11)
    for (const module of SPORT_MODULES) {
      expect(module.metrics.length, module.category).toBeGreaterThanOrEqual(3)
    }
  })

  test('jede Kennzahl kommt aus einem Test, der sie auch bildet', async () => {
    // Der ganze Katalog, aus allen Dateien zusammengesetzt.
    const catalog = TEST_CATALOG
    const bySlug = new Map(catalog.map((t) => [t.slug, t]))

    for (const module of SPORT_MODULES) {
      for (const metric of module.metrics) {
        expect(metric.fromTests.length, `${module.category}/${metric.key}`).toBeGreaterThan(0)
        for (const slug of metric.fromTests) {
          const test = bySlug.get(slug)
          expect(test, `${module.category}/${metric.key}: Test «${slug}» gibt es nicht`).toBeTruthy()
          expect(
            test!.derivedMetrics ?? [],
            `${module.category}/${metric.key}: «${slug}» bildet diese Kennzahl nicht`,
          ).toContain(metric.key)
        }
      }
    }
  })

  test('eine unbekannte Kategorie hat kein Modul', () => {
    expect(moduleFor(null)).toBeNull()
    expect(moduleReadout([], null)).toBeNull()
  })
})

test.describe('Die Ablesung', () => {
  test('nicht gemessen ist nicht null', () => {
    const readout = moduleReadout([], 'rowing')!
    expect(readout.measured).toBe(0)
    for (const metric of readout.metrics) {
      expect(metric.latest, metric.key).toBeNull()
      expect(metric.change, metric.key).toBeNull()
    }
  })

  test('die jüngste Messung zählt, und die davor gibt die Veränderung', () => {
    const results = [
      result('row_2000m', '2026-03-01T10:00:00.000Z', { avg_power_w: 280, watts_per_kg: 3.5 }),
      result('row_2000m', '2026-06-01T10:00:00.000Z', { avg_power_w: 300, watts_per_kg: 3.75 }),
      result('row_1000m', '2026-01-01T10:00:00.000Z', { avg_power_w: 260, watts_per_kg: 3.25 }),
    ]
    const readout = moduleReadout(results, 'rowing')!
    const power = readout.metrics.find((m) => m.key === 'avg_power_w')!
    expect(power.latest).toBe(300)
    expect(power.latestAt).toBe('2026-06-01T10:00:00.000Z')
    expect(power.previous).toBe(280)
    // Die Veränderung ist die Differenz — kein Urteil, kein Vorzeichenspiel.
    expect(power.change).toBe(20)
    expect(readout.measured).toBeGreaterThan(0)
  })

  test('eine einzelne Messung hat keine Veränderung', () => {
    const readout = moduleReadout([result('row_2000m', '2026-06-01T10:00:00.000Z', { avg_power_w: 300 })], 'rowing')!
    const power = readout.metrics.find((m) => m.key === 'avg_power_w')!
    expect(power.latest).toBe(300)
    expect(power.change).toBeNull()
  })
})

test.describe('Kritische Geschwindigkeit', () => {
  test('aus zwei Läufen verschiedener Dauer', () => {
    // 5000 m in 1200 s und 2414 m in 540 s.
    // CS = (5000 − 2414) / (1200 − 540) = 2586 / 660 = 3,918 m/s
    const cs = criticalSpeed([
      result('run_5k', '2026-06-01T10:00:00.000Z', {}, { durationSeconds: 1200 }),
      result('run_1_5_mile', '2026-05-20T10:00:00.000Z', {}, { durationSeconds: 540 }),
    ])!
    expect(cs).toBeTruthy()
    expect(cs.speed).toBeCloseTo(3.918, 2)
    // D′ = 2414 − 3,918 · 540 = 298 m
    expect(cs.reserve).toBeCloseTo(298, 0)
  })

  test('ein einzelner Lauf ergibt nichts', () => {
    expect(criticalSpeed([result('run_5k', '2026-06-01T10:00:00.000Z', {}, { durationSeconds: 1200 })])).toBeNull()
  })

  test('zwei Läufe aus verschiedenen Jahren beschreiben zwei verschiedene Athleten', () => {
    expect(
      criticalSpeed([
        result('run_5k', '2026-06-01T10:00:00.000Z', {}, { durationSeconds: 1200 }),
        result('run_1_5_mile', '2024-05-20T10:00:00.000Z', {}, { durationSeconds: 540 }),
      ]),
    ).toBeNull()
  })

  test('passt das Modell nicht, gibt es keine Zahl statt einer falschen', () => {
    // Der längere Lauf ist kürzer in der Strecke — daraus folgt eine
    // negative Geschwindigkeit, und die gibt es nicht.
    expect(
      criticalSpeed([
        result('run_5k', '2026-06-01T10:00:00.000Z', {}, { durationSeconds: 400 }),
        result('run_1_5_mile', '2026-05-20T10:00:00.000Z', {}, { durationSeconds: 1200 }),
      ]),
    ).toBeNull()
  })

  test('der Cooper-Test zählt mit seiner gelaufenen Strecke', () => {
    const cs = criticalSpeed([
      result('cooper_12min', '2026-06-01T10:00:00.000Z', {}, { distanceM: 3000 }),
      result('run_5k', '2026-05-20T10:00:00.000Z', {}, { durationSeconds: 1300 }),
    ])
    expect(cs).toBeTruthy()
    // 720 s für 3000 m, 1300 s für 5000 m → CS = 2000 / 580 = 3,448 m/s
    expect(cs!.speed).toBeCloseTo(3.448, 2)
  })
})

test.describe('Im Bildschirm', () => {
  async function asElite(page: import('@playwright/test').Page) {
    const { openGuest } = await import('./helpers')
    await openGuest(page)
    await page.evaluate(() => {
      localStorage.setItem('kydon.billing.mode', 'on')
      localStorage.setItem(
        'kydon.billing.v1',
        JSON.stringify({ entitlements: [{ product: 'athlete_elite', status: 'active', currentPeriodEnd: null }], coachGrant: false, checkedAt: null }),
      )
    })
  }

  test('ohne Sportart im Profil führt der Weg ins Profil, nicht ins Leere', async ({ page }) => {
    await asElite(page)
    await page.goto('/sportmodul', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Keine Sportart im Profil')).toBeVisible()
  })

  test('mit Sportart stehen die Kennzahlen da — auch die ungemessenen', async ({ page }) => {
    await asElite(page)
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      store.athletes[0].profile.sportCategoryId = 'rowing'
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })
    await page.goto('/sportmodul', { waitUntil: 'domcontentloaded' })

    const panel = page.getByTestId('sport-module')
    await expect(panel).toBeVisible()
    // Ohne Messung steht «noch nicht gemessen» da — keine Null, keine Lücke.
    await expect(page.getByTestId('unmeasured-avg_power_w')).toBeVisible()
    await expect(panel).toContainText('0 von 3 gemessen')

    // Und kein rohes Schlüsselwort: jede Kennzahl hat einen Namen.
    const text = await panel.innerText()
    expect(text).not.toContain('avg_power_w')
    expect(text).not.toContain('watts_per_kg')
  })

  test('der Bildschirm bewertet nichts', async ({ page }) => {
    await asElite(page)
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('kydon.data.v1')!)
      store.athletes[0].profile.sportCategoryId = 'rowing'
      localStorage.setItem('kydon.data.v1', JSON.stringify(store))
    })
    await page.goto('/sportmodul', { waitUntil: 'domcontentloaded' })
    const text = await page.locator('main').innerText()
    for (const wort of ['schwach', 'stark', 'Defizit', 'zu langsam', 'verbessere', 'du solltest', 'Empfehlung']) {
      expect(text, `«${wort}» wäre ein Urteil`).not.toContain(wort)
    }
    await expect(page.getByTestId('sport-module-scope')).toContainText('sagt diese App nicht')
  })
})
