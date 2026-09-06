import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { nextLevel, targetForNextLevel } from '../src/domain/targetValue'
import type { ReferenceComparison } from '../src/data/references'

/**
 * Der Wert, den die nächste Stufe verlangt.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: «Gut» sagt, wo jemand steht — nicht, wie
 * weit es bis «Sehr gut» ist. Das ist die Frage, die nach der Einordnung
 * kommt.
 *
 * Der teuerste Fehler wäre, eine Referenz umzukehren, die sich nicht
 * umkehren lässt: aus einem Band oder einem Median einen Zielwert zu rechnen
 * hiesse, eine Verteilung zu erfinden (§81). Dafür stehen der dritte und
 * vierte Fall.
 */

const meanSd = (mean: number, sd: number): ReferenceComparison =>
  ({
    entry: { method: 'mean_sd', mean, sd } as never,
    percentile: null,
    sdFromMean: null,
    band: null,
    percentOfAnchor: null,
    percentFromMedian: null,
  }) as ReferenceComparison

test.describe('Zielwert', () => {
  test('bei «grösser ist besser» liegt er über dem eigenen Wert', () => {
    // Mittel 40, Streuung 5: «Sehr gut» beginnt bei +1 SD, also 45.
    const target = targetForNextLevel(meanSd(40, 5), 'good', 42, 'higher_is_better')
    expect(target?.level).toBe('very_good')
    expect(target?.value).toBeCloseTo(45, 0)
    expect(target?.distance).toBeCloseTo(3, 0)
  })

  test('bei «kleiner ist besser» liegt er darunter — und der Abstand bleibt positiv', () => {
    // Ein negativer Abstand hiesse: «du musst 3 Sekunden langsamer werden».
    const target = targetForNextLevel(meanSd(12, 1), 'good', 11.8, 'lower_is_better')
    expect(target?.value).toBeCloseTo(11, 0)
    expect(target?.distance).toBeGreaterThan(0)
  })

  test('aus einem Band entsteht kein Zielwert', () => {
    const band = {
      entry: { method: 'bands', bands: [] } as never,
      percentile: null,
      sdFromMean: null,
      band: null,
      percentOfAnchor: null,
      percentFromMedian: null,
    } as ReferenceComparison
    // Die Quelle nennt eine Klassengrenze, aber keine Verteilung dazwischen.
    expect(targetForNextLevel(band, 'good', 10, 'higher_is_better')).toBeNull()
  })

  test('auf der obersten Stufe gibt es keine nächste', () => {
    expect(nextLevel('elite')).toBeNull()
    expect(targetForNextLevel(meanSd(40, 5), 'elite', 60, 'higher_is_better')).toBeNull()
  })

  test('wer die Schwelle schon überschreitet, bekommt keinen Zielwert', () => {
    // Sonst stünde «noch 0 m» oder gar ein negativer Abstand da.
    expect(targetForNextLevel(meanSd(40, 5), 'good', 46, 'higher_is_better')).toBeNull()
  })
})

test.describe('Am Ergebnis', () => {
  test('die Kennzahl wird erklärt, ohne medizinische Aussage', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2900')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    await expect(page.getByText('Was diese Kennzahl ist')).toBeVisible()
    await expect(page.getByText(/geschätzt, nicht gemessen/)).toBeVisible()
  })

  test('die Zeile zum Weitergeben lässt sich kopieren', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2900')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    await page.getByRole('button', { name: 'Zeile kopieren' }).click()
    const kopiert = await page.evaluate(() => navigator.clipboard.readText())
    // Datum, Test und Wert — nachprüfbar, kein Abzeichen.
    expect(kopiert).toContain('Cooper')
    expect(kopiert).toMatch(/\d/)
  })
})
