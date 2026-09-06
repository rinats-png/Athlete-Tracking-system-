import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Einen Messwert korrigieren.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: bis hierher liess sich ein Ergebnis nur
 * löschen. Ein Vertipper kostete Datum, Bedingungen, Beleg und die Zuordnung
 * zum Termin — der häufigste Handgriff war der einzige, den die App nicht
 * konnte.
 *
 * Der teuerste Fehler an einer Korrektur wäre, die abgeleiteten Werte
 * mitzuschleppen: eine korrigierte Last mit dem alten Relativkraftwert
 * daneben wäre ein stiller Rechenfehler (§89). Dafür steht der zweite Fall.
 */

test.describe('Korrektur eines Messwerts', () => {
  test('der Wert lässt sich ändern und die Ableitung wandert mit', async ({ page }) => {
    await openGuest(page)
    // Cooper: die geschätzte VO2max hängt an der Distanz, also muss sie
    // mitwandern. Ein korrigierter Wert mit der alten Ableitung daneben wäre
    // ein stiller Rechenfehler (§89).
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2400')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    const vorher = JSON.parse(
      (await page.evaluate(() => localStorage.getItem('baseline.data.v1'))) ?? '{}',
    )
    const ergebnisVorher = vorher.athletes[0].results[0]
    expect(ergebnisVorher.values.distanceM).toBe(2400)
    const vo2Vorher = ergebnisVorher.metrics.vo2max_ml_kg_min

    await page.getByRole('button', { name: 'Wert korrigieren' }).click()
    await page.getByLabel(/^Distanz/).fill('3200')
    await page.getByRole('button', { name: 'Korrektur speichern' }).click()
    await expect(page.getByText('Gespeichert.')).toBeVisible()

    const nachher = JSON.parse(
      (await page.evaluate(() => localStorage.getItem('baseline.data.v1'))) ?? '{}',
    )
    const ergebnisNachher = nachher.athletes[0].results[0]
    expect(ergebnisNachher.values.distanceM).toBe(3200)
    expect(ergebnisNachher.metrics.vo2max_ml_kg_min).not.toBe(vo2Vorher)
    expect(ergebnisNachher.score).toBe(3200)
  })

  test('die Zuordnung und die Kennung bleiben — es entsteht kein zweiter Eintrag', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('3000')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')
    const url = page.url()

    await page.getByRole('button', { name: 'Wert korrigieren' }).click()
    await page.getByLabel(/^Distanz/).fill('3200')
    await page.getByRole('button', { name: 'Korrektur speichern' }).click()
    await expect(page.getByText('Gespeichert.')).toBeVisible()

    // Dieselbe Seite, dieselbe Kennung: eine Korrektur ist kein neuer Wert.
    expect(page.url()).toBe(url)
    const store = await page.evaluate(() => localStorage.getItem('baseline.data.v1'))
    const anzahl = (store?.match(/"testSlug":"cooper_12min"/g) ?? []).length
    expect(anzahl, 'genau ein Ergebnis, nicht zwei').toBe(1)
  })

  test('der Änderungsnachweis hält fest, dass geändert wurde', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('3000')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')
    await page.getByRole('button', { name: 'Wert korrigieren' }).click()
    await page.getByLabel(/^Distanz/).fill('3200')
    await page.getByRole('button', { name: 'Korrektur speichern' }).click()
    await expect(page.getByText('Gespeichert.')).toBeVisible()

    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Geändert').first()).toBeVisible()
    // Und ausdrücklich NICHT, was vorher drinstand (§50).
    const seite = await page.content()
    expect(seite).not.toContain('3.000 → 3.200')
  })

  test('die Korrektur ist zugeklappt, bis jemand sie braucht', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('3000')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')
    // Ein Formular über dem Ergebnis lädt zum Ändern ein. Ein Messwert soll
    // die Regel sein und die Korrektur die Ausnahme.
    await expect(page.getByRole('heading', { name: 'Wert korrigieren' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Wert korrigieren' })).toBeVisible()
  })
})
