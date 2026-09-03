import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { aggregateAttempts } from '../src/domain/assessment'

/**
 * Der Diagnostik-Durchlauf ist der Kern des Produkts: Termin anlegen, Tests
 * einzeln messen, abschliessen, Auswertung lesen. Bricht dieser Weg, ist
 * BASELINE ein Verlaufslogbuch — genau das, was es nicht sein soll.
 */

test.describe('Diagnostik', () => {
  test('Termin anlegen, messen, abschliessen, auswerten', async ({ page }) => {
    await openGuest(page)

    // Profil zuerst: ohne Geschlecht und Alter gibt es keinen Perzentilvergleich,
    // und ohne Körpergewicht keine Relativkraft.
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Vorname').fill('Testperson')
    await page.getByRole('radio', { name: 'Männlich' }).click()
    await page.getByLabel('Geburtsdatum').fill('1994-03-11')
    await page.getByLabel('Körpergewicht', { exact: true }).last().fill('83.2')
    await page.getByRole('button', { name: 'Gewicht speichern' }).click()

    // 1. Termin aus einer Vorlage anlegen
    await page.goto('/diagnostik/neu', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Maxkraft \(Big Three\)/ }).click()
    // Die Zahl steht jetzt im Umfang des Termins statt in der Überschrift
    // der Testliste — sichtbar bleibt sie in jedem Fall vor dem Start.
    await expect(page.getByText('Umfang dieses Termins')).toBeVisible()
    expect(await page.locator('input[type="checkbox"]:checked').count()).toBe(5)
    // Die Vorlage deckt nicht alles ab — das muss VOR dem Start dastehen.
    await expect(page.getByText(/Achsen bleiben ungemessen/)).toBeVisible()

    await page.getByRole('button', { name: 'Diagnostik anlegen' }).click()
    await page.waitForURL(/\/diagnostik\/[^/]+$/)
    await expect(page.getByText('0 von 5 gemessen')).toBeVisible()

    // 2. Ersten Test aus dem Termin heraus messen
    await page.getByRole('link', { name: 'Messen' }).first().click()
    await page.waitForURL(/\/tests\/.*diagnostik=/)
    await expect(page.getByText(/Teil der Diagnostik/)).toBeVisible()
    await page.getByLabel(/^Gewicht/).fill('165')
    await page.getByLabel(/^Wiederholungen/).fill('1')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()

    // Der Rückweg führt in den Termin, nicht in den Verlauf.
    await page.waitForURL(/\/diagnostik\/[^/]+$/)
    await expect(page.getByText('1 von 5 gemessen')).toBeVisible()

    // 3. Vorzeitig abschliessen — mit ausgewiesener Lücke
    await expect(page.getByText(/4 geplante Tests fehlen noch/)).toBeVisible()
    await page.getByRole('button', { name: 'Diagnostik abschliessen' }).click()
    await page.waitForURL(/\/abschluss$/)

    // 4. Die Auswertung benennt, was fehlt, statt es zu verschweigen
    await expect(page.getByText(/Nicht gemessen:/)).toBeVisible()
    await expect(page.getByText(/Noch offen:/)).toBeVisible()
    await expect(page.getByRole('cell', { name: /165|180/ }).first()).toBeVisible()

    // 5. Der Termin steht in der Terminliste
    await page.goto('/diagnostik/termine', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Abgeschlossen')).toBeVisible()
  })

  test('ein gelöschter Termin nimmt die Ergebnisse nicht mit', async ({ page }) => {
    await openGuest(page)

    await page.goto('/diagnostik/neu', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Diagnostik anlegen' }).click()
    await page.waitForURL(/\/diagnostik\/[^/]+$/)

    await page.getByRole('link', { name: 'Messen' }).first().click()
    // Erster Test der Allgemein-Batterie ist der Countermovement Jump.
    await page.getByLabel(/Sprunghöhe/).first().fill('42')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL(/\/diagnostik\/[^/]+$/)

    await page.getByRole('button', { name: 'Diagnostik löschen' }).click()
    await page.getByRole('button', { name: 'Endgültig löschen' }).click()
    await page.waitForURL('**/diagnostik')

    // Das Ergebnis überlebt den Termin — es verliert nur die Zuordnung.
    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/42/).first()).toBeVisible()
  })
})

test.describe('Wertung mehrerer Versuche', () => {
  const context = { key: 'loadKg', direction: 'higher_is_better' as const }
  const attempts = [
    { loadKg: 150, rpe: 7 },
    { loadKg: 170, rpe: 9 },
    { loadKg: 160, rpe: 8 },
  ]

  test('bester und schlechtester Versuch bleiben echte Versuche', () => {
    // Entscheidend ist der Nebenwert: bei einem gemittelten RPE stünde eine
    // Zahl im Datensatz, die niemand gemessen hat.
    expect(aggregateAttempts(attempts, 'best', context)).toEqual({ loadKg: 170, rpe: 9 })
    expect(aggregateAttempts(attempts, 'worst', context)).toEqual({ loadKg: 150, rpe: 7 })
  })

  test('bei niedriger-ist-besser dreht sich die Rangfolge', () => {
    const times = [{ t: 16.5 }, { t: 15.9 }, { t: 17.2 }]
    const ctx = { key: 't', direction: 'lower_is_better' as const }
    expect(aggregateAttempts(times, 'best', ctx)).toEqual({ t: 15.9 })
    expect(aggregateAttempts(times, 'worst', ctx)).toEqual({ t: 17.2 })
  })

  test('Mittelwert mittelt nur den Leistungswert', () => {
    const mean = aggregateAttempts(attempts, 'mean', context)
    expect(mean?.loadKg).toBeCloseTo(160, 6)
    // RPE stammt vom Versuch, der dem Mittel am nächsten liegt (160 kg).
    expect(mean?.rpe).toBe(8)
  })

  test('Median ist robust gegen einen einzelnen Ausrutscher', () => {
    expect(aggregateAttempts([...attempts, { loadKg: 40, rpe: 4 }], 'median', context)?.loadKg).toBe(155)
    expect(aggregateAttempts(attempts, 'median', context)?.loadKg).toBe(160)
  })

  test('unbrauchbare Versuche werden übergangen statt gerechnet', () => {
    expect(aggregateAttempts([{}, { rpe: 8 }], 'best', context)).toBeNull()
    expect(aggregateAttempts([], 'best', context)).toBeNull()
  })
})
