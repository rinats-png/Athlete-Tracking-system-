import { expect, test } from '@playwright/test'
import { MAX_PHOTO_CHARS, emptyData, storedDataSchema } from '../src/lib/store/schema'
import { openGuest } from './helpers'

/**
 * Der Beleg zur Messung (§14).
 *
 * Die Gefahr an dieser Stelle ist nicht das Bild, sondern die Speicherquote:
 * ein ungeprüftes Kamerabild macht den GESAMTEN Bestand unspeicherbar, auch
 * die Messwerte. Diese Fälle gehen deshalb durch die Oberfläche und schauen
 * danach in den Speicher — geprüft wird, was wirklich abgelegt wird.
 */

async function seedResult(page: import('@playwright/test').Page) {
  const store = emptyData()
  store.athletes[0].profile.onboardingCompletedAt = '2026-01-01T00:00:00.000Z'
  store.athletes[0].results = [
    {
      id: 'r1',
      testSlug: 'plank_hold',
      performedAt: '2026-01-02T10:00:00.000Z',
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
      createdAt: '2026-01-02T10:00:00.000Z',
    } as never,
  ]
  await page.evaluate((data) => {
    localStorage.setItem('baseline.data.v1', JSON.stringify(data))
  }, store)
  await page.goto('/ergebnis/r1', { waitUntil: 'domcontentloaded' })
}

/** Erzeugt im Browser eine grosse, nicht verdichtbare Bilddatei. */
async function attachGeneratedImage(page: import('@playwright/test').Page, edge: number) {
  // Der Bildschirm wird nachgeladen: ohne dieses Warten greift das Skript ins
  // Leere, bevor das Feld überhaupt im Dokument steht.
  await page.locator('input[type="file"][accept="image/*"]').waitFor({ state: 'attached' })
  await page.evaluate(async (size) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!
    const image = context.createImageData(size, size)
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = Math.random() * 255
      image.data[i + 1] = Math.random() * 255
      image.data[i + 2] = Math.random() * 255
      image.data[i + 3] = 255
    }
    context.putImageData(image, 0, 0)
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'))
    const file = new File([blob], 'beleg.png', { type: 'image/png' })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    const input = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, edge)
}

function storedPhoto(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('baseline.data.v1')
    if (!raw) return null
    const store = JSON.parse(raw) as {
      athletes: { results: { photo: { dataUrl: string } | null }[] }[]
    }
    return store.athletes[0].results[0].photo?.dataUrl ?? null
  })
}

test.describe('Belegbild', () => {
  test('ein grosses Kamerabild wird verkleinert, bevor es gespeichert wird', async ({ page }) => {
    await openGuest(page)
    await seedResult(page)
    await attachGeneratedImage(page, 2000)

    await expect(page.getByRole('img', { name: /Beleg zur Messung/ })).toBeVisible()
    const stored = await storedPhoto(page)
    expect(stored, 'ohne Bild im Speicher wäre die Anzeige eine Illusion').toBeTruthy()
    expect(stored!.startsWith('data:image/jpeg'), 'als JPEG abgelegt').toBe(true)
    expect(
      stored!.length,
      'sonst sprengt ein einziges Bild die Quote und ALLE Messwerte sind unspeicherbar',
    ).toBeLessThanOrEqual(MAX_PHOTO_CHARS)
  })

  test('der Beleg lässt sich wieder entfernen', async ({ page }) => {
    await openGuest(page)
    await seedResult(page)
    await attachGeneratedImage(page, 400)
    await expect(page.getByRole('img', { name: /Beleg zur Messung/ })).toBeVisible()

    await page.getByRole('button', { name: /Beleg entfernen/ }).click()
    await expect(page.getByRole('img', { name: /Beleg zur Messung/ })).toHaveCount(0)
    expect(await storedPhoto(page)).toBeNull()
  })

  test('der Hinweis sagt, dass das Bild das Gerät nicht verlässt', async ({ page }) => {
    await openGuest(page)
    await seedResult(page)
    await expect(page.getByText(/bleibt auf diesem Gerät/)).toBeVisible()
  })

  test('das Schema nimmt kein Bild über der Grenze an', () => {
    const store = emptyData()
    store.athletes[0].results = [
      {
        id: 'r1',
        testSlug: 'plank_hold',
        performedAt: '2026-01-01T10:00:00.000Z',
        values: { durationSeconds: 60 },
        metrics: {},
        score: 60,
        createdAt: '2026-01-01T10:00:00.000Z',
        photo: { dataUrl: 'x'.repeat(MAX_PHOTO_CHARS + 1), addedAt: '2026-01-01T10:00:00.000Z' },
      } as never,
    ]
    expect(
      storedDataSchema.safeParse(store).success,
      'sonst wäre der ganze Bestand nicht mehr speicherbar',
    ).toBe(false)
  })
})
