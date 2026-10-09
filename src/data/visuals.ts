/**
 * Bildzuordnung für Pläne und Einheiten (Neugestaltung «weniger Text, mehr
 * Bild»). Die Bilder stammen aus der vorhandenen Bildwelt
 * (`public/testbilder`: S_* Programm-, U_* Übungsbilder) und sind Schmuck —
 * sie tragen keine Aussage, nur einen Wiedererkennungswert.
 */
import { exerciseImageUrl } from '@/data/exerciseImages'
import { REGISTRY_TO_LEGACY } from '@/data/library/legacyExerciseMap'

const img = (file: string) => `/testbilder/${file}`

/** Planziel (Seed-Kennung) → Bild. */
const GOAL_IMAGE: Record<string, string> = {
  HYROX: 'S_sled_drag.webp',
  RUN_5K: 'S_run_5k.webp',
  RUN_10K: 'S_threshold_run_30min.webp',
  GENERAL_FITNESS: 'S_cindy_20min_amrap.webp',
  POWERLIFTING: 'U_deadlift.jpg',
  GENERAL_STRENGTH: 'U_back_squat.jpg',
  HYPERTROPHY: 'U_bench_press.jpg',
  COMBAT_SPORT_GRAPPLING: 'S_grappling_circuit_5min.webp',
  COMBAT_SPORT_STRIKING: 'S_combat_rounds.webp',
}

/** Absicht einer Einheit → Bild, wenn die Einheit keine bebilderte Übung hat. */
const INTENT_IMAGE: Record<string, string> = {
  VO2MAX: 'S_row_1000m.webp',
  REPEATED_SPRINT: 'S_repeated_sprint_bike.webp',
  MAX_STRENGTH: 'U_back_squat.jpg',
  POWER: 'U_power_clean.jpg',
  PLYOMETRIC: 'U_box_jump.jpg',
  AEROBIC_BASE: 'S_run_5k.webp',
  COMPROMISED_RUNNING: 'S_brick_bike_run.webp',
  HYROX_STATIONS: 'S_sled_drag.webp',
  GRIP_ENDURANCE: 'S_gi_grip_hang.webp',
  FIGHT_SIMULATION: 'S_grappling_circuit_5min.webp',
  RACE_REHEARSAL: 'S_brick_bike_run.webp',
  THRESHOLD: 'S_threshold_run_30min.webp',
  REPEATED_HIGH_INTENSITY: 'S_fatigue_circuit_4x30s.webp',
  LONG_ENDURANCE: 'S_run_5k.webp',
  RECOVERY_AEROBIC: 'U_bike_erg.jpg',
  RELATIVE_STRENGTH: 'U_pull_up.jpg',
  HYPERTROPHY_SUPPORT: 'U_db_row.jpg',
  STRENGTH_ENDURANCE: 'U_kettlebell_swing.jpg',
  ISOMETRIC_STRENGTH: 'U_plank.jpg',
  ACCELERATION: 'S_shuttle_5_10_5.webp',
  MAX_SPEED: 'S_shuttle_5_10_5.webp',
  AGILITY_COD: 'S_shuttle_5_10_5.webp',
  COMBAT_ROUNDS: 'S_combat_rounds.webp',
  TAPER_MAINTENANCE: 'U_front_squat.jpg',
  GPP: 'U_farmers_walk.jpg',
  METCON: 'S_cindy_20min_amrap.webp',
  MOBILITY: 'U_glute_bridge.jpg',
  PRIMING: 'U_box_jump.jpg',
  STRENGTH_VOLUME: 'U_back_squat.jpg',
}

const FALLBACK = 'U_back_squat.jpg'

export function goalImage(goal: string | null | undefined): string {
  return img((goal && GOAL_IMAGE[goal]) || FALLBACK)
}

export function intentImage(intent: string | null | undefined): string {
  return img((intent && INTENT_IMAGE[intent]) || FALLBACK)
}

/** Bild einer Übung der Datenbank, oder null ohne Bild. */
export function libraryExerciseImage(exerciseId: string): string | null {
  const legacy = REGISTRY_TO_LEGACY[exerciseId]
  return legacy ? exerciseImageUrl(legacy) : exerciseImageUrl(exerciseId)
}

/** Bild einer geplanten Einheit: die erste bebilderte Übung, sonst die Absicht. */
export function sessionImage(session: { primaryIntent: string; blocks: ReadonlyArray<{ type: string; exerciseId?: string }> }): string {
  for (const b of session.blocks) {
    if (b.type === 'library_exercise' && b.exerciseId) {
      const url = libraryExerciseImage(b.exerciseId)
      if (url) return url
    }
  }
  return intentImage(session.primaryIntent)
}

/** Kacheln des Plan-Hubs. */
export const HUB_IMAGES = {
  programs: img('S_clean_and_jerk_1rm.webp'),
  exercises: img('U_kettlebell_swing.jpg'),
  own: img('S_farmers_carry.webp'),
  calendar: img('S_run_5k.webp'),
} as const
