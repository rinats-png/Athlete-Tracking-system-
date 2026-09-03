import { expect, test } from '@playwright/test'
import { RATING_THRESHOLDS, rateResult, ratingFromPercentile } from '../src/domain/rating'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * Die Einordnung Schwach → Durchschnitt → Gut → Sehr gut → Elite.
 *
 * Jeder Fall hier hält fest, dass eine Stufe nur aus einer benannten Referenz
 * entsteht und die Richtung des Tests respektiert. Ein Fall, der bricht,
 * hiesse: jemand liest eine Stufe, die aus nichts entstanden ist.
 */

const result = (
  testSlug: string,
  values: Record<string, number>,
  metrics: Record<string, number> = {},
  overrides: Partial<StoredResult> = {},
): StoredResult =>
  ({
    id: `${testSlug}-1`,
    testSlug,
    performedAt: '2026-05-01T09:00:00.000Z',
    values,
    metrics,
    score: Object.values(values)[0] ?? null,
    bodyWeightKg: 78,
    ageYears: 28,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  }) as StoredResult

const male = (disciplineIds: string[] = []) => ({ sex: 'male' as const, birthDate: '1998-01-01', disciplineIds })

test.describe('Einordnung', () => {
  test('die Schwellen sind die ganzzahligen Standardabweichungen', () => {
    // −1 SD ≈ P15,9 · Mittel = P50 · +1 SD ≈ P84,1 · +2 SD ≈ P97,7
    expect(RATING_THRESHOLDS.map((t) => t.minPercentile)).toEqual([97.7, 84.1, 50, 15.9, 0])
    expect(ratingFromPercentile(10)).toBe('weak')
    expect(ratingFromPercentile(30)).toBe('average')
    expect(ratingFromPercentile(60)).toBe('good')
    expect(ratingFromPercentile(90)).toBe('very_good')
    expect(ratingFromPercentile(99)).toBe('elite')
    expect(ratingFromPercentile(null)).toBeNull()
  })

  test('Mittelwert der Athletenkohorte ergibt «Gut» an der Grenze zu Durchschnitt', () => {
    // MMA: VO₂max 63,23 ± 5,50. Der Mittelwert ist P50 — die Untergrenze von «Gut».
    const rating = rateResult(
      result('cooper_12min', { distanceM: 3000 }, { vo2max_ml_kg_min: 63.23 }),
      male(['mma']),
    )
    expect(rating.basis).toBe('percentile')
    expect(rating.level).toBe('good')
    expect(rating.comparison?.entry.cohort).toBe('athlete')
    expect(rating.metricKey).toBe('vo2max_ml_kg_min')
    // Die Bevölkerungsreferenz bleibt als Alternative erhalten (§17).
    expect(rating.alternatives.some((c) => c.entry.cohort === 'population')).toBe(true)
  })

  test('zwei Standardabweichungen über dem Athletenmittel sind Elite, zwei darunter schwach', () => {
    const high = rateResult(result('cooper_12min', { distanceM: 3500 }, { vo2max_ml_kg_min: 74.5 }), male(['mma']))
    const low = rateResult(result('cooper_12min', { distanceM: 2000 }, { vo2max_ml_kg_min: 52 }), male(['mma']))
    expect(high.level).toBe('elite')
    expect(low.level).toBe('weak')
  })

  test('bei «kleiner ist besser» ist der schnellere Wert die bessere Stufe', () => {
    // Karate-Sprint 10 m: 1,97 ± 0,06 s. 1,84 s liegt mehr als zwei SD besser.
    const fast = rateResult(result('sprint_10m', { durationSeconds: 1.84 }), male(['karate']))
    const slow = rateResult(result('sprint_10m', { durationSeconds: 2.12 }), male(['karate']))
    expect(fast.level).toBe('elite')
    expect(slow.level).toBe('weak')
  })

  test('publizierte Bänder ergeben eine Stufe, ohne ein Perzentil zu erfinden', () => {
    // SJFT: ≤ 11,73 excellent · ≤ 14,84 mittlerer Bereich · darüber very poor.
    const best = rateResult(result('special_judo_fitness_test', { throwsA: 7 }, { sjft_index: 11 }), male(['judo']))
    const mid = rateResult(result('special_judo_fitness_test', { throwsA: 6 }, { sjft_index: 13 }), male(['judo']))
    const worst = rateResult(result('special_judo_fitness_test', { throwsA: 5 }, { sjft_index: 16 }), male(['judo']))
    expect(best.basis).toBe('band')
    expect(best.comparison?.percentile).toBeNull()
    expect(best.level).toBe('elite')
    expect(mid.level).toBe('good')
    expect(worst.level).toBe('weak')
  })

  test('die Athletenkohorte der eigenen Sportart trägt die Stufe, nicht die Bevölkerung', () => {
    const rating = rateResult(result('cooper_12min', { distanceM: 3000 }, { vo2max_ml_kg_min: 55 }), male(['judo']))
    expect(rating.comparison?.entry.cohort).toBe('athlete')
    expect(rating.comparison?.entry.disciplineIds).toContain('judo')
  })

  test('ein Ankerwert allein ergibt keine Stufe', () => {
    // Griffkraft: Bevölkerungsreferenz nur als Altersgipfel-Anker.
    const rating = rateResult(result('grip_strength', { gripKg: 52 }), male())
    expect(rating.level).toBeNull()
    expect(rating.gap).toBe('anchor_only')
    expect(rating.comparison?.percentOfAnchor).toBeGreaterThan(0)
  })

  test('ohne Referenz gibt es keine Stufe — und der Grund steht dabei', () => {
    const rating = rateResult(result('plank_hold', { durationSeconds: 120 }), male())
    expect(rating.level).toBeNull()
    expect(rating.gap).toBe('no_reference')
  })

  test('ohne Geschlecht keine geschlechtsgebundene Referenz', () => {
    const rating = rateResult(
      result('grip_strength', { gripKg: 52 }, {}, { sex: 'other' }),
      { sex: 'other', birthDate: '1998-01-01', disciplineIds: [] },
    )
    expect(rating.level).toBeNull()
    expect(rating.gap).toBe('no_sex')
  })

  test('das Alter zum Messzeitpunkt zählt, nicht das heutige', () => {
    // Mit 72 Jahren gemessen: die Anker für 25–49 passen nicht, die für 70+ schon.
    const rating = rateResult(
      result('grip_strength', { gripKg: 20 }, {}, { sex: 'female', ageYears: 72 }),
      { sex: 'female', birthDate: '1954-01-01', disciplineIds: [] },
    )
    expect(rating.comparison?.entry.ageMin).toBe(70)
  })
})
