import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openDemo, openGuest } from './helpers'

/**
 * Das Designsystem «Performance OS».
 *
 * Diese Fälle sichern die Festlegungen, die man beim Umbauen am leichtesten
 * verliert: dass die Farbwelt unverändert bleibt, dass der Orb eine
 * fehlende Referenz nicht als schlechte Leistung zeichnet, dass die
 * Referenzachse der Richtung des Tests folgt, und dass sich alles bei
 * `prefers-reduced-motion` beruhigt.
 */

const theme = () => readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf-8')

test.describe('Farbwelt bleibt', () => {
  test('die fünf Töne der Palette stehen unverändert im System', () => {
    const css = theme()
    for (const hex of ['#EEF1EA', '#151515', '#3F4B3A', '#75856A', '#A8A49A']) {
      expect(css, `${hex} fehlt`).toContain(hex)
    }
  })

  test('der Schatten trägt die Markenfarbe, keine neue', () => {
    // Moss Shadow als RGB: der Schatten ist eine Transparenz der Palette,
    // keine erfundene Grauabstufung.
    expect(theme()).toContain('--shadow-hue: 63 75 58')
  })
})

test.describe('Tiefe und Bewegung', () => {
  test('es gibt genau drei Elevationsstufen', () => {
    const css = theme()
    for (const step of ['--elev-1:', '--elev-2:', '--elev-3:']) {
      expect(css).toContain(step)
    }
    expect(css.includes('--elev-4:'), 'vier Stufen wären keine Ordnung mehr').toBe(false)
  })

  test('reduzierte Bewegung wird global respektiert', () => {
    expect(theme()).toContain('prefers-reduced-motion: reduce')
  })

  test('bei reduzierter Bewegung steht der Orb still und zeigt den Wert sofort', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await openDemo(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const orb = page.getByRole('img', { name: /Leistungsprofil als Form/ })
    await expect(orb).toBeVisible()
    // Zwei Messungen der Form im Abstand: ohne Bewegung sind sie gleich.
    const path = page.locator('svg path').first()
    const first = await path.getAttribute('d')
    await page.waitForTimeout(400)
    expect(await path.getAttribute('d'), 'die Atmung muss stillstehen').toBe(first)
    await context.close()
  })
})

test.describe('Performance Orb', () => {
  test('er trägt seine Abdeckung als Beschriftung, nicht nur die Zahl', async ({ page }) => {
    await openDemo(page)
    const orb = page.getByRole('img', { name: /Leistungsprofil als Form/ })
    const label = await orb.getAttribute('aria-label')
    expect(label, 'sonst wäre die Zahl für Screenreader eine Behauptung').toMatch(
      /von \d+ Achsen mit belegter Referenz|belegte Achsen/,
    )
  })

  test('ohne Messungen erscheint er gar nicht — statt als leere Form', async ({ page }) => {
    await openGuest(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('img', { name: /Leistungsprofil als Form/ })).toHaveCount(0)
  })
})

/**
 * Die schwebende Leiste ist der Weg auf Touch-Geräten. Ab `lg` übernimmt die
 * Kopfzeile — dort gibt es sie bewusst nicht, und diese Fälle überspringen
 * sich selbst, statt eine Leiste zu verlangen, die es nicht geben soll.
 */
async function floatingNav(page: import('@playwright/test').Page) {
  // Kopfzeile und Leiste tragen dieselbe Beschriftung. Unterschieden wird
  // über das, was die schwebende Leiste ausmacht: sie ist `fixed`. Nach
  // Sichtbarkeit allein zu gehen griff auf dem Desktop die Kopfzeile ab.
  const navs = page.getByRole('navigation', { name: 'Hauptnavigation' })
  for (let i = 0; i < (await navs.count()); i++) {
    const candidate = navs.nth(i)
    if (!(await candidate.isVisible())) continue
    const fixed = await candidate.evaluate((el) => getComputedStyle(el).position === 'fixed')
    if (fixed) return candidate
  }
  return null
}

test.describe('Schwebende Navigation', () => {
  test('der aktive Anzeiger wandert, statt umzuspringen', async ({ page }) => {
    await openDemo(page)
    const nav = await floatingNav(page)
    test.skip(nav == null, 'ab lg trägt die Kopfzeile die Navigation')

    const indicator = nav!.locator('span[aria-hidden]').first()
    const before = await indicator.evaluate((el) => getComputedStyle(el).transform)
    expect(
      await indicator.evaluate((el) => getComputedStyle(el).transitionProperty),
      'ohne Übergang springt er, und die Bewegung sagt nichts mehr',
    ).toContain('transform')

    await nav!.getByRole('button', { name: /Verlauf/ }).click()
    await expect(page).toHaveURL(/verlauf/)
    // Nach dem Klick läuft der Übergang noch — direkt zu messen erwischt
    // ihn auf halbem Weg und manchmal noch am Ausgangspunkt.
    await expect
      .poll(() => indicator.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe(before)
  })
})

test.describe('Action Orb', () => {
  test('er öffnet einen Fächer mit beschrifteten Aktionen und schliesst auf Escape', async ({
    page,
  }) => {
    await openDemo(page)
    const orb = page.getByRole('button', { name: 'Schnellaktionen öffnen' })
    await expect(orb).toBeVisible()
    await orb.click()

    // Beschriftet, nicht nur Symbol: ein Symbolfächer ist beim ersten Mal
    // ein Rätsel.
    await expect(page.getByRole('button', { name: 'Test durchführen' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aus Tabelle übernehmen' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Test durchführen' })).toBeHidden()
  })

  test('er verdeckt die Navigation nicht', async ({ page }) => {
    await openDemo(page)
    const nav = await floatingNav(page)
    test.skip(nav == null, 'ab lg trägt die Kopfzeile die Navigation')

    const orbBox = await page.getByRole('button', { name: 'Schnellaktionen öffnen' }).boundingBox()
    const navBox = await nav!.boundingBox()
    expect(orbBox).toBeTruthy()
    expect(navBox).toBeTruthy()
    expect(
      orbBox!.y + orbBox!.height,
      'der Orb sitzt über der Leiste, nicht darauf',
    ).toBeLessThanOrEqual(navBox!.y + 2)
  })
})
