import { expect, test } from '@playwright/test'
import { DEFAULT_RETEST_DAYS, nextTests } from '../src/domain/nextTest'
import type { StoredResult } from '../src/lib/store/localStore'

const asOf = new Date('2026-06-01T12:00:00.000Z')
const daysAgo = (days: number) => new Date(asOf.getTime() - days * 86_400_000).toISOString()

const result = (testSlug: string, performedAt: string, values: Record<string, number> = { x: 1 }): StoredResult =>
  ({
    id: `${testSlug}-${performedAt}`,
    testSlug,
    performedAt,
    values,
    metrics: {},
    score: Object.values(values)[0],
    bodyWeightKg: 78,
    ageYears: 28,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: performedAt,
  }) as StoredResult

const base = {
  disciplineId: 'judo',
  additionalDisciplineIds: [] as string[],
  goalKey: null,
  sex: 'male' as const,
  birthDate: '1998-01-01',
  reminderIntervalDays: {},
}

test.describe('Nächster Test', () => {
  test('ein nie gemessener Kerntest steht vor einem frisch gemessenen', () => {
    const fresh = { ...result('special_judo_fitness_test', daysAgo(3)), metrics: { sjft_index: 12 } }
    const list = nextTests({ ...base, results: [fresh] }, asOf)
    const sjft = list.find((s) => s.slug === 'special_judo_fitness_test')!
    const grip = list.find((s) => s.slug === 'grip_strength')!
    expect(grip.reasons).toContain('never_measured')
    expect(sjft.reasons).not.toContain('never_measured')
    expect(list.indexOf(grip)).toBeLessThan(list.indexOf(sjft))
  })

  test('nach dem Abstand wird ein Test fällig — und der Grund steht dabei', () => {
    const list = nextTests(
      { ...base, results: [result('special_judo_fitness_test', daysAgo(DEFAULT_RETEST_DAYS + 5))] },
      asOf,
    )
    const sjft = list.find((s) => s.slug === 'special_judo_fitness_test')!
    expect(sjft.reasons).toContain('overdue')
    expect(sjft.daysSince).toBe(DEFAULT_RETEST_DAYS + 5)
  })

  test('ein eigener Abstand je Test gilt vor der Vorgabe', () => {
    const list = nextTests(
      {
        ...base,
        reminderIntervalDays: { special_judo_fitness_test: 90 },
        results: [result('special_judo_fitness_test', daysAgo(60))],
      },
      asOf,
    )
    expect(list.find((s) => s.slug === 'special_judo_fitness_test')!.reasons).not.toContain('overdue')
  })

  test('ein Ergebnis mit Vorbehalt drängt auf Wiederholung', () => {
    // Maximaltest, nicht ausbelastet (RPE 5) — die Datenqualität sagt «mit Vorbehalt».
    const list = nextTests(
      { ...base, results: [result('back_squat_1rm', daysAgo(3), { loadKg: 120, reps: 1, rpe: 5 })] },
      asOf,
    )
    // Die Kniebeuge ist kein Judotest — sie taucht nur auf, wenn sie im Pool ist.
    const squat = list.find((s) => s.slug === 'back_squat_1rm')
    if (squat) expect(squat.reasons).toContain('questionable_last')
    const fitness = nextTests(
      { ...base, disciplineId: 'general_fitness', results: [result('back_squat_1rm', daysAgo(3), { loadKg: 120, reps: 1, rpe: 5 })] },
      asOf,
    )
    expect(fitness.find((s) => s.slug === 'back_squat_1rm')!.reasons).toContain('questionable_last')
  })

  test('das Ziel gewichtet: Wettkampf zieht Sportarttests vor, Fitness die universellen', () => {
    const competition = nextTests({ ...base, goalKey: 'competition', results: [] }, asOf)
    const fitness = nextTests({ ...base, goalKey: 'fitness', results: [] }, asOf)
    expect(competition.find((s) => s.slug === 'special_judo_fitness_test')!.reasons).toContain('goal_fit')
    expect(competition.find((s) => s.slug === 'cooper_12min')!.reasons).not.toContain('goal_fit')
    expect(fitness.find((s) => s.slug === 'cooper_12min')!.reasons).toContain('goal_fit')
  })

  test('jeder Vorschlag nennt mindestens einen Grund oder steht ganz hinten', () => {
    const list = nextTests({ ...base, results: [] }, asOf)
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].reasons.length).toBeGreaterThan(0)
    expect(list[0].score).toBeGreaterThanOrEqual(list[list.length - 1].score)
  })
})
