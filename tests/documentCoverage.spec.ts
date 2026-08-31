import { expect, test } from '@playwright/test'
import {
  DOCUMENT_GAPS,
  additionReason,
  documentLabelOf,
  openGaps,
  provenanceOf,
} from '../src/data/documentCoverage'
import { DISCIPLINES, coreSlugs, disciplineById } from '../src/data/sportProfiles'
import { getTest } from '../src/data/testCatalog'

/**
 * Die Zusage: ein Test, den das Zielgruppendokument für eine Disziplin nennt,
 * wird durch spätere Ergänzungen nicht verdrängt.
 *
 * Bis zu Befund 07 stand die Herkunft in einer zweiten Liste, die mit der
 * ersten übereinstimmen musste. Jetzt steht sie am Eintrag selbst — die
 * Zusage ist damit nicht schwächer, sondern schlicht nicht mehr auf zwei
 * Listen verteilt: ein Dokumenttest kann nicht mehr aus der Zuordnung
 * fallen, ohne seine Herkunftsangabe mitzunehmen.
 */

const allTests = DISCIPLINES.flatMap((d) => d.tests.map((t) => ({ discipline: d.id, ...t })))

test.describe('Dokumentabdeckung', () => {
  test('jede Disziplin hat Tests', () => {
    for (const d of DISCIPLINES) {
      expect(d.tests.length, d.id).toBeGreaterThan(0)
    }
  })

  test('jeder verwiesene Slug steht im Katalog', () => {
    for (const entry of allTests) {
      expect(getTest(entry.slug), `${entry.discipline} → ${entry.slug}`).toBeTruthy()
    }
  })

  test('jede Zuordnung hat eine bekannte Herkunft', () => {
    for (const entry of allTests) {
      expect(provenanceOf(entry.discipline, entry.slug), `${entry.discipline} → ${entry.slug}`).not.toBe(
        'unknown',
      )
    }
  })

  test('ein Dokumenttest nennt seine Bezeichnung im Dokument', () => {
    // Ohne sie liesse sich die Zeile im Dokument nicht wiederfinden, und die
    // Herkunftsangabe wäre eine Behauptung ohne Beleg.
    for (const entry of allTests.filter((e) => e.provenance === 'document')) {
      const label = documentLabelOf(entry.discipline, entry.slug)
      expect(label, `${entry.discipline} → ${entry.slug}`).toBeTruthy()
      expect(label!.length, `${entry.discipline} → ${entry.slug}`).toBeGreaterThan(2)
    }
  })

  test('jede Ergänzung hat eine ausgeschriebene Begründung', () => {
    // Eine Ergänzung ohne Begründung ist eine Zuordnung, die niemand mehr
    // erklären kann. Sie darf nicht in den Auslieferungsstand.
    for (const entry of allTests.filter((e) => e.provenance === 'addition')) {
      const reason = additionReason(entry.discipline, entry.slug)
      expect(reason, `${entry.discipline} → ${entry.slug}`).toBeTruthy()
      expect(reason!.length, `${entry.discipline} → ${entry.slug}: Begründung zu knapp`).toBeGreaterThan(25)
    }
  })

  test('kein Test steht zweimal in derselben Disziplin', () => {
    for (const d of DISCIPLINES) {
      const slugs = d.tests.map((t) => t.slug)
      expect(new Set(slugs).size, d.id).toBe(slugs.length)
    }
  })

  test('eine Ergänzung trägt kein Profil — sie schärft es', () => {
    // Was ein Profil trägt, stammt aus dem Dokument. Fiele diese Zusage,
    // stünde eine eigene Entscheidung an der Stelle einer belegten.
    const carried = allTests.filter((e) => e.role === 'core' && e.provenance !== 'document')
    expect(carried.map((e) => `${e.discipline} → ${e.slug}`)).toEqual([])
  })

  test('jede Lücke gehört zu einer Disziplin, die es gibt', () => {
    for (const gap of DOCUMENT_GAPS) {
      expect(disciplineById(gap.disciplineId), gap.disciplineId).toBeTruthy()
    }
  })

  test('jede Lücke nennt Art und Grund', () => {
    for (const gap of openGaps()) {
      expect(['buildable', 'equipment', 'no_protocol', 'elsewhere']).toContain(gap.kind)
      expect(gap.reason.length, `${gap.disciplineId}: ${gap.label}`).toBeGreaterThan(40)
    }
  })

  test('kein Kerntest, den nur ein Labor durchführen kann', () => {
    for (const d of DISCIPLINES) {
      for (const slug of coreSlugs(d)) {
        expect(getTest(slug)?.setting ?? 'field', `${d.id} → ${slug}`).toBe('field')
      }
    }
  })

  test('die offenen Lücken sind gezählt und benannt', () => {
    const gaps = openGaps()
    // Kein Zielwert, sondern eine Sichtbarkeitsprüfung: die Zahl darf sich
    // ändern, aber nie unbemerkt.
    expect(gaps.length).toBeGreaterThan(0)
    const buildable = gaps.filter((g) => g.kind === 'buildable')
    expect(
      buildable.length,
      `noch baubar ohne Fremdgerät: ${buildable.map((g) => g.label).join(', ')}`,
    ).toBeLessThanOrEqual(2)
  })
})
