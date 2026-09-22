import type { SportCategoryId } from './sportProfiles'

/**
 * Sportmodule — die Kennzahlen, an denen eine Sportart hängt.
 *
 * WAS EIN MODUL IST UND WAS NICHT. Die App rechnet je Test schon seit
 * Längerem Kennzahlen aus (`testDerive.ts`): aus 2000 m Rudern werden
 * Split, Watt und Watt je Kilogramm. Was fehlte, war die Zusammenführung:
 * Ein Ruderer will nicht durch neun Testkarten blättern, um seine drei
 * Zahlen zu sehen.
 *
 * Ein Modul ist deshalb eine AUSWAHL und eine REIHENFOLGE, keine neue
 * Wissenschaft. Es nennt die Kennzahlen dieser Sportart in der Reihenfolge,
 * in der man sie ansieht, und sagt, aus welchem Test jede kommt. Es erfindet
 * keine Formel, keinen Grenzwert und keine Bewertung — gerechnet wurde
 * schon, und wer die Zahl deutet, ist der Mensch davor.
 *
 * EINE AUSNAHME, und die trägt ihre Quelle mit: die kritische
 * Geschwindigkeit beim Laufen. Sie ist die einzige Kennzahl, die über ZWEI
 * Tests hinweg entsteht und deshalb in keiner Testdefinition stehen kann
 * (siehe `criticalSpeed` in `domain/sportModule.ts`).
 *
 * WAS NICHT GEMESSEN IST, IST NICHT SCHWACH (§89). Eine Kennzahl ohne
 * Messung bleibt leer und wird benannt — sie wird nicht auf null gesetzt
 * und nicht weggelassen.
 */

export interface ModuleMetric {
  /** Schlüssel der Kennzahl, so wie `testDerive.ts` sie ablegt. */
  key: string
  /** Aus welchen Tests sie kommen kann, in absteigender Eignung. */
  fromTests: string[]
  /** Kleinere Werte sind schneller — für die Richtung der Veränderung. */
  lowerIsBetter?: boolean
  /** Nachkommastellen in der Anzeige. */
  digits?: number
}

export interface SportModule {
  category: SportCategoryId
  metrics: ModuleMetric[]
}

/**
 * Elf Module, eines je Kategorie.
 *
 * Die Auswahl folgt der Belastungsstruktur, die schon in `sportProfiles.ts`
 * die Achsengewichte begründet — und sie nimmt ausschliesslich Kennzahlen,
 * die es in dieser App bereits gibt. Eine Kennzahl, für die kein Test da
 * ist, wäre ein Versprechen ohne Messung.
 */
export const SPORT_MODULES: SportModule[] = [
  {
    category: 'running',
    metrics: [
      { key: 'vo2max_ml_kg_min', fromTests: ['cooper_12min', 'beep_test_20m'], digits: 1 },
      { key: 'avg_pace_s_per_km', fromTests: ['run_5k', 'run_2_mile', 'run_1_5_mile', 'threshold_run_30min'], lowerIsBetter: true },
      { key: 'hr_drift_percent', fromTests: ['hr_drift_test'], lowerIsBetter: true, digits: 1 },
    ],
  },
  {
    category: 'cycling',
    metrics: [
      { key: 'ftp_watt', fromTests: ['ftp_20min'] },
      { key: 'ftp_watt_per_kg', fromTests: ['ftp_20min'], digits: 2 },
      { key: 'watts_per_kg', fromTests: ['peak_power_5s', 'wingate_30s', 'ramp_test_bike'], digits: 2 },
      { key: 'efficiency_w_per_bpm', fromTests: ['submax_efficiency_bike'], digits: 2 },
    ],
  },
  {
    category: 'swimming',
    metrics: [
      { key: 'css_speed_m_s', fromTests: ['swim_css_test'], digits: 2 },
      { key: 'css_pace_s_100m', fromTests: ['swim_css_test'], lowerIsBetter: true, digits: 1 },
      { key: 'swim_technique_score', fromTests: ['swim_incremental'], digits: 1 },
    ],
  },
  {
    category: 'rowing',
    metrics: [
      { key: 'avg_pace_s_per_500m', fromTests: ['row_2000m', 'row_1000m', 'ski_erg_1000m'], lowerIsBetter: true, digits: 1 },
      { key: 'avg_power_w', fromTests: ['row_2000m', 'row_1000m'] },
      { key: 'watts_per_kg', fromTests: ['row_2000m', 'row_1000m'], digits: 2 },
    ],
  },
  {
    category: 'strength',
    metrics: [
      { key: 'one_rm_kg', fromTests: ['clean_1rm', 'overhead_press_1rm'], digits: 1 },
      { key: 'relative_strength_bw', fromTests: ['clean_1rm', 'overhead_press_1rm', 'bear_complex'], digits: 2 },
      { key: 'sinclair_points', fromTests: ['clean_1rm'], digits: 1 },
      { key: 'grip_relative', fromTests: ['grip_strength'], digits: 2 },
    ],
  },
  {
    category: 'combat',
    metrics: [
      { key: 'sjft_index', fromTests: ['special_judo_fitness_test'], lowerIsBetter: true, digits: 1 },
      { key: 'swft_index', fromTests: ['special_wrestling_fitness_test'], lowerIsBetter: true, digits: 1 },
      { key: 'fatigue_index_percent', fromTests: ['jjapt', 'uchi_komi_fitness_test', 'fatigue_circuit_4x30s'], lowerIsBetter: true, digits: 1 },
      { key: 'grip_relative', fromTests: ['grip_strength'], digits: 2 },
    ],
  },
  {
    category: 'hybrid',
    metrics: [
      { key: 'total_reps', fromTests: ['cindy_20min_amrap'] },
      { key: 'reps_per_minute', fromTests: ['cindy_20min_amrap', 'rope_skipping_3min'], digits: 1 },
      { key: 'calories_per_minute', fromTests: ['assault_bike_10min_cal'], digits: 1 },
      { key: 'fatigue_index_percent', fromTests: ['fatigue_circuit_4x30s', 'repeated_sprint_bike'], lowerIsBetter: true, digits: 1 },
    ],
  },
  {
    // Drei Sportarten in einer Ansicht — genau das ist ein Triathlonmodul.
    category: 'triathlon',
    metrics: [
      { key: 'vo2max_ml_kg_min', fromTests: ['cooper_12min', 'beep_test_20m'], digits: 1 },
      { key: 'ftp_watt_per_kg', fromTests: ['ftp_20min'], digits: 2 },
      { key: 'css_speed_m_s', fromTests: ['swim_css_test'], digits: 2 },
      { key: 'hr_drift_percent', fromTests: ['hr_drift_test'], lowerIsBetter: true, digits: 1 },
    ],
  },
  {
    category: 'tactical',
    metrics: [
      { key: 'total_load_kg', fromTests: ['weighted_pull_up_1rm'], digits: 1 },
      { key: 'total_load_bw', fromTests: ['weighted_pull_up_1rm'], digits: 2 },
      { key: 'seconds_per_station', fromTests: ['obstacle_course_sim'], lowerIsBetter: true, digits: 1 },
      { key: 'grip_relative', fromTests: ['grip_strength'], digits: 2 },
    ],
  },
  {
    category: 'team',
    metrics: [
      { key: 'watts_per_kg', fromTests: ['wingate_30s', 'peak_power_5s'], digits: 2 },
      { key: 'fatigue_index_percent', fromTests: ['repeated_sprint_bike', 'wingate_30s'], lowerIsBetter: true, digits: 1 },
      { key: 'vo2max_ml_kg_min', fromTests: ['beep_test_20m', 'cooper_12min'], digits: 1 },
    ],
  },
  {
    category: 'athletics',
    metrics: [
      { key: 'avg_jump_height_cm', fromTests: ['repeated_jump_15s'], digits: 1 },
      { key: 'watts_per_kg', fromTests: ['peak_power_5s', 'wingate_30s'], digits: 2 },
      { key: 'relative_strength_bw', fromTests: ['clean_1rm', 'bear_complex'], digits: 2 },
    ],
  },
]

export function moduleFor(category: SportCategoryId | null): SportModule | null {
  return SPORT_MODULES.find((m) => m.category === category) ?? null
}

/**
 * Die Laufstrecken, aus denen eine kritische Geschwindigkeit entstehen kann.
 *
 * Nur maximale Dauerläufe über eine feste Strecke oder Zeit — ein
 * Intervalltest taugt für dieses Modell nicht.
 */
export const RUN_DISTANCES: Record<string, { meters: number | null; secondsFixed: number | null }> = {
  run_1_5_mile: { meters: 2414, secondsFixed: null },
  run_2_mile: { meters: 3219, secondsFixed: null },
  run_5k: { meters: 5000, secondsFixed: null },
  cooper_12min: { meters: null, secondsFixed: 720 },
}
