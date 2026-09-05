import { expect, test } from '@playwright/test'
import { introScenes, MAX_SCENES } from '../src/domain/introScenes'
import type { StoredResult } from '../src/lib/store/localStore'
import { blockFonts } from './helpers'

/**
 * Die Intro-Sequenz.
 *
 * Der gefährlichste Fehler hier wäre nicht eine hakelige Animation, sondern
 * eine erfundene Zahl: wer die App öffnet und «1.240 N» sieht, hält das für
 * seinen Wert. Diese Fälle halten deshalb vor allem fest, woher die Inhalte
 * kommen — und dass die Sequenz niemanden aufhält.
 */

const context = { sex: null, birthDate: null, disciplineIds: [] }
const fmt = () => '54 kg'

function result(slug: string, score: number, i: number): StoredResult {
  return {
    id: `r${i}`,
    testSlug: slug,
    performedAt: new Date(Date.UTC(2026, 0, 5 + i)).toISOString(),
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
    createdAt: '2026-01-01T00:00:00.000Z',
  } as StoredResult
}

test.describe('Inhalte der Sequenz', () => {
  test('ohne Messungen zeigt sie, WAS gemessen wird — ohne Zahl', () => {
    const scenes = introScenes([], context, 'de', fmt)
    expect(scenes.length).toBeGreaterThan(0)
    const callouts = scenes.flatMap((s) => s.callouts)
    for (const callout of callouts) {
      expect(callout.value, 'eine Zahl ohne Messung wäre erfunden').toBeNull()
      expect(callout.fill, 'und ein gefüllter Balken erst recht').toBeNull()
      expect(callout.label.length).toBeGreaterThan(1)
    }
  })

  test('mit Messungen zeigt sie die eigenen Werte', () => {
    const results = [result('grip_strength', 54, 0), result('plank_hold', 120, 1)]
    const callouts = introScenes(results, context, 'de', fmt).flatMap((s) => s.callouts)
    expect(callouts.some((c) => c.value === '54 kg')).toBe(true)
  })

  test('derselbe Test erscheint nicht zweimal', () => {
    const results = [0, 1, 2, 3].map((i) => result('grip_strength', 50 + i, i))
    const callouts = introScenes(results, context, 'de', fmt).flatMap((s) => s.callouts)
    const grip = callouts.filter((c) => c.label.toLowerCase().includes('griff'))
    expect(grip.length, 'sonst stünde viermal derselbe Wert da').toBeLessThanOrEqual(1)
  })

  test('sie bleibt kurz — höchstens drei Szenen', () => {
    const results = Array.from({ length: 20 }, (_, i) => result(`t${i}`, 10 + i, i))
    expect(introScenes(results, context, 'de', fmt).length).toBeLessThanOrEqual(MAX_SCENES)
  })
})

test.describe('Ablauf beim Öffnen', () => {
  /**
   * Wie ein Mensch die App öffnet: Kaltstart, durch das Tor, dann die
   * Sequenz.
   *
   * Sie lief früher beim Programmstart. Seit die App hinter einer Anmeldung
   * liegt, gehört sie zur ANMELDUNG: die Anmeldefläche zerfällt in Partikel,
   * und daraus wird die Sequenz. Ein Neuladen führt deshalb nicht mehr durch
   * sie hindurch — man ist dann schon drin.
   */
  async function openWithIntro(page: import('@playwright/test').Page) {
    await blockFonts(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('baseline.locale', 'de')
      sessionStorage.clear()
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await signIn(page)
  }

  /** Durch das Tor. Geprüft wird nichts — es gibt keinen Server. */
  async function signIn(page: import('@playwright/test').Page) {
    await page.getByLabel('E-Mail').fill('pruef@baseline.test')
    await page.getByLabel('Passwort').fill('egal')
    await page.getByRole('button', { name: 'Anmelden' }).click()
  }

  test('sie läuft beim Öffnen und lässt sich abbrechen', async ({ page }) => {
    await openWithIntro(page)
    const dialog = page.getByRole('dialog', { name: 'Einführungssequenz' })
    await expect(dialog).toBeVisible()
    await expect(page.getByText(/Messen · Einordnen/)).toBeVisible()

    await page.getByRole('button', { name: 'Überspringen' }).click()
    await expect(dialog).toHaveCount(0)
    // Danach steht die App — nicht eine leere Seite.
    await expect(page.getByRole('button', { name: /Mit leerem Bestand starten/ })).toBeVisible()
  })

  test('ein Neuladen führt nicht wieder durch sie hindurch', async ({ page }) => {
    // Die Sequenz gehört zur Anmeldung, nicht zum Programmstart. Wer nur die
    // Seite neu lädt, ist bereits angemeldet und soll nicht warten — zehnmal
    // am Tag dieselbe Animation wäre eine Zumutung.
    await openWithIntro(page)
    await page.getByRole('button', { name: 'Überspringen' }).click()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('dialog', { name: 'Einführungssequenz' })).toHaveCount(0)
  })

  test('abgeschaltet läuft sie gar nicht', async ({ page }) => {
    await blockFonts(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('baseline.intro', 'off')
      sessionStorage.clear()
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await signIn(page)
    await expect(page.getByRole('dialog', { name: 'Einführungssequenz' })).toHaveCount(0)
  })

  test('bei reduzierter Bewegung bleibt nur der Leitsatz, ganz kurz', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await openWithIntro(page)
    // Der Leitsatz steht sofort, ohne Szenenfolge davor.
    await expect(page.getByText(/Messen · Einordnen/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Mit leerem Bestand starten/ })).toBeVisible({
      timeout: 4000,
    })
    await ctx.close()
  })

  test('im Profil lässt sie sich abschalten', async ({ page }) => {
    const { openGuest } = await import('./helpers')
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    const box = page.getByLabel(/Sequenz beim Öffnen/)
    await expect(box).toBeVisible()
    await box.uncheck()
    expect(await page.evaluate(() => localStorage.getItem('baseline.intro'))).toBe('off')
  })
})
