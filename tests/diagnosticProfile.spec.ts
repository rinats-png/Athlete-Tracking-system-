import { expect, test } from '@playwright/test'
import {
  START_RECOMMENDATION_COUNT,
  UNIVERSAL_TEST_SLUGS,
  buildDiagnosticProfile,
} from '../src/domain/diagnosticProfile'
import { getTest } from '../src/data/testCatalog'
import type { StoredResult } from '../src/lib/store/localStore'

const result = (testSlug: string): StoredResult =>
  ({
    id: `${testSlug}-1`,
    testSlug,
    performedAt: '2026-05-01T09:00:00.000Z',
    values: { x: 1 },
    metrics: {},
    score: 1,
    bodyWeightKg: 78,
    ageYears: 28,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    photo: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: '2026-05-01T09:00:00.000Z',
  }) as StoredResult

test.describe('Diagnostikprofil', () => {
  test('für Judo stehen die Judotests und die vier universellen bereit', () => {
    const profile = buildDiagnosticProfile({ disciplineId: 'judo', sex: 'male', birthDate: '1998-01-01', results: [] })
    const slugs = profile.ranked.map((t) => t.slug)
    expect(slugs).toContain('special_judo_fitness_test')
    for (const slug of UNIVERSAL_TEST_SLUGS) expect(slugs).toContain(slug)
    expect(profile.recommendedStart).toHaveLength(START_RECOMMENDATION_COUNT)
    expect(profile.recommendedStart.length + profile.further.length).toBe(profile.ranked.length)
  })

  test('zum Start empfohlen wird, was das Profil trägt und eine Referenz hat', () => {
    const profile = buildDiagnosticProfile({ disciplineId: 'judo', sex: 'male', birthDate: '1998-01-01', results: [] })
    const sjft = profile.ranked.find((t) => t.slug === 'special_judo_fitness_test')!
    expect(sjft.reasons).toContain('core')
    expect(sjft.reasons).toContain('reference')
    expect(profile.recommendedStart.map((t) => t.slug)).toContain('special_judo_fitness_test')
  })

  test('was schon gemessen ist, steht nicht mehr zum Start', () => {
    const profile = buildDiagnosticProfile({
      disciplineId: 'judo',
      sex: 'male',
      birthDate: '1998-01-01',
      results: [result('special_judo_fitness_test')],
    })
    expect(profile.recommendedStart.map((t) => t.slug)).not.toContain('special_judo_fitness_test')
    expect(profile.ranked.find((t) => t.slug === 'special_judo_fitness_test')?.measured).toBe(true)
  })

  test('ohne Sportart bleiben die universellen Tests', () => {
    const profile = buildDiagnosticProfile({ disciplineId: null, sex: null, birthDate: null, results: [] })
    expect(profile.ranked.map((t) => t.slug).sort()).toEqual([...UNIVERSAL_TEST_SLUGS].sort())
  })

  test('ein Labortest steht nie vor einem Feldtest derselben Rolle', () => {
    for (const disciplineId of ['road_race', 'freestyle', 'marathon']) {
      const profile = buildDiagnosticProfile({ disciplineId, sex: 'male', birthDate: '1998-01-01', results: [] })
      const firstLab = profile.ranked.findIndex((t) => getTest(t.slug)?.setting === 'lab')
      if (firstLab < 0) continue
      const coreField = profile.ranked.findIndex((t) => t.role === 'core' && getTest(t.slug)?.setting !== 'lab')
      expect(coreField, disciplineId).toBeLessThan(firstLab)
    }
  })
})
