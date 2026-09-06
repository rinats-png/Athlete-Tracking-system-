import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { REFERENCE_GAPS, gapsForTest } from '../src/data/references'
import { getTest } from '../src/data/testCatalog'

/**
 * Belegte Lücken in der Referenzlage.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: an einem Test ohne Referenz stand «keine
 * publizierte Referenz vorhanden» — und damit war das Thema zu Ende. Für
 * einige dieser Tests gibt es sehr wohl Normen; sie sind nur nicht
 * eingepflegt, weil die Zahlen nicht frei zugänglich sind oder die Kohorte
 * nicht passt.
 *
 * Der teuerste Fehler wäre, eine Quelle zu nennen, die es nicht gibt (§81).
 * Deshalb prüft der erste Fall die Form des DOI — und deshalb steht jede
 * dieser Angaben mit DOI im Quelltext statt aus dem Gedächtnis.
 */

test.describe('Form der Lückenangaben', () => {
  test('jede genannte Quelle trägt einen DOI in gültiger Form', () => {
    const mitQuelle = REFERENCE_GAPS.filter((g) => g.source)
    expect(mitQuelle.length).toBeGreaterThan(0)
    for (const gap of mitQuelle) {
      // 10.<Registrant>/<Suffix> — mehr prüft die Form nicht, aber ein
      // Fantasiename fällt dabei auf.
      expect(gap.source!.doi, gap.subject).toMatch(/^10\.\d{4,9}\/\S+$/)
      expect(gap.source!.study.length).toBeGreaterThan(20)
    }
  })

  test('jede zugeordnete Testkennung gibt es im Katalog', () => {
    for (const gap of REFERENCE_GAPS) {
      for (const slug of gap.testSlugs ?? []) {
        expect(getTest(slug), `${gap.subject}: ${slug}`).toBeTruthy()
      }
    }
  })

  test('jede Lücke sagt, WARUM sie nicht geschlossen ist', () => {
    // Ein Grund von drei Wörtern ist kein Grund, sondern eine Ausrede. Die
    // Schwelle ist bewusst niedrig: «Die Bänder sind beschrieben, die
    // zugehörigen Werte nicht beziffert» ist knapp und trotzdem vollständig.
    for (const gap of REFERENCE_GAPS) {
      expect(gap.reason.length, gap.subject).toBeGreaterThan(60)
    }
  })

  test('die vier grossen Lücken sind benannt', () => {
    for (const slug of ['beep_test_20m', 'sprint_30m', 'back_squat_1rm', 'row_2000m']) {
      expect(gapsForTest(slug).length, slug).toBeGreaterThan(0)
    }
  })
})

test.describe('Am Test sichtbar', () => {
  test('ein Test ohne Referenz nennt die bekannte Norm und verlinkt sie', async ({ page }) => {
    await openDemo(page)
    await page.goto('/tests/beep_test_20m/details', { waitUntil: 'domcontentloaded' })

    // Der Beep-Test lässt sich über die abgeleitete VO2max bereits
    // einordnen — die Lücke im Test SELBST bleibt davon unberührt und muss
    // trotzdem dastehen.
    await expect(page.getByText('Bekannte Lücke').first()).toBeVisible()
    const link = page.getByRole('link', { name: /doi:10\.1136/ })
    await expect(link).toHaveAttribute('href', 'https://doi.org/10.1136/bjsports-2016-095987')
  })

  test('ohne bekannte Norm bleibt es bei der schlichten Auskunft', async ({ page }) => {
    await openDemo(page)
    // Für diesen Test ist keine Lücke hinterlegt — dann darf auch keine
    // erfunden dastehen.
    await page.goto('/tests/rope_climb/details', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/keine publizierte Referenz vor/)).toBeVisible()
    await expect(page.getByText('Bekannte Lücke')).toHaveCount(0)
  })
})
