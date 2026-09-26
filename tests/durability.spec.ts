import { expect, test } from '@playwright/test'
import { openDemo, openGuest } from './helpers'
import { durabilityPoints, durabilitySeries, DURABILITY_MIN_CHANGE_PP } from '../src/domain/durability'
import { runInsights, type InsightContext } from '../src/domain/insightEngine'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * Ermüdungsresistenz aus Tests (Master-Spezifikation D4) und der
 * Belastungsbildschirm (D6).
 */

const TODAY = '2026-09-26'
function day(offset: number): string {
  return new Date(Date.parse(`${TODAY}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)
}

function result(slug: string, values: Record<string, number>, offsetDays: number, metrics: Record<string, number> = {}, score = 1): StoredResult {
  const at = `${day(offsetDays)}T10:00:00.000Z`
  return {
    id: `${slug}-${offsetDays}`,
    testSlug: slug,
    performedAt: at,
    values,
    metrics,
    score,
    bodyWeightKg: 80,
    ageYears: 30,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    protocol: { version: null, method: null, tester: '', deviation: '', abortReason: '', invalidAttempts: [] },
    photo: null,
    createdAt: at,
  }
}

const circuit = (set1: number, set4: number, offset: number) =>
  result('fatigue_circuit_4x30s', { repsSet1: set1, repsSet2: set1 - 1, repsSet3: set1 - 2, repsSet4: set4, rpe: 9 }, offset, {}, set1 * 4)

function ctx(results: StoredResult[]): InsightContext {
  return {
    today: TODAY,
    axes: [],
    results,
    assessments: [],
    profile: { sex: 'male', birthDate: '1995-01-01' },
    diary: [],
    workouts: [],
    decisions: [],
    observations: [],
    meals: [],
    nutrition: { pal: 1.55, weightRateBand: null },
    can: () => true,
  }
}

test.describe('Erhalt je Quelle', () => {
  test('Zirkel: Satz 4 in Prozent von Satz 1', () => {
    const [p] = durabilityPoints([circuit(20, 15, -1)])
    expect(p.retentionPct).toBe(75)
    expect(p.unit).toBe('reps')
  })

  test('Sprint: letzter in Prozent vom höchsten', () => {
    const [p] = durabilityPoints([result('repeated_sprint_bike', { peakPowerW: 1000, lastSprintPowerW: 820, sprintCount: 6, rpe: 10 }, -1)])
    expect(p.retentionPct).toBe(82)
  })

  test('SJFT: Wurfrate Serie C gegen Serie A', () => {
    // A: 6 Würfe in 15 s = 0,4/s; C: 10 Würfe in 30 s = 0,333/s → 83,3 %.
    const [p] = durabilityPoints([result('special_judo_fitness_test', { throwsA: 6, throwsB: 11, throwsC: 10, hrEnd: 180, hrAfter1min: 150 }, -1)])
    expect(p.retentionPct).toBe(83.3)
  })

  test('Brick: frische 5-km-Pace gegen Pace nach dem Rad — nur mit frischem Lauf in 56 Tagen', () => {
    const fresh = result('run_5k', { durationSeconds: 1200 }, -30, { avg_pace_s_per_km: 240 })
    const brick = result('brick_bike_run', { durationSeconds: 3600 + 1500, bikeMinutes: 60, runDistanceM: 5000 }, -1, { avg_pace_s_per_km: 300 })
    const [p] = durabilityPoints([fresh, brick])
    expect(p.retentionPct).toBe(80)
    expect(p.freshResultId).toBe(fresh.id)
    const stale = result('run_5k', { durationSeconds: 1200 }, -90, { avg_pace_s_per_km: 240 })
    expect(durabilityPoints([stale, brick])).toHaveLength(0)
  })

  test('ein Satz mit niedriger Anstrengung zählt nicht', () => {
    const low = result('fatigue_circuit_4x30s', { repsSet1: 20, repsSet2: 19, repsSet3: 18, repsSet4: 19, rpe: 4 }, -1, {}, 76)
    expect(durabilityPoints([low])).toHaveLength(0)
  })
})

test.describe('Verlauf gegen die eigene Streuung', () => {
  test('ohne sechs Messungen kein Urteil', () => {
    const pts = durabilityPoints([circuit(20, 15, -50), circuit(20, 15, -40), circuit(20, 14, -30)])
    expect(durabilitySeries(pts, 'fatigue_circuit_4x30s').verdict).toBe('unknown')
  })

  test('ein einzelner schlechter Wert ist kein Rückgang', () => {
    const base = [15, 15, 16, 15].map((s4, i) => circuit(20, s4, -100 + i * 10))
    const pts = durabilityPoints([...base, circuit(20, 16, -20), circuit(20, 10, -5)])
    expect(durabilitySeries(pts, 'fatigue_circuit_4x30s').verdict).toBe('within_noise')
  })

  test('zwei Werte jenseits der Schwelle: Rückgang, und die Regel greift', () => {
    const base = [15, 15, 16, 15].map((s4, i) => circuit(20, s4, -100 + i * 10))
    const results = [...base, circuit(20, 12, -20), circuit(20, 11, -5)]
    const s = durabilitySeries(durabilityPoints(results), 'fatigue_circuit_4x30s')
    expect(s.verdict).toBe('worsened')
    expect(s.detectablePp).toBeGreaterThanOrEqual(DURABILITY_MIN_CHANGE_PP)
    const hits = runInsights(ctx(results), []).active.filter((i) => i.ruleId === 'durability_worsened')
    expect(hits).toHaveLength(1)
    expect(hits[0].evidence).toHaveLength(2)
    // Ohne Freischaltung schweigt die Regel.
    expect(runInsights({ ...ctx(results), can: () => false }, []).active.filter((i) => i.ruleId === 'durability_worsened')).toHaveLength(0)
  })
})

test.describe('Im Bildschirm', () => {
  test('Belastung: Summen, zwölf Wochen und Kennzahlen mit Datenlage', async ({ page }) => {
    await openDemo(page)
    await page.goto('/belastung', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('load-sums')).toBeVisible()
    await expect(page.getByTestId('load-sums').getByTestId('metric-meta').first()).toBeVisible()
    expect(await page.locator('[data-week]').count()).toBe(12)
    await expect(page.getByTestId('load-week-detail')).toBeVisible()
    const text = await page.locator('main').innerText()
    for (const word of ['Verletzungsrisiko hoch', 'Sweet Spot', 'gefährlich']) expect(text).not.toContain(word)
  })

  test('ohne passende Tests erklärt die Ermüdungsresistenz, woher die Zahl kommt', async ({ page }) => {
    await openGuest(page)
    await page.goto('/belastung', { waitUntil: 'domcontentloaded' })
    const panel = page.getByTestId('durability')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('link', { name: /Ermüdungszirkel/ })).toBeVisible()
  })
})
