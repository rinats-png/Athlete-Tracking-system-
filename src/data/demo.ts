import type {
  AppLocale,
  AthleteProfile,
  RadarAxis,
  ScoreMode,
  TestSummary,
  TrendPoint,
} from '@/types/domain'

/**
 * Demodaten für die Layoutarbeit und für den ersten Blick ohne Login.
 *
 * Die Werte sind ein durchgerechneter Fall, kein Zufallsrauschen: derselbe
 * Athlet über drei Diagnostiktermine, dazwischen ein Kraftblock und ein
 * Ausdauerblock. Die Radar-Werte stammen aus derselben Rechenlogik wie
 * `public.athlete_radar_profile()` in der Datenbank — so zeigt das Layout
 * Zahlen, die später auch wirklich so herauskommen.
 *
 * Sichtbar wird daran auch der Unterschied der beiden Modi: im
 * Bestleistungsmodus liegt ein formstarker Athlet nahe an 100 auf allen
 * Achsen (Formstand), erst der Populationsmodus zeigt Stärken und Schwächen.
 */

export const DEMO_ATHLETE: AthleteProfile = {
  id: 'demo-athlete',
  firstName: 'Alex',
  lastName: 'Roth',
  sex: 'male',
  birthDate: '1994-03-11',
  bodyWeightKg: 83.2,
  heightCm: 181,
  restingHr: 48,
  maxHr: 189,
  lastAssessmentOn: '2026-06-14',
}

export const DEMO_ASSESSMENT_DATES = {
  current: '2026-06-14',
  previous: '2026-01-18',
  baseline: '2025-08-20',
} as const

const radar = (
  scores: Record<string, [number | null, number]>,
  performedAt: string,
): RadarAxis[] =>
  (
    [
      'endurance',
      'max_strength',
      'relative_strength',
      'strength_endurance',
      'power',
      'agility',
    ] as const
  ).map((dimension) => {
    const [score, testCount] = scores[dimension]
    return {
      dimension,
      score,
      testCount,
      latestPerformedAt: score == null ? null : performedAt,
      hasData: score != null,
    }
  })

export const DEMO_RADAR: Record<ScoreMode, { current: RadarAxis[]; previous: RadarAxis[] }> = {
  personal_best: {
    current: radar(
      {
        endurance: [100, 2],
        max_strength: [96.1, 3],
        relative_strength: [98.9, 3],
        strength_endurance: [98.1, 3],
        power: [100, 1],
        agility: [100, 1],
      },
      DEMO_ASSESSMENT_DATES.current,
    ),
    previous: radar(
      {
        endurance: [97.2, 2],
        max_strength: [100, 3],
        relative_strength: [100, 3],
        strength_endurance: [100, 3],
        power: [100, 1],
        agility: [100, 1],
      },
      DEMO_ASSESSMENT_DATES.previous,
    ),
  },
  population: {
    current: radar(
      {
        endurance: [82.8, 2],
        max_strength: [79.0, 3],
        relative_strength: [80.9, 3],
        strength_endurance: [78.4, 3],
        power: [79.0, 1],
        agility: [64.5, 1],
      },
      DEMO_ASSESSMENT_DATES.current,
    ),
    previous: radar(
      {
        endurance: [63.5, 2],
        max_strength: [82.7, 3],
        relative_strength: [82.3, 3],
        strength_endurance: [72.9, 3],
        power: [72.5, 1],
        agility: [49.0, 1],
      },
      DEMO_ASSESSMENT_DATES.previous,
    ),
  },
}

/**
 * Die Testnamen kommen später aus `test_definition_translations`; in den
 * Demodaten stehen beide Sprachen direkt am Eintrag.
 */
type DemoTest = Omit<TestSummary, 'name'> & { names: Record<AppLocale, string> }

const DEMO_TESTS: DemoTest[] = [
  {
    id: 't-cooper',
    slug: 'cooper_12min',
    names: { de: 'Cooper-Test (12 Minuten)', en: 'Cooper Test (12 minutes)' },
    category: 'endurance',
    dimension: 'endurance',
    performedAt: '2026-06-14',
    value: 3320,
    unit: 'm',
    direction: 'higher_is_better',
    deltaPercent: 12.2,
    isPersonalBest: true,
    rpe: 9.5,
    derived: { vo2max_ml_kg_min: { value: 62.9, unit: 'ml/kg/min' } },
  },
  {
    id: 't-row',
    slug: 'row_2000m',
    names: { de: '2000 m Rudern', en: '2000 m Row' },
    category: 'endurance',
    dimension: 'endurance',
    performedAt: '2026-06-14',
    value: 402,
    unit: 's',
    direction: 'lower_is_better',
    deltaPercent: -6.1,
    isPersonalBest: true,
    rpe: 10,
    derived: { avg_pace_s_per_500m: { value: 100.5, unit: 's/500m' } },
  },
  {
    id: 't-illinois',
    slug: 'illinois_agility',
    names: { de: 'Illinois Agility Test', en: 'Illinois Agility Test' },
    category: 'agility',
    dimension: 'agility',
    performedAt: '2026-06-13',
    value: 16.42,
    unit: 's',
    direction: 'lower_is_better',
    deltaPercent: -3.7,
    isPersonalBest: true,
    rpe: 8,
    derived: {},
  },
  {
    id: 't-broad',
    slug: 'standing_broad_jump',
    names: { de: 'Standweitsprung', en: 'Standing Broad Jump' },
    category: 'power',
    dimension: 'power',
    performedAt: '2026-06-13',
    value: 2.44,
    unit: 'm',
    direction: 'higher_is_better',
    deltaPercent: 2.5,
    isPersonalBest: true,
    rpe: 7,
    derived: {},
  },
  {
    id: 't-squat',
    slug: 'back_squat_1rm',
    names: { de: 'Kniebeuge (Back Squat) 1RM', en: 'Back Squat 1RM' },
    category: 'max_strength',
    dimension: 'max_strength',
    performedAt: '2026-06-12',
    value: 165,
    unit: 'kg',
    direction: 'higher_is_better',
    deltaPercent: -4.3,
    isPersonalBest: false,
    rpe: 9,
    derived: {
      one_rm_kg: { value: 165, unit: 'kg' },
      relative_strength_bw: { value: 1.98, unit: '× KG' },
    },
  },
  {
    id: 't-deadlift',
    slug: 'deadlift_1rm',
    names: { de: 'Kreuzheben (Deadlift) 1RM', en: 'Deadlift 1RM' },
    category: 'max_strength',
    dimension: 'max_strength',
    performedAt: '2026-06-12',
    value: 207.5,
    unit: 'kg',
    direction: 'higher_is_better',
    deltaPercent: -3.5,
    isPersonalBest: false,
    rpe: 9.5,
    derived: {
      one_rm_kg: { value: 207.5, unit: 'kg' },
      relative_strength_bw: { value: 2.49, unit: '× KG' },
    },
  },
  {
    id: 't-cindy',
    slug: 'cindy_20min_amrap',
    names: { de: 'Cindy (20 Min AMRAP)', en: 'Cindy (20 min AMRAP)' },
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    performedAt: '2026-06-11',
    value: 445,
    unit: 'reps',
    direction: 'higher_is_better',
    deltaPercent: 9.9,
    isPersonalBest: true,
    rpe: 10,
    derived: { reps_per_minute: { value: 22.3, unit: '/min' } },
  },
  {
    id: 't-bike',
    slug: 'assault_bike_10min_cal',
    names: { de: 'Assault Bike — 10 Minuten', en: 'Assault Bike — 10 minutes' },
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    performedAt: '2026-06-11',
    value: 158,
    unit: 'kcal',
    direction: 'higher_is_better',
    deltaPercent: 6.8,
    isPersonalBest: true,
    rpe: 9.5,
    derived: { calories_per_minute: { value: 15.8, unit: 'kcal/min' } },
  },
]

export function getDemoTests(locale: AppLocale): TestSummary[] {
  return DEMO_TESTS.map(({ names, ...test }) => ({ ...test, name: names[locale] }))
}

export const DEMO_TREND: Record<string, TrendPoint[]> = {
  cooper_12min: [
    { performedAt: '2025-08-20', value: 3080 },
    { performedAt: '2026-01-18', value: 2960 },
    { performedAt: '2026-06-14', value: 3320 },
  ],
  back_squat_1rm: [
    { performedAt: '2025-08-20', value: 150 },
    { performedAt: '2026-01-18', value: 172.5 },
    { performedAt: '2026-06-14', value: 165 },
  ],
  illinois_agility: [
    { performedAt: '2025-08-20', value: 17.42 },
    { performedAt: '2026-01-18', value: 17.05 },
    { performedAt: '2026-06-14', value: 16.42 },
  ],
}
