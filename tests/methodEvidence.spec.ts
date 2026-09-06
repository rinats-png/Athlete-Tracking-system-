import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { METHOD_EVIDENCE, evidenceForTest } from '../src/data/methodEvidence'
import { getTest } from '../src/data/testCatalog'
import { REFERENCES } from '../src/data/references'

/**
 * Methodenbelege aus ClinicalTrials.gov.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: das Referenzhandbuch nennt zu vielen Tests
 * eine Registernummer — und schreibt an fast jede zugleich «Wert als Norm
 * verfügbar? Nein». Diese Zeilen als Referenz zu führen wäre falsch, sie
 * wegzulassen verschenkte den Beleg, dass ein Verfahren in angemeldeter
 * Forschung so gemessen wird.
 *
 * Der teuerste Fehler wäre, beides zu vermischen: ein NCT-Verweis neben
 * einem Referenzwert wird als wissenschaftliche Absicherung gelesen, die er
 * nicht ist. Dafür stehen der zweite und der dritte Fall.
 */

test.describe('Form der Belege', () => {
  test('jede Registernummer hat die Form NCT + acht Ziffern', () => {
    expect(METHOD_EVIDENCE.length).toBeGreaterThan(0)
    for (const entry of METHOD_EVIDENCE) {
      expect(entry.nct).toMatch(/^NCT\d{8}$/)
      expect(entry.study.de.length).toBeGreaterThan(15)
      expect(entry.caveat.de.length).toBeGreaterThan(30)
    }
  })

  test('jeder zugeordnete Test gibt es im Katalog', () => {
    for (const entry of METHOD_EVIDENCE) {
      for (const slug of entry.testSlugs) {
        expect(getTest(slug), `${entry.nct} -> ${slug}`).toBeTruthy()
      }
    }
  })

  test('kein Beleg steht als Referenzwert in der Belegung', () => {
    // Die beiden Listen dürfen sich nicht überschneiden: ein Beleg ordnet
    // niemanden ein.
    const studies = REFERENCES.map((r) => r.source.study)
    for (const entry of METHOD_EVIDENCE) {
      expect(studies.some((s) => s.includes(entry.nct)), entry.nct).toBe(false)
    }
  })

  test('jeder Beleg sagt, was er NICHT belegt', () => {
    // Der Vorbehalt ist der Kern des Eintrags: ohne ihn läse sich eine
    // Registernummer wie ein Gütesiegel.
    for (const entry of METHOD_EVIDENCE) {
      expect(entry.caveat.de, entry.nct).toMatch(/kein|nicht|ohne/i)
    }
  })
})

test.describe('Am Test sichtbar', () => {
  test('der Abschnitt steht getrennt und verlinkt die Studie', async ({ page }) => {
    await openDemo(page)
    await page.goto('/tests/sprint_10m/details', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Methodenbeleg')).toBeVisible()
    await expect(page.getByText(/nicht, dass es einen Normwert dafür gibt/)).toBeVisible()
    await expect(page.getByRole('link', { name: /NCT04766411/ })).toHaveAttribute(
      'href',
      'https://clinicaltrials.gov/study/NCT04766411',
    )
  })

  test('ohne Beleg bleibt der Abschnitt weg', async ({ page }) => {
    await openDemo(page)
    expect(evidenceForTest('rope_climb')).toHaveLength(0)
    await page.goto('/tests/rope_climb/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Methodenbeleg')).toHaveCount(0)
  })
})
