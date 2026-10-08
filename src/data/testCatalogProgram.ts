import type { TestBlueprint, TestField } from './testCatalog'

/**
 * Tests aus dem Programm-Seed v4 (Testkatalog §6): die Retests der
 * Bibliothekspläne, die es im KYDON-Katalog noch nicht gab (5 km, 10 km und
 * Klimmzüge gibt es schon: `run_5k`, `run_10k`, `pull_up_max_reps`).
 *
 * Keine Referenzwerte, keine Normen (Regel 6). Der Messfehler ist im Seed nur
 * geschätzt («~1–2 %», «2,5–5 kg») und ohne Quelle — solange er nicht belegt
 * ist, zeigt die App Werte und Verläufe, aber kein «besser/schlechter»
 * (Regel 7, `domain/change.ts`: ohne Messfehler keine Bewertung).
 *
 * Mehrere Lifts in einem Test (3RM/5RM/10RM): jeder Lift ist ein eigenes Feld;
 * die Summe ist die Hauptkennzahl nur, wenn alle Lifts gemessen sind — eine
 * Teilsumme wäre kein vergleichbarer Wert.
 */

const HR_RPE: TestField[] = [
  { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
]

const kg = (key: string, required = true): TestField => ({ key, type: 'number', unit: 'kg', required, min: 10, max: 500, step: 0.5 })

const sumOf = (keys: string[], metric: string): TestBlueprint['derive'] => (values, _ctx, put) => {
  const xs = keys.map((k) => values[k])
  if (xs.every((x) => x != null && Number.isFinite(x))) put(metric, xs.reduce((a, b) => a + b, 0))
}

export const PROGRAM_TESTS: TestBlueprint[] = [
  {
    slug: 'strength_5rm',
    primaryMetric: 'total5RmKg',
    primaryUnit: 'kg',
    fields: [kg('squat5RmKg'), kg('bench5RmKg'), kg('deadlift5RmKg')],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: false,
    derivedMetrics: ['total5RmKg'],
    derive: sumOf(['squat5RmKg', 'bench5RmKg', 'deadlift5RmKg'], 'total5RmKg'),
    sortOrder: 763,
    name: { de: '5RM Kniebeuge, Bankdrücken, Kreuzheben', en: '5RM squat, bench press, deadlift' },
    shortName: { de: '5RM KB/BD/KH', en: '5RM S/B/D' },
    summary: { de: 'Direkter Test der höchsten Last für fünf saubere Wiederholungen je Lift. Keine Schätzformel.', en: 'Direct test of the heaviest load for five clean repetitions per lift. No estimation formula.' },
    instructions: {
      de: 'Angeleitetes Aufwärmen, dann je Lift steigern bis zu fünf sauberen Wiederholungen; volle Pausen. Gleiche Übungsausführung wie zu Planbeginn.',
      en: 'Guided warm-up, then build up per lift to five clean repetitions; full rest. Same exercise execution as at the start of the plan.',
    },
    equipmentIds: [['barbell'], ['bench']],
    equipment: { de: 'Langhantel, Rack, Bank', en: 'Barbell, rack, bench' },
  },
  {
    slug: 'strength_3rm',
    primaryMetric: 'total3RmKg',
    primaryUnit: 'kg',
    fields: [kg('squat3RmKg'), kg('bench3RmKg'), kg('deadlift3RmKg')],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: false,
    derivedMetrics: ['total3RmKg'],
    derive: sumOf(['squat3RmKg', 'bench3RmKg', 'deadlift3RmKg'], 'total3RmKg'),
    sortOrder: 764,
    name: { de: '3RM Kniebeuge, Bankdrücken, Kreuzheben', en: '3RM squat, bench press, deadlift' },
    shortName: { de: '3RM KB/BD/KH', en: '3RM S/B/D' },
    summary: { de: 'Höchste Last für drei saubere Wiederholungen je Lift; nur für Erfahrene.', en: 'Heaviest load for three clean repetitions per lift; experienced athletes only.' },
    instructions: {
      de: 'Wie beim 5RM-Test, aber drei Wiederholungen. Nur mit sicherer Technik und Sicherung.',
      en: 'As in the 5RM test, but three repetitions. Only with safe technique and spotting.',
    },
    equipmentIds: [['barbell'], ['bench']],
    equipment: { de: 'Langhantel, Rack, Bank', en: 'Barbell, rack, bench' },
  },
  {
    slug: 'strength_10rm',
    primaryMetric: 'total10RmKg',
    primaryUnit: 'kg',
    fields: [kg('squat10RmKg'), kg('press10RmKg')],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: false,
    derivedMetrics: ['total10RmKg'],
    derive: sumOf(['squat10RmKg', 'press10RmKg'], 'total10RmKg'),
    sortOrder: 765,
    name: { de: '10RM Kniebeuge- und Drückvariante', en: '10RM squat and press variation' },
    shortName: { de: '10RM', en: '10RM' },
    summary: { de: 'Höchste Last für zehn Wiederholungen in einer Kniebeuge- und einer Drückvariante – dieselben Übungen wie zu Planbeginn.', en: 'Heaviest load for ten repetitions in a squat and a press variation – the same exercises as at the start of the plan.' },
    instructions: {
      de: 'Übungswahl zu Planbeginn festhalten und beim Retest nicht wechseln. Volle Pausen zwischen den Versuchen.',
      en: 'Record the exercise choice at the start of the plan and do not change it at the retest. Full rest between attempts.',
    },
    equipmentIds: [['barbell', 'dumbbells', 'kettlebell']],
    equipment: { de: 'Langhantel, Kurzhanteln oder Kettlebell', en: 'Barbell, dumbbells or kettlebell' },
  },
  {
    slug: 'hyrox_half_sim',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [{ key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 600, max: 7200 }, ...HR_RPE],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    deviceBound: 'high',
    derivedMetrics: [],
    sortOrder: 931,
    name: { de: 'Halb-HYROX-Simulation', en: 'Half HYROX simulation' },
    shortName: { de: 'Halb-HYROX', en: 'Half HYROX' },
    summary: { de: '4 × (1 km Lauf + eine Station): 25 Wall Balls, 20 m Sled Push, 12 Burpee Broad Jumps, 20 m Farmers Carry. Gesamtzeit.', en: '4 × (1 km run + one station): 25 wall balls, 20 m sled push, 12 burpee broad jumps, 20 m farmers carry. Total time.' },
    instructions: {
      de: 'Stationsaufbau und Schlittenwiderstand festhalten: nur bei identischem Aufbau vergleichbar.',
      en: 'Record the station setup and sled resistance: only comparable with an identical setup.',
    },
    equipmentIds: [['measured_course', 'track', 'treadmill'], ['wall_ball'], ['sled'], ['kettlebell', 'dumbbells'], ['stopwatch']],
    equipment: { de: 'Laufstrecke, Wall Ball, Schlitten, Kettlebells/Kurzhanteln, Stoppuhr', en: 'Running route, wall ball, sled, kettlebells/dumbbells, stopwatch' },
  },
  {
    slug: 'gpp_circuit',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [{ key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 120, max: 3600 }, { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 }],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 932,
    name: { de: 'Standardisierter GPP-Zirkel', en: 'Standardised GPP circuit' },
    shortName: { de: 'GPP-Zirkel', en: 'GPP circuit' },
    summary: { de: '3 Runden: 10 Goblet Squats mit festem Gewicht, 10 Liegestütze, 250 m Rudern. Gesamtzeit.', en: '3 rounds: 10 goblet squats with a fixed weight, 10 push-ups, 250 m rowing. Total time.' },
    instructions: {
      de: 'Gleiches Gewicht wie beim ersten Mal; Dämpferstellung des Ruderergometers notieren.',
      en: 'Same weight as the first time; note the rowing ergometer damper setting.',
    },
    equipmentIds: [['kettlebell', 'dumbbells'], ['rowing_erg'], ['stopwatch']],
    equipment: { de: 'Kettlebell oder Kurzhantel, Ruderergometer, Stoppuhr', en: 'Kettlebell or dumbbell, rowing ergometer, stopwatch' },
  },
  {
    slug: 'hr_recovery_60s',
    primaryMetric: 'hrDropBpm',
    primaryUnit: 'bpm',
    fields: [
      { key: 'hrEndBpm', type: 'integer', unit: 'bpm', required: true, min: 60, max: 240 },
      { key: 'hrAfter60Bpm', type: 'integer', unit: 'bpm', required: true, min: 40, max: 240 },
    ],
    protocol: { mode: 'countdown', durationSeconds: 60 },
    requiresBodyWeight: false,
    deviceBound: 'high',
    derivedMetrics: ['hrDropBpm'],
    derive: (values, _ctx, put) => {
      if (values.hrEndBpm != null && values.hrAfter60Bpm != null && values.hrEndBpm >= values.hrAfter60Bpm) put('hrDropBpm', values.hrEndBpm - values.hrAfter60Bpm)
    },
    sortOrder: 933,
    name: { de: 'Herzfrequenz-Rückgang 60 s', en: 'Heart rate recovery 60 s' },
    shortName: { de: 'HF-Rückgang', en: 'HR recovery' },
    summary: { de: 'Nach 3 min definierter Intervallbelastung (z. B. 6 × 10 s hart / 50 s locker am Bike): Herzfrequenz am Ende und nach 60 s Ruhe.', en: 'After 3 min of defined interval load (e.g. 6 × 10 s hard / 50 s easy on the bike): heart rate at the end and after 60 s of rest.' },
    instructions: {
      de: 'Gleiche Belastung, gleiche Position in der Erholung (sitzend oder stehend). Koffein, Schlaf und Raumtemperatur beeinflussen die Herzfrequenz – notieren.',
      en: 'Same load, same recovery position (seated or standing). Caffeine, sleep and room temperature affect heart rate – note them.',
    },
    equipmentIds: [['heart_rate_monitor'], ['bike_erg', 'rowing_erg', 'treadmill']],
    equipment: { de: 'Pulsgurt, Ergometer', en: 'Heart rate strap, ergometer' },
  },
  {
    slug: 'opener_simulation',
    primaryMetric: 'successfulAttempts',
    primaryUnit: 'Versuche',
    fields: [
      { key: 'successfulAttempts', type: 'integer', required: true, min: 0, max: 3 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 766,
    name: { de: 'Wettkampf-Simulation mit Openern', en: 'Competition simulation with openers' },
    shortName: { de: 'Opener-Simulation', en: 'Opener simulation' },
    summary: { de: 'Je ein Versuch in Kniebeuge, Bankdrücken und Kreuzheben mit dem geplanten Opener (etwa 90 % des Ziel-Maximums) unter Wettkampfkommandos. Kein Maximalversuch.', en: 'One attempt each in squat, bench press and deadlift with the planned opener (about 90 % of the target maximum) under competition commands. Not a max attempt.' },
    instructions: {
      de: 'Kommandos und Pausen wie im Wettkampf. Gezählt werden gültige Versuche.',
      en: 'Commands and rest as in competition. Valid attempts are counted.',
    },
    equipmentIds: [['barbell'], ['bench']],
    equipment: { de: 'Langhantel, Rack, Bank', en: 'Barbell, rack, bench' },
  },
]
