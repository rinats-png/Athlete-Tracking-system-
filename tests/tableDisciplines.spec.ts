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
 * Die frühere Fußballsperre hat der Auftraggeber ausdrücklich aufgehoben
 * (Testbibliothek, Welle 3); der letzte Fall hält das fest.
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

  test('ihre Herkunft ist gekennzeichnet: Mastertabelle oder ergänzt mit Grund', () => {
    // Zielgruppendokument und Mastertabelle sind zwei Quellen mit
    // verschiedener Belegkraft — das muss am Eintrag ablesbar bleiben.
    // Spätere Ergänzungen (Testbibliothek) tragen ihren Grund und nie ein Profil.
    for (const discipline of TABLE_DISCIPLINES) {
      for (const entry of discipline.tests) {
        const id = `${discipline.id} -> ${entry.slug}`
        if (entry.provenance === 'addition') {
          expect(entry.role, id).toBe('optional')
          expect(entry.reason?.length ?? 0, id).toBeGreaterThan(10)
        } else {
          expect(entry.provenance, id).toBe('master_table')
        }
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

  test('Fußball ist freigegeben und steht nicht unter den Mastertabellen-Disziplinen', () => {
    // Der Auftraggeber hat die Sperre mit Welle 3 der Testbibliothek aufgehoben.
    // Die Disziplin stammt aus der Testbibliothek, nicht aus der Mastertabelle.
    expect(BLOCKED_DISCIPLINES).toEqual([])
    expect(DISCIPLINES.map((d) => d.id)).toContain('football')
    expect(TABLE_DISCIPLINES.map((d) => d.id)).not.toContain('football')
    expect(coreSlugs(disciplineById('football')!).length).toBeGreaterThan(0)
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
