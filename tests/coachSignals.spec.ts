import { expect, test } from '@playwright/test'
import { groupHeatmap, PATTERN_MIN_ATHLETES } from '../src/domain/groupHeatmap'
import { coachProof } from '../src/domain/coachProof'
import {
  AVAILABILITY_DROP_POINTS,
  NEWCOMER_DAYS,
  availabilitySignals,
  newcomerSignals,
} from '../src/domain/availability'
import { emptyData } from '../src/lib/store/schema'
import { getTest } from '../src/data/testCatalog'
import { deriveMetrics, primaryValue } from '../src/lib/metrics/derive'
import type { StoredAssessment, StoredAthlete, StoredResult } from '../src/lib/store/localStore'

/**
 * Die drei Trainersignale: Heatmap, Wirksamkeitsnachweis, Verfügbarkeit und
 * Neuzugang. Gemeinsam bewachen diese Fälle eine Grenze: jedes Signal ist
 * ein Hinweis mit Nenner und Grund — nie ein Urteil über eine Person und
 * nie eine Trainingsfreigabe.
 */

const asOf = new Date('2026-05-01T12:00:00.000Z')

const result = (slug: string, day: string, score: number): StoredResult =>
  ({
    id: `${slug}-${day}-${score}`,
    testSlug: slug,
    performedAt: `${day}T09:00:00.000Z`,
    values: {},
    metrics: {},
    score,
    bodyWeightKg: 80,
    ageYears: 28,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    photo: null,
    createdAt: `${day}T09:00:00.000Z`,
  }) as StoredResult

const athlete = (id: string, over: Partial<StoredAthlete> = {}, profile: Partial<StoredAthlete['profile']> = {}): StoredAthlete => {
  const base = emptyData().athletes[0]
  return {
    ...base,
    id,
    name: id,
    ...over,
    profile: { ...base.profile, sex: 'male', birthDate: '1998-01-01', disciplineId: 'judo', sportCategoryId: 'combat', ...profile },
  }
}

/**
 * Ein Ergebnis mit abgeleiteten Kennzahlen — so, wie es die App speichert.
 * Ohne Kennzahlen zahlt ein Ergebnis auf keine Achse ein, und die Heatmap
 * bliebe leer, obwohl gemessen wurde.
 */
const measured = (slug: string, day: string, values: Record<string, number>): StoredResult => {
  const test = getTest(slug)!
  const metrics = deriveMetrics(test, values, { bodyWeightKg: 80, ageYears: 28, sex: 'male' })
  return { ...result(slug, day, primaryValue(test, values, metrics) as number), values, metrics }
}
/**
 * Ein Cooper-Wert, der in der Bevölkerungsreferenz tief liegt; einer, der
 * hoch liegt. Ein Perzentil gegen die Bevölkerung gibt es in dieser App
 * nur, wo eine Kohorte mit Streuung publiziert ist — beim VO₂max, also
 * beim Cooper-Test. Griffkraft hat eine Ankerreferenz ohne Streuung und
 * bleibt deshalb ohne Perzentil («ohne Referenz» in der Heatmap, nicht
 * «nicht gemessen»). Die Ausdauer ist beim 5-km-Lauf die Achse mit
 * Anforderung 1,0; beim Judo wäre sie gar keine Achse.
 */
const RUNNER = { disciplineId: 'run_5k_discipline', sportCategoryId: 'running' } as const
const lowCooper = (day = '2026-04-10') => measured('cooper_12min', day, { distanceM: 1500, maxHeartRate: 185, rpe: 9 })
const highCooper = (day = '2026-04-10') => measured('cooper_12min', day, { distanceM: 3400, maxHeartRate: 185, rpe: 9 })

test.describe('Gruppen-Heatmap', () => {
  test('Athleten werden nach Disziplin gruppiert, grösste Gruppe zuerst', () => {
    const groups = groupHeatmap(
      [athlete('a'), athlete('b'), athlete('c', {}, { disciplineId: 'marathon', sportCategoryId: 'running' })],
      asOf,
    )
    expect(groups[0].disciplineId).toBe('judo')
    expect(groups[0].athletes).toHaveLength(2)
    expect(groups[1].disciplineId).toBe('marathon')
  })

  test('der Spaltenfuss trägt den Nenner: offen von eingeordnet', () => {
    const groups = groupHeatmap(
      [
        athlete('a', { results: [lowCooper()] }, RUNNER),
        athlete('b', { results: [highCooper()] }, RUNNER),
        athlete('c', {}, RUNNER), // nichts gemessen
      ],
      asOf,
    )
    const covered = groups[0].columns.filter((c) => c.covered > 0)
    expect(covered.length, 'der Cooper-Test zahlt auf die Ausdauer ein, die Achse des 5-km-Laufs').toBeGreaterThan(0)
    for (const column of covered) expect(column.covered).toBe(2)
    // Ungemessen ist kein Befund — c zählt in keinen der beiden Zähler.
    expect(groups[0].cells.filter((cell) => cell.athleteId === 'c').every((cell) => !cell.measured)).toBe(true)
  })

  test('ein Muster braucht Mindestzahl UND Anteil', () => {
    const many = Array.from({ length: PATTERN_MIN_ATHLETES }, (_, i) => athlete(`low-${i}`, { results: [lowCooper()] }, RUNNER))
    const groups = groupHeatmap(many, asOf)
    const open = groups[0].columns.filter((c) => c.openCount > 0)
    expect(open.length, '1500 m im Cooper liegen unter der Referenzmitte').toBeGreaterThan(0)
    // Vier von vier offen: ein Muster. Drei von drei: unter der Mindestzahl.
    for (const column of open) {
      expect(column.openCount).toBe(PATTERN_MIN_ATHLETES)
      expect(column.pattern).toBe(true)
    }
    expect(groups[0].patterns.length).toBeGreaterThan(0)
    const few = groupHeatmap(many.slice(0, PATTERN_MIN_ATHLETES - 1), asOf)
    expect(few[0].patterns, 'unter der Mindestzahl gibt es kein Muster').toHaveLength(0)
  })

  test('archivierte Athleten erscheinen nicht', () => {
    const groups = groupHeatmap([athlete('a'), athlete('b', { archived: true })], asOf)
    expect(groups[0].athletes.map((a) => a.id)).toEqual(['a'])
  })
})

test.describe('Wirksamkeitsnachweis', () => {
  const noisy = (base: number, gainAtEnd: number) =>
    ['2025-06-01', '2025-08-01', '2025-10-01', '2025-12-01', '2026-02-01', '2026-04-01'].map((d, i) =>
      result('grip_strength', d, i === 5 ? base + gainAtEnd : base + (i % 2)),
    )

  test('eine Veränderung zählt nur über der eigenen Streuung', () => {
    const proof = coachProof(
      [athlete('gain', { results: noisy(50, 15) }), athlete('noise', { results: noisy(50, 1) })],
      asOf,
    )
    const gain = proof.athletes.find((a) => a.athleteId === 'gain')!
    const noise = proof.athletes.find((a) => a.athleteId === 'noise')!
    expect(gain.gains).toBe(1)
    expect(noise.gains).toBe(0)
    expect(noise.withinNoise).toBe(1)
    expect(proof.athletesWithGain).toBe(1)
    expect(proof.athletesMeasured).toBe(2)
  })

  test('ein Rückgang steht genauso da wie eine Verbesserung', () => {
    const proof = coachProof([athlete('drop', { results: noisy(50, -15) })], asOf)
    expect(proof.totalDrops).toBe(1)
    expect(proof.athletesWithDrop).toBe(1)
    expect(proof.athletes[0].drops).toBe(1)
  })

  test('nur das Fenster zählt, die Streuung aber aus der ganzen Historie', () => {
    const old = result('grip_strength', '2024-01-01', 30)
    const proof = coachProof([athlete('a', { results: [old, ...noisy(50, 15)] })], asOf)
    // Der Wert von 2024 liegt ausserhalb; verglichen wird 2025-06 gegen 2026-04.
    expect(proof.athletes[0].changes[0].first).toBe(50)
    expect(proof.athletes[0].results).toBe(6)
  })

  test('ohne zwei Messungen desselben Tests gibt es nichts zu vergleichen', () => {
    const proof = coachProof([athlete('a', { results: [result('grip_strength', '2026-04-01', 50)] })], asOf)
    expect(proof.athletes[0].testsCompared).toBe(0)
    expect(proof.medianGainPercent).toBeNull()
  })

  test('die Testtabelle zählt Athleten je Test', () => {
    const proof = coachProof([athlete('a', { results: noisy(50, 15) }), athlete('b', { results: noisy(60, 20) })], asOf)
    expect(proof.tests[0].testSlug).toBe('grip_strength')
    expect(proof.tests[0].compared).toBe(2)
    expect(proof.tests[0].gains).toBe(2)
  })
})

test.describe('Verfügbarkeit', () => {
  const assessment = (day: string, fatigue: number, sleepQuality: number): StoredAssessment =>
    ({
      id: `a-${day}`,
      title: null,
      batterySlug: null,
      performedOn: day,
      status: 'completed',
      plannedTestSlugs: [],
      readiness: { sleepMinutes: null, sleepQuality, fatigue, stress: null, soreness: null, motivation: null, recordedAt: `${day}T08:00:00.000Z` },
      nextAssessmentOn: null,
      createdAt: `${day}T08:00:00.000Z`,
      completedAt: `${day}T10:00:00.000Z`,
    }) as StoredAssessment

  test('unter drei Selbsteinschätzungen gibt es keinen Trend', () => {
    const [s] = availabilitySignals([athlete('a', { assessments: [assessment('2026-03-01', 3, 8), assessment('2026-04-01', 9, 2)] })])
    expect(s.status).toBe('insufficient')
  })

  test('ein einzelner schlechter Morgen ist kein Signal — zwei Termine unter der Linie sind eines', () => {
    const good = (d: string) => assessment(d, 2, 9) // Bereitschaft hoch
    const bad = (d: string) => assessment(d, 9, 2) // Bereitschaft tief
    const oneBad = availabilitySignals([athlete('a', { assessments: [good('2026-01-01'), good('2026-02-01'), good('2026-03-01'), bad('2026-04-01')] })])[0]
    expect(oneBad.status).toBe('steady')
    const twoBad = availabilitySignals([athlete('a', { assessments: [good('2026-01-01'), good('2026-02-01'), bad('2026-03-01'), bad('2026-04-01')] })])[0]
    expect(twoBad.status).toBe('declining')
    expect(twoBad.drop).toBeGreaterThanOrEqual(AVAILABILITY_DROP_POINTS)
    expect(twoBad.baseline).not.toBeNull()
  })
})

test.describe('Neuzugang', () => {
  test('wer seine erste Messung vor kurzem hatte, ist ein Neuzugang — und schon eingeordnet', () => {
    const fresh = athlete('new', { results: [lowCooper('2026-04-20'), result('grip_strength', '2026-04-20', 45)] })
    const veteran = athlete('old', { results: [lowCooper('2025-01-10'), lowCooper('2026-04-20')] })
    const signals = newcomerSignals([fresh, veteran], asOf)
    expect(signals.map((s) => s.athleteId)).toEqual(['new'])
    expect(signals[0].daysSinceFirst).toBe(11)
    expect(signals[0].results).toBe(2)
    expect(signals[0].axesTotal).toBeGreaterThan(0)
    expect(signals[0].daysSinceFirst).toBeLessThanOrEqual(NEWCOMER_DAYS)
  })

  test('ohne Messung ist niemand ein Neuzugang — er ist ein Athlet ohne Messung', () => {
    expect(newcomerSignals([athlete('none')], asOf)).toHaveLength(0)
  })
})
