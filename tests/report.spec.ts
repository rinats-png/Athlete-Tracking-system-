import { expect, test } from '@playwright/test'
import { openDemo, openGuest } from './helpers'
import { resultsToCsv, biometricsToCsv } from '../src/lib/export/csv'
import { emptyAthleteView } from './helpers'
import type { AthleteData, StoredResult } from '../src/lib/store/localStore'

/**
 * Der Bericht ist das Dokument, das ein Trainer einem zahlenden Kunden
 * aushändigt. Er darf keine Lücke verschweigen, keine Herkunft unterschlagen
 * und beim Öffnen in Excel nichts ausführen.
 */

const result = (overrides: Partial<StoredResult> = {}): StoredResult =>
  ({
    id: 'r1',
    testSlug: 'back_squat_1rm',
    performedAt: '2026-04-01T09:00:00.000Z',
    values: { loadKg: 165, reps: 1 },
    metrics: { one_rm_kg: 165 },
    score: 165,
    bodyWeightKg: 82,
    ageYears: 34,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: '2026-04-01T09:00:00.000Z',
    ...overrides,
  }) as StoredResult

test.describe('CSV-Export', () => {
  const data: AthleteData = { ...emptyAthleteView(), results: [result()] }

  test('Kopfzeile und Werte stehen maschinenlesbar da', () => {
    const csv = resultsToCsv(data, 'de')
    const [header, row] = csv.split('\r\n')
    expect(header.split(',')[0]).toBe('result_id')
    expect(header).toContain('primary_value')
    expect(header).toContain('percentile')
    // Rohwert und ISO-Datum, nicht die Anzeigeform.
    expect(row).toContain('165')
    expect(row).toContain('2026-04-01T09:00:00.000Z')
    expect(row).toContain('kg')
  })

  test('eine Notiz kann in Excel keine Formel auslösen', () => {
    const csv = resultsToCsv(
      { ...data, results: [result({ notes: '=1+1' })] },
      'de',
    )
    // Führendes Apostroph: Excel liest den Inhalt als Text.
    expect(csv).toContain("'=1+1")
    expect(csv).not.toMatch(/,=1\+1/)
  })

  test('Trennzeichen und Zeilenumbrüche in Notizen zerstören die Tabelle nicht', () => {
    const csv = resultsToCsv(
      { ...data, results: [result({ notes: 'kalt, windig\nzweiter Versuch' })] },
      'de',
    )
    expect(csv).toContain('"kalt, windig\nzweiter Versuch"')
    // Der Datensatz bleibt eine Zeile im CSV-Sinn: genau eine Kopfzeile.
    expect(csv.startsWith('result_id,')).toBe(true)
  })

  test('Körperwerte sind eine eigene Tabelle', () => {
    const csv = biometricsToCsv({
      ...data,
      biometrics: [
        {
          id: 'b1',
          measuredOn: '2026-04-01',
          bodyWeightKg: 82.4,
          bodyFatPercent: null,
          restingHr: null,
          createdAt: '2026-04-01T07:00:00.000Z',
        },
      ],
    })
    expect(csv.split('\r\n')[0]).toBe('measured_on,body_weight_kg,body_fat_percent,resting_hr')
    expect(csv).toContain('2026-04-01,82.4,,')
  })
})

test.describe('Bericht', () => {
  test('nennt Lücken, Belegstärke und die Herkunft der Referenzwerte', async ({ page }) => {
    await openDemo(page)
    await page.goto('/bericht', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Leistungsprofil', level: 1 })).toBeVisible()
    await expect(page.getByText('Zur Methode')).toBeVisible()

    // Die Referenzwerte sind ausdrücklich als vorläufig gekennzeichnet —
    // ohne diesen Satz wäre der Bericht eine unbelegte Normaussage.
    await expect(page.getByText(/baseline_v0_placeholder/)).toBeVisible()
    await expect(page.getByText(/Schätzformeln/)).toBeVisible()

    // Und der Abgrenzungshinweis steht drin, nicht nur in der App.
    await expect(page.getByText(/keine medizinische Diagnostik/)).toBeVisible()
  })

  test('der Bericht eines Termins weist dessen fehlende Achsen aus', async ({ page }) => {
    await openGuest(page)

    await page.goto('/diagnostik/neu', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Maxkraft \(Big Three\)/ }).click()
    await page.getByRole('button', { name: 'Diagnostik anlegen' }).click()
    await page.waitForURL(/\/diagnostik\/[^/]+$/)

    await page.getByRole('link', { name: 'Messen' }).first().click()
    await page.getByLabel(/^Gewicht/).fill('165')
    await page.getByLabel(/^Wiederholungen/).fill('1')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL(/\/diagnostik\/[^/]+$/)
    await page.getByRole('button', { name: 'Diagnostik abschliessen' }).click()
    await page.waitForURL(/\/abschluss$/)

    await page.getByRole('link', { name: 'Bericht' }).click()
    await page.waitForURL(/\/bericht\//)
    await expect(page.getByText(/Nicht gemessen:/)).toBeVisible()
    // Der Termin trägt den Titel aus seiner Vorlage; «Diagnostikbericht» ist
    // nur der Rückfall für Termine ohne Bezeichnung.
    await expect(
      page.getByRole('heading', { name: /Maxkraft \(Big Three\)/, level: 1 }),
    ).toBeVisible()
  })

  test('Bedienelemente verschwinden im Druck, der Inhalt bleibt', async ({ page }) => {
    await openDemo(page)
    await page.goto('/bericht', { waitUntil: 'domcontentloaded' })

    // Die Druckvorschau simulieren: dieselbe Seite, andere Medienabfrage.
    await page.emulateMedia({ media: 'print' })

    await expect(page.getByRole('button', { name: /Drucken/ })).toBeHidden()
    await expect(page.getByRole('navigation')).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'Leistungsprofil' })).toBeVisible()
    await expect(page.getByText('Messwerte').first()).toBeVisible()

    // Auf Papier wird schwarz auf weiss gedruckt, auch aus dem Dunkelmodus.
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    )
    expect(background).toBe('rgb(255, 255, 255)')
  })
})

test.describe("Bericht: Aufbau (§33)", () => {
  test("Deckblatt, Profil, Abdeckung und Methodik stehen drin", async ({ page }) => {
    await openDemo(page);
    await page.goto("/bericht", { waitUntil: "domcontentloaded" });

    // Deckblatt mit Athlet und Datum
    await expect(page.getByText("Athlet", { exact: true }).first()).toBeVisible();

    // Das Leistungsprofil gehört in den Bericht — sechs Zahlen in einer
    // Tabelle beantworten «wo stehe ich» schlechter als ein Netz.
    await expect(page.getByRole("heading", { name: /Leistungsprofil/ }).first()).toBeVisible();

    await expect(page.getByRole("heading", { name: "Testabdeckung" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Zur Methode" })).toBeVisible();
  });

  test("das Profil bleibt ohne Diagrammbibliothek lesbar", async ({ page }) => {
    // Im Druck ist das Diagramm ein Bild; die Tabellenansicht ist der Weg
    // zu denselben Zahlen, wenn es nicht lädt.
    await page.route(/\/assets\/echarts-[^/]*\.js$/, (route) => route.abort());
    await openDemo(page);
    await page.goto("/bericht", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Als Tabelle/ }).first().click();
    await expect(page.getByRole("columnheader", { name: "Achse" }).first()).toBeVisible();
  });

  test("ein Folgetermin wird gegen seinen Vorgänger gestellt", async ({ page }) => {
    await openDemo(page);
    await page.goto("/diagnostik", { waitUntil: "domcontentloaded" });

    // Der Demobestand hat mehrere abgeschlossene Termine — der jüngste muss
    // einen Vorgängervergleich zeigen.
    await page.getByRole("link", { name: /Abgeschlossen/ }).first().click();
    await page.waitForURL(/\/diagnostik\/[^/]+$/);
    await page.getByRole("link", { name: "Auswertung ansehen" }).click();
    await page.waitForURL(/\/abschluss$/);
    await page.getByRole("link", { name: "Bericht" }).click();
    await page.waitForURL(/\/bericht\//);

    await expect(page.getByText(/Gegenüber \d/).first()).toBeVisible();
  });
});
