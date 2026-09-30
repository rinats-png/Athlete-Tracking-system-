import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { FUEL_RULES, FUEL_SOURCES } from '../src/data/fuelRules'
import { DISCIPLINES } from '../src/data/sportProfiles'
import { fuelRuleFor, sportDailyNeed } from '../src/domain/fuel'
import { FORMULA_REGISTRY } from '../src/domain/formulaRegistry'
import { PROTEIN_BAND } from '../src/domain/fueling'

/**
 * Fuel-Regeln der Ausdauerdisziplinen (docs/fuel.md, Stufe 1): jede Regel
 * trägt ihre Quelle, verweist auf echte Disziplinen und rechnet nur, was sie
 * belegen kann.
 */

test.describe('Fuel-Regeln', () => {
  test('Protein steht auf 1,6–2,2 g/kg', () => {
    expect(PROTEIN_BAND).toEqual([1.6, 2.2])
  })

  test('jede Regel nennt Quellen, die es gibt, und Spannen in der richtigen Reihenfolge', () => {
    for (const r of FUEL_RULES) {
      expect(r.evidence.sourceIds.length, r.id).toBeGreaterThan(0)
      for (const id of r.evidence.sourceIds) expect(FUEL_SOURCES[id], `${r.id}: ${id}`).toBeTruthy()
      expect(r.carbsPerKg[0], r.id).toBeLessThan(r.carbsPerKg[1])
      expect(r.evidence.ruleVersion, r.id).toMatch(/^\d+\.\d+\.\d+$/)
      expect(r.evidence.reviewed, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  test('Regeln verweisen nur auf vorhandene Disziplinen, keine doppelt', () => {
    const known = new Set(DISCIPLINES.map((d) => d.id))
    const seen = new Set<string>()
    for (const r of FUEL_RULES) {
      for (const id of [...r.disciplineIds, ...r.relatedDisciplineIds]) {
        expect(known.has(id), `${r.id}: ${id}`).toBe(true)
        expect(seen.has(id), `doppelt: ${id}`).toBe(false)
        seen.add(id)
      }
    }
  })

  test('ohne Regel keine Spanne: Halbmarathon, Freiwasser, Ju-Jutsu, HYROX, keine Disziplin', () => {
    for (const id of ['half_marathon', 'open_water', 'ju_jutsu', 'hyrox', null]) expect(fuelRuleFor(id), String(id)).toBeNull()
  })

  test('verwandte Disziplinen werden als übertragen ausgewiesen', () => {
    expect(fuelRuleFor('marathon')?.specificity).toBe('same_sport')
    expect(fuelRuleFor('trail_running')?.specificity).toBe('related_sport')
    expect(fuelRuleFor('gravel')?.rule.id).toBe('cycling')
  })

  test('Tagesspanne in Gramm; ohne Körpermasse keine', () => {
    const rule = fuelRuleFor('marathon')!.rule
    expect(sportDailyNeed(rule, null)).toBeNull()
    const need = sportDailyNeed(rule, 70)!
    expect(need.carbsG).toEqual([420, 700])
    expect(need.proteinG).toEqual([112, 154])
  })

  test('Formelregister führt die Disziplinspannen als vorläufig', () => {
    const f = FORMULA_REGISTRY.find((x) => x.metricKey === 'fuel_sport_carbs_g_per_kg')
    expect(f?.source).toBe('provisional')
    expect(f?.reference).toBeNull()
  })

  test('Karte in der Ernährung: Regel mit Evidenz für den Marathon', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'marathon'
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/fuel', { waitUntil: 'domcontentloaded' })
    const card = page.getByTestId('fuel-rule')
    await expect(card).toBeVisible()
    await expect(page.getByTestId('fuel-rule-evidence')).toBeVisible()
    await expect(page.getByTestId('fuel-rule-load')).toBeVisible()
    await expect(card.getByRole('link').first()).toHaveAttribute('href', /pubmed|doi/)
  })

  test('Karte ohne Regel sagt es, statt zu rechnen', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'ju_jutsu'
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/fuel', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('fuel-rule-none')).toBeVisible()
    await expect(page.getByTestId('fuel-rule-evidence')).toHaveCount(0)
  })
})
