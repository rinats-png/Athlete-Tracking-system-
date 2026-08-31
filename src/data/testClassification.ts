import type { PerformanceDimension, ScoringDirection, TestCategory } from '@/types/domain'

/**
 * Die Einordnung aller Tests an einer Stelle.
 *
 * DER FEHLER, DEN DAS BEHEBT
 *
 * Protokoll, Kennzahlen, Achsenzuordnung und Anzeigetexte standen in einem
 * Objekt — vierzehn Belange in einer Struktur. Die folgenreichste Angabe
 * darin ist `dimensionMetrics`: sie entscheidet, auf welche Achse ein Test
 * einzahlt und aus welcher Kennzahl der Achsenwert entsteht. Sie stand
 * zwischen Anleitungstexten und Ausrüstungslisten, wo sie niemand als
 * Ganzes prüfen konnte.
 *
 * Die Einordnung ist zugleich die Schicht, die sich am häufigsten ändert:
 * eine neue Referenzstudie, eine überdachte Achsenzuordnung. Sie steht
 * deshalb hier, als eine Tabelle, die sich am Stück lesen und im Ganzen
 * beurteilen lässt — ohne die Protokolltexte anzufassen.
 *
 * Die beiden anderen Schichten bleiben, wo sie hingehören: das Protokoll
 * samt Feldern in den Katalogdateien, die Kennzahlen als `derive` neben den
 * Feldern, aus denen sie entstehen.
 *
 * `tests/classification.spec.ts` verlangt: jeder Test im Katalog hat genau
 * einen Eintrag, kein Eintrag steht ohne Test, und jede hier genannte
 * Kennzahl wird von ihrem Test auch tatsächlich gebildet.
 */

export interface TestClassification {
  category: TestCategory
  dimension: PerformanceDimension
  /** Achse -> Kennzahl, aus der der Achsenwert gebildet wird. */
  dimensionMetrics: Partial<Record<PerformanceDimension, string>>
  direction: ScoringDirection
}

export const TEST_CLASSIFICATION: Record<string, TestClassification> = {
  cooper_12min: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'vo2max_ml_kg_min' },
    direction: 'higher_is_better',
  },
  beep_test_20m: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'vo2max_ml_kg_min' },
    direction: 'higher_is_better',
  },
  row_2000m: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  back_squat_1rm: {
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: { max_strength: 'one_rm_kg', relative_strength: 'relative_strength_bw' },
    direction: 'higher_is_better',
  },
  deadlift_1rm: {
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: { max_strength: 'one_rm_kg', relative_strength: 'relative_strength_bw' },
    direction: 'higher_is_better',
  },
  bench_press_1rm: {
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: { max_strength: 'one_rm_kg', relative_strength: 'relative_strength_bw' },
    direction: 'higher_is_better',
  },
  clean_and_jerk_1rm: {
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: {
      max_strength: 'one_rm_kg',
      relative_strength: 'relative_strength_bw',
      power: 'relative_strength_bw',
    },
    direction: 'higher_is_better',
  },
  snatch_1rm: {
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: {
      max_strength: 'one_rm_kg',
      relative_strength: 'relative_strength_bw',
      power: 'relative_strength_bw',
    },
    direction: 'higher_is_better',
  },
  bear_complex: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'loadKg', relative_strength: 'relative_strength_bw' },
    direction: 'higher_is_better',
  },
  cindy_20min_amrap: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'total_reps' },
    direction: 'higher_is_better',
  },
  assault_bike_10min_cal: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'calories', endurance: 'calories' },
    direction: 'higher_is_better',
  },
  illinois_agility: {
    category: 'agility',
    dimension: 'agility',
    dimensionMetrics: { agility: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  standing_broad_jump: {
    category: 'power',
    dimension: 'power',
    dimensionMetrics: { power: 'distanceM' },
    direction: 'higher_is_better',
  },
  sprint_10m: {
    category: 'speed',
    dimension: 'power',
    dimensionMetrics: { power: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  sprint_20m: {
    category: 'speed',
    dimension: 'power',
    dimensionMetrics: { power: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  sprint_30m: {
    category: 'speed',
    dimension: 'power',
    dimensionMetrics: { power: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  sprint_40yd: {
    category: 'speed',
    dimension: 'power',
    dimensionMetrics: { power: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  shuttle_5_10_5: {
    category: 'agility',
    dimension: 'agility',
    dimensionMetrics: { agility: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  t_test_agility: {
    category: 'agility',
    dimension: 'agility',
    dimensionMetrics: { agility: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  countermovement_jump: {
    category: 'power',
    dimension: 'power',
    dimensionMetrics: { power: 'jumpHeightCm' },
    direction: 'higher_is_better',
  },
  squat_jump: {
    category: 'power',
    dimension: 'power',
    dimensionMetrics: { power: 'jumpHeightCm' },
    direction: 'higher_is_better',
  },
  vertical_jump_reach: {
    category: 'power',
    dimension: 'power',
    dimensionMetrics: { power: 'jumpHeightCm' },
    direction: 'higher_is_better',
  },
  repeated_jump_15s: {
    category: 'power',
    dimension: 'power',
    dimensionMetrics: { power: 'avg_jump_height_cm', strength_endurance: 'jumpCount' },
    direction: 'higher_is_better',
  },
  overhead_press_1rm: {
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: { max_strength: 'one_rm_kg', relative_strength: 'relative_strength_bw' },
    direction: 'higher_is_better',
  },
  clean_1rm: {
    category: 'max_strength',
    dimension: 'max_strength',
    dimensionMetrics: {
      max_strength: 'one_rm_kg',
      relative_strength: 'relative_strength_bw',
      power: 'relative_strength_bw',
    },
    direction: 'higher_is_better',
  },
  pull_up_max_reps: {
    category: 'strength_endurance',
    dimension: 'relative_strength',
    dimensionMetrics: { relative_strength: 'reps', strength_endurance: 'reps' },
    direction: 'higher_is_better',
  },
  weighted_pull_up_1rm: {
    category: 'max_strength',
    dimension: 'relative_strength',
    dimensionMetrics: { relative_strength: 'total_load_bw', max_strength: 'total_load_kg' },
    direction: 'higher_is_better',
  },
  run_1_5_mile: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  run_5k: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  fran: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  grace: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  murph: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  special_judo_fitness_test: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'sjft_index', power: 'totalThrows' },
    direction: 'lower_is_better',
  },
  grip_strength: {
    category: 'max_strength',
    dimension: 'relative_strength',
    dimensionMetrics: { relative_strength: 'grip_relative', max_strength: 'gripKg' },
    direction: 'higher_is_better',
  },
  grip_hang_time: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: {
      strength_endurance: 'durationSeconds',
      relative_strength: 'durationSeconds',
    },
    direction: 'higher_is_better',
  },
  repeated_throws_30s: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', power: 'reps' },
    direction: 'higher_is_better',
  },
  punch_test_60s: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', power: 'reps' },
    direction: 'higher_is_better',
  },
  kick_test_60s: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', power: 'reps' },
    direction: 'higher_is_better',
  },
  plank_hold: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds' },
    direction: 'higher_is_better',
  },
  farmers_carry: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', relative_strength: 'load_relative' },
    direction: 'lower_is_better',
  },
  sled_push: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', relative_strength: 'load_relative' },
    direction: 'lower_is_better',
  },
  sled_drag: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', relative_strength: 'load_relative' },
    direction: 'lower_is_better',
  },
  stair_climb: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', relative_strength: 'load_relative' },
    direction: 'lower_is_better',
  },
  loaded_march: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', relative_strength: 'load_relative' },
    direction: 'lower_is_better',
  },
  wall_balls_75: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  burpee_broad_jump_80m: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', power: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  row_1000m: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  run_10k: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  threshold_run_30min: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'distanceM' },
    direction: 'higher_is_better',
  },
  ftp_20min: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'ftp_watt' },
    direction: 'higher_is_better',
  },
  ramp_test_bike: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'peakPowerW' },
    direction: 'higher_is_better',
  },
  peak_power_5s: {
    category: 'power',
    dimension: 'power',
    dimensionMetrics: { power: 'peakPowerW', max_strength: 'peakPowerW' },
    direction: 'higher_is_better',
  },
  wingate_30s: {
    category: 'power',
    dimension: 'power',
    dimensionMetrics: { power: 'avgPowerW', strength_endurance: 'fatigue_index_percent' },
    direction: 'higher_is_better',
  },
  lactate_step_test: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'thresholdSpeed' },
    direction: 'higher_is_better',
  },
  swim_100m: {
    category: 'endurance',
    dimension: 'power',
    dimensionMetrics: { power: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  swim_400m: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  swim_incremental: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'thresholdPaceS100', strength_endurance: 'strokeLengthM' },
    direction: 'lower_is_better',
  },
  brick_bike_run: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds', strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  special_wrestling_fitness_test: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'swft_index', power: 'totalThrows' },
    direction: 'lower_is_better',
  },
  uchi_komi_fitness_test: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', power: 'repsFirst30' },
    direction: 'higher_is_better',
  },
  jjapt: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps' },
    direction: 'higher_is_better',
  },
  punch_test_180s: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps' },
    direction: 'higher_is_better',
  },
  grappling_circuit_5min: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'rounds' },
    direction: 'higher_is_better',
  },
  fatigue_circuit_4x30s: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps' },
    direction: 'higher_is_better',
  },
  rope_climb: {
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', max_strength: 'reps' },
    direction: 'higher_is_better',
  },
  rope_skipping_3min: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', power: 'reps' },
    direction: 'higher_is_better',
  },
  ski_erg_1000m: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds', strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  crawl_30m: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  obstacle_course_sim: {
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  uphill_run_test: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds', strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  downhill_run_test: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds', power: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  hr_drift_test: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'hr_drift_percent' },
    direction: 'lower_is_better',
  },
  submax_efficiency_bike: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'efficiency_w_per_bpm' },
    direction: 'higher_is_better',
  },
  repeated_sprint_bike: {
    category: 'conditioning',
    dimension: 'power',
    dimensionMetrics: { power: 'peakPowerW', strength_endurance: 'fatigue_index_percent' },
    direction: 'higher_is_better',
  },
  swim_100m_backstroke: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  swim_100m_breaststroke: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
  swim_100m_butterfly: {
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds' },
    direction: 'lower_is_better',
  },
}
