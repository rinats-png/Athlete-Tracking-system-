import { mkdirSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { openDemo } from '../tests/helpers'

/**
 * Der Athleten-Report als das, was er beim Nutzer wird: ein A4-PDF.
 *
 * Die App bringt keine PDF-Bibliothek mit — der Bericht ist eine für den
 * Druck gebaute Seite, und «Drucken → Als PDF sichern» erzeugt die Datei über
 * die Engine des Systems. Diese Aufnahme geht denselben Weg: sie schaltet die
 * Seite in den Druckmodus und lässt Chromium daraus A4 setzen. Was hier
 * herauskommt, ist deshalb kein nachgebautes Muster, sondern genau die Datei,
 * die ein Trainer bekommt.
 *
 * Die Werte stammen aus dem Demobestand — durchgerechnet, nicht erfunden.
 * Auch die Trainingsschwerpunkte sind echte Einträge dieses Bestands: der
 * Satz stammt von einem Trainer, die Bewertung daneben ist gemessen.
 *
 * Läuft nur im Schreibtisch-Profil: ein A4-Satz aus einem Telefonlayout wäre
 * ein anderes Dokument, und `page.pdf()` gibt es nur in Chromium.
 *
 * Der Bericht ist mit dem Demobestand VIER Seiten lang, nicht zwei. Er wird
 * dafür nicht gekürzt: was wegfiele, wäre Testabdeckung, Herkunft der
 * Referenzwerte und die Formelherkunft — also genau das, was den Bericht von
 * einem Werbeblatt unterscheidet. Die Länge folgt dem Bestand, nicht einer
 * vorher gesetzten Seitenzahl.
 */

const OUT = 'mockups/out/report'

test.describe('Report', () => {
  test('A4 aus dem Druckpfad, hell und dunkel gesetzt', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'A4 wird aus dem Schreibtischlayout gesetzt')
    mkdirSync(OUT, { recursive: true })

    for (const theme of ['light', 'dark'] as const) {
      await openDemo(page)
      await page.evaluate((value) => localStorage.setItem('baseline.theme', value), theme)
      await page.goto('/bericht', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 })
      // Die Schwerpunkte sind der neue Block — ohne sie wäre die Aufnahme
      // unvollständig, und ein leeres PDF fiele sonst niemandem auf.
      await expect(page.getByRole('heading', { name: 'Trainingsschwerpunkte' })).toBeVisible()
      await page.waitForTimeout(1200)

      // Der Druckmodus setzt den Grund auf Weiss und blendet die Bedienung
      // aus — auf Papier ist beides gleich, egal welches Thema gewählt war.
      await page.emulateMedia({ media: 'print' })
      await page.pdf({
        path: `${OUT}/baseline-report-${theme}.pdf`,
        format: 'A4',
        printBackground: true,
      })
      // Dieselbe Seite im Druckmodus als Bild: ein PDF lässt sich hier nicht
      // öffnen, und was im Druck anders aussieht, soll trotzdem prüfbar sein.
      await page.screenshot({
        path: `${OUT}/druckansicht-${theme}.png`,
        fullPage: true,
      })
      await page.emulateMedia({ media: 'screen' })

      // Dazu die Bildschirmfassung, damit die Galerie beides zeigt.
      await page.screenshot({ path: `${OUT}/bericht-${theme}.png`, fullPage: true })
    }
  })
})
