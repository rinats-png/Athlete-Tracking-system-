import { expect, test } from '@playwright/test'
import { goalLooksReversed, goalProgress } from '../src/domain/testGoal'
import type { StoredResult } from '../src/lib/store/localStore'
import { openGuest } from './helpers'

/**
 * Der selbst gesetzte Zielwert.
 *
 * Die entscheidende Festlegung: der Fortschritt zählt ab der ERSTEN Messung,
 * nicht ab null. Ab null gerechnet stünde bei einer Sprintzeit von 3,4 s mit
 * Ziel 3,2 s immer über 90 %, und der Balken wäre bedeutungslos.
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

test.describe('Zielwerte', () => {
  test('ohne Ziel oder ohne Messung gibt es keinen Fortschritt', () => {
    expect(goalProgress(series('grip_strength', [40]), 'grip_strength', undefined)).toBeNull()
    expect(goalProgress([], 'grip_strength', 50)).toBeNull()
  })

  test('der Fortschritt zählt ab der ersten Messung, nicht ab null', () => {
    // 40 → 45, Ziel 50: die halbe Strecke.
    const progress = goalProgress(series('grip_strength', [40, 45]), 'grip_strength', 50)!
    expect(progress.percent, 'ab null gerechnet stünden hier 90 %').toBe(50)
    expect(progress.remaining).toBeCloseTo(5, 2)
  })

  test('bei einem Test, wo weniger besser ist, zählt die Richtung', () => {
    // 3,6 s → 3,4 s, Ziel 3,2 s: ebenfalls die halbe Strecke.
    const progress = goalProgress(series('sprint_10m', [3.6, 3.4]), 'sprint_10m', 3.2)!
    expect(progress.percent).toBe(50)
    expect(progress.reached).toBe(false)
  })

  test('ein erreichtes Ziel steht auf 100, auch wenn es übertroffen wurde', () => {
    const progress = goalProgress(series('grip_strength', [40, 55]), 'grip_strength', 50)!
    expect(progress.reached).toBe(true)
    expect(progress.percent).toBe(100)
    expect(progress.remaining).toBe(0)
  })

  test('ein Rückschritt gegenüber dem Start ergibt keinen negativen Balken', () => {
    const progress = goalProgress(series('grip_strength', [40, 35]), 'grip_strength', 50)!
    expect(progress.percent).toBe(0)
  })

  test('ein Ziel hinter dem letzten Wert wird als vermutlicher Vertipper erkannt', () => {
    const grip = series('grip_strength', [50])
    expect(goalLooksReversed(grip, 'grip_strength', 40), 'mehr ist besser').toBe(true)
    expect(goalLooksReversed(grip, 'grip_strength', 60)).toBe(false)

    const sprint = series('sprint_10m', [3.4])
    expect(goalLooksReversed(sprint, 'sprint_10m', 3.6), 'weniger ist besser').toBe(true)
    expect(goalLooksReversed(sprint, 'sprint_10m', 3.2)).toBe(false)
  })

  test('ein Ziel lässt sich am Ergebnis setzen und wieder entfernen', async ({ page }) => {
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

    await page.getByRole('button', { name: 'Ziel setzen' }).click()
    await page.getByLabel(/Zielwert/).fill('120')
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByText(/noch 30/)).toBeVisible()
    await page.getByRole('button', { name: 'Ziel entfernen' }).click()
    await expect(page.getByRole('button', { name: 'Ziel setzen' })).toBeVisible()
  })
})
