import { expect, test } from '@playwright/test'
import {
  MIN_AXES_FOR_SCORE,
  missingAxesForScore,
  performanceScore,
} from '../src/domain/performanceScore'
import type { RadarAxis } from '../src/types/domain'
import { openDemo, openGuest } from './helpers'

/**
 * Die eine Zahl.
 *
 * Sie ist das, was ein Nutzer sofort versteht — und genau deshalb gefährlich:
 * sie mittelt über Achsen unterschiedlicher Belegbarkeit und sieht präziser
 * aus als alles, woraus sie entsteht. Diese Fälle halten die drei Regeln
 * fest, die das verhindern: nur belegte Achsen, Abdeckung immer dabei, und
 * unter drei Achsen gar keine Zahl.
 */

function axis(axisId: string, score: number | null, hasData = true): RadarAxis {
  return { axisId, dimension: null, score, testCount: score == null ? 0 : 2, latestPerformedAt: null, hasData }
}

test.describe('Zusammenfassung', () => {
  test('unter drei belegten Achsen gibt es keine Zahl', () => {
    const axes = [axis('a', 60), axis('b', 70), axis('c', null, false)]
    const score = performanceScore(axes)
    expect(score.value, 'zwei Achsen sind keine Zusammenfassung').toBeNull()
    expect(missingAxesForScore(axes)).toBe(MIN_AXES_FOR_SCORE - 2)
  })

  test('eine gemessene Achse ohne Referenz zählt nicht als Null', () => {
    const mitLücke = performanceScore([axis('a', 90), axis('b', 90), axis('c', 90), axis('d', null)])
    expect(mitLücke.value, 'als Null gerechnet stünde hier 67').toBe(90)
    expect(mitLücke.measuredWithoutReference).toBe(1)
  })

  test('die Abdeckung sagt, aus wie vielen Achsen die Zahl stammt', () => {
    const score = performanceScore([axis('a', 60), axis('b', 80), axis('c', 70), axis('d', null)])
    expect(score.ratedAxes).toBe(3)
    expect(score.totalAxes).toBe(4)
    expect(score.coverage).toBeCloseTo(0.75, 2)
  })

  test('die Zahl ist das Mittel der Perzentile, nichts Gewichtetes', () => {
    expect(performanceScore([axis('a', 60), axis('b', 70), axis('c', 80)]).value).toBe(70)
  })

  test('ohne jede Achse bricht nichts', () => {
    const score = performanceScore([])
    expect(score.value).toBeNull()
    expect(score.coverage).toBe(0)
  })

  test('im Bildschirm steht die Abdeckung neben der Zahl', async ({ page }) => {
    await openDemo(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    // Entweder eine Zahl mit Abdeckung, oder die Ansage, dass Achsen fehlen —
    // aber nie eine Zahl allein.
    const mitAbdeckung = page.getByText(/von \d+ Achsen mit belegter Referenz/)
    const zuWenig = page.getByText(/fehlen noch \d+ Achsen/)
    await expect(mitAbdeckung.or(zuWenig).first()).toBeVisible()
  })

  test('ohne Messungen steht dort gar keine Zusammenfassung', async ({ page }) => {
    await openGuest(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    // Ohne Daten führt die Übersicht zum ersten Test, statt eine leere
    // Zusammenfassung zu zeigen.
    await expect(page.getByText(/Achsen mit belegter Referenz/)).toHaveCount(0)
    await expect(page.getByText(/fehlen noch \d+ Achsen/)).toHaveCount(0)
  })
})
