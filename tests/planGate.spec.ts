import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { assessmentGate, GATE_MAX_AGE_DAYS } from '../src/domain/planGate'
import type { RequirementGap, RequirementRow } from '../src/domain/requirementGap'
import type { RadarAxis } from '../src/types/domain'

/** Trainingsbereich Etappe 6: Bewertungstor und Leistungsprofil. */

const ASOF = new Date('2026-10-05T00:00:00Z')
const row = (axisId: string, dimension: RequirementRow['dimension'], requirement: number, measurements: number): RequirementRow => ({ axisId, dimension, requirement, score: measurements ? 40 : null, leverage: measurements ? 30 : null, open: false, measurements, evidence: 'weak' })
const axis = (axisId: string, count: number, daysAgo: number | null): RadarAxis => ({ axisId, dimension: null, score: 40, testCount: count, hasData: count > 0, latestPerformedAt: daysAgo == null ? null : new Date(ASOF.getTime() - daysAgo * 86_400_000).toISOString() })
const gapOf = (rows: RequirementRow[]): RequirementGap => ({ disciplineId: 'judo', ranked: rows.filter((r) => r.leverage != null), unmeasured: rows.filter((r) => r.score == null), unweighted: [], openCount: 0 })

test.describe('Bewertungstor: Fachlogik', () => {
  const rows = [row('a', 'endurance', 0.9, 3), row('b', 'max_strength', 0.8, 2), row('c', 'power', 0.5, 0)]

  test('alle Pflichtbereiche ausreichend und Zuverlässigkeit MODERATE: Verordnen offen; Empfohlenes darf fehlen', () => {
    const g = assessmentGate(gapOf(rows), [axis('a', 3, 10), axis('b', 2, 30)], 'MODERATE', ASOF)
    expect(g).toMatchObject({ open: true, level: 'PRESCRIBE', requiredTotal: 2, requiredOk: 2, missing: [] })
    expect(g.rows.find((r) => r.axisId === 'a')).toMatchObject({ status: 'ok', confidence: 'HIGH', required: true })
    expect(g.rows.find((r) => r.axisId === 'b')?.confidence).toBe('MODERATE')
    expect(g.rows.find((r) => r.axisId === 'c')).toMatchObject({ status: 'missing', confidence: 'INSUFFICIENT', required: false })
  })

  test('zu alt, zu wenig oder ungemessen sperrt, und die fehlenden Pflichtbereiche stehen in der Liste', () => {
    const stale = assessmentGate(gapOf(rows), [axis('a', 3, GATE_MAX_AGE_DAYS + 1), axis('b', 2, 30)], 'HIGH', ASOF)
    expect(stale.open).toBe(false)
    expect(stale.missing.map((m) => [m.axisId, m.status])).toEqual([['a', 'stale']])
    const thin = assessmentGate(gapOf([row('a', 'endurance', 0.9, 1), row('b', 'max_strength', 0.8, 0)]), [axis('a', 1, 5)], 'HIGH', ASOF)
    expect(thin.missing.map((m) => m.status).sort()).toEqual(['missing', 'thin'])
    expect(thin.level).toBe('EXPLAIN')
  })

  test('niedrige Gesamtzuverlässigkeit sperrt trotz voller Abdeckung; die Hälfte ergibt Analysieren', () => {
    const all = [axis('a', 3, 10), axis('b', 2, 30)]
    expect(assessmentGate(gapOf(rows), all, 'LOW', ASOF)).toMatchObject({ open: false, level: 'EXPLAIN' })
    const half = assessmentGate(gapOf([row('a', 'endurance', 0.9, 3), row('b', 'max_strength', 0.8, 0)]), [axis('a', 3, 10)], 'MODERATE', ASOF)
    expect(half).toMatchObject({ open: false, level: 'ANALYZE', requiredOk: 1, requiredTotal: 2 })
  })

  test('ohne Pflichtbereich öffnet nichts', () => {
    expect(assessmentGate(gapOf([row('c', 'power', 0.5, 5)]), [axis('c', 5, 1)], 'HIGH', ASOF).open).toBe(false)
  })
})

test.describe('Bewertungstor: Bildschirm', () => {
  test('mit einer einzigen Messung gesperrt mit Liste und Weg zu den Tests; Abdeckung als Anzahl', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'judo'
      data.athletes[0].results = data.athletes[0].results.slice(0, 1)
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/pruefung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('plan-gate')).toBeVisible()
    await expect(page.getByTestId('gate-level-EXPLAIN')).toHaveAttribute('data-reached', 'true')
    await expect(page.getByTestId('gate-level-PRESCRIBE')).toHaveAttribute('data-reached', 'false')
    await expect(page.getByTestId('gate-closed')).toBeVisible()
    await expect(page.getByTestId('gate-profile')).toContainText(/von \d+ Pflichtbereichen/)
    await expect(page.getByTestId('gate-profile')).not.toContainText('%')
    await expect(page.locator('[data-testid^="gate-missing-"]').first()).toBeVisible()
    await expect(page.getByTestId('gate-plan-tests')).toHaveAttribute('href', '/diagnostik')
  })

  test('das Demo-Profil zeigt je Bereich Status und Zuverlässigkeit', async ({ page }) => {
    await openDemo(page)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      data.athletes[0].profile.disciplineId = 'judo'
      localStorage.setItem('kydon.data.v1', JSON.stringify(data))
    })
    await page.goto('/plan/pruefung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('gate-overall')).toBeVisible()
    const rows = page.locator('[data-testid^="gate-row-"]')
    expect(await rows.count()).toBeGreaterThan(2)
    for (const s of await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-status')))) expect(['ok', 'thin', 'stale', 'missing']).toContain(s)
    await expect(page.getByTestId('gate-overall')).toContainText('Datenzuverlässigkeit')
  })
})
