import { expect, test } from '@playwright/test'
import { openDemo, openGuest } from './helpers'

/**
 * Übersicht und Diagnostik (Konzept §6–§18) als Abläufe: was jemand sieht,
 * wenn er die App öffnet, wo er hinkommt, wenn er testen will, und was
 * nach dem Speichern steht. Jeder Fall hält eine Zusage des Konzepts fest.
 */

test.describe('Übersicht', () => {
  test('ohne Messung stehen die drei Tests zum Start', async ({ page }) => {
    await openGuest(page)
    await expect(page.getByText('Zum Start empfohlen')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Test starten' })).toHaveCount(3)
  })

  test('mit Messungen: Orb, Stärken, Potenzial, nächster Test, letzte Ergebnisse', async ({ page }) => {
    await openDemo(page)
    // Das Leistungsprofil steht seit dem Umbau als Orb da, nicht als
    // Balkenliste — die Aussage ist dieselbe, die Form eine andere.
    await expect(page.getByRole('img', { name: /Leistungsprofil als Form/ })).toBeVisible()
    await expect(page.getByText('Deine Stärken')).toBeVisible()
    await expect(page.getByText('Grösstes Potenzial')).toBeVisible()
    await expect(page.getByText('Nächster sinnvoller Test')).toBeVisible()
    await expect(page.getByText('Letzte Ergebnisse')).toBeVisible()
  })

  test('die Empfehlung trägt ihre Begründung mit', async ({ page }) => {
    await openDemo(page)
    const karte = page.getByRole('link', { name: /Nächster sinnvoller Test/ })
    await expect(karte).toBeVisible()
    // Eine Empfehlung ohne «warum» ist von einer zufälligen Auswahl nicht
    // zu unterscheiden.
    await expect(karte).not.toHaveText(/^Nächster sinnvoller Test\s*\S+$/)
  })
})

test.describe('Diagnostik', () => {
  test('beginnt mit der Frage, nicht mit der Liste', async ({ page }) => {
    await openGuest(page)
    await page.goto('/diagnostik', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Was möchtest du testen?' })).toBeVisible()
    for (const name of ['Meine Sportart testen', 'Kraft testen', 'Ausdauer testen', 'Explosivität testen', 'Schnelligkeit testen', 'Test selbst auswählen']) {
      await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
    }
  })

  test('ein Bereich zeigt Testkarten mit Status, Einordnung und Evidenz', async ({ page }) => {
    await openGuest(page)
    await page.goto('/diagnostik/bereich/strength', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Kraft' })).toBeVisible()
    const card = page.locator('article').first()
    await expect(card.getByText('Offen')).toBeVisible()
    await expect(card.getByText('Letztes Ergebnis')).toBeVisible()
    await expect(card.getByRole('link', { name: 'Test starten' })).toBeVisible()
  })

  test('die Sportseite führt Stand, empfohlene Tests, Filter und Batterien', async ({ page }) => {
    await openDemo(page)
    await page.goto('/sport/functional_fitness', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Functional Fitness' })).toBeVisible()
    await expect(page.getByText('Dein aktueller Stand')).toBeVisible()
    await expect(page.getByText('Empfohlene Tests')).toBeVisible()
    await page.getByRole('radio', { name: 'Kraft' }).click()
    await expect(page.locator('article').first()).toBeVisible()
    await expect(page.getByText(/Batterien für Functional Fitness/)).toBeVisible()
  })

  test('eine Batterie zählt Fortschritt und legt beim Start einen Termin an', async ({ page }) => {
    await openGuest(page)
    await page.goto('/batterie/general_fitness', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('0 / 6 abgeschlossen')).toBeVisible()
    await page.getByRole('button', { name: 'Batterie starten' }).click()
    await expect(page).toHaveURL(/\/diagnostik\/[^/]+$/)
    await expect(page.getByRole('heading', { name: 'Allgemeine Fitness' })).toBeVisible()
  })

  test('die Testdetailseite zeigt Protokoll, Modus und die wissenschaftliche Grundlage', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/grip_strength/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Protokoll').first()).toBeVisible()
    await expect(page.getByText('Testmodus')).toBeVisible()
    await expect(page.getByText('Wissenschaftliche Grundlage')).toBeVisible()
    await expect(page.getByRole('cell', { name: /Referenzgruppe/ }).or(page.getByText('Referenzgruppe'))).toBeVisible()
    await expect(page.getByText(/n = /).first()).toBeVisible()
  })

  test('ohne Referenz sagt die Detailseite das — und erfindet keine', async ({ page }) => {
    // Beispiel war der Unterarmstütz; der hat inzwischen einen Bezugswert
    // aus dem US Army Fitness Test. Der Seilklettergang hat keinen — und
    // genau darum geht es hier: die Seite darf keinen erfinden.
    await openGuest(page)
    await page.goto('/tests/rope_climb/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/keine publizierte Referenz/)).toBeVisible()
  })
})

test.describe('Ergebnis', () => {
  test('nach dem Speichern steht die Auswertung: Wert, Referenz, Einordnung, Benchmark', async ({ page }) => {
    await openGuest(page)
    // Profil für eine Referenz: männlich, 28, Judo.
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('baseline.data.v1') ?? '{}')
      Object.assign(store.athletes[0].profile, { sex: 'male', birthDate: '1998-01-01', disciplineId: 'judo', sportCategoryId: 'combat' })
      localStorage.setItem('baseline.data.v1', JSON.stringify(store))
    })
    await page.goto('/tests/sprint_10m', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Zeit/).first().fill('1.9')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await expect(page).toHaveURL(/\/ergebnis\//)
    await expect(page.getByText('Dein Wert')).toBeVisible()
    await expect(page.getByText('Referenzvergleich')).toBeVisible()
    await expect(page.getByText('Deine Einordnung')).toBeVisible()
    await expect(page.getByText('Benchmarking')).toBeVisible()
  })

  test('ohne passende Referenz steht «Keine zuverlässige Bewertung möglich»', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/plank_hold', { waitUntil: 'domcontentloaded' })
    await page.getByPlaceholder('min').first().fill('1')
    await page.getByPlaceholder('sek').first().fill('30')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await expect(page).toHaveURL(/\/ergebnis\//)
    await expect(page.getByText('Keine zuverlässige Bewertung möglich.')).toBeVisible()
    await expect(page.getByText('Keine belastbare Gesellschaftsreferenz verfügbar.')).toBeVisible()
  })
})

/**
 * EIN WEG ZU MESSEN.
 *
 * Gemessener Fehler: wer eine Batterie laufen hatte und den Test aus dem
 * Katalog startete, bekam ein Ergebnis, das nirgends dazugehörte — der
 * Termin blieb offen, obwohl gemessen worden war. Der laufende Termin wird
 * jetzt vorgeschlagen, sichtbar und abwählbar.
 */
test.describe('Ein Weg zu messen', () => {
  test('ein Einzeltest wird dem laufenden Termin zugeschlagen, sichtbar und abwählbar', async ({
    page,
  }) => {
    await openGuest(page)
    await page.evaluate(() => {
      const raw = localStorage.getItem('baseline.data.v1')!
      const store = JSON.parse(raw)
      store.athletes[0].assessments = [
        {
          id: 'a1',
          title: 'Grundlagen',
          batterySlug: null,
          performedOn: new Date().toISOString().slice(0, 10),
          status: 'in_progress',
          plannedTestSlugs: ['plank_hold'],
          readiness: null,
          nextAssessmentOn: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
      ]
      localStorage.setItem('baseline.data.v1', JSON.stringify(store))
    })
    await page.goto('/tests/plank_hold', { waitUntil: 'domcontentloaded' })

    const box = page.getByRole('checkbox', { name: /Grundlagen/ })
    await expect(box, 'die Zuordnung muss sichtbar sein, nicht still').toBeVisible()
    await expect(box).toBeChecked()
    await box.uncheck()
    await expect(box).not.toBeChecked()
  })

  test('ohne laufenden Termin fragt nichts danach', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/plank_hold', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('checkbox', { name: /Termin/ })).toHaveCount(0)
  })
})
