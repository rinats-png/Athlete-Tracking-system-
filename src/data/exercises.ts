/**
 * Übungskatalog für das Trainingslog (Schicht S2).
 *
 * Aus der Übungs-DB des Coaching-Systems v4.0.0 übernommen: Name,
 * Primärmuskel, Gerät. Der Primärmuskel ist die EINZIGE Zuordnung — Sekundär-
 * muskeln werden bewusst nicht mitgezählt (v4, Blatt Muskelvolumen), weil
 * sonst jeder Satz Bankdrücken auch als Trizepssatz zählte und die Wochen-
 * summe je Muskel nichts mehr bedeutete.
 *
 * Der Katalog ist ein ANGEBOT, keine Grenze: wer eine Übung nicht findet,
 * trägt sie frei ein (`exerciseKey: 'custom'`). Eine freie Übung hat keinen
 * Primärmuskel und zählt in keiner Muskelsumme — das ist ehrlicher als ein
 * geratener.
 *
 * Keine Technikhinweise, keine Sätze-Vorgaben, keine «empfohlenen» Wieder-
 * holungen (§81). Der Katalog sagt, WAS eine Übung ist, nicht, wie viel
 * davon jemand tun soll.
 */

export type Muscle =
  | 'legs'
  | 'glutes'
  | 'calves'
  | 'back'
  | 'lower_back'
  | 'chest'
  | 'shoulders'
  | 'neck'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'full_body'
  | 'cardio'

export const MUSCLES: Muscle[] = [
  'legs',
  'glutes',
  'calves',
  'back',
  'lower_back',
  'chest',
  'shoulders',
  'neck',
  'biceps',
  'triceps',
  'core',
  'full_body',
  'cardio',
]

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'ez_bar' | 'other'

export interface ExerciseDefinition {
  key: string
  name: { de: string; en: string }
  muscle: Muscle
  equipment: Equipment
}

const E = (key: string, de: string, en: string, muscle: Muscle, equipment: Equipment): ExerciseDefinition => ({
  key,
  name: { de, en },
  muscle,
  equipment,
})

export const EXERCISES: ExerciseDefinition[] = [
  // --- Beine ---------------------------------------------------------------
  E('back_squat', 'Kniebeuge (Langhantel)', 'Back squat (barbell)', 'legs', 'barbell'),
  E('front_squat', 'Frontkniebeuge', 'Front squat', 'legs', 'barbell'),
  E('hack_squat', 'Hackenschmidt-Kniebeuge', 'Hack squat', 'legs', 'machine'),
  E('leg_press', 'Beinpresse', 'Leg press', 'legs', 'machine'),
  E('bulgarian_split_squat', 'Bulgarian Split Squat', 'Bulgarian split squat', 'legs', 'dumbbell'),
  E('lunge', 'Ausfallschritte', 'Lunges', 'legs', 'dumbbell'),
  E('leg_extension', 'Beinstrecker', 'Leg extension', 'legs', 'machine'),
  E('leg_curl_lying', 'Beinbeuger liegend', 'Lying leg curl', 'legs', 'machine'),
  E('leg_curl_seated', 'Beinbeuger sitzend', 'Seated leg curl', 'legs', 'machine'),
  E('romanian_deadlift', 'Rumänisches Kreuzheben', 'Romanian deadlift', 'legs', 'barbell'),
  E('deadlift', 'Kreuzheben konventionell', 'Conventional deadlift', 'back', 'barbell'),
  E('sumo_deadlift', 'Sumo-Kreuzheben', 'Sumo deadlift', 'legs', 'barbell'),
  E('adductor_machine', 'Adduktoren-Maschine', 'Adductor machine', 'legs', 'machine'),
  E('box_jump', 'Box Jumps', 'Box jumps', 'legs', 'bodyweight'),
  // --- Gesäss --------------------------------------------------------------
  E('hip_thrust', 'Hip Thrust', 'Hip thrust', 'glutes', 'barbell'),
  E('glute_bridge', 'Glute Bridge', 'Glute bridge', 'glutes', 'bodyweight'),
  E('abductor_machine', 'Abduktoren-Maschine', 'Abductor machine', 'glutes', 'machine'),
  // --- Waden ---------------------------------------------------------------
  E('calf_raise_standing', 'Wadenheben stehend', 'Standing calf raise', 'calves', 'machine'),
  E('calf_raise_seated', 'Wadenheben sitzend', 'Seated calf raise', 'calves', 'machine'),
  // --- Brust ---------------------------------------------------------------
  E('bench_press', 'Bankdrücken (Langhantel)', 'Bench press (barbell)', 'chest', 'barbell'),
  E('incline_bench_press', 'Schrägbankdrücken (Langhantel)', 'Incline bench press (barbell)', 'chest', 'barbell'),
  E('db_bench_press', 'Kurzhantel-Bankdrücken', 'Dumbbell bench press', 'chest', 'dumbbell'),
  E('db_incline_press', 'Kurzhantel-Schrägbankdrücken', 'Dumbbell incline press', 'chest', 'dumbbell'),
  E('chest_press_machine', 'Brustpresse Maschine', 'Chest press machine', 'chest', 'machine'),
  E('cable_fly', 'Fliegende (Kabel)', 'Cable fly', 'chest', 'cable'),
  E('pec_deck', 'Butterfly', 'Pec deck', 'chest', 'machine'),
  E('dip', 'Dips', 'Dips', 'chest', 'bodyweight'),
  E('push_up', 'Liegestütze', 'Push-ups', 'chest', 'bodyweight'),
  // --- Rücken --------------------------------------------------------------
  E('pull_up', 'Klimmzüge', 'Pull-ups', 'back', 'bodyweight'),
  E('lat_pulldown_wide', 'Latzug breit', 'Lat pulldown (wide)', 'back', 'cable'),
  E('lat_pulldown_close', 'Latzug eng', 'Lat pulldown (close)', 'back', 'cable'),
  E('barbell_row', 'Langhantelrudern', 'Barbell row', 'back', 'barbell'),
  E('db_row', 'Kurzhantelrudern einarmig', 'One-arm dumbbell row', 'back', 'dumbbell'),
  E('cable_row', 'Kabelrudern sitzend', 'Seated cable row', 'back', 'cable'),
  E('t_bar_row', 'T-Bar-Rudern', 'T-bar row', 'back', 'barbell'),
  E('chest_supported_row', 'Rudermaschine (Chest Supported)', 'Chest-supported row', 'back', 'machine'),
  E('cable_pullover', 'Überzüge (Kabel)', 'Cable pullover', 'back', 'cable'),
  E('hyperextension', 'Hyperextensions', 'Back extensions', 'lower_back', 'bodyweight'),
  E('face_pull', 'Face Pulls', 'Face pulls', 'shoulders', 'cable'),
  // --- Schultern -----------------------------------------------------------
  E('overhead_press', 'Schulterdrücken (Langhantel)', 'Overhead press (barbell)', 'shoulders', 'barbell'),
  E('db_shoulder_press', 'Schulterdrücken (Kurzhantel)', 'Dumbbell shoulder press', 'shoulders', 'dumbbell'),
  E('shoulder_press_machine', 'Schulterpresse Maschine', 'Shoulder press machine', 'shoulders', 'machine'),
  E('lateral_raise', 'Seitheben (Kurzhantel)', 'Lateral raise (dumbbell)', 'shoulders', 'dumbbell'),
  E('cable_lateral_raise', 'Seitheben (Kabel)', 'Cable lateral raise', 'shoulders', 'cable'),
  E('reverse_fly', 'Reverse Flys', 'Reverse fly', 'shoulders', 'machine'),
  E('front_raise', 'Frontheben', 'Front raise', 'shoulders', 'dumbbell'),
  E('arnold_press', 'Arnold Press', 'Arnold press', 'shoulders', 'dumbbell'),
  E('shrug', 'Shrugs', 'Shrugs', 'neck', 'dumbbell'),
  // --- Arme ----------------------------------------------------------------
  E('barbell_curl', 'Bizepscurls (Langhantel)', 'Barbell curl', 'biceps', 'barbell'),
  E('db_curl', 'Bizepscurls (Kurzhantel)', 'Dumbbell curl', 'biceps', 'dumbbell'),
  E('hammer_curl', 'Hammercurls', 'Hammer curl', 'biceps', 'dumbbell'),
  E('preacher_curl', 'Scottcurls', 'Preacher curl', 'biceps', 'ez_bar'),
  E('cable_curl', 'Kabelcurls', 'Cable curl', 'biceps', 'cable'),
  E('concentration_curl', 'Konzentrationscurls', 'Concentration curl', 'biceps', 'dumbbell'),
  E('triceps_pushdown', 'Trizepsdrücken (Kabel)', 'Triceps pushdown', 'triceps', 'cable'),
  E('overhead_triceps_extension', 'Overhead-Trizepsdrücken', 'Overhead triceps extension', 'triceps', 'cable'),
  E('skull_crusher', 'Skullcrusher', 'Skull crusher', 'triceps', 'ez_bar'),
  E('close_grip_bench', 'Enges Bankdrücken', 'Close-grip bench press', 'triceps', 'barbell'),
  E('triceps_kickback', 'Trizeps-Kickbacks', 'Triceps kickback', 'triceps', 'dumbbell'),
  // --- Rumpf ---------------------------------------------------------------
  E('crunch', 'Crunches', 'Crunches', 'core', 'bodyweight'),
  E('hanging_leg_raise', 'Beinheben hängend', 'Hanging leg raise', 'core', 'bodyweight'),
  E('cable_crunch', 'Kabel-Crunches', 'Cable crunch', 'core', 'cable'),
  E('plank', 'Plank', 'Plank', 'core', 'bodyweight'),
  E('russian_twist', 'Russian Twist', 'Russian twist', 'core', 'bodyweight'),
  E('ab_wheel', 'Ab-Wheel Rollout', 'Ab wheel rollout', 'core', 'other'),
  // --- Ganzkörper ----------------------------------------------------------
  E('farmers_walk', 'Farmers Walk', "Farmer's walk", 'full_body', 'dumbbell'),
  E('kettlebell_swing', 'Kettlebell Swing', 'Kettlebell swing', 'full_body', 'kettlebell'),
  E('power_clean', 'Umsetzen (Power Clean)', 'Power clean', 'full_body', 'barbell'),
  // --- Cardio --------------------------------------------------------------
  E('treadmill', 'Laufband', 'Treadmill', 'cardio', 'machine'),
  E('stair_climber', 'Stepper', 'Stair climber', 'cardio', 'machine'),
  E('rowing_erg', 'Rudergerät', 'Rowing ergometer', 'cardio', 'machine'),
  E('bike_erg', 'Fahrrad-Ergometer', 'Bike ergometer', 'cardio', 'machine'),
]

/** Kennung einer frei eingetragenen Übung ohne Katalogeintrag. */
export const CUSTOM_EXERCISE = 'custom'

const byKey = new Map(EXERCISES.map((e) => [e.key, e]))

export function exerciseByKey(key: string): ExerciseDefinition | null {
  return byKey.get(key) ?? null
}

/**
 * Suche ohne Rücksicht auf Sprache, Gross-/Kleinschreibung und Umlaute:
 * «bank» findet Bankdrücken und Bench press, «kniebeuge» findet Squat.
 */
export function searchExercises(query: string, limit = 8): ExerciseDefinition[] {
  const q = fold(query)
  if (!q) return EXERCISES.slice(0, limit)
  return EXERCISES.filter((e) => fold(e.name.de).includes(q) || fold(e.name.en).includes(q)).slice(0, limit)
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
}
