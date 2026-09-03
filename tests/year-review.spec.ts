import { expect, test } from '@playwright/test'
import { yearReview } from '../src/domain/yearReview'
import type { StoredResult } from '../src/lib/store/localStore'
import { openDemo } from './helpers'

/**
 * Der Jahresrückblick ist die eine Ansicht, die jemand freiwillig
 * weiterschickt. Ein «grösster Fortschritt», der aus einer Tagesschwankung
 * stammt, stünde dann als Bild in einem Gruppenchat — deshalb prüfen diese
 * Fälle vor allem, was NICHT als Fortschritt gezählt wird.
 */

function result(slug: string, iso: string, score: number, i: number): StoredResult {
  return {
    id: `${slug}-${i}`,
    testSlug: slug,
    performedAt: iso,
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
    createdAt: iso,
  } as StoredResult
}

const day = (month: number, score: number, i: number, slug = 'grip_strength') =>
  result(slug, `2026-${String(month).padStart(2, '0')}-05T10:00:00.000Z`, score, i)

test.describe('Jahresrückblick', () => {
  test('ein Jahr ohne Messungen bleibt leer statt erfunden', () => {
    const review = yearReview([day(1, 40, 0)], [], 2025)
    expect(review.results).toBe(0)
    expect(review.biggestGain).toBeNull()
  })

  test('eine Veränderung innerhalb der Schwankung gilt nicht als Fortschritt', () => {
    const results = [day(1, 40, 0), day(4, 42, 1), day(7, 39, 2), day(10, 41, 3), day(12, 42, 4)]
    const review = yearReview(results, [], 2026)
    expect(review.biggestGain, 'sonst stünde Rauschen als Erfolg auf der Karte').toBeNull()
    expect(review.changes[0].proven).toBe(false)
  })

  test('ein belegter Sprung erscheint als grösster Fortschritt', () => {
    const results = [day(1, 40, 0), day(3, 40.5, 1), day(5, 40, 2), day(7, 40.5, 3), day(12, 56, 4)]
    const review = yearReview(results, [], 2026)
    expect(review.biggestGain, 'ein Sprung von 40 %').not.toBeNull()
    expect(review.biggestGain!.changePercent).toBeGreaterThan(30)
  })

  test('ein Rückgang wird genauso benannt wie ein Fortschritt', () => {
    const results = [day(1, 50, 0), day(3, 50.5, 1), day(5, 50, 2), day(7, 50.5, 3), day(12, 20, 4)]
    const review = yearReview(results, [], 2026)
    expect(review.biggestDrop, 'ein Rückgang gehört genauso dazu').not.toBeNull()
    expect(review.biggestDrop!.changePercent).toBeLessThan(0)
  })

  test('die allererste Messung ist kein persönlicher Bestwert', () => {
    expect(yearReview([day(1, 40, 0)], [], 2026).personalBests, 'ein Anfang, kein Rekord').toBe(0)
    expect(yearReview([day(1, 40, 0), day(6, 44, 1)], [], 2026).personalBests).toBe(1)
  })

  test('ein Bestwert zählt gegen die ganze Historie, nicht gegen das Jahr', () => {
    const frueher = result('grip_strength', '2025-06-05T10:00:00.000Z', 60, 9)
    const review = yearReview([frueher, day(1, 40, 0), day(6, 44, 1)], [], 2026)
    expect(review.personalBests, '44 ist schlechter als die 60 aus dem Vorjahr').toBe(0)
  })

  test('Monate mit Messung werden gezählt, nicht Messungen je Monat', () => {
    const review = yearReview([day(3, 40, 0), day(3, 41, 1), day(9, 42, 2)], [], 2026)
    expect(review.activeMonths).toBe(2)
  })
})

test.describe('Jahresrückblick im Bildschirm', () => {
  test('der Rückblick steht und die Karte lässt sich erzeugen', async ({ page }) => {
    await openDemo(page)
    await page.goto('/analyse/jahr', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dein Jahr')

    const karte = page.getByLabel('Deine Leistungskarte als Bild')
    await expect(karte).toBeVisible()
    await page.getByRole('button', { name: 'Karte herunterladen' }).click()
    // Nach dem Zeichnen darf die Karte nicht leer sein.
    const bemalt = await karte.evaluate((canvas) => {
      const ctx = (canvas as HTMLCanvasElement).getContext('2d')!
      const data = ctx.getImageData(0, 0, canvas.clientWidth, 200).data
      return new Set(Array.from(data)).size > 4
    })
    expect(bemalt, 'eine leere Karte wäre schlimmer als keine').toBe(true)
  })

  test('die Karte trägt keinen Namen und keinen Geburtstag', async ({ page }) => {
    await openDemo(page)
    await page.goto('/analyse/jahr', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/trägt Leistungswerte, keine Personendaten/)).toBeVisible()
  })
})
