import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { DISCIPLINES, BLOCKED_DISCIPLINES, coreSlugs, disciplineById } from '../src/data/sportProfiles'
import { TABLE_DISCIPLINES } from '../src/data/sportProfilesAdditions'
import { getTest } from '../src/data/testCatalog'
import { rationaleFor } from '../src/data/sportRationale'

/**
 * Die Disziplinen aus der Mastertabelle.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: die App führte ausschliesslich Einzel-,
 * Kampf-, Ausdauer- und Einsatzsport. Mannschaftssport, Leichtathletik,
 * Rudern und Kraftdreikampf fehlten ganz.
 *
 * Der teuerste Fehler wäre, dabei die Fussballsperre stillschweigend
 * aufzuheben: sie ist eine Grundsatzentscheidung des Auftraggebers und wird
 * nicht durch eine Datenlieferung ausser Kraft gesetzt. Dafür steht der
 * letzte Fall.
 */

test.describe('Neue Disziplinen', () => {
  test('alle neun sind im Katalog und tragen eine Begründung', () => {
    expect(TABLE_DISCIPLINES).toHaveLength(9)
    for (const discipline of TABLE_DISCIPLINES) {
      expect(disciplineById(discipline.id), discipline.id).toBeTruthy()
      expect(rationaleFor(discipline.id), discipline.id).toBeTruthy()
    }
  })

  test('jeder ihrer Tests gibt es wirklich', () => {
    for (const discipline of TABLE_DISCIPLINES) {
      for (const entry of discipline.tests) {
        expect(getTest(entry.slug), `${discipline.id} -> ${entry.slug}`).toBeTruthy()
      }
    }
  })

  test('ihre Herkunft ist als Mastertabelle gekennzeichnet', () => {
    // Zielgruppendokument und Mastertabelle sind zwei Quellen mit
    // verschiedener Belegkraft — das muss am Eintrag ablesbar bleiben.
    for (const discipline of TABLE_DISCIPLINES) {
      for (const entry of discipline.tests) {
        expect(entry.provenance, `${discipline.id} -> ${entry.slug}`).toBe('master_table')
      }
    }
  })

  test('kein Kerntest braucht ein Labor', () => {
    for (const discipline of TABLE_DISCIPLINES) {
      for (const slug of coreSlugs(discipline)) {
        expect(getTest(slug)?.setting ?? 'field', `${discipline.id} -> ${slug}`).toBe('field')
      }
    }
  })

  test('Fussball bleibt gesperrt', () => {
    // Die Mastertabelle nennt ihn. Das hebt die Sperre nicht auf.
    expect(BLOCKED_DISCIPLINES.map((b) => b.id)).toContain('football')
    expect(DISCIPLINES.map((d) => d.id)).not.toContain('football')
    expect(DISCIPLINES.map((d) => d.id)).not.toContain('soccer')
  })
})

test.describe('Neue Felder am Athleten', () => {
  test('Gewichtsklasse und biologisches Alter lassen sich eintragen', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Gewichtsklasse', { exact: true }).fill('-73 kg')
    await page.getByLabel('Biologisches Alter', { exact: true }).selectOption('circa_phv')

    const bestand = JSON.parse(
      (await page.evaluate(() => localStorage.getItem('kydon.data.v1'))) ?? '{}',
    )
    expect(bestand.athletes[0].profile.weightClass).toBe('-73 kg')
    expect(bestand.athletes[0].profile.maturityStage).toBe('circa_phv')
  })

  test('die App schätzt den Reifegrad nicht selbst', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    // Ein geschätzter Reifegrad sähe aus wie eine Messung und flösse
    // unsichtbar in jede Einordnung ein (§81).
    await expect(page.getByText(/App schätzt das nicht/)).toBeVisible()
    await expect(page.getByLabel('Biologisches Alter', { exact: true })).toHaveValue('')
  })
})
