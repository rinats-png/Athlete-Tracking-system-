import { expect, test } from '@playwright/test'
import { openFirstRun, openGuest } from './helpers'

/**
 * Der Einstieg (Konzept §3): sechs Schritte, dann das Diagnostikprofil.
 *
 * Diese Fälle halten fest, dass die Pflichtangaben Pflicht sind, dass die
 * freiwilligen Schritte übersprungen werden können, dass am Ende der
 * Bestand vollständig ist — und dass der Einstieg danach nicht wiederkommt.
 */

async function fillProfile(page: import('@playwright/test').Page) {
  await page.getByRole('radio', { name: 'Männlich' }).click()
  await page.getByLabel('Geburtsdatum').fill('1996-04-12')
  await page.getByLabel(/Körpergrösse/).fill('182')
  await page.getByLabel(/Körpergewicht/).fill('81')
}

test.describe('Einstieg', () => {
  test('ohne Pflichtangaben geht es nicht weiter — und es steht, was fehlt', async ({ page }) => {
    await openFirstRun(page)
    await expect(page.getByText('Schritt 2 von 6')).toBeVisible()
    const next = page.getByRole('button', { name: 'Weiter' })
    await expect(next).toBeDisabled()
    await expect(page.getByText(/Es fehlt noch:/)).toContainText('Geschlecht')
    await fillProfile(page)
    await expect(next).toBeEnabled()
  })

  test('das Alter und die Altersklasse erscheinen, sobald das Geburtsdatum steht', async ({ page }) => {
    await openFirstRun(page)
    await page.getByLabel('Geburtsdatum').fill('1990-01-01')
    await expect(page.getByText(/Altersklasse: 30–39/)).toBeVisible()
  })

  test('der ganze Weg: Profil, Sportart, Ziel, vorhandener Wert, Diagnostikprofil, Übersicht', async ({ page }) => {
    await openFirstRun(page)
    await fillProfile(page)
    await page.getByRole('button', { name: 'Weiter' }).click()

    // Schritt 3: die Hauptsportart ist Pflicht.
    await expect(page.getByText('Schritt 3 von 6')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Weiter' })).toBeDisabled()
    await page.getByRole('button', { name: /^Judo/ }).click()
    await page.getByRole('button', { name: 'Weiter' }).click()

    // Schritt 4: weitere Sportarten, eine dazu.
    await expect(page.getByText('Schritt 4 von 6')).toBeVisible()
    await page.getByRole('button', { name: /^HYROX/ }).click()
    await expect(page.getByText('1 gewählt')).toBeVisible()
    await page.getByRole('button', { name: 'Weiter' }).click()

    // Schritt 5: Ziel.
    await expect(page.getByText('Schritt 5 von 6')).toBeVisible()
    await page.getByRole('button', { name: 'Wettkampfvorbereitung' }).click()
    await page.getByRole('button', { name: 'Weiter' }).click()

    // Schritt 6: ein vorhandener Wert.
    await expect(page.getByText('Schritt 6 von 6')).toBeVisible()
    await page.getByLabel(/Griffkraft/).fill('54')
    await page.getByRole('button', { name: 'Diagnostikprofil erstellen' }).click()

    // Das Diagnostikprofil.
    await expect(page.getByRole('heading', { name: /Deine Judo-Diagnostik/ })).toBeVisible()
    await expect(page.getByText(/relevante Tests gefunden/)).toBeVisible()
    await expect(page.getByText('Zum Start empfohlen')).toBeVisible()
    await expect(page.getByText('Special Judo Fitness Test').first()).toBeVisible()
    await page.getByRole('button', { name: 'Zur Übersicht' }).click()

    // Danach die App — und der Bestand ist vollständig.
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).first()).toBeVisible()
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('baseline.data.v1') ?? '{}'))
    const profile = stored.athletes[0].profile
    expect(profile.sex).toBe('male')
    expect(profile.birthDate).toBe('1996-04-12')
    expect(profile.heightCm).toBe(182)
    expect(profile.disciplineId).toBe('judo')
    expect(profile.additionalDisciplineIds).toEqual(['hyrox'])
    expect(profile.goalKey).toBe('competition')
    expect(profile.onboardingCompletedAt).toBeTruthy()
    expect(stored.athletes[0].biometrics[0].bodyWeightKg).toBe(81)
    expect(stored.athletes[0].results.map((r: { testSlug: string }) => r.testSlug)).toEqual(['grip_strength'])
  })

  test('die freiwilligen Schritte lassen sich überspringen', async ({ page }) => {
    await openFirstRun(page)
    await fillProfile(page)
    await page.getByRole('button', { name: 'Weiter' }).click()
    await page.getByRole('button', { name: /^Marathon/ }).click()
    await page.getByRole('button', { name: 'Weiter' }).click()
    await page.getByRole('button', { name: 'Überspringen' }).click()
    await page.getByRole('button', { name: 'Überspringen' }).click()
    await page.getByRole('button', { name: 'Überspringen' }).click()
    await expect(page.getByRole('heading', { name: /Deine Marathon-Diagnostik/ })).toBeVisible()
  })

  test('nach dem Einstieg kommt er nicht wieder — auch nicht nach einem Neuladen', async ({ page }) => {
    await openGuest(page)
    await expect(page.getByText(/Schritt \d von 6/)).toHaveCount(0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Schritt \d von 6/)).toHaveCount(0)
  })

  test('zurück verliert nichts', async ({ page }) => {
    await openFirstRun(page)
    await fillProfile(page)
    await page.getByRole('button', { name: 'Weiter' }).click()
    await page.getByRole('button', { name: 'Zurück' }).click()
    await expect(page.getByLabel(/Körpergrösse/)).toHaveValue('182')
  })
})
