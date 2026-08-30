import { expect, test } from '@playwright/test'
import {
  AXIS_GAP_THRESHOLD,
  RETEST_AFTER_DAYS,
  limiters,
  nextAssessment,
  recommendations,
  strengths,
  testsForDimension,
} from '../src/domain/insights'
import type { RadarAxis } from '../src/types/domain'
import type { StoredAssessment, StoredResult } from '../src/lib/store/localStore'

/**
 * Diese Datei bewacht drei Grenzen, die BASELINE nicht überschreiten darf:
 * keine medizinische Aussage, keine erfundene Wissenschaft, kein
 * Trainingsplan. Sie prüft ausserdem, dass jeder Hinweis nur so stark
 * auftritt, wie er belegt ist.
 */

const axis = (dimension: string, score: number | null): RadarAxis =>
  ({
    dimension,
    score,
    testCount: score == null ? 0 : 1,
    latestPerformedAt: score == null ? null : '2026-04-01T09:00:00.000Z',
    hasData: score != null,
  }) as RadarAxis

const result = (
  testSlug: string,
  performedAt: string,
  score: number,
  overrides: Partial<StoredResult> = {},
): StoredResult =>
  ({
    id: `${testSlug}-${performedAt}`,
    testSlug,
    performedAt: `${performedAt}T09:00:00.000Z`,
    values: {},
    metrics: {},
    score,
    bodyWeightKg: 82,
    ageYears: 34,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    createdAt: `${performedAt}T09:00:00.000Z`,
    ...overrides,
  }) as StoredResult

const fullProfile = { sex: 'male', birthDate: '1992-01-01' }
const asOf = new Date('2026-05-01T12:00:00.000Z')

test.describe('Limiter und Stärken', () => {
  const axes = [
    axis('max_strength', 80),
    axis('relative_strength', 78),
    axis('power', 76),
    axis('endurance', 50),
  ]
  const results = [
    result('back_squat_1rm', '2026-04-01', 165),
    result('back_squat_1rm', '2026-04-10', 168),
    result('cooper_12min', '2026-04-01', 2600),
  ]

  test('die deutlich schwächere Achse wird gefunden', () => {
    const found = limiters(axes, results)
    expect(found.map((f) => f.dimension)).toEqual(['endurance'])
    expect(found[0].gapToMean).toBeLessThan(-AXIS_GAP_THRESHOLD)
    // Eine Achse mit einer Messung darf nicht als gut belegt auftreten.
    expect(found[0].evidence).toBe('weak')
    expect(found[0].measurements).toBe(1)
  })

  test('verglichen wird gegen die übrigen Achsen, nicht gegen das Gesamtmittel', () => {
    // Gesamtmittel wäre 71, Mittel der übrigen 78. Der Abstand muss der
    // grössere sein, sonst erschiene die Achse künstlich weniger schwach.
    const found = limiters(axes, results)
    expect(found[0].gapToMean).toBeCloseTo(50 - 78, 1)
  })

  test('unter drei belegten Achsen wird nichts behauptet', () => {
    expect(limiters([axis('max_strength', 80), axis('endurance', 40)], results)).toEqual([])
    expect(strengths([axis('max_strength', 80), axis('endurance', 40)], results)).toEqual([])
  })

  test('ungemessene Achsen sind keine Limiter', () => {
    const withGap = [...axes, axis('agility', null)]
    expect(limiters(withGap, results).map((f) => f.dimension)).not.toContain('agility')
  })

  test('eine deutlich stärkere Achse wird als Stärke erkannt', () => {
    const found = strengths(
      [axis('power', 90), axis('max_strength', 60), axis('endurance', 58)],
      results,
    )
    expect(found.map((f) => f.dimension)).toEqual(['power'])
  })
})

test.describe('Hinweise', () => {
  test('fehlender Vergleichskontext steht ganz oben', () => {
    const list = recommendations([], [], { sex: null, birthDate: null }, asOf)
    expect(list[0].kind).toBe('add_profile_data')
  })

  test('ungemessene Achsen werden mit konkreten Tests vorgeschlagen', () => {
    const list = recommendations([], [], fullProfile, asOf)
    const missing = list.filter((r) => r.kind === 'measure_missing_axis')
    expect(missing).toHaveLength(6)
    for (const item of missing) {
      expect(item.suggestedTestSlugs.length).toBeGreaterThan(0)
      // Der Vorschlag muss wirklich auf diese Achse einzahlen.
      expect(testsForDimension(item.dimension!)).toContain(item.suggestedTestSlugs[0])
    }
  })

  test('eine veraltete Messung wird zur Wiederholung vorgeschlagen', () => {
    const stale = recommendations(
      [],
      [result('back_squat_1rm', '2025-11-01', 165)],
      fullProfile,
      asOf,
    ).find((r) => r.kind === 'retest_stale')
    expect(stale).toBeTruthy()
    expect(stale!.values.days).toBeGreaterThan(RETEST_AFTER_DAYS)
    expect(stale!.suggestedTestSlugs).toEqual(['back_squat_1rm'])
  })

  test('eine frische Messung wird nicht zur Wiederholung vorgeschlagen', () => {
    const list = recommendations(
      [],
      [result('back_squat_1rm', '2026-04-20', 165)],
      fullProfile,
      asOf,
    )
    expect(list.some((r) => r.kind === 'retest_stale')).toBe(false)
  })

  test('die Datenlage kommt vor der inhaltlichen Beobachtung', () => {
    const axes = [
      axis('max_strength', 80),
      axis('relative_strength', 78),
      axis('power', 76),
      axis('endurance', 40),
    ]
    const list = recommendations(
      axes,
      [result('back_squat_1rm', '2026-04-20', 165), result('cooper_12min', '2026-04-20', 2400)],
      fullProfile,
      asOf,
    )
    const limiterIndex = list.findIndex((r) => r.kind === 'address_limiter')
    const dataIndex = list.findIndex((r) => r.kind === 'measure_missing_axis')
    expect(limiterIndex).toBeGreaterThan(dataIndex)
  })

  test('kein Hinweis formuliert eine Trainings- oder Gesundheitsanweisung', () => {
    // Die Texte stehen in der Übersetzung; hier wird geprüft, dass der
    // Datentyp gar keinen Platz für eine Anweisung vorsieht: nur Regelart,
    // Belege und Testvorschläge aus dem eigenen Katalog.
    const list = recommendations(
      [axis('max_strength', 80), axis('power', 78), axis('endurance', 40)],
      [result('back_squat_1rm', '2026-04-20', 165)],
      fullProfile,
      asOf,
    )
    for (const item of list) {
      expect(Object.keys(item).sort()).toEqual(
        ['dimension', 'evidence', 'kind', 'priority', 'suggestedTestSlugs', 'values'].sort(),
      )
      for (const slug of item.suggestedTestSlugs) {
        expect(testsForDimension(item.dimension!)).toContain(slug)
      }
    }
  })
})

test.describe('Nächster Termin', () => {
  const completed: StoredAssessment = {
    id: 'a1',
    title: null,
    batterySlug: null,
    performedOn: '2026-03-01',
    status: 'completed',
    plannedTestSlugs: [],
    createdAt: '2026-03-01T09:00:00.000Z',
    completedAt: '2026-03-01T18:00:00.000Z',
  }

  test('gerechnet wird ab der letzten abgeschlossenen Diagnostik', () => {
    const next = nextAssessment([completed], [], asOf)
    expect(next.basis).toBe('last_assessment')
    expect(next.date).toBe('2026-05-30')
    expect(next.overdue).toBe(false)
  })

  test('ein laufender Termin ist keine Grundlage', () => {
    const next = nextAssessment(
      [{ ...completed, status: 'in_progress', completedAt: null }],
      [result('back_squat_1rm', '2026-03-01', 165)],
      asOf,
    )
    expect(next.basis).toBe('last_result')
  })

  test('ein überschrittener Termin wird als überfällig gekennzeichnet', () => {
    const next = nextAssessment([{ ...completed, performedOn: '2025-06-01' }], [], asOf)
    expect(next.overdue).toBe(true)
  })

  test('ohne jede Grundlage wird kein Datum erfunden', () => {
    const next = nextAssessment([], [], asOf)
    expect(next.date).toBeNull()
    expect(next.basis).toBe('none')
  })
})

test.describe('Hinweise im Bildschirm', () => {
  test('jede Aussage trägt ihre Belegstärke sichtbar mit', async ({ page }) => {
    const { openDemo } = await import('./helpers')
    await openDemo(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Auffälligkeiten')).toBeVisible()
    await expect(page.getByText(/gut belegt|eingeschränkt belegt|schwach belegt/).first()).toBeVisible()
    await expect(page.getByText('Nächster Termin')).toBeVisible()
    // Die Herleitung des Terminvorschlags steht dabei, nicht in einer Fussnote.
    await expect(page.getByText(/Voreinstellung dieser App|letzte Messung/).first()).toBeVisible()
  })
})
