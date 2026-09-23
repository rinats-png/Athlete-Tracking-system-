import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { PROTOCOL_V1, PROTOCOL_VERSION } from '../src/data/protocolV1'
import { getTest } from '../src/data/testCatalog'
import { procedureFor } from '../src/data/testProcedure'
import { resultsToCsv } from '../src/lib/export/csv'
import { protocolInfoSchema } from '../src/lib/store/schema'

/**
 * Standardisierte Testdokumentation, Protokoll v1.0.
 *
 * Der teuerste Fehler wäre, zwei Messungen unter verschiedenen Protokollen
 * als gleichwertig zu behandeln: deshalb trägt jedes neue Ergebnis seine
 * Version, und ein altes steht als «Protokoll unbekannt» da — nicht als
 * ungültig und nicht stillschweigend als v1.0.
 */

const THIRTEEN = [
  'cooper_12min',
  'beep_test_20m',
  'row_2000m',
  'back_squat_1rm',
  'deadlift_1rm',
  'bench_press_1rm',
  'clean_and_jerk_1rm',
  'snatch_1rm',
  'bear_complex',
  'cindy_20min_amrap',
  'assault_bike_10min_cal',
  'illinois_agility',
  'standing_broad_jump',
]

test.describe('Protokoll v1.0 — Daten', () => {
  test('alle dreizehn Tests der Dokumentation haben ein Protokoll und stehen im Katalog', () => {
    expect(Object.keys(PROTOCOL_V1).sort()).toEqual([...THIRTEEN].sort())
    for (const slug of THIRTEEN) {
      const t = getTest(slug)
      expect(t, slug).toBeTruthy()
      expect(PROTOCOL_V1[slug].methods.length, slug).toBeGreaterThan(0)
    }
  })

  test('die Entscheidungen landen in der Durchführungsvorschrift', () => {
    const squat = procedureFor(getTest('back_squat_1rm')!).procedure
    expect(squat.valid.map((v) => v.de).join(' ')).toContain('Hüftfalte kommt unter die Oberkante')
    expect(squat.attempts.de).toContain('Epley')
    const beep = procedureFor(getTest('beep_test_20m')!).procedure
    expect(beep.valid.map((v) => v.de).join(' ')).toContain('Léger (1988)')
    // Auch eine allgemeine Vorschrift bekommt die v1.0-Regeln.
    const cindy = procedureFor(getTest('cindy_20min_amrap')!).procedure
    expect(cindy.valid.map((v) => v.de).join(' ')).toContain('Kipping')
  })

  test('ein altes Ergebnis ohne Angaben gilt als «Protokoll unbekannt»', () => {
    const empty = protocolInfoSchema.parse({})
    expect(empty.version).toBeNull()
    expect(empty.invalidAttempts).toEqual([])
    const csv = resultsToCsv(
      {
        profile: {} as never,
        biometrics: [],
        assessments: [],
        results: [
          {
            id: 'r1',
            testSlug: 'cooper_12min',
            performedAt: '2026-01-01T12:00:00.000Z',
            values: { distanceM: 2600 },
            metrics: {},
            score: 2600,
            bodyWeightKg: null,
            ageYears: null,
            sex: null,
            assessmentId: null,
            attempts: [],
            attemptSelection: null,
            context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
            protocol: empty,
            photo: null,
            createdAt: '2026-01-01T12:00:00.000Z',
          },
        ],
      } as never,
      'de',
    )
    const [head, row] = csv.split('\r\n')
    const cols = head.split(',')
    expect(row.split(',')[cols.indexOf('protocol_version')]).toBe('unknown')
  })
})

test.describe('Protokoll v1.0 — Erfassung', () => {
  test('Methode ist vorbelegt, ungültige Versuche zählen nicht, das Ergebnis trägt die Version', async ({
    page,
  }) => {
    await openGuest(page)
    await page.goto('/tests/back_squat_1rm', { waitUntil: 'domcontentloaded' })

    const fields = page.getByTestId('protocol-fields')
    await expect(fields).toBeVisible()
    await expect(fields.getByText(`Protokoll v${PROTOCOL_VERSION}`)).toBeVisible()
    await expect(fields.getByLabel('Messmethode')).toHaveValue('direct_1rm')

    // Geschätztes 1RM ist eine eigene Methode und wird so benannt.
    await fields.getByLabel('Messmethode').selectOption('estimated_e1rm')
    await expect(fields.getByText(/nicht direkt mit einem getesteten 1RM vergleichbar/)).toBeVisible()
    await fields.getByLabel('Messmethode').selectOption('direct_1rm')

    await page.getByLabel(/^Wiederholungen/).fill('1')
    await page.getByRole('button', { name: 'Versuch', exact: true }).click()
    await page.getByRole('button', { name: 'Versuch', exact: true }).click()
    await page.getByLabel('Versuch 1', { exact: true }).fill('140')
    await page.getByLabel('Versuch 2', { exact: true }).fill('150')
    // Der schwerere Versuch war zu hoch — er bleibt stehen, zählt aber nicht.
    await page.getByLabel('Gültigkeit Versuch 2').selectOption('depth')

    await fields.getByLabel('Testleiter').fill('A. Muster')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    const store = JSON.parse((await page.evaluate(() => localStorage.getItem('kydon.data.v1'))) ?? '{}')
    const result = store.athletes[0].results[0]
    expect(result.protocol.version).toBe(PROTOCOL_VERSION)
    expect(result.protocol.method).toBe('direct_1rm')
    expect(result.protocol.tester).toBe('A. Muster')
    expect(result.protocol.invalidAttempts).toEqual([{ index: 1, reason: 'depth' }])
    expect(result.attempts).toHaveLength(2)
    expect(result.values.loadKg).toBe(140)

    const line = page.getByTestId('result-protocol')
    await expect(line).toContainText('Protokoll v1.0')
    await expect(line).toContainText('1 ungültiger Versuch')
  })

  test('ein Test ausserhalb der Dokumentation zeigt keine Protokollfelder', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/rope_climb', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Ergebnis speichern' })).toBeVisible()
    await expect(page.getByTestId('protocol-fields')).toHaveCount(0)
  })
})
