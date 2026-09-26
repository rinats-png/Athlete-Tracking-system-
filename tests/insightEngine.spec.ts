import { expect, test } from '@playwright/test'
import { applyInsightAction, runInsights, type InsightContext, type InsightRule } from '../src/domain/insightEngine'
import { readinessContext, median, robustScale } from '../src/domain/readinessContext'
import { loadSummary, loadSpike } from '../src/domain/load'
import type { StoredDiaryEntry, StoredResult } from '../src/lib/store/localStore'

/**
 * Insight Engine (Spezifikation G) und Tageskontext (D5).
 *
 * Die kritischen Fälle der Spezifikation (O2): gleiche Regel erneut in zwei
 * Tagen → kein Duplikat; kein Einzelwert-Alarm; kein Rückgang aus einer
 * einzelnen Messung.
 */

const TODAY = '2026-09-26'
function day(offset: number): string {
  return new Date(Date.parse(`${TODAY}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)
}

function result(slug: string, score: number, offsetDays: number, extra: Partial<StoredResult> = {}): StoredResult {
  const at = `${day(offsetDays)}T10:00:00.000Z`
  return {
    id: `${slug}-${offsetDays}`,
    testSlug: slug,
    performedAt: at,
    values: {},
    metrics: {},
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
    ...extra,
  }
}

function diaryDay(offset: number, patch: Partial<StoredDiaryEntry>): StoredDiaryEntry {
  const d = day(offset)
  return {
    id: `d${offset}`,
    day: d,
    weightKg: null,
    sleepHours: null,
    sleepQuality: null,
    energy: null,
    stress: null,
    soreness: null,
    steps: null,
    adherence: null,
    sessions: [],
    note: '',
    createdAt: `${d}T08:00:00.000Z`,
    updatedAt: `${d}T08:00:00.000Z`,
    ...patch,
  }
}

function ctx(patch: Partial<InsightContext> = {}): InsightContext {
  return {
    today: TODAY,
    axes: [],
    results: [],
    assessments: [],
    profile: { sex: 'male', birthDate: '1995-01-01' },
    diary: [],
    workouts: [],
    decisions: [],
    observations: [],
    meals: [],
    nutrition: { pal: 1.55, weightRateBand: null },
    can: () => true,
    ...patch,
  }
}

const onlyRule = (id: string, c: InsightContext, state = []) =>
  runInsights(c, state).active.filter((i) => i.ruleId === id)

test.describe('Regeln', () => {
  test('Rückgang nur, wenn beide jüngsten Messungen ausserhalb des Rauschens unter dem früheren Median liegen', () => {
    // Stabile Serie mit kleiner Streuung, dann zwei deutliche Rückgänge (Sprung, höher ist besser).
    const stable = [200, 202, 199, 201, 200].map((s, i) => result('standing_broad_jump', s, -200 + i * 20))
    const one = [...stable, result('standing_broad_jump', 185, -60)]
    expect(onlyRule('performance_regression', ctx({ results: one }))).toHaveLength(0)
    const two = [...one, result('standing_broad_jump', 170, -10)]
    const hits = onlyRule('performance_regression', ctx({ results: two }))
    expect(hits).toHaveLength(1)
    expect(hits[0].evidence).toHaveLength(2)
    expect(hits[0].whyNow).toBe('two_declines_beyond_noise')
  })

  test('Bestleistung nur bei gültiger, junger Messung', () => {
    const series = [result('standing_broad_jump', 200, -100), result('standing_broad_jump', 210, -3)]
    expect(onlyRule('performance_pr', ctx({ results: series }))).toHaveLength(1)
    const old = [result('standing_broad_jump', 200, -100), result('standing_broad_jump', 210, -40)]
    expect(onlyRule('performance_pr', ctx({ results: old }))).toHaveLength(0)
  })

  test('Belastungsspitze gegen die eigene übliche Woche', () => {
    const diary: StoredDiaryEntry[] = []
    for (let i = 35; i >= 7; i--) diary.push(diaryDay(-i, { sessions: [{ id: `s${i}`, kind: 'strength', durationMin: 60, rpe: 5, note: '' }] }))
    for (let i = 6; i >= 0; i--) diary.push(diaryDay(-i, { sessions: [{ id: `s${i}`, kind: 'strength', durationMin: 90, rpe: 7, note: '' }] }))
    const summary = loadSummary(diary, TODAY)
    expect(summary.typicalWeek).toBe(2100)
    expect(loadSpike(summary).spike).toBe(true)
    expect(onlyRule('load_spike_review', ctx({ diary }))).toHaveLength(1)
    // Ohne Freischaltung schweigt die Regel.
    expect(onlyRule('load_spike_review', ctx({ diary, can: () => false }))).toHaveLength(0)
  })

  test('Schlaf: kein Einzelwert-Alarm, erst mehrere Tage', () => {
    const diary: StoredDiaryEntry[] = []
    for (let i = 30; i >= 4; i--) diary.push(diaryDay(-i, { sleepHours: 7.5 + ((i % 3) - 1) * 0.25 }))
    // Nur eine kurze Nacht.
    const single = [...diary, diaryDay(-3, { sleepHours: 7.5 }), diaryDay(-2, { sleepHours: 7.5 }), diaryDay(-1, { sleepHours: 7.5 }), diaryDay(0, { sleepHours: 5 })]
    expect(onlyRule('sleep_deviation', ctx({ diary: single }))).toHaveLength(0)
    // Drei kurze Nächte in Folge.
    const three = [...diary, diaryDay(-3, { sleepHours: 7.5 }), diaryDay(-2, { sleepHours: 5.5 }), diaryDay(-1, { sleepHours: 5.5 }), diaryDay(0, { sleepHours: 5 })]
    expect(onlyRule('sleep_deviation', ctx({ diary: three }))).toHaveLength(1)
  })

  test('eine fehlerhafte Regel nimmt die übrigen nicht mit', () => {
    const broken: InsightRule = { id: 'broken', version: '1', category: 'performance', severity: 'info', cooldownDays: 1, evaluate: () => { throw new Error('x') } }
    const fine: InsightRule = { id: 'fine', version: '1', category: 'performance', severity: 'info', cooldownDays: 1, evaluate: () => [{ values: {}, evidence: [], whyNow: 'x', confidence: 1 }] }
    const run = runInsights(ctx(), [], [broken, fine])
    expect(run.active.map((i) => i.ruleId)).toEqual(['fine'])
  })
})

test.describe('Zustand', () => {
  const rule: InsightRule = {
    id: 'demo',
    version: '1.0.0',
    category: 'performance',
    severity: 'notice',
    cooldownDays: 7,
    evaluate: () => [
      { subject: 'a', values: {}, evidence: [], whyNow: 'x', confidence: 0.5 },
      { subject: 'a', values: {}, evidence: [], whyNow: 'x', confidence: 0.5 },
    ],
  }

  test('derselbe Befund zweimal ergibt einen Hinweis', () => {
    expect(runInsights(ctx(), [], [rule]).active).toHaveLength(1)
  })

  test('verworfen: ruht während der Sperrfrist, danach wieder da', () => {
    const insight = runInsights(ctx(), [], [rule]).active[0]
    const state = applyInsightAction([], insight, 'dismiss', 7, new Date(`${TODAY}T12:00:00Z`))
    expect(runInsights(ctx(), state, [rule]).active).toHaveLength(0)
    expect(runInsights(ctx(), state, [rule]).suppressed).toBe(1)
    // Zwei Tage später: gleiche Regel, kein Duplikat, weiter ausgeblendet.
    expect(runInsights(ctx({ today: day(2) }), state, [rule]).active).toHaveLength(0)
    // Nach der Sperrfrist wird neu bewertet.
    expect(runInsights(ctx({ today: day(8) }), state, [rule]).active).toHaveLength(1)
  })

  test('bestätigt: steht unter «Erledigt», nicht mehr offen', () => {
    const insight = runInsights(ctx(), [], [rule]).active[0]
    expect(insight.state).toBe('new')
    const seen = applyInsightAction([], insight, 'seen', 7)
    expect(runInsights(ctx(), seen, [rule]).active[0].state).toBe('seen')
    const acked = applyInsightAction(seen, insight, 'acknowledge', 7, new Date(`${TODAY}T12:00:00Z`))
    const run = runInsights(ctx(), acked, [rule])
    expect(run.active).toHaveLength(0)
    expect(run.acknowledged).toHaveLength(1)
    expect(acked).toHaveLength(1)
  })
})

test.describe('Tageskontext', () => {
  test('robuste Bandbreite: Median und MAD', () => {
    expect(median([1, 2, 3, 100])).toBe(2.5)
    expect(robustScale([10, 10, 10, 10])).toBe(0)
    expect(robustScale([1, 2, 3, 4, 5])).toBeCloseTo(1.4826, 3)
  })

  test('Komponenten gegen die eigene Bandbreite, Marker nur in der zählenden Richtung', () => {
    const diary: StoredDiaryEntry[] = []
    for (let i = 20; i >= 1; i--) diary.push(diaryDay(-i, { sleepHours: 7 + (i % 2) * 0.5, energy: 3 + (i % 2), stress: 2 }))
    diary.push(diaryDay(0, { sleepHours: 5, energy: 4, stress: 5 }))
    const c = readinessContext(diary, [], TODAY)
    const sleep = c.components.find((x) => x.key === 'sleepHours')!
    expect(sleep.status).toBe('below')
    expect(sleep.marker).toBe(true)
    const stress = c.components.find((x) => x.key === 'stress')!
    expect(stress.status).toBe('above')
    expect(stress.marker).toBe(true)
    const energy = c.components.find((x) => x.key === 'energy')!
    expect(energy.marker).toBe(false)
    expect(c.markers).toBe(2)
    expect(c.metric.algorithmVersion).toBe('1.0.0')
  })

  test('zu wenig Vorlauf: keine Bandbreite, keine Aussage', () => {
    const diary = [diaryDay(-2, { sleepHours: 7 }), diaryDay(-1, { sleepHours: 7 }), diaryDay(0, { sleepHours: 4 })]
    const c = readinessContext(diary, [], TODAY)
    expect(c.components.find((x) => x.key === 'sleepHours')!.status).toBe('insufficient')
    expect(c.markers).toBe(0)
  })
})
