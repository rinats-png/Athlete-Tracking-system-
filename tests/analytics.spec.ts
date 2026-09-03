import { expect, test } from '@playwright/test'
import {
  MIN_TREND_POINTS,
  baselineComparisons,
  compareAssessments,
  confidenceScore,
  latestComparablePair,
  performanceBalance,
  testTrend,
} from '../src/domain/analytics'
import type { AthleteData, StoredResult } from '../src/lib/store/localStore'
import { emptyAthleteView } from './helpers'

/**
 * Die Analytik trifft Aussagen über die Entwicklung eines Menschen. Jeder
 * Fall hier hält eine Zusage fest, deren Bruch dazu führen würde, dass jemand
 * seinem Training aufgrund einer erfundenen Zahl eine andere Richtung gibt.
 */

const day = (iso: string) => `${iso}T09:00:00.000Z`

const result = (
  testSlug: string,
  performedAt: string,
  score: number,
  overrides: Partial<StoredResult> = {},
): StoredResult =>
  ({
    id: `${testSlug}-${performedAt}`,
    testSlug,
    performedAt: day(performedAt),
    values: {},
    metrics: {},
    score,
    bodyWeightKg: 82,
    ageYears: 34,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: day(performedAt),
    ...overrides,
  }) as StoredResult

test.describe('Trend', () => {
  test('unter drei Messungen gibt es keinen Trend, sondern die Zahl der Punkte', () => {
    const trend = testTrend(
      [result('back_squat_1rm', '2026-01-01', 150), result('back_squat_1rm', '2026-03-01', 170)],
      'back_squat_1rm',
    )
    expect(trend.label).toBe('insufficient')
    expect(trend.points).toBe(2)
    expect(trend.percentPer30Days).toBeNull()
    expect(MIN_TREND_POINTS).toBe(3)
  })

  test('eine steigende Serie ergibt einen steigenden Trend', () => {
    const trend = testTrend(
      [
        result('back_squat_1rm', '2026-01-01', 150),
        result('back_squat_1rm', '2026-02-01', 158),
        result('back_squat_1rm', '2026-03-01', 166),
      ],
      'back_squat_1rm',
    )
    expect(trend.label).toBe('improving')
    expect(trend.percentPer30Days).toBeGreaterThan(4)
    // Nahezu perfekt linear — das muss auch so ausgewiesen werden.
    expect(trend.rSquared).toBeGreaterThan(0.99)
    expect(trend.points).toBe(3)
  })

  test('bei Zeitmessungen bedeutet schneller besser', () => {
    // Illinois-Agility: fallende Sekunden sind eine Verbesserung.
    const trend = testTrend(
      [
        result('illinois_agility', '2026-01-01', 17.4),
        result('illinois_agility', '2026-02-01', 17.0),
        result('illinois_agility', '2026-03-01', 16.6),
      ],
      'illinois_agility',
    )
    expect(trend.label).toBe('improving')
    expect(trend.percentPer30Days).toBeGreaterThan(0)
  })

  test('ein einzelner schlechter Tag kippt einen Aufwärtstrend nicht', () => {
    // Der letzte Wert liegt unter dem vorletzten. „Letzter gegen vorletzter“
    // ergäbe hier fallend — die Regression sieht die Serie.
    const trend = testTrend(
      [
        result('back_squat_1rm', '2026-01-01', 150),
        result('back_squat_1rm', '2026-02-01', 160),
        result('back_squat_1rm', '2026-03-01', 170),
        result('back_squat_1rm', '2026-04-01', 166),
      ],
      'back_squat_1rm',
    )
    expect(trend.label).toBe('improving')
    // Die Streuung ist sichtbar geringer als bei der sauberen Serie.
    expect(trend.rSquared).toBeLessThan(0.95)
  })

  test('gleichbleibende Leistung ist stabil, nicht steigend', () => {
    const trend = testTrend(
      [
        result('back_squat_1rm', '2026-01-01', 160),
        result('back_squat_1rm', '2026-02-01', 160.5),
        result('back_squat_1rm', '2026-03-01', 159.8),
      ],
      'back_squat_1rm',
    )
    expect(trend.label).toBe('stable')
  })

  test('drei Messungen am selben Tag ergeben keinen Zeitverlauf', () => {
    const trend = testTrend(
      [
        result('back_squat_1rm', '2026-01-01', 150, { id: 'a' }),
        result('back_squat_1rm', '2026-01-01', 160, { id: 'b' }),
        result('back_squat_1rm', '2026-01-01', 170, { id: 'c' }),
      ],
      'back_squat_1rm',
    )
    expect(trend.label).toBe('insufficient')
  })
})

test.describe('Erste gegen letzte Messung', () => {
  test('Veränderung und Zeitraum stehen zusammen', () => {
    const [row] = baselineComparisons([
      result('back_squat_1rm', '2026-01-01', 150),
      result('back_squat_1rm', '2026-02-01', 160),
      result('back_squat_1rm', '2026-03-02', 165),
    ])
    expect(row.changePercent).toBe(10)
    expect(row.daysBetween).toBe(60)
    expect(row.baseline.score).toBe(150)
    expect(row.current.score).toBe(165)
  })

  test('ein Test mit nur einer Messung erscheint nicht', () => {
    expect(baselineComparisons([result('back_squat_1rm', '2026-01-01', 150)])).toEqual([])
  })

  test('schneller geworden zählt als Verbesserung', () => {
    const [row] = baselineComparisons([
      result('illinois_agility', '2026-01-01', 18),
      result('illinois_agility', '2026-03-01', 17.1),
    ])
    expect(row.changePercent).toBe(5)
  })
})

test.describe('Terminvergleich', () => {
  const data: AthleteData = {
    ...emptyAthleteView(),
    assessments: [
      {
        id: 'a1', title: 'Januar', batterySlug: null, performedOn: '2026-01-10',
        status: 'completed', plannedTestSlugs: [], readiness: null, nextAssessmentOn: null, createdAt: day('2026-01-10'),
        completedAt: day('2026-01-10'),
      },
      {
        id: 'a2', title: 'April', batterySlug: null, performedOn: '2026-04-10',
        status: 'completed', plannedTestSlugs: [], readiness: null, nextAssessmentOn: null, createdAt: day('2026-04-10'),
        completedAt: day('2026-04-10'),
      },
    ],
    results: [
      result('back_squat_1rm', '2026-01-10', 150, { id: 'r1', assessmentId: 'a1' }),
      result('back_squat_1rm', '2026-04-10', 165, { id: 'r2', assessmentId: 'a2' }),
      result('cooper_12min', '2026-01-10', 3000, { id: 'r3', assessmentId: 'a1' }),
      result('standing_broad_jump', '2026-04-10', 2.4, { id: 'r4', assessmentId: 'a2' }),
    ],
  }

  test('Tests aus nur einem Termin werden gekennzeichnet, nicht weggelassen', () => {
    const rows = compareAssessments(data, 'a1', 'a2')
    expect(rows).toHaveLength(3)

    const cooper = rows.find((r) => r.testSlug === 'cooper_12min')
    expect(cooper?.onlyIn).toBe('before')
    expect(cooper?.changePercent).toBeNull()

    const jump = rows.find((r) => r.testSlug === 'standing_broad_jump')
    expect(jump?.onlyIn).toBe('after')

    const squat = rows.find((r) => r.testSlug === 'back_squat_1rm')
    expect(squat?.onlyIn).toBeNull()
    expect(squat?.changePercent).toBe(10)
  })

  test('vorgeschlagen wird das jüngste vergleichbare Paar, älter zuerst', () => {
    const pair = latestComparablePair(data.assessments)
    expect(pair?.[0].id).toBe('a1')
    expect(pair?.[1].id).toBe('a2')
  })

  test('ohne zwei abgeschlossene Termine gibt es keinen Vorschlag', () => {
    expect(latestComparablePair([data.assessments[0]])).toBeNull()
    expect(
      latestComparablePair([
        data.assessments[0],
        { ...data.assessments[1], status: 'in_progress' },
      ]),
    ).toBeNull()
  })
})

test.describe('Belastbarkeit', () => {
  const asOf = new Date('2026-05-01T12:00:00.000Z')

  test('ohne Daten ist die Belastbarkeit null, nicht unbestimmt', () => {
    const { score, components } = confidenceScore([], asOf)
    expect(score).toBe(0)
    expect(components).toHaveLength(4)
  })

  test('jede Komponente ist mit ihrem Beleg nachvollziehbar', () => {
    const { components } = confidenceScore(
      [result('back_squat_1rm', '2026-04-20', 160), result('back_squat_1rm', '2026-04-25', 165)],
      asOf,
    )
    const byKey = Object.fromEntries(components.map((c) => [c.key, c]))
    // Kniebeuge zahlt auf Maxkraft und Relativkraft ein: 2 von 6 Achsen.
    expect(byKey.coverage.detail).toEqual({ covered: 2, total: 6 })
    // Sechs Tage alt — voll aktuell.
    expect(byKey.recency.value).toBe(1)
    expect(byKey.recency.detail.days).toBe(6)
    expect(byKey.depth.detail).toEqual({ deepEnough: 2, total: 6 })
  })

  test('eine alte Messung senkt die Aktualität, ohne sie zu verwerfen', () => {
    const alt = confidenceScore([result('back_squat_1rm', '2025-01-01', 160)], asOf)
    const recency = alt.components.find((c) => c.key === 'recency')!
    expect(recency.value).toBeGreaterThan(0)
    expect(recency.value).toBeLessThan(0.5)
  })

  test('die Gesamtzahl ist das Mittel der offengelegten Anteile', () => {
    const { score, components } = confidenceScore(
      [result('back_squat_1rm', '2026-04-25', 165)],
      asOf,
    )
    const mean = components.reduce((sum, c) => sum + c.value, 0) / components.length
    expect(score).toBe(Math.round(mean * 100))
  })
})

test.describe('Ausgewogenheit', () => {
  test('ungemessene Achsen zählen nicht als schwach', () => {
    const report = performanceBalance([
      { axisId: 'max_strength', score: 80 },
      { axisId: 'endurance', score: 70 },
      { axisId: 'power', score: null },
    ])
    expect(report.spread).toBe(10)
    expect(report.balance).toBe(90)
    expect(report.weakest?.axisId).toBe('endurance')
    expect(report.unmeasured).toEqual(['power'])
  })

  test('unter zwei belegten Achsen gibt es keine Ausgewogenheit', () => {
    const report = performanceBalance([
      { axisId: 'max_strength', score: 80 },
      { axisId: 'endurance', score: null },
    ])
    expect(report.balance).toBeNull()
    expect(report.unmeasured).toEqual(['endurance'])
  })
})

test.describe('Analyse-Bildschirm', () => {
  test('zeigt Belastbarkeit, Ausgewogenheit und Terminvergleich', async ({ page }) => {
    const { openDemo } = await import('./helpers')
    await openDemo(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1, name: /Wo bin ich stark/ })).toBeVisible()

    // Die Belastbarkeit steht nicht als nackte Zahl da, sondern mit ihren
    // vier Bestandteilen — sonst müsste man ihr blind glauben.
    // exact: true — die Testabdeckung je Achse trägt einen Namen, der
    // «Abdeckung» als Teilzeichenkette enthält.
    await expect(page.getByRole('meter', { name: 'Abdeckung', exact: true })).toBeVisible()
    await expect(page.getByRole('meter', { name: 'Aktualität' })).toBeVisible()
    await expect(page.getByRole('meter', { name: 'Datenqualität' })).toBeVisible()
    await expect(page.getByRole('meter', { name: 'Messtiefe' })).toBeVisible()
    await expect(page.getByText(/von 6 Achsen/).first()).toBeVisible()

    // Entwicklung seit der ersten Messung
    await expect(page.getByRole('columnheader', { name: 'Veränderung' }).first()).toBeVisible()
    await expect(page.getByText(/Messungen, \d+ Tage, R²/).first()).toBeVisible()

    // Terminvergleich mit zwei Auswahlfeldern
    await expect(page.getByLabel('Vorher')).toBeVisible()
    await expect(page.getByLabel('Nachher')).toBeVisible()
  })

  test('ohne Messungen wird nichts ausgewertet statt eine leere Tabelle zu zeigen', async ({ page }) => {
    const { openGuest } = await import('./helpers')
    await openGuest(page)
    await page.goto('/analyse', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Noch nichts auszuwerten')).toBeVisible()
  })
})
