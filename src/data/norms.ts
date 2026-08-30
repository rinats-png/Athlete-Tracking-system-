import type { Sex } from '@/types/domain'

/**
 * Populations-Referenzwerte als Perzentil-Stützstellen.
 *
 * Spiegelt `public.performance_norms`. Wie beim Testkatalog ist die Doppelung
 * beabsichtigt: der Gastmodus rechnet den Perzentilvergleich ohne Netz.
 *
 * ACHTUNG — Datenqualität: Startbelegung für Entwicklung und Demo, angelehnt
 * an übliche Grössenordnungen für trainierte Erwachsene, aber nicht aus einer
 * publizierten Normstudie. Vor dem Produktivstart gegen belastbare Quellen
 * ersetzen (ACSM, Cooper Institute, nationale Behörden-Standards).
 */

export const NORM_SOURCE = 'baseline_v0_placeholder'

/**
 * Herkunft der Referenzwerte, strukturiert (§15).
 *
 * Diese Angaben stehen im Bericht und in der Auswertung. Sie sind bewusst
 * unangenehm ehrlich: `validated: false` heisst, dass diese Zahlen keine
 * publizierte Normstichprobe hinter sich haben. Sobald belegte Daten
 * eingespielt werden, wird dieser Block ersetzt — und erst dann darf
 * irgendwo «Norm» statt «Referenz» stehen.
 */
export interface NormDatasetMeta {
  id: string
  /** Wie die Daten im Text genannt werden dürfen. */
  label: { de: string; en: string }
  population: { de: string; en: string }
  method: { de: string; en: string }
  ageRange: [number, number]
  sexes: ('male' | 'female')[]
  /** Stichprobengrösse. Null, solange keine erhoben wurde. */
  sampleSize: number | null
  year: number | null
  /** Gegen eine publizierte Stichprobe abgeglichen? */
  validated: boolean
}

export const NORM_DATASET: NormDatasetMeta = {
  id: NORM_SOURCE,
  label: {
    de: 'BASELINE-Referenz (experimentell)',
    en: 'BASELINE reference (experimental)',
  },
  population: {
    de: 'Trainierte Erwachsene, 18–60 Jahre, nach Geschlecht und Altersgruppe getrennt',
    en: 'Trained adults, 18–60 years, split by sex and age band',
  },
  method: {
    de: 'Stützstellen für die Perzentile 10/25/50/75/90/99, dazwischen linear interpoliert, an den Rändern geklemmt statt extrapoliert. Die Werte sind an übliche Grössenordnungen angelehnt und nicht aus einer publizierten Normstudie übernommen.',
    en: 'Anchors at the 10/25/50/75/90/99 percentiles, linearly interpolated between them and clamped at the edges rather than extrapolated. The values follow common orders of magnitude and are not taken from a published normative study.',
  },
  ageRange: [18, 120],
  sexes: ['male', 'female'],
  sampleSize: null,
  year: null,
  validated: false,
}
const PERCENTILES = [10, 25, 50, 75, 90, 99] as const

export interface NormRow {
  testSlug: string
  metricKey: string
  sex: Exclude<Sex, 'other'>
  ageMin: number
  ageMax: number
  /** Werte zu den Perzentilen 10 / 25 / 50 / 75 / 90 / 99. */
  values: number[]
}

const row = (
  testSlug: string,
  metricKey: string,
  sex: Exclude<Sex, 'other'>,
  ageMin: number,
  ageMax: number,
  values: number[],
  scale = 1,
): NormRow => ({
  testSlug,
  metricKey,
  sex,
  ageMin,
  ageMax,
  values: values.map((v) => Math.round(v * scale * 1000) / 1000),
})

export const NORMS: NormRow[] = [
  // Ausdauer — geschätzte VO2max (ml/kg/min)
  row('cooper_12min', 'vo2max_ml_kg_min', 'male', 18, 29, [38, 43, 48, 54, 59, 66]),
  row('cooper_12min', 'vo2max_ml_kg_min', 'male', 30, 39, [36, 41, 46, 52, 57, 64]),
  row('cooper_12min', 'vo2max_ml_kg_min', 'male', 40, 49, [34, 38, 43, 49, 54, 61]),
  row('cooper_12min', 'vo2max_ml_kg_min', 'male', 50, 120, [31, 35, 40, 45, 50, 57]),
  row('cooper_12min', 'vo2max_ml_kg_min', 'female', 18, 29, [32, 36, 41, 46, 51, 58]),
  row('cooper_12min', 'vo2max_ml_kg_min', 'female', 30, 39, [30, 34, 39, 44, 49, 56]),
  row('cooper_12min', 'vo2max_ml_kg_min', 'female', 40, 49, [28, 32, 37, 42, 47, 54]),
  row('cooper_12min', 'vo2max_ml_kg_min', 'female', 50, 120, [26, 30, 34, 39, 44, 50]),
  row('beep_test_20m', 'vo2max_ml_kg_min', 'male', 18, 39, [37, 42, 47, 53, 58, 65]),
  row('beep_test_20m', 'vo2max_ml_kg_min', 'female', 18, 39, [31, 35, 40, 45, 50, 57]),

  // 2000 m Rudern in Sekunden — weniger ist besser
  row('row_2000m', 'durationSeconds', 'male', 18, 39, [480, 450, 420, 395, 375, 350]),
  row('row_2000m', 'durationSeconds', 'male', 40, 120, [480, 450, 420, 395, 375, 350], 1.07),
  row('row_2000m', 'durationSeconds', 'female', 18, 39, [555, 520, 490, 462, 440, 410]),
  row('row_2000m', 'durationSeconds', 'female', 40, 120, [555, 520, 490, 462, 440, 410], 1.07),

  // Relativkraft (1RM je kg Körpergewicht)
  row('back_squat_1rm', 'relative_strength_bw', 'male', 18, 39, [1.0, 1.3, 1.6, 2.0, 2.3, 2.8]),
  row('back_squat_1rm', 'relative_strength_bw', 'male', 40, 120, [1.0, 1.3, 1.6, 2.0, 2.3, 2.8], 0.9),
  row('back_squat_1rm', 'relative_strength_bw', 'female', 18, 39, [0.7, 0.9, 1.2, 1.5, 1.8, 2.2]),
  row('back_squat_1rm', 'relative_strength_bw', 'female', 40, 120, [0.7, 0.9, 1.2, 1.5, 1.8, 2.2], 0.9),
  row('bench_press_1rm', 'relative_strength_bw', 'male', 18, 39, [0.7, 0.9, 1.1, 1.35, 1.55, 1.9]),
  row('bench_press_1rm', 'relative_strength_bw', 'male', 40, 120, [0.7, 0.9, 1.1, 1.35, 1.55, 1.9], 0.9),
  row('bench_press_1rm', 'relative_strength_bw', 'female', 18, 39, [0.4, 0.55, 0.7, 0.9, 1.05, 1.3]),
  row('bench_press_1rm', 'relative_strength_bw', 'female', 40, 120, [0.4, 0.55, 0.7, 0.9, 1.05, 1.3], 0.9),
  row('deadlift_1rm', 'relative_strength_bw', 'male', 18, 39, [1.2, 1.5, 1.9, 2.3, 2.6, 3.1]),
  row('deadlift_1rm', 'relative_strength_bw', 'male', 40, 120, [1.2, 1.5, 1.9, 2.3, 2.6, 3.1], 0.9),
  row('deadlift_1rm', 'relative_strength_bw', 'female', 18, 39, [0.9, 1.15, 1.45, 1.8, 2.05, 2.5]),
  row('deadlift_1rm', 'relative_strength_bw', 'female', 40, 120, [0.9, 1.15, 1.45, 1.8, 2.05, 2.5], 0.9),
  row('clean_and_jerk_1rm', 'relative_strength_bw', 'male', 18, 39, [0.6, 0.8, 1.0, 1.25, 1.45, 1.75]),
  row('clean_and_jerk_1rm', 'relative_strength_bw', 'female', 18, 39, [0.4, 0.55, 0.7, 0.9, 1.05, 1.3]),
  row('snatch_1rm', 'relative_strength_bw', 'male', 18, 39, [0.45, 0.6, 0.78, 0.98, 1.15, 1.4]),
  row('snatch_1rm', 'relative_strength_bw', 'female', 18, 39, [0.3, 0.42, 0.55, 0.7, 0.82, 1.02]),

  // Absolute Maxkraft (kg). Gröber als die Relativkraft, weil stark
  // körpergewichtsabhängig — mittelfristig durch Wilks/IPF-GL zu ersetzen.
  row('back_squat_1rm', 'one_rm_kg', 'male', 18, 39, [70, 100, 130, 165, 195, 240]),
  row('back_squat_1rm', 'one_rm_kg', 'male', 40, 120, [70, 100, 130, 165, 195, 240], 0.9),
  row('back_squat_1rm', 'one_rm_kg', 'female', 18, 39, [40, 55, 75, 95, 115, 145]),
  row('back_squat_1rm', 'one_rm_kg', 'female', 40, 120, [40, 55, 75, 95, 115, 145], 0.9),
  row('deadlift_1rm', 'one_rm_kg', 'male', 18, 39, [90, 125, 160, 195, 225, 275]),
  row('deadlift_1rm', 'one_rm_kg', 'male', 40, 120, [90, 125, 160, 195, 225, 275], 0.9),
  row('deadlift_1rm', 'one_rm_kg', 'female', 18, 39, [55, 75, 100, 125, 150, 185]),
  row('deadlift_1rm', 'one_rm_kg', 'female', 40, 120, [55, 75, 100, 125, 150, 185], 0.9),
  row('bench_press_1rm', 'one_rm_kg', 'male', 18, 39, [55, 75, 95, 115, 135, 165]),
  row('bench_press_1rm', 'one_rm_kg', 'male', 40, 120, [55, 75, 95, 115, 135, 165], 0.9),
  row('bench_press_1rm', 'one_rm_kg', 'female', 18, 39, [25, 35, 47, 60, 72, 92]),
  row('bench_press_1rm', 'one_rm_kg', 'female', 40, 120, [25, 35, 47, 60, 72, 92], 0.9),
  row('clean_and_jerk_1rm', 'one_rm_kg', 'male', 18, 39, [55, 72, 90, 110, 128, 155]),
  row('clean_and_jerk_1rm', 'one_rm_kg', 'female', 18, 39, [28, 38, 50, 62, 73, 90]),
  row('snatch_1rm', 'one_rm_kg', 'male', 18, 39, [42, 55, 70, 88, 102, 125]),
  row('snatch_1rm', 'one_rm_kg', 'female', 18, 39, [22, 30, 40, 50, 58, 72]),

  // Kraftausdauer
  row('bear_complex', 'loadKg', 'male', 18, 39, [40, 55, 70, 85, 100, 120]),
  row('bear_complex', 'loadKg', 'female', 18, 39, [25, 32, 42, 52, 62, 75]),
  row('cindy_20min_amrap', 'total_reps', 'male', 18, 39, [240, 300, 360, 420, 480, 570]),
  row('cindy_20min_amrap', 'total_reps', 'female', 18, 39, [180, 240, 300, 360, 420, 510]),
  row('assault_bike_10min_cal', 'calories', 'male', 18, 39, [100, 115, 130, 150, 165, 190]),
  row('assault_bike_10min_cal', 'calories', 'female', 18, 39, [70, 82, 95, 110, 122, 140]),

  // Agilität und Schnellkraft
  row('illinois_agility', 'durationSeconds', 'male', 18, 39, [19.5, 18.3, 17.0, 16.0, 15.2, 14.3]),
  row('illinois_agility', 'durationSeconds', 'male', 40, 120, [19.5, 18.3, 17.0, 16.0, 15.2, 14.3], 1.08),
  row('illinois_agility', 'durationSeconds', 'female', 18, 39, [22.0, 20.5, 19.0, 17.9, 17.0, 16.0]),
  row('illinois_agility', 'durationSeconds', 'female', 40, 120, [22.0, 20.5, 19.0, 17.9, 17.0, 16.0], 1.08),
  row('standing_broad_jump', 'distanceM', 'male', 18, 39, [1.8, 2.0, 2.2, 2.4, 2.55, 2.8]),
  row('standing_broad_jump', 'distanceM', 'male', 40, 120, [1.8, 2.0, 2.2, 2.4, 2.55, 2.8], 0.92),
  row('standing_broad_jump', 'distanceM', 'female', 18, 39, [1.4, 1.55, 1.75, 1.9, 2.05, 2.25]),
  row('standing_broad_jump', 'distanceM', 'female', 40, 120, [1.4, 1.55, 1.75, 1.9, 2.05, 2.25], 0.92),

  // --- Erweiterung (§12) --------------------------------------------------
  // Dieselbe Einordnung wie oben: experimentelle Referenz, an übliche
  // Grössenordnungen für trainierte Erwachsene angelehnt, NICHT aus einer
  // publizierten Normstudie. Aufgenommen wurden nur Tests, für die sich eine
  // Einordnung überhaupt sinnvoll angeben lässt — für Murph, Fran und Grace
  // etwa gibt es keine, weil Last- und Ausführungsvarianten die Zeiten nicht
  // vergleichbar machen; dort bleibt das Perzentil bewusst leer.

  // Sprint (Sekunden, weniger ist besser)
  row('sprint_10m', 'durationSeconds', 'male', 18, 39, [2.15, 2.02, 1.90, 1.80, 1.72, 1.62]),
  row('sprint_10m', 'durationSeconds', 'female', 18, 39, [2.40, 2.25, 2.10, 1.98, 1.89, 1.78]),
  row('sprint_20m', 'durationSeconds', 'male', 18, 39, [3.60, 3.40, 3.20, 3.05, 2.94, 2.80]),
  row('sprint_20m', 'durationSeconds', 'female', 18, 39, [4.05, 3.82, 3.60, 3.43, 3.30, 3.14]),
  row('sprint_30m', 'durationSeconds', 'male', 18, 39, [5.05, 4.78, 4.50, 4.30, 4.15, 3.95]),
  row('sprint_30m', 'durationSeconds', 'female', 18, 39, [5.70, 5.38, 5.06, 4.83, 4.66, 4.44]),
  row('sprint_40yd', 'durationSeconds', 'male', 18, 39, [5.90, 5.55, 5.20, 4.95, 4.76, 4.50]),
  row('sprint_40yd', 'durationSeconds', 'female', 18, 39, [6.70, 6.30, 5.90, 5.62, 5.40, 5.10]),

  // Agilität (Sekunden, weniger ist besser)
  row('shuttle_5_10_5', 'durationSeconds', 'male', 18, 39, [5.60, 5.30, 5.00, 4.78, 4.62, 4.40]),
  row('shuttle_5_10_5', 'durationSeconds', 'female', 18, 39, [6.30, 5.96, 5.62, 5.38, 5.20, 4.95]),
  row('t_test_agility', 'durationSeconds', 'male', 18, 39, [12.0, 11.2, 10.5, 9.9, 9.5, 9.0]),
  row('t_test_agility', 'durationSeconds', 'female', 18, 39, [13.4, 12.5, 11.7, 11.1, 10.6, 10.0]),

  // Sprung (cm, mehr ist besser)
  row('countermovement_jump', 'jumpHeightCm', 'male', 18, 39, [26, 32, 38, 44, 50, 58]),
  row('countermovement_jump', 'jumpHeightCm', 'female', 18, 39, [18, 23, 28, 33, 38, 45]),
  row('squat_jump', 'jumpHeightCm', 'male', 18, 39, [23, 28, 34, 40, 45, 53]),
  row('squat_jump', 'jumpHeightCm', 'female', 18, 39, [16, 20, 25, 30, 35, 41]),
  row('vertical_jump_reach', 'jumpHeightCm', 'male', 18, 39, [40, 48, 56, 64, 71, 81]),
  row('vertical_jump_reach', 'jumpHeightCm', 'female', 18, 39, [28, 34, 40, 46, 52, 60]),

  // Klimmzüge (Wiederholungen, mehr ist besser)
  row('pull_up_max_reps', 'reps', 'male', 18, 39, [3, 7, 12, 17, 22, 30]),
  row('pull_up_max_reps', 'reps', 'female', 18, 39, [0, 1, 4, 8, 12, 18]),

  // Laufen (Sekunden, weniger ist besser)
  row('run_1_5_mile', 'durationSeconds', 'male', 18, 39, [810, 735, 660, 606, 570, 522]),
  row('run_1_5_mile', 'durationSeconds', 'female', 18, 39, [960, 870, 780, 714, 672, 612]),
  row('run_5k', 'durationSeconds', 'male', 18, 39, [1800, 1620, 1440, 1320, 1230, 1110]),
  row('run_5k', 'durationSeconds', 'female', 18, 39, [2100, 1890, 1680, 1530, 1440, 1290]),
]

/**
 * Perzentil eines Messwerts gegen die Referenztabelle.
 *
 * Portierung von `public.norm_percentile()`. Richtungsunabhängig: die
 * Stützstellen tragen die Richtung in sich — bei Zeit-Tests fällt das
 * Perzentil mit steigendem Wert von selbst. Zwischen Stützstellen wird linear
 * interpoliert, ausserhalb auf die Randstützstelle geklemmt.
 */
export function normPercentile(
  testSlug: string,
  metricKey: string,
  sex: Sex | null,
  age: number | null,
  value: number | null,
): number | null {
  if (value == null || sex == null || sex === 'other') return null
  const effectiveAge = age ?? 30

  const anchors = NORMS.filter(
    (n) =>
      n.testSlug === testSlug &&
      n.metricKey === metricKey &&
      n.sex === sex &&
      effectiveAge >= n.ageMin &&
      effectiveAge <= n.ageMax,
  ).flatMap((n) => n.values.map((v, i) => ({ value: v, percentile: PERCENTILES[i] as number })))

  if (anchors.length === 0) return null

  const sorted = [...anchors].sort((a, b) => a.value - b.value)
  const lower = [...sorted].reverse().find((a) => a.value <= value)
  const upper = sorted.find((a) => a.value >= value)

  if (!lower) return upper!.percentile
  if (!upper) return lower.percentile
  if (upper.value === lower.value) return Math.max(lower.percentile, upper.percentile)

  const ratio = (value - lower.value) / (upper.value - lower.value)
  return lower.percentile + ratio * (upper.percentile - lower.percentile)
}
