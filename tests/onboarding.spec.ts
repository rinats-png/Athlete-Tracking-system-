import { expect, test } from '@playwright/test'
import { openFirstRun, openGuest } from './helpers'

/**
 * Der Einstieg (Konzept §3): neun Schritte für den Einzelnutzer, ein
 * kürzerer Weg für den Trainer.
 *
 * Der Leitgedanke, den diese Fälle absichern: jede Frage sagt, was sie
 * freischaltet, und der Einstieg endet nicht in einer leeren Übersicht,
 * sondern mit einem angelegten Termin. Dazu drei Eigenschaften, die man
 * leicht kaputt macht: fortsetzbar nach einem Neuladen, wiederholbar aus dem
 * Profil, und er kommt nach dem Abschluss nicht wieder.
 */

type Page = import('@playwright/test').Page

const weiter = (page: Page) => page.getByRole('button', { name: 'Weiter' })

/** Von Schritt 1 bis zu den Angaben zur Person. */
async function bisPerson(page: Page) {
  await weiter(page).click() // Was BASELINE ist
  await page.getByRole('button', { name: /Für mich selbst/ }).click()
  await weiter(page).click() // Rolle
}

async function fillProfile(page: Page) {
  await page.getByRole('radio', { name: 'Männlich' }).click()
  await page.getByLabel('Geburtsdatum').fill('1996-04-12')
  await page.getByLabel(/Körpergrösse/).fill('182')
  await page.getByLabel(/Körpergewicht/).fill('81')
}

const store = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('baseline.data.v1') ?? '{}'))

test.describe('Einstieg', () => {
  test('der erste Schritt sagt, was die App nicht ist', async ({ page }) => {
    await openFirstRun(page)
    await expect(page.getByText('Schritt 1 von 9')).toBeVisible()
    await expect(page.getByText(/keine medizinische Diagnostik/i)).toBeVisible()
    await expect(page.getByText(/kein Trainingsplan/i)).toBeVisible()
  })

  test('ohne Pflichtangaben geht es nicht weiter — und es steht, was fehlt', async ({ page }) => {
    await openFirstRun(page)
    await bisPerson(page)
    await expect(page.getByText('Schritt 3 von 9')).toBeVisible()
    await expect(weiter(page)).toBeDisabled()
    await expect(page.getByText(/Es fehlt noch:/)).toContainText('Geschlecht')
    await fillProfile(page)
    await expect(weiter(page)).toBeEnabled()
  })

  test('jede Pflichtangabe sagt, wofür sie gebraucht wird', async ({ page }) => {
    await openFirstRun(page)
    await bisPerson(page)
    await expect(page.getByText(/passt keine Altersklasse/)).toBeVisible()
    await expect(page.getByText(/für Relativkraft/)).toBeVisible()
  })

  test('das Alter und die Altersklasse erscheinen, sobald das Geburtsdatum steht', async ({ page }) => {
    await openFirstRun(page)
    await bisPerson(page)
    await page.getByLabel('Geburtsdatum').fill('1990-01-01')
    await expect(page.getByText(/Altersklasse: 30–39/)).toBeVisible()
  })

  test('der ganze Weg endet mit einem angelegten Termin', async ({ page }) => {
    await openFirstRun(page)
    await bisPerson(page)
    await fillProfile(page)
    await weiter(page).click()

    // Schritt 4: Haupt- und weitere Sportarten in einem Schritt.
    await expect(page.getByText('Schritt 4 von 9')).toBeVisible()
    await expect(weiter(page)).toBeDisabled()
    await page.getByRole('button', { name: /^Judo/ }).click()
    await page.getByRole('button', { name: /^HYROX/ }).click()
    await expect(page.getByText('1 gewählt')).toBeVisible()
    await weiter(page).click()

    // Schritt 5: Ziel.
    await expect(page.getByText('Schritt 5 von 9')).toBeVisible()
    await page.getByRole('button', { name: 'Wettkampfvorbereitung' }).click()
    await weiter(page).click()

    // Schritt 6: wo gemessen wird.
    await expect(page.getByText('Schritt 6 von 9')).toBeVisible()
    await page.getByRole('button', { name: /Fitnessstudio/ }).click()
    await weiter(page).click()

    // Schritt 7: wie oft.
    await expect(page.getByText('Schritt 7 von 9')).toBeVisible()
    await page.getByRole('radio', { name: '3 Monate' }).click()
    await page.getByLabel(/Erinnere mich/).check()
    await weiter(page).click()

    // Schritt 8: vorhandene Werte.
    await expect(page.getByText('Schritt 8 von 9')).toBeVisible()
    await page.getByLabel(/Griffkraft/).fill('54')
    await weiter(page).click()

    // Schritt 9: der Startplan mit dem ersten Termin.
    await expect(page.getByRole('heading', { name: /Deine Judo-Diagnostik/ })).toBeVisible()
    await expect(page.getByText('Zum Start empfohlen')).toBeVisible()
    await page.getByRole('button', { name: 'Ersten Termin anlegen' }).click()

    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).first()).toBeVisible()
    const stored = await store(page)
    const athlete = stored.athletes[0]
    expect(athlete.profile.sex).toBe('male')
    expect(athlete.profile.disciplineId).toBe('judo')
    expect(athlete.profile.additionalDisciplineIds).toEqual(['hyrox'])
    expect(athlete.profile.goalKey).toBe('competition')
    expect(athlete.profile.remindersEnabled, 'die Erinnerung war angehakt').toBe(true)
    expect(
      Object.values(athlete.profile.reminderIntervalDays),
      'der gewählte Abstand gilt für die empfohlenen Tests',
    ).toContain(91)
    expect(athlete.profile.onboardingCompletedAt).toBeTruthy()
    expect(athlete.biometrics[0].bodyWeightKg).toBe(81)
    expect(athlete.results.map((r: { testSlug: string }) => r.testSlug)).toEqual(['grip_strength'])
    expect(athlete.assessments, 'der Einstieg endet mit einem Termin').toHaveLength(1)
    expect(athlete.assessments[0].status).toBe('in_progress')
    expect(athlete.assessments[0].plannedTestSlugs.length).toBeGreaterThan(0)

    const equipment = await page.evaluate(() => localStorage.getItem('baseline.equipment'))
    expect(equipment, 'die Ortswahl füllt den Ausrüstungsfilter vor').toContain('barbell')
  })

  test('der Einstieg lässt sich mitten drin unterbrechen und läuft weiter', async ({ page }) => {
    await openFirstRun(page)
    await bisPerson(page)
    await fillProfile(page)
    await weiter(page).click()
    await page.getByRole('button', { name: /^Marathon/ }).click()
    await weiter(page).click()
    await expect(page.getByText('Schritt 5 von 9')).toBeVisible()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(
      page.getByText('Schritt 5 von 9'),
      'der frühere Ablauf begann nach einem Neuladen wieder von vorn',
    ).toBeVisible()
    const stored = await store(page)
    expect(stored.athletes[0].profile.disciplineId).toBe('marathon')
    expect(stored.athletes[0].profile.onboardingCompletedAt, 'noch nicht fertig').toBeNull()
  })

  test('die freiwilligen Schritte lassen sich überspringen', async ({ page }) => {
    await openFirstRun(page)
    await bisPerson(page)
    await fillProfile(page)
    await weiter(page).click()
    await page.getByRole('button', { name: /^Marathon/ }).click()
    await weiter(page).click()
    await page.getByRole('button', { name: 'Überspringen' }).click() // Ziel
    await page.getByRole('button', { name: 'Überspringen' }).click() // Ausrüstung
    await weiter(page).click() // Rhythmus
    await page.getByRole('button', { name: 'Überspringen' }).click() // vorhandene Werte
    await expect(page.getByRole('heading', { name: /Deine Marathon-Diagnostik/ })).toBeVisible()
  })

  test('nach dem Einstieg kommt er nicht wieder — auch nicht nach einem Neuladen', async ({ page }) => {
    await openGuest(page)
    await expect(page.getByText(/Schritt \d von 9/)).toHaveCount(0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Schritt \d von 9/)).toHaveCount(0)
  })

  test('zurück verliert nichts', async ({ page }) => {
    await openFirstRun(page)
    await bisPerson(page)
    await fillProfile(page)
    await weiter(page).click()
    await page.getByRole('button', { name: 'Zurück' }).click()
    await expect(page.getByLabel(/Körpergrösse/)).toHaveValue('182')
  })

  test('aus dem Profil lässt er sich erneut durchlaufen, ohne Messwerte zu verlieren', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Einstieg erneut durchlaufen' }).click()
    await expect(
      page.getByText('Schritt 1 von 9'),
      'und wieder am Anfang, nicht am Ende hängend',
    ).toBeVisible()
  })
})

test.describe('Einstieg für Trainer', () => {
  test('der Trainer richtet Athleten ein statt sich selbst', async ({ page }) => {
    await openFirstRun(page)
    await weiter(page).click()
    await page.getByRole('button', { name: /Ich betreue andere/ }).click()
    await weiter(page).click()

    // Kein Fragebogen über den eigenen Körper.
    await expect(page.getByText('Schritt 3 von 4')).toBeVisible()
    await expect(page.getByLabel(/Körpergewicht/)).toHaveCount(0)

    await page.getByLabel('Name').fill('Mara')
    await page.getByRole('button', { name: 'Hinzufügen' }).click()
    await page.getByLabel('Name').fill('Jonas')
    await page.getByRole('button', { name: 'Hinzufügen' }).click()
    await weiter(page).click()

    await page.getByRole('button', { name: 'Zum Trainerbereich' }).click()
    const stored = await store(page)
    expect(stored.role).toBe('coach')
    expect(stored.athletes.map((a: { name: string }) => a.name)).toContain('Mara')
    expect(stored.athletes.map((a: { name: string }) => a.name)).toContain('Jonas')
  })
})
