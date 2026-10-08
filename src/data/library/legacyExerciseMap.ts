/**
 * Zusammenführung des alten Übungskatalogs (`data/exercises.ts`, Kennungen wie
 * `back_squat`) mit der kuratierten Übungsdatenbank v1.1 (`EX_…`-Kennungen).
 *
 * Bestehende Trainingslogs behalten ihre alte Kennung — nichts wird umgeschrieben.
 * Die Bibliothek zeigt eine zugeordnete Übung nur einmal (als Datenbank-Eintrag);
 * alte Einträge ohne Gegenstück bleiben als Zusatz im Katalog stehen.
 *
 * Zuordnung nur bei gleicher Bewegung, gleichem Gerät und gleicher Absicht
 * (Duplikatregel der Übungsdatenbank, Kap. 12). Varianten (z. B. Latzug eng
 * gegenüber breit, Beinbeuger sitzend) werden bewusst NICHT zugeordnet.
 */
export const LEGACY_TO_REGISTRY: Record<string, string> = {
  back_squat: 'EX_STR_BAR_001_KNIEBEUGE',
  front_squat: 'EX_STR_BAR_002_FRONTKNIEBEUGE',
  deadlift: 'EX_STR_BAR_003_KREUZHEBEN',
  romanian_deadlift: 'EX_STR_BAR_004_RUMANISCHES_KREUZHEBEN',
  bench_press: 'EX_STR_BAR_005_BANKDRUCKEN',
  barbell_row: 'EX_STR_BAR_006_VORGEBEUGTES_RUDERN',
  overhead_press: 'EX_STR_BAR_007_UBERKOPFDRUCKEN',
  power_clean: 'EX_STR_BAR_008_POWER_CLEAN',
  sumo_deadlift: 'EX_STR_BAR_009_SUMO_KREUZHEBEN',
  hip_thrust: 'EX_STR_BAR_011_HIP_THRUST_BECKENHEBEN_MIT_L',
  db_bench_press: 'EX_STR_ACC_018_KURZHANTEL_BANKDRUCKEN',
  db_row: 'EX_STR_ACC_019_EINARMIGES_KURZHANTEL_RUDERN',
  db_shoulder_press: 'EX_STR_ACC_020_SCHULTERDRUCKEN_MIT_KURZHANT',
  leg_press: 'EX_STR_ACC_022_BEINPRESSE',
  leg_curl_lying: 'EX_STR_ACC_023_BEINBEUGER_LIEGEND',
  leg_extension: 'EX_STR_ACC_024_BEINSTRECKER',
  calf_raise_standing: 'EX_STR_ACC_025_WADENHEBEN_STEHEND',
  cable_row: 'EX_STR_ACC_026_KABEL_RUDERN_SITZEND',
  lat_pulldown_wide: 'EX_STR_ACC_027_LATZUG_ZUR_BRUST',
  face_pull: 'EX_STR_ACC_028_FACE_PULL',
  cable_fly: 'EX_STR_ACC_029_BUTTERFLY_CABLE_FLY',
  db_curl: 'EX_STR_ACC_030_BIZEPSCURL_MIT_KURZHANTELN',
  triceps_pushdown: 'EX_STR_ACC_031_TRIZEPSDRUCKEN_AM_KABEL',
  lateral_raise: 'EX_STR_ACC_032_SEITHEBEN_MIT_KURZHANTELN',
  push_up: 'EX_BW_034_LIEGESTUTZ',
  pull_up: 'EX_BW_035_KLIMMZUG',
  dip: 'EX_BW_037_DIPS',
  bulgarian_split_squat: 'EX_BW_043_BULGARISCHE_SPLIT_KNIEBEUGE',
  hanging_leg_raise: 'EX_BW_047_HANGENDES_BEINHEBEN',
  box_jump: 'EX_PLYO_052_BOX_JUMP',
  kettlebell_swing: 'EX_KB_078_KETTLEBELL_SWING',
  farmers_walk: 'EX_KB_085_FARMERS_WALK',
  plank: 'EX_CORE_107_UNTERARMSTUTZ',
  ab_wheel: 'EX_CORE_108_AB_WHEEL_ROLLOUT',
  rowing_erg: 'EX_COND_119_RUDERERGOMETER',
}

/** Rückrichtung: Datenbank-ID → alte Katalogkennung (für Logs und Muskelsummen). */
export const REGISTRY_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_TO_REGISTRY).map(([k, v]) => [v, k]),
)
