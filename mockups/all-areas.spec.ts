import { mkdirSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import { openDemo, openFirstRun } from '../tests/helpers'

/**
 * Mockups aller Bereiche der App, mit Bestandsdaten statt Platzhaltern.
 *
 * WOHER DIE DATEN KOMMEN: aus dem Demobestand, den die App selbst mitbringt
 * («Demo ansehen»). Für die Trainerbereiche wird daraus eine Gruppe gebaut,
 * indem der Bestand auf seine drei Diagnostiktermine aufgeteilt wird — jede
 * Athletin, jeder Athlet trägt damit echte, in sich stimmige Werte aus
 * genau einem Termin. Es wird KEINE Zahl erfunden: alle Werte stammen aus
 * dem durchgerechneten Demofall und laufen durch dieselbe Ableitung.
 *
 * Das ist keine Prüfung, deshalb liegt es neben `tests/` und läuft nur über
 * `npm run mockups`.
 */

const OUT = 'mockups/out'

/** Namen für die Gruppe. Frei erfunden — Namen sind keine Messwerte. */
const GROUP = ['Alex Roth', 'Mira Sand', 'Jonas Feld']

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((value) => localStorage.setItem('baseline.theme', value), theme)
  await page.reload({ waitUntil: 'domcontentloaded' })
}

/**
 * Ein Bild ablegen. Die Nummer hält die Reihenfolge der Galerie.
 *
 * NICHT `fullPage`: die App hat feststehende Elemente — die Navigationsleiste
 * und den Aktionsknopf. In einer `fullPage`-Aufnahme kleben die mitten im
 * Bild, quer über dem Inhalt. Stattdessen wird das Fenster für die Aufnahme
 * so hoch gemacht wie die Seite und danach zurückgesetzt: dann steht die
 * Leiste dort, wo sie hingehört, und der ganze Inhalt ist zu sehen.
 */
async function shot(page: Page, project: string, name: string, grow = true) {
  mkdirSync(`${OUT}/${project}`, { recursive: true })
  // Einlaufende Elemente (`rise`, Journey, Orb) sollen fertig sein.
  await page.waitForTimeout(900)
  const view = page.viewportSize() as { width: number; height: number }
  if (grow) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    // Deckel: eine Aufnahme über 4000 px liest niemand mehr.
    const grown = Math.min(Math.max(height, view.height), 4000)
    if (grown > view.height) {
      await page.setViewportSize({ width: view.width, height: grown })
      await page.waitForTimeout(500)
    }
  }
  await page.screenshot({ path: `${OUT}/${project}/${name}.png` })
  if (page.viewportSize()?.height !== view.height) await page.setViewportSize(view)
}

/** Wartet, bis der Bildschirm steht (Suspense der geteilten Bündel). */
async function ready(page: Page) {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 })
}

async function go(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await ready(page)
}

test.describe('Mockups', () => {
  test('alle Bereiche', async ({ page }, testInfo) => {
    const p = testInfo.project.name
    const theme = p === 'phone' ? 'dark' : 'light'

    // ---------- 1. Einstieg, ohne Bestand ----------
    await openFirstRun(page)
    await setTheme(page, theme)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await ready(page)
    await shot(page, p, '02-onboarding-schritt-1')

    // ---------- 2. Willkommen und Intro ----------
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('baseline.locale', 'de')
      localStorage.setItem('baseline.intro', 'off')
    })
    await setTheme(page, theme)
    await shot(page, p, '01-willkommen', false)

    await page.evaluate(() => {
      localStorage.setItem('baseline.intro', 'on')
      sessionStorage.removeItem('baseline.intro.seen')
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    // Mitten in der ersten Szene, wenn die Messpunkte stehen.
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${p}/00-intro.png` })
    await page.evaluate(() => localStorage.setItem('baseline.intro', 'off'))

    // ---------- 3. Der Bestand ----------
    await openDemo(page)
    await setTheme(page, theme)
    await ready(page)
    await shot(page, p, '03-uebersicht')

    const ids = await page.evaluate(() => {
      const raw = localStorage.getItem('baseline.data.v1')
      const data = JSON.parse(raw as string)
      const athlete = data.athletes[0]
      const latest = [...athlete.results].sort((a: any, b: any) =>
        b.performedAt.localeCompare(a.performedAt),
      )[0]
      const assessment = athlete.assessments[0]
      return { resultId: latest.id, slug: latest.testSlug, assessmentId: assessment.id }
    })

    await go(page, '/diagnostik')
    await shot(page, p, '04-diagnostik')

    await go(page, '/diagnostik/bereich/strength')
    await shot(page, p, '05-bereich-kraft')

    await go(page, '/sport/functional_fitness')
    await shot(page, p, '06-sportart')

    await go(page, '/batterie/hybrid')
    await shot(page, p, '07-testbatterie')

    await go(page, '/diagnostik/termine')
    await shot(page, p, '08-termine')

    await go(page, `/diagnostik/${ids.assessmentId}`)
    await shot(page, p, '09-termin')

    await go(page, '/tests')
    await shot(page, p, '10-testkatalog')

    await go(page, `/tests/${ids.slug}/details`)
    await shot(page, p, '11-testdetail')

    await go(page, `/tests/${ids.slug}`)
    await shot(page, p, '12-testdurchfuehrung')

    await go(page, `/ergebnis/${ids.resultId}`)
    await shot(page, p, '13-ergebnis')

    await go(page, '/verlauf')
    await shot(page, p, '14-verlauf')

    await go(page, '/verlauf/werte')
    await shot(page, p, '15-werte')

    await go(page, '/verlauf/kalender')
    await shot(page, p, '16-kalender')

    await go(page, '/verlauf/erinnerungen')
    await shot(page, p, '17-erinnerungen')

    await go(page, '/analyse')
    await shot(page, p, '18-analyse')

    await go(page, '/analyse/jahr')
    await shot(page, p, '19-jahresrueckblick')

    await go(page, '/community')
    await shot(page, p, '20-community')

    await go(page, '/bericht')
    await shot(page, p, '21-bericht')

    await go(page, '/profil')
    await shot(page, p, '22-profil')

    await go(page, '/preise')
    await shot(page, p, '23-preise')

    await go(page, '/profil/import')
    await shot(page, p, '24-csv-import-leer')
    // Mit Datei: erst dann ist der eigentliche Teil zu sehen — Zuordnung der
    // Spalten und die Vorschau, die vor dem Schreiben zeigt, was ankommt.
    await page.setInputFiles('input[type="file"]', {
      name: 'werte.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Datum;Griffkraft\n05.01.2026;48\n05.02.2026;51\n', 'utf-8'),
    })
    await expect(page.getByText(/Werte werden übernommen/)).toBeVisible()
    await shot(page, p, '24b-csv-import-vorschau')

    // ---------- 4. Trainerbereich ----------
    await page.evaluate((names) => {
      const data = JSON.parse(localStorage.getItem('baseline.data.v1') as string)
      const base = data.athletes[0]
      // Die Termine des Demofalls, jüngster zuerst.
      const sessions = [...base.assessments].sort((a: any, b: any) =>
        b.performedOn.localeCompare(a.performedOn),
      )
      data.role = 'coach'
      data.athletes = names.map((name, i) => {
        // Unterschiedlich weit: die erste Person hat alle drei Termine, die
        // nächste zwei, die letzte einen. Damit zeigt die Liste einen
        // Verlauf, wo Verlauf da ist, und «zu wenig Daten», wo keiner ist —
        // beides ohne eine einzige erfundene Zahl.
        const mine = sessions.slice(i)
        const ids = new Set(mine.map((a: any) => a.id))
        return {
          ...structuredClone(base),
          id: `mock-athlete-${i}`,
          name,
          assessments: mine,
          results: base.results.filter((r: any) => ids.has(r.assessmentId)),
        }
      })
      data.activeAthleteId = data.athletes[0].id
      localStorage.setItem('baseline.data.v1', JSON.stringify(data))
    }, GROUP)

    await go(page, '/trainer')
    await shot(page, p, '25-trainer')

    await go(page, '/trainer/gruppentest')
    // Ohne gewählte Station ist der Bildschirm leer — die Liste der Athleten
    // hängt an Test und Tag. Für das Mockup wird eine Station gewählt.
    await page.locator('select').first().selectOption({ index: 1 })
    await shot(page, p, '26-gruppentest')
  })
})
