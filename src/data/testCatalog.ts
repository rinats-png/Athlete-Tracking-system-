import type { PerformanceDimension, ScoringDirection, TestCategory } from '@/types/domain'
import type { DeriveContext, PutMetric } from './testDerive'

/**
 * Testkatalog als Client-Daten.
 *
 * Spiegelt `public.test_definitions` samt Übersetzungen aus der Datenbank. Die
 * Doppelung ist beabsichtigt: der Gastmodus speichert ausschliesslich lokal und
 * muss ohne Netz und ohne Konto vollständig funktionieren — inklusive
 * Testauswahl, Protokolltexten und Metrikberechnung.
 *
 * Einzige Quelle der Wahrheit bleibt die Migration
 * `20260829120800_seed_test_catalog.sql`. Ändert sich dort etwas, ist diese
 * Datei mitzuziehen; der Test `catalog.spec.ts` vergleicht beide Seiten
 * über die Slugs.
 */

import {
  AGILITY_TESTS,
  CONDITIONING_TESTS,
  ENDURANCE_TESTS,
  JUMP_TESTS,
  REPEATED_JUMP,
  SPEED_TESTS,
  STRENGTH_TESTS,
} from './testCatalogAdditions'
import { SPORT_SPECIFIC_TESTS } from './testCatalogSportSpecific'
import { DOCUMENT_TESTS } from './testCatalogDocument'
import { vo2maxFromBeepTest, vo2maxFromCooper } from '@/lib/metrics'
import { deriveRowing } from './testDeriveShared'

export type FieldType = 'number' | 'integer' | 'duration' | 'rpe' | 'stages'

export interface TestField {
  key: string
  type: FieldType
  unit?: string
  required: boolean
  min?: number
  max?: number
  step?: number
}

export type ProtocolMode = 'countdown' | 'stopwatch' | 'amrap' | 'attempts' | 'stages'

export interface TestDefinition {
  slug: string
  category: TestCategory
  dimension: PerformanceDimension
  /** Achse -> Metrik, aus der der Achsenwert gebildet wird. */
  dimensionMetrics: Partial<Record<PerformanceDimension, string>>
  direction: ScoringDirection
  /** Metrik, die als Primärergebnis in der Liste erscheint. */
  primaryMetric: string
  primaryUnit: string
  fields: TestField[]
  protocol: { mode: ProtocolMode; durationSeconds?: number; targetDistanceM?: number; attempts?: number }
  requiresBodyWeight: boolean
  /**
   * `lab`: braucht Geräte oder Personal, die ausserhalb eines Instituts
   * selten verfügbar sind (Ergometer mit Drehmomentmessung, Laktatanalyse).
   * Solche Tests stehen zur Verfügung, sind aber nie Voraussetzung für ein
   * vollständiges Profil — sonst wäre das Profil für die meisten Nutzer
   * grundsätzlich unvollständig. Fehlt die Angabe, gilt `field`.
   */
  setting?: 'field' | 'lab'
  derivedMetrics: string[]
  /**
   * Kennzahlen dieses Tests aus seinen Rohwerten.
   *
   * Steht bewusst neben `fields`: die Kennzahl gehört zu den Feldern, aus
   * denen sie entsteht. Was für jeden Test mit denselben Feldern gilt
   * (Relativkraft, Pace, Watt je Kilogramm), rechnet `deriveMetrics`
   * gemeinsam — hier steht nur, was diesen Test ausmacht.
   */
  derive?: (
    values: Record<string, number>,
    ctx: DeriveContext,
    put: PutMetric,
    test: TestDefinition,
  ) => void
  sortOrder: number
  name: { de: string; en: string }
  shortName: { de: string; en: string }
  summary: { de: string; en: string }
  instructions: { de: string; en: string }
  equipment: { de: string; en: string }
}

const HR_RPE: TestField[] = [
  { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
]

export const TEST_CATALOG: TestDefinition[] = [
  {
    slug: 'cooper_12min',
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'vo2max_ml_kg_min' },
    direction: 'higher_is_better',
    primaryMetric: 'distanceM',
    primaryUnit: 'm',
    fields: [{ key: 'distanceM', type: 'number', unit: 'm', required: true, min: 500, max: 6000, step: 10 }, ...HR_RPE],
    protocol: { mode: 'countdown', durationSeconds: 720 },
    requiresBodyWeight: false,
    derivedMetrics: ['vo2max_ml_kg_min'],
    derive: (values, _ctx, put) => {
    put('vo2max_ml_kg_min', vo2maxFromCooper(values.distanceM))
    },
    sortOrder: 10,
    name: { de: 'Cooper-Test (12 Minuten)', en: 'Cooper Test (12 minutes)' },
    shortName: { de: 'Cooper', en: 'Cooper' },
    summary: {
      de: 'Maximal zurückgelegte Distanz in 12 Minuten. Robuster Feldtest zur Schätzung der VO2max.',
      en: 'Maximum distance covered in 12 minutes. A robust field test for estimating VO2max.',
    },
    instructions: {
      de: 'Nach lockerem Einlaufen 12 Minuten in gleichmässig maximalem Tempo laufen. Distanz auf 10 m genau erfassen.',
      en: 'After a light warm-up, run for 12 minutes at an evenly paced maximum effort. Record distance to the nearest 10 m.',
    },
    equipment: { de: 'Laufbahn oder vermessene Strecke, Stoppuhr', en: 'Running track or measured course, stopwatch' },
  },
  {
    slug: 'beep_test_20m',
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'vo2max_ml_kg_min' },
    direction: 'higher_is_better',
    primaryMetric: 'level',
    primaryUnit: 'Level',
    fields: [
      { key: 'level', type: 'number', unit: 'Level', required: true, min: 1, max: 21, step: 0.5 },
      { key: 'shuttle', type: 'integer', unit: 'Shuttle', required: false, min: 1, max: 16 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stages' },
    requiresBodyWeight: false,
    derivedMetrics: ['vo2max_ml_kg_min'],
    derive: (values, ctx, put) => {
    put('vo2max_ml_kg_min', vo2maxFromBeepTest(values.level, ctx.ageYears ?? 30))
    },
    sortOrder: 20,
    name: { de: '20 m Shuttle Run (Beep-Test)', en: '20 m Shuttle Run (Beep Test)' },
    shortName: { de: 'Beep-Test', en: 'Beep Test' },
    summary: {
      de: 'Stufentest über 20 m bis zur Ausbelastung. Ergebnis ist die erreichte Stufe.',
      en: 'Incremental 20 m shuttle test to exhaustion. The result is the level reached.',
    },
    instructions: {
      de: 'Bei jedem Signalton die 20-m-Linie erreichen. Test endet, wenn die Linie zweimal in Folge verfehlt wird.',
      en: 'Reach the 20 m line on every beep. The test ends after missing the line twice in a row.',
    },
    equipment: { de: '20 m markierte Strecke, Audio-Protokoll', en: '20 m marked course, audio protocol' },
  },
  {
    slug: 'row_2000m',
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', required: true, min: 300, max: 900 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch', targetDistanceM: 2000 },
    requiresBodyWeight: true,
    derivedMetrics: ['avg_pace_s_per_500m', 'avg_power_w', 'watts_per_kg'],
    derive: deriveRowing,
    sortOrder: 40,
    name: { de: '2000 m Rudern', en: '2000 m Row' },
    shortName: { de: '2k Row', en: '2k Row' },
    summary: {
      de: 'Klassischer Ruderergometer-Test über 2000 m. Misst anaerobe Kapazität und Ausdauerleistung.',
      en: 'The classic 2000 m rowing ergometer test. Measures anaerobic capacity and endurance.',
    },
    instructions: {
      de: 'Damper 4–6, nach Einrudern 2000 m auf Zeit. Splits alle 500 m notieren.',
      en: 'Damper 4–6, row 2000 m for time after warm-up. Record 500 m splits.',
    },
    equipment: { de: 'Ruderergometer (Concept2 o. ä.)', en: 'Rowing ergometer (Concept2 or similar)' },
  },
  ...(
    [
      ['back_squat_1rm', 'Kniebeuge (Back Squat) 1RM', 'Back Squat 1RM', 'Squat', 'Squat', 110, 400],
      ['deadlift_1rm', 'Kreuzheben (Deadlift) 1RM', 'Deadlift 1RM', 'Deadlift', 'Deadlift', 120, 450],
      ['bench_press_1rm', 'Bankdrücken (Bench Press) 1RM', 'Bench Press 1RM', 'Bench', 'Bench', 130, 300],
    ] as const
  ).map<TestDefinition>(([slug, nameDe, nameEn, shortDe, shortEn, sort, maxLoad]) => ({
    slug,
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: { max_strength: 'one_rm_kg', relative_strength: 'relative_strength_bw' },
    direction: 'higher_is_better',
    primaryMetric: 'one_rm_kg',
    primaryUnit: 'kg',
    fields: [
      { key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 20, max: maxLoad, step: 2.5 },
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 1, max: 10 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 5 },
    requiresBodyWeight: true,
    derivedMetrics: ['one_rm_kg', 'relative_strength_bw'],
    sortOrder: sort,
    name: { de: nameDe, en: nameEn },
    shortName: { de: shortDe, en: shortEn },
    summary: {
      de: 'Maximalkraft. Bei mehr als einer Wiederholung wird das 1RM nach Epley geschätzt.',
      en: 'Maximal strength. With more than one repetition the 1RM is estimated using Epley.',
    },
    instructions: {
      de: 'Nach Aufwärmsätzen in 2–5 Versuchen an das Maximum herantasten. Nur saubere Wiederholungen zählen.',
      en: 'After warm-up sets, work up to a maximum in 2–5 attempts. Only clean repetitions count.',
    },
    equipment: { de: 'Langhantel, Rack, Scheiben', en: 'Barbell, rack, plates' },
  })),
  ...(
    [
      ['clean_and_jerk_1rm', 'Umsetzen und Stossen (Clean & Jerk)', 'Clean & Jerk 1RM', 'C&J', 140, 260],
      ['snatch_1rm', 'Reissen (Snatch)', 'Snatch 1RM', 'Snatch', 150, 200],
    ] as const
  ).map<TestDefinition>(([slug, nameDe, nameEn, short, sort, maxLoad]) => ({
    slug,
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: {
      max_strength: 'one_rm_kg',
      relative_strength: 'relative_strength_bw',
      power: 'relative_strength_bw',
    },
    direction: 'higher_is_better',
    primaryMetric: 'one_rm_kg',
    primaryUnit: 'kg',
    fields: [
      { key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 20, max: maxLoad, step: 1 },
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 1, max: 3 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 6 },
    requiresBodyWeight: true,
    derivedMetrics: ['one_rm_kg', 'relative_strength_bw', 'sinclair_points'],
    sortOrder: sort,
    name: { de: nameDe, en: nameEn },
    shortName: { de: short, en: short },
    summary: {
      de: 'Olympische Disziplin. Zahlt auf Maxkraft, Relativkraft und Schnellkraft ein.',
      en: 'Olympic lift. Feeds max strength, relative strength and power.',
    },
    instructions: {
      de: 'Aufwärmsätze, dann Steigerungsversuche bis zum Maximum. Nur gültige Versuche zählen.',
      en: 'Warm-up sets, then increasing attempts to a maximum. Only valid lifts count.',
    },
    equipment: { de: 'Olympische Langhantel, Bumper, Plattform', en: 'Olympic barbell, bumper plates, platform' },
  })),
  {
    slug: 'bear_complex',
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'loadKg', relative_strength: 'relative_strength_bw' },
    direction: 'higher_is_better',
    primaryMetric: 'loadKg',
    primaryUnit: 'kg',
    fields: [{ key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 20, max: 150, step: 2.5 }, ...HR_RPE],
    protocol: { mode: 'attempts', attempts: 5 },
    requiresBodyWeight: true,
    derivedMetrics: ['relative_strength_bw'],
    sortOrder: 210,
    name: { de: 'Bear Complex (Maximallast)', en: 'Bear Complex (Max Load)' },
    shortName: { de: 'Bear', en: 'Bear' },
    summary: {
      de: '5 Runden à 7 unterbrechungsfreie Wiederholungen. Gewertet wird die schwerste vollständige Runde.',
      en: '5 rounds of 7 unbroken repetitions. The heaviest completed round counts.',
    },
    instructions: {
      de: 'Power Clean, Front Squat, Push Press, Back Squat, Push Press — ohne Absetzen.',
      en: 'Power clean, front squat, push press, back squat, push press — without setting the bar down.',
    },
    equipment: { de: 'Langhantel, Scheiben', en: 'Barbell, plates' },
  },
  {
    slug: 'cindy_20min_amrap',
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'total_reps' },
    direction: 'higher_is_better',
    primaryMetric: 'rounds',
    primaryUnit: 'Runden',
    fields: [
      { key: 'rounds', type: 'number', unit: 'Runden', required: true, min: 0, max: 40, step: 1 },
      { key: 'partialReps', type: 'integer', unit: 'Wdh.', required: false, min: 0, max: 29 },
      ...HR_RPE,
    ],
    protocol: { mode: 'amrap', durationSeconds: 1200 },
    requiresBodyWeight: false,
    derivedMetrics: ['total_reps', 'reps_per_minute'],
    derive: (values, _ctx, put) => {
    // Eine Runde Cindy sind 5 + 10 + 15 = 30 Wiederholungen.
    const total = (values.rounds ?? 0) * 30 + (values.partialReps ?? 0)
    put('total_reps', total)
    put('reps_per_minute', total / 20)
    },
    sortOrder: 220,
    name: { de: 'Cindy (20 Min AMRAP)', en: 'Cindy (20 min AMRAP)' },
    shortName: { de: 'Cindy', en: 'Cindy' },
    summary: {
      de: '20 Minuten so viele Runden wie möglich: 5 Klimmzüge, 10 Liegestütze, 15 Kniebeugen.',
      en: 'As many rounds as possible in 20 minutes: 5 pull-ups, 10 push-ups, 15 air squats.',
    },
    instructions: {
      de: 'Durchgehend arbeiten, Pausen frei wählbar. Am Ende volle Runden plus angefangene Wiederholungen notieren.',
      en: 'Work continuously, rest as needed. Record full rounds plus partial repetitions at the buzzer.',
    },
    equipment: { de: 'Klimmzugstange, Zeitmesser', en: 'Pull-up bar, timer' },
  },
  {
    slug: 'assault_bike_10min_cal',
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'calories', endurance: 'calories' },
    direction: 'higher_is_better',
    primaryMetric: 'calories',
    primaryUnit: 'kcal',
    fields: [{ key: 'calories', type: 'number', unit: 'kcal', required: true, min: 20, max: 400, step: 1 }, ...HR_RPE],
    protocol: { mode: 'countdown', durationSeconds: 600 },
    requiresBodyWeight: false,
    derivedMetrics: ['calories_per_minute'],
    derive: (values, _ctx, put) => {
    put('calories_per_minute', values.calories / 10)
    },
    sortOrder: 230,
    name: { de: 'Assault Bike — 10 Minuten', en: 'Assault Bike — 10 minutes' },
    shortName: { de: 'Bike 10 Min', en: 'Bike 10 min' },
    summary: {
      de: 'Maximale Kalorienzahl in 10 Minuten. Misst, wie lange hohe Leistung gehalten wird.',
      en: 'Maximum calories in 10 minutes. Measures the ability to sustain high power output.',
    },
    instructions: {
      de: 'Aus dem Stand starten, 10 Minuten maximal gleichmässig arbeiten.',
      en: 'Start from a standstill and work at an evenly paced maximum for 10 minutes.',
    },
    equipment: { de: 'Assault Bike / Air Bike', en: 'Assault bike / air bike' },
  },
  {
    slug: 'illinois_agility',
    category: 'agility',
    dimension: 'agility',
    dimensionMetrics: { agility: 'durationSeconds' },
    direction: 'lower_is_better',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'number', unit: 's', required: true, min: 10, max: 40, step: 0.01 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch', attempts: 2 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 310,
    name: { de: 'Illinois Agility Test', en: 'Illinois Agility Test' },
    shortName: { de: 'Illinois', en: 'Illinois' },
    summary: {
      de: 'Standardisierter Wendigkeitsparcours über 10 × 5 m mit Slalom. Der schnellere von zwei Läufen zählt.',
      en: 'Standardised agility course of 10 × 5 m including a slalom. The faster of two runs counts.',
    },
    instructions: {
      de: 'Start in Bauchlage. Zeit auf Hundertstel erfassen. Zwei Versuche mit voller Pause.',
      en: 'Start lying prone. Time to hundredths. Two attempts with full recovery.',
    },
    equipment: { de: '8 Markierungshütchen, Stoppuhr', en: '8 cones, stopwatch' },
  },
  {
    slug: 'standing_broad_jump',
    category: 'power',
    dimension: 'power',
    dimensionMetrics: { power: 'distanceM' },
    direction: 'higher_is_better',
    primaryMetric: 'distanceM',
    primaryUnit: 'm',
    fields: [
      { key: 'distanceM', type: 'number', unit: 'm', required: true, min: 0.5, max: 4, step: 0.01 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: true,
    derivedMetrics: [],
    sortOrder: 320,
    name: { de: 'Standweitsprung', en: 'Standing Broad Jump' },
    shortName: { de: 'Standweitsprung', en: 'Broad Jump' },
    summary: {
      de: 'Horizontale Schnellkraft aus dem Stand. Gemessen zur hintersten Landespur.',
      en: 'Horizontal explosive power from a standing start. Measured to the nearest landing mark.',
    },
    instructions: {
      de: 'Beidbeiniger Absprung ohne Anlauf, beidbeinige Landung ohne Rückfallen. Drei Versuche, der beste zählt.',
      en: 'Two-footed take-off without a run-up, two-footed landing. Three attempts, best counts.',
    },
    equipment: { de: 'Massband, rutschfeste Absprungmarkierung', en: 'Tape measure, non-slip take-off marking' },
  },

  // Erweiterung (§12) — in einer eigenen Datei, damit dieser Katalog lesbar
  // bleibt. Aufnahmekriterium und die Begründungen für bewusst weggelassene
  // Tests stehen dort.
  ...SPEED_TESTS,
  ...AGILITY_TESTS,
  ...JUMP_TESTS,
  REPEATED_JUMP,
  ...STRENGTH_TESTS,
  ...ENDURANCE_TESTS,
  ...CONDITIONING_TESTS,
  // Sportartspezifische Tests zu den Disziplinen aus src/data/sportProfiles.ts.
  ...SPORT_SPECIFIC_TESTS,
  // Namentlich im Zielgruppendokument genannte Verfahren; die Herkunft steht
  // je Disziplin in src/data/documentCoverage.ts.
  ...DOCUMENT_TESTS,
]

export const TEST_BY_SLUG = new Map(TEST_CATALOG.map((test) => [test.slug, test]))

export function getTest(slug: string): TestDefinition | undefined {
  return TEST_BY_SLUG.get(slug)
}
