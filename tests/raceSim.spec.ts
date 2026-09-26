import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'
import { combatBreakdown, hyroxBreakdown } from '../src/domain/raceSim'
import { runInsights, type InsightContext } from '../src/domain/insightEngine'
import { deriveMetrics } from '../src/lib/metrics/derive'
import { getTest } from '../src/data/testCatalog'
import { HYROX_STATIONS } from '../src/data/testCatalogRaceSim'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * HYROX-Simulation und Kampfsport-Runden (Master-Spezifikation D7):
 * Zerlegung, Laufabfall, Stationen gegen den eigenen Median — und kein
 * Urteil ohne eigene Streuung.
 */

const TODAY = '2026-09-26'
const day = (o: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + o * 86_400_000).toISOString().slice(0, 10)

function stored(slug: string, values: Record<string, number>, offset: number): StoredResult {
  const at = `${day(offset)}T10:00:00.000Z`
  const def = getTest(slug)!
  const metrics = deriveMetrics(def, values, { bodyWeightKg: 80, ageYears: 30, sex: 'male' })
  return {
    id: `${slug}${offset}`,
    testSlug: slug,
    performedAt: at,
    values,
    metrics,
    score: metrics[def.primaryMetric] ?? null,
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

/** Läufe 1–8 und Stationen; `late` verlangsamt die Läufe 7–8, `sled` die Schlitten-Station. */
function sim(offset: number, { late = 300, sled = 180 }: { late?: number; sled?: number } = {}) {
  const v: Record<string, number> = {}
  ;[280, 285, 290, 290, 295, 295, late, late].forEach((s, i) => (v[`run${i + 1}Seconds`] = s))
  const station: Record<string, number> = { skiErg: 260, sledPush: sled, sledPull: 200, burpeeBroadJump: 270, row: 270, farmersCarry: 110, sandbagLunges: 240, wallBalls: 330 }
  for (const s of HYROX_STATIONS) v[`${s}Seconds`] = station[s]
  v.roxzoneSeconds = 420
  return stored('hyrox_simulation', v, offset)
}

function ctx(results: StoredResult[], can = () => true): InsightContext {
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
    can,
  }
}

test.describe('HYROX-Simulation', () => {
  test('Kennzahlen: Gesamtzeit, Lauf- und Stationszeit, Laufabfall', () => {
    const r = sim(-1, { late: 320 })
    expect(r.metrics.run_total_s).toBe(280 + 285 + 290 + 290 + 295 + 295 + 320 + 320)
    expect(r.metrics.total_time_s).toBe((r.metrics.run_total_s as number) + (r.metrics.station_total_s as number) + 420)
    // (320 − 282,5) / 282,5 = 13,3 %
    expect(r.metrics.run_decay_percent).toBe(13.3)
  })

  test('erste Simulation: Anteile und grösster Anteil, aber kein Urteil', () => {
    const b = hyroxBreakdown([sim(-1)])!
    expect(b.priorSims).toBe(0)
    expect(b.largestShare).toBe('wallBalls')
    expect(b.ownLimiter).toBeNull()
    expect(b.stations.every((s) => s.verdict === 'no_history')).toBe(true)
    expect(b.stations.reduce((a, s) => a + s.sharePct, 0)).toBeLessThan(100)
  })

  test('mit wenigen früheren Simulationen: Abweichung als Zahl, ohne Urteil', () => {
    const b = hyroxBreakdown([sim(-60), sim(-30), sim(-1, { sled: 240 })])!
    const sled = b.stations.find((s) => s.station === 'sledPush')!
    expect(sled.deltaPct).toBe(33.3)
    expect(sled.verdict).toBe('within_noise')
    expect(b.ownLimiter).toBeNull()
  })

  test('ab vier früheren Simulationen: langsamer nur jenseits der eigenen Streuung', () => {
    const prior = [178, 182, 180, 181].map((s, i) => sim(-120 + i * 20, { sled: s }))
    const b = hyroxBreakdown([...prior, sim(-1, { sled: 215 })])!
    expect(b.ownLimiter).toBe('sledPush')
    const run = runInsights(ctx([...prior, sim(-1, { sled: 215 })]), []).active
    expect(run.filter((i) => i.ruleId === 'hyrox_station_slower')).toHaveLength(1)
    const calm = hyroxBreakdown([...prior, sim(-1, { sled: 183 })])!
    expect(calm.ownLimiter).toBeNull()
  })

  test('Laufabfall-Regel: zwei Simulationen jenseits der Streuung, nur mit Sportanalyse', () => {
    const base = [300, 302, 299, 301].map((l, i) => sim(-150 + i * 25, { late: l }))
    const results = [...base, sim(-30, { late: 330 }), sim(-2, { late: 335 })]
    expect(runInsights(ctx(results), []).active.filter((i) => i.ruleId === 'hyrox_run_decay')).toHaveLength(1)
    // Keine Doppelung über die allgemeine Durability-Regel.
    expect(runInsights(ctx(results), []).active.filter((i) => i.ruleId === 'durability_worsened')).toHaveLength(0)
    expect(runInsights(ctx(results, () => false), []).active.filter((i) => i.ruleId === 'hyrox_run_decay')).toHaveLength(0)
  })
})

test.describe('Kampfsport-Runden', () => {
  test('Rundenabfall: letzte gegen erste Runde', () => {
    const r = stored('combat_rounds', { round1Actions: 60, round2Actions: 55, round3Actions: 48, roundSeconds: 180, restSeconds: 60 }, -1)
    expect(r.metrics.total_actions).toBe(163)
    expect(r.metrics.round_decay_percent).toBe(20)
    const b = combatBreakdown([r])!
    expect(b.rounds).toEqual([60, 55, 48])
    expect(b.decayPct).toBe(20)
  })

  test('im Bildschirm: Runden erfassen, dann zerlegt sehen', async ({ page }) => {
    await openGuest(page)
    await page.goto('/sportanalyse', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('start-hyrox_simulation')).toBeVisible()
    await expect(page.getByTestId('start-combat_rounds')).toBeVisible()

    await page.goto('/tests/combat_rounds', { waitUntil: 'domcontentloaded' })
    await page.getByRole('spinbutton', { name: 'Runde 1', exact: true }).fill('60')
    await page.getByRole('spinbutton', { name: 'Runde 2', exact: true }).fill('55')
    await page.getByRole('spinbutton', { name: 'Runde 3', exact: true }).fill('48')
    await page.getByRole('spinbutton', { name: 'Rundenlänge' }).fill('180')
    await page.getByRole('spinbutton', { name: 'Pause zwischen den Runden' }).fill('60')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    await page.goto('/sportanalyse', { waitUntil: 'domcontentloaded' })
    const panel = page.getByTestId('combat-rounds')
    await expect(panel).toBeVisible()
    await expect(panel.getByText(/Letzte gegen erste Runde: −20/)).toBeVisible()
  })
})
