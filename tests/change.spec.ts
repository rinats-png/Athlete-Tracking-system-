import { expect, test } from '@playwright/test'
import {
  MIN_POINTS_FOR_ERROR,
  changeReport,
  missingForError,
  typicalErrorPercent,
} from '../src/domain/change'
import type { StoredResult } from '../src/lib/store/localStore'
import { openGuest } from './helpers'

/**
 * «+8 % gegenüber deinem letzten Test» ist ohne die eigene Streuung eine
 * Behauptung. Diese Fälle halten fest, dass die App sie nur aufstellt, wenn
 * die Veränderung grösser ist als das, was derselbe Athlet im selben Test
 * ohnehin von Tag zu Tag schwankt — und dass sie sonst schweigt.
 */

const START = Date.UTC(2026, 0, 5, 10)

function series(slug: string, values: number[]): StoredResult[] {
  return values.map(
    (score, i) =>
      ({
        id: `${slug}-${i}`,
        testSlug: slug,
        performedAt: new Date(START + i * 30 * 86_400_000).toISOString(),
        values: {},
        metrics: {},
        score,
        bodyWeightKg: null,
        ageYears: null,
        sex: null,
        assessmentId: null,
        attempts: [],
        attemptSelection: null,
        context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
        photo: null,
        createdAt: '2026-01-01T10:00:00.000Z',
      }) as StoredResult,
  )
}

test.describe('Bedeutsame Veränderung', () => {
  test('ohne Vormessung wird nichts verglichen', () => {
    const results = series('countermovement_jump', [40])
    expect(changeReport(results, results[0]).verdict).toBe('first')
  })

  test('unter vier Messungen kennt die App die Streuung nicht — und sagt es', () => {
    const results = series('countermovement_jump', [40, 42])
    const report = changeReport(results, results[1])
    expect(report.verdict, 'lieber keine Aussage als eine erfundene').toBe('unknown_error')
    expect(report.changePercent, 'die Zahl selbst steht trotzdem da').toBeCloseTo(5, 1)
    expect(report.typicalErrorPercent).toBeNull()
    expect(missingForError(results, 'countermovement_jump')).toBe(MIN_POINTS_FOR_ERROR - 2)
  })

  test('eine Veränderung innerhalb der eigenen Streuung gilt nicht als Fortschritt', () => {
    // Werte, die um denselben Mittelwert schwanken: da ist keine Entwicklung.
    const results = series('countermovement_jump', [40, 42, 39, 41, 40, 42])
    const report = changeReport(results, results[results.length - 1])
    expect(report.typicalErrorPercent!).toBeGreaterThan(0)
    expect(report.verdict, 'sonst würde die App Rauschen als Fortschritt feiern').toBe(
      'within_noise',
    )
  })

  test('ein Sprung deutlich über der Streuung gilt als belegt', () => {
    const results = series('countermovement_jump', [40, 40.5, 40, 40.5, 40, 52])
    const report = changeReport(results, results[results.length - 1])
    expect(report.verdict).toBe('better')
    expect(report.changePercent!).toBeGreaterThan(20)
  })

  test('bei einem Test, wo weniger besser ist, zählt die Richtung', () => {
    // Sprintzeiten: kleiner ist besser, also ist −12 % eine Verbesserung.
    const results = series('sprint_10m', [3.5, 3.52, 3.5, 3.51, 3.5, 3.1])
    const report = changeReport(results, results[results.length - 1])
    expect(report.changePercent!, 'richtungsbereinigt: positiv heisst besser').toBeGreaterThan(0)
    expect(report.verdict).toBe('better')
  })

  test('ein Rückgang über der Streuung wird als solcher benannt, nicht beschönigt', () => {
    const results = series('countermovement_jump', [40, 40.5, 40, 40.5, 40, 30])
    expect(changeReport(results, results[results.length - 1]).verdict).toBe('worse')
  })

  test('die Streuung stammt aus den eigenen Messungen, nicht aus einer Tabelle', () => {
    const ruhig = typicalErrorPercent(series('countermovement_jump', [40, 40.1, 40, 40.1, 40]), 'countermovement_jump')!
    const unruhig = typicalErrorPercent(series('countermovement_jump', [40, 46, 35, 44, 38]), 'countermovement_jump')!
    expect(unruhig, 'wer stärker schwankt, braucht mehr für eine belegte Veränderung').toBeGreaterThan(ruhig)
  })
})

test.describe('Veränderung im Bildschirm', () => {
  test('die erste Messung verspricht keine Entwicklung', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('baseline.data.v1')!)
      store.athletes[0].results = [
        {
          id: 'r1',
          testSlug: 'plank_hold',
          performedAt: '2026-02-01T10:00:00.000Z',
          values: { durationSeconds: 90 },
          metrics: {},
          score: 90,
          bodyWeightKg: null,
          ageYears: null,
          sex: null,
          assessmentId: null,
          attempts: [],
          attemptSelection: null,
          context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
          photo: null,
          createdAt: '2026-02-01T10:00:00.000Z',
        },
      ]
      localStorage.setItem('baseline.data.v1', JSON.stringify(store))
    })
    await page.goto('/ergebnis/r1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/erste Messung in diesem Test/)).toBeVisible()
  })

  test('mit zwei Messungen steht die Zahl da, aber ohne Deutung', async ({ page }) => {
    await openGuest(page)
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('baseline.data.v1')!)
      const base = {
        testSlug: 'plank_hold',
        values: { durationSeconds: 90 },
        metrics: {},
        bodyWeightKg: null,
        ageYears: null,
        sex: null,
        assessmentId: null,
        attempts: [],
        attemptSelection: null,
        context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
        photo: null,
      }
      store.athletes[0].results = [
        { ...base, id: 'r0', performedAt: '2026-01-01T10:00:00.000Z', score: 80, createdAt: '2026-01-01T10:00:00.000Z' },
        { ...base, id: 'r1', performedAt: '2026-02-01T10:00:00.000Z', score: 90, createdAt: '2026-02-01T10:00:00.000Z' },
      ]
      localStorage.setItem('baseline.data.v1', JSON.stringify(store))
    })
    await page.goto('/ergebnis/r1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('+12,5 %')).toBeVisible()
    await expect(
      page.getByText(/noch nicht bekannt/),
      'die Prozentzahl allein wäre eine Behauptung',
    ).toBeVisible()
  })
})
