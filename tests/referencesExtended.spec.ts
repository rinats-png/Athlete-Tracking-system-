import { expect, test } from '@playwright/test'
import { REFERENCES, REFERENCE_GAPS, compareToReferences } from '../src/data/references'
import { EXTENDED_REFERENCES } from '../src/data/referencesExtended'
import { getTest, TEST_CATALOG } from '../src/data/testCatalog'
import { rateResult } from '../src/domain/rating'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * Die Ergänzungen aus der erweiterten Quelltabelle.
 *
 * Geprüft wird nicht, dass die Zahlen dastehen — das sagt die Datei selbst.
 * Geprüft wird, was aus ihnen FOLGT: dass eine Sechzehnjährige an ihrer
 * Altersklasse gemessen wird und nicht an einer Erwachsenentabelle, dass
 * eine bei P50 beginnende Perzentiltabelle unterdurchschnittliche Werte
 * nicht zum Median erklärt, und dass die neuen Tests rechnen, was ihre
 * Quelle vorschreibt.
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
    bodyWeightKg: 80,
    ageYears: 25,
    sex: 'male',
    attempts: [],
    attemptSelection: null,
    photo: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    assessmentId: null,
    createdAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  }) as StoredResult

const context = (disciplineIds: string[]) => ({
  sex: 'male' as const,
  birthDate: null,
  disciplineIds,
})

test.describe('SJFT nach Altersklasse', () => {
  test('ein Kadett wird an der Kadettentabelle gemessen, nicht an der Erwachsenentabelle', () => {
    const cadet = rateResult(
      result('special_judo_fitness_test', {}, { sjft_index: 12.5, totalThrows: 27 }, { ageYears: 16 }),
      context(['judo']),
    )
    expect(cadet.comparison?.entry.cohortLabel.de).toContain('Kadetten')

    const senior = rateResult(
      result('special_judo_fitness_test', {}, { sjft_index: 12.5, totalThrows: 27 }, { ageYears: 25 }),
      context(['judo']),
    )
    expect(senior.comparison?.entry.cohortLabel.de).not.toContain('Kadetten')
  })

  test('die Juniorentabelle nennt alle fünf Stufen, die anderen nur die äusseren', () => {
    const juniors = EXTENDED_REFERENCES.find(
      (e) => e.metricKey === 'sjft_index' && e.cohortLabel.de.includes('Junioren'),
    )
    expect(juniors?.bands).toHaveLength(5)

    const cadets = EXTENDED_REFERENCES.find(
      (e) => e.metricKey === 'sjft_index' && e.cohortLabel.de.includes('Kadetten'),
    )
    expect(cadets?.bands).toHaveLength(3)
    // Was die Quelle nicht benennt, heisst «Mittlerer Bereich» und nicht «Good».
    expect(cadets?.bands?.[1].label.de).toBe('Mittlerer Bereich')
  })

  test('ein Sechzehnjähriger bekommt keine zwei widersprechenden Judo-Tabellen', () => {
    const rating = rateResult(
      result('special_judo_fitness_test', {}, { sjft_index: 12.5 }, { ageYears: 16 }),
      context(['judo']),
    )
    const judoIndexTables = [rating.comparison, ...rating.alternatives].filter(
      (c) => c?.entry.metricKey === 'sjft_index',
    )
    expect(judoIndexTables).toHaveLength(1)
  })
})

test.describe('Klassifikationen für vorhandene Tests', () => {
  test('die Cooper-Originalnormen stufen nach Alter', () => {
    const [young] = compareToReferences('cooper_12min', 'distanceM', 2200, 'higher_is_better', 'male', 25, null)
    const [older] = compareToReferences('cooper_12min', 'distanceM', 2200, 'higher_is_better', 'male', 45, null)
    // Dieselben 2200 m: mit 25 Jahren Durchschnitt, mit 45 überdurchschnittlich.
    // Die Originaltabelle staffelt nach Dekade, und das ist der ganze Punkt.
    expect(young.band?.label.de).toBe('Durchschnittlich')
    expect(older.band?.label.de).toBe('Überdurchschnittlich')
  })

  test('die Ringer-Wurfzahl bekommt sieben Stufen', () => {
    const entry = EXTENDED_REFERENCES.find((e) => e.testSlug === 'special_wrestling_fitness_test')
    expect(entry?.bands).toHaveLength(7)
    const [top] = compareToReferences(
      'special_wrestling_fitness_test',
      'totalThrows',
      36,
      'higher_is_better',
      'male',
      25,
      'wrestling',
    )
    expect(top.band?.label.de).toBe('Superior')
  })
})

test.describe('Perzentiltabellen mit eigenen Stützstellen', () => {
  test('unterhalb der belegten Reihe gibt es kein Perzentil statt eines geklemmten', () => {
    const acsm = REFERENCES.filter(
      (e) => e.method === 'percentiles' && e.percentileAnchors && e.sex === 'male',
    )
    expect(acsm.length).toBeGreaterThan(0)

    // 45 liegt unter dem kleinsten belegten Wert (P50 = 48,0).
    const below = compareToReferences('*', 'vo2max_ml_kg_min', 45, 'higher_is_better', 'male', 25, null).find(
      (c) => c.entry.percentileAnchors != null,
    )
    expect(below?.percentile, 'unter P50 darf die Tabelle nichts sagen').toBeNull()

    // Innerhalb der Reihe rechnet sie normal.
    const inside = compareToReferences('*', 'vo2max_ml_kg_min', 55.2, 'higher_is_better', 'male', 25, null).find(
      (c) => c.entry.percentileAnchors != null,
    )
    expect(inside?.percentile).toBeCloseTo(75, 1)
  })

  test('die Standardreihe klemmt weiterhin an den Rändern', () => {
    const standard = REFERENCES.find((e) => e.method === 'percentiles' && !e.percentileAnchors)
    if (!standard) return
    const far = compareToReferences(
      standard.testSlug,
      standard.metricKey,
      standard.values![0] - 1000,
      'higher_is_better',
      standard.sex === 'all' ? 'male' : standard.sex,
      30,
      standard.disciplineIds?.[0] ?? null,
    ).find((c) => c.entry === standard)
    expect(far?.percentile).not.toBeNull()
  })
})

test.describe('Neue Tests', () => {
  test('alle fünf sind im Katalog und vollständig eingeordnet', () => {
    for (const slug of [
      'swim_css_test',
      'gi_grip_hang',
      'hand_release_push_up',
      'sprint_drag_carry',
      'run_2_mile',
    ]) {
      const test_ = getTest(slug)
      expect(test_, slug).toBeTruthy()
      expect(test_!.dimensionMetrics, slug).not.toEqual({})
    }
  })

  test('die kritische Schwimmgeschwindigkeit rechnet nach der Formel der Quelle', () => {
    const css = getTest('swim_css_test')!
    const out: Record<string, number> = {}
    css.derive!(
      { time400S: 360, time200S: 170 },
      { bodyWeightKg: 80, ageYears: 30, sex: 'male' },
      (k, v) => {
        if (v != null) out[k] = v
      },
      css,
    )
    // (360 − 170) / 2 = 95 s pro 100 m.
    expect(out.css_pace_s_100m).toBeCloseTo(95, 5)
    expect(out.css_speed_m_s).toBeCloseTo(100 / 95, 5)
  })

  test('eine 400er-Zeit unter dem Doppelten der 200er ergibt keinen Wert statt eines unsinnigen', () => {
    const css = getTest('swim_css_test')!
    const out: Record<string, number> = {}
    css.derive!(
      { time400S: 300, time200S: 320 },
      { bodyWeightKg: 80, ageYears: 30, sex: 'male' },
      (k, v) => {
        if (v != null) out[k] = v
      },
      css,
    )
    expect(out.css_pace_s_100m).toBeUndefined()
  })

  test('der 2-Meilen-Lauf rechnet die Pace auf den Kilometer', () => {
    const run = getTest('run_2_mile')!
    const out: Record<string, number> = {}
    run.derive!(
      { durationSeconds: 805 },
      { bodyWeightKg: 80, ageYears: 30, sex: 'male' },
      (k, v) => {
        if (v != null) out[k] = v
      },
      run,
    )
    expect(out.avg_pace_s_km).toBeCloseTo(805 / 3.21869, 2)
  })

  test('die Griffausdauer am Anzug ist ein eigener Test, nicht eine Variante des Hangs', () => {
    // Beide messen Sekunden, aber gegen verschiedene Referenzen: der eine an
    // der Stange, der andere am Stoff.
    const gi = compareToReferences('gi_grip_hang', 'durationSeconds', 45, 'higher_is_better', 'male', 25, 'bjj')
    const bar = compareToReferences('grip_hang_time', 'durationSeconds', 45, 'higher_is_better', 'male', 25, 'bjj')
    expect(gi.length).toBeGreaterThan(0)
    expect(gi.some((c) => bar.some((b) => b.entry === c.entry))).toBe(false)
  })

  test('jeder neue Test steht bei mindestens einer Sportart', async () => {
    const { DISCIPLINES } = await import('../src/data/sportProfiles')
    for (const slug of [
      'swim_css_test',
      'gi_grip_hang',
      'hand_release_push_up',
      'sprint_drag_carry',
      'run_2_mile',
    ]) {
      const used = DISCIPLINES.some((d) => d.tests.some((t) => t.slug === slug))
      expect(used, `${slug} steht bei keiner Sportart`).toBe(true)
    }
  })
})

test.describe('Was bewusst draussen blieb', () => {
  test('jede weggelassene Zeile nennt ihren Grund', () => {
    for (const subject of [
      'Schlagkraft',
      'SWPT-Index',
      'Kreuzheben',
      'KSAT',
      'HYROX',
    ]) {
      const gap = REFERENCE_GAPS.find((g) => g.subject.includes(subject))
      expect(gap, subject).toBeTruthy()
      expect(gap!.reason.length, subject).toBeGreaterThan(80)
    }
  })

  test('der Katalog führt keinen Test ohne beschreibbares Protokoll', () => {
    for (const slug of ['karate_specific_aerobic_test', 'taaa_test', 'punch_force']) {
      expect(TEST_CATALOG.some((t) => t.slug === slug), slug).toBe(false)
    }
  })
})
