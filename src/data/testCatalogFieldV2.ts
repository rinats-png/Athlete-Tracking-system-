import type { TestBlueprint, TestField } from './testCatalog'
import {
  boscoPowerWkg,
  criticalSpeedFromRuns,
  jumpHeightFromFlightTime,
  reactiveStrengthIndex,
  ruffierIndices,
  samozinoJumpProfile,
  speedKmh,
  stairPowerWatts,
  threeMinuteAllOut,
  vo2maxFromIft,
} from '@/domain/fieldPhysiology'

/**
 * Feldtests aus der Mastertabelle v2 (Nr. 133–160).
 *
 * Aufgenommen ist, was sich ohne Labor durchführen lässt und ein
 * nachvollziehbares Protokoll hat. Die Quelle je Test steht am Test; die
 * Formeln mit Gültigkeitsbereich in `domain/fieldPhysiology.ts`.
 *
 * KEINE REFERENZWERTE (§19 Regel 6): für die meisten dieser Tests gibt es
 * keine belastbare Norm; wo es eine gibt (Burpee, Y-Balance), wird sie erst
 * nach Prüfung des Volltexts aufgenommen. Ob sich ein Wert verändert hat,
 * beurteilt `domain/change.ts` aus der eigenen Streuung des Athleten — dafür
 * braucht es keinen Literaturwert.
 *
 * ABWEICHUNGEN VON DER MASTERTABELLE, mit Grund:
 *
 *   - `critical_speed_run`: die Tabelle nennt 400 m + 1500 m. Das
 *     Distanz-Zeit-Modell gilt für maximale Läufe von 2–15 min; ein
 *     400-m-Lauf liegt darunter. Der Test nimmt zwei oder drei Läufe
 *     beliebiger Strecke, rechnet aber nur mit denen im gültigen Bereich
 *     (Protokoll mit drei Läufen: Galbraith et al. 2014).
 *   - `run_5min_mas` statt `run_6min_mas`: der belegte Test misst fünf
 *     Minuten (Berthon et al. 1997, SEM 0,15–0,34 km/h). Eine VO2max wird
 *     daraus nicht geschätzt — dieselben Autoren schreiben, dass das nicht
 *     mit vertretbarer Genauigkeit geht.
 *   - `bolt_breath_hold` fehlt: keine Reliabilität gefunden und kein
 *     Zusammenhang mit Leistung (Kowalski et al. 2024). Ein Test, der auf
 *     die Ausdauerachse einzahlt, ohne Ausdauer zu messen, würde das Profil
 *     verfälschen.
 *   - Knee-to-Wall und Y-Balance sind Beweglichkeit und Stabilität, keine
 *     Agilität. Sie stehen als Beobachtungswerte (Screening), nicht als
 *     Tests auf einer Leistungsachse.
 *   - Das Change-of-Direction-Deficit fehlt: belegt ist es für den 505-Test
 *     minus 10-m-Sprint (Nimphius 2016); den 505-Test gibt es im Katalog
 *     nicht, und für den 5-10-5 ist keine Referenzstrecke belegt.
 */

const HR_RPE: TestField[] = [
  { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
]
const RPE: TestField = { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 }

const reps = (max = 300): TestField => ({ key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 0, max })
const seconds = (min: number, max: number): TestField => ({ key: 'durationSeconds', type: 'duration', unit: 's', required: true, min, max })

/** Die schwächere Seite ist das Ergebnis; der Seitenunterschied steht daneben. */
const bilateral = (leftKey: string, rightKey: string, metric: string): TestBlueprint['derive'] => (values, _ctx, put) => {
  const l = values[leftKey]
  const r = values[rightKey]
  if (l == null || r == null) return
  put(metric, Math.min(l, r))
  const high = Math.max(l, r)
  put('asymmetryPercent', high > 0 ? Math.round((Math.abs(l - r) / high) * 1000) / 10 : 0)
}

export const FIELD_V2_TESTS: TestBlueprint[] = [
  // --- Ausdauer und Schwellen ------------------------------------------------
  {
    slug: 'critical_speed_run',
    primaryMetric: 'critical_speed_m_s',
    primaryUnit: 'm/s',
    fields: [
      { key: 'run1DistanceM', type: 'number', unit: 'm', required: true, min: 200, max: 6000, step: 10 },
      { key: 'run1Seconds', type: 'duration', unit: 's', required: true, min: 30, max: 1800 },
      { key: 'run2DistanceM', type: 'number', unit: 'm', required: true, min: 200, max: 6000, step: 10 },
      { key: 'run2Seconds', type: 'duration', unit: 's', required: true, min: 30, max: 1800 },
      { key: 'run3DistanceM', type: 'number', unit: 'm', required: false, min: 200, max: 6000, step: 10 },
      { key: 'run3Seconds', type: 'duration', unit: 's', required: false, min: 30, max: 1800 },
      RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['critical_speed_m_s', 'd_prime_m', 'cs_see_m'],
    derive: (values, _ctx, put) => {
      const runs = [1, 2, 3]
        .map((i) => ({ meters: values[`run${i}DistanceM`], seconds: values[`run${i}Seconds`] }))
        .filter((r) => r.meters != null && r.seconds != null)
      const fit = criticalSpeedFromRuns(runs)
      if (!fit) return
      put('critical_speed_m_s', fit.speed)
      put('d_prime_m', fit.reserve)
      put('cs_see_m', fit.seeMeters)
    },
    sortOrder: 940,
    name: { de: 'Critical-Speed-Test (2–3 Läufe)', en: 'Critical speed test (2–3 runs)' },
    shortName: { de: 'Critical Speed', en: 'Critical speed' },
    summary: {
      de: 'Kritische Geschwindigkeit aus zwei oder drei maximalen Läufen von je 2 bis 15 Minuten. Die Geschwindigkeit, die sich lange halten lässt, und die Reserve darüber.',
      en: 'Critical speed from two or three maximal runs of 2 to 15 minutes each. The speed that can be sustained for a long time, and the reserve above it.',
    },
    instructions: {
      de: 'Zwei oder drei maximale Läufe verschiedener Länge auf der Bahn, z. B. 1200, 2400 und 3600 m, mit mindestens 30 Minuten Pause dazwischen. Jeder Lauf muss zwischen 2 und 15 Minuten dauern; kürzere oder längere Läufe zählen nicht. Strecke und Zeit je Lauf eintragen.',
      en: 'Two or three maximal runs of different length on the track, e.g. 1200, 2400 and 3600 m, with at least 30 minutes of rest in between. Each run must last between 2 and 15 minutes; shorter or longer runs do not count. Enter distance and time for each run.',
    },
    equipmentIds: [['track', 'measured_course'], ['stopwatch']],
    equipment: { de: 'Laufbahn oder vermessene Strecke, Stoppuhr', en: 'Running track or measured course, stopwatch' },
  },
  {
    slug: 'run_3min_all_out',
    primaryMetric: 'critical_speed_m_s',
    primaryUnit: 'm/s',
    fields: [
      { key: 'distanceM', type: 'number', unit: 'm', required: true, min: 400, max: 2000, step: 1 },
      { key: 'distanceAt150sM', type: 'number', unit: 'm', required: true, min: 300, max: 1800, step: 1 },
      ...HR_RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 180 },
    requiresBodyWeight: false,
    derivedMetrics: ['critical_speed_m_s', 'd_prime_m'],
    derive: (values, _ctx, put) => {
      const r = threeMinuteAllOut(values.distanceM, values.distanceAt150sM)
      if (!r) return
      put('critical_speed_m_s', r.speed)
      put('d_prime_m', r.reserve)
    },
    sortOrder: 941,
    name: { de: '3-Minuten-All-Out-Lauf', en: '3-minute all-out run' },
    shortName: { de: '3MT', en: '3MT' },
    summary: {
      de: 'Drei Minuten maximal ohne Einteilung. Die Geschwindigkeit der letzten 30 Sekunden schätzt die kritische Geschwindigkeit.',
      en: 'Three minutes flat out with no pacing. The speed over the last 30 seconds estimates critical speed.',
    },
    instructions: {
      de: 'Gründlich aufwärmen. Dann vom Start weg so schnell wie möglich laufen und bis zum Ende nicht einteilen. Strecke nach 2:30 min und nach 3:00 min erfassen, am besten per GPS-Uhr oder Markierungen alle 10 m.',
      en: 'Warm up thoroughly. Then run as fast as possible from the start and do not pace until the end. Record the distance at 2:30 min and at 3:00 min, ideally with a GPS watch or markers every 10 m.',
    },
    equipmentIds: [['track', 'measured_course'], ['stopwatch']],
    equipment: { de: 'Laufbahn, GPS-Uhr oder Markierungen, Stoppuhr', en: 'Running track, GPS watch or markers, stopwatch' },
  },
  {
    slug: 'run_5min_mas',
    primaryMetric: 'mas_kmh',
    primaryUnit: 'km/h',
    fields: [{ key: 'distanceM', type: 'number', unit: 'm', required: true, min: 500, max: 2500, step: 5 }, ...HR_RPE],
    protocol: { mode: 'countdown', durationSeconds: 300 },
    requiresBodyWeight: false,
    derivedMetrics: ['mas_kmh'],
    derive: (values, _ctx, put) => {
      put('mas_kmh', speedKmh(values.distanceM, 300))
    },
    sortOrder: 942,
    name: { de: '5-Minuten-Lauf (MAS)', en: '5-minute run (MAS)' },
    shortName: { de: 'MAS 5 min', en: 'MAS 5 min' },
    summary: {
      de: 'Maximale Strecke in fünf Minuten. Die mittlere Geschwindigkeit schätzt die maximale aerobe Geschwindigkeit (MAS).',
      en: 'Maximum distance in five minutes. The average speed estimates maximal aerobic speed (MAS).',
    },
    instructions: {
      de: 'Nach dem Aufwärmen fünf Minuten so weit wie möglich laufen, gleichmässig eingeteilt. Strecke auf 5 m genau erfassen.',
      en: 'After warming up, run as far as possible in five minutes, evenly paced. Record the distance to the nearest 5 m.',
    },
    equipmentIds: [['track', 'measured_course'], ['stopwatch']],
    equipment: { de: 'Laufbahn oder vermessene Strecke, Stoppuhr', en: 'Running track or measured course, stopwatch' },
  },
  {
    slug: 'bronco_shuttle_1200m',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [seconds(180, 900), ...HR_RPE],
    protocol: { mode: 'stopwatch', targetDistanceM: 1200 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 943,
    name: { de: 'Bronco-Test (1200 m Pendel)', en: 'Bronco test (1200 m shuttle)' },
    shortName: { de: 'Bronco', en: 'Bronco' },
    summary: {
      de: 'Fünf Durchgänge 20-40-60 m Pendellauf ohne Pause, 1200 m insgesamt. Mannschaftssporttest für die aerobe Leistungsfähigkeit.',
      en: 'Five sets of 20-40-60 m shuttles without rest, 1200 m in total. A team-sport test of aerobic capacity.',
    },
    instructions: {
      de: 'Markierungen bei 0, 20, 40 und 60 m. Ein Durchgang: 20 m hin und zurück, 40 m hin und zurück, 60 m hin und zurück. Fünf Durchgänge ohne Pause auf Zeit.',
      en: 'Markers at 0, 20, 40 and 60 m. One set: 20 m out and back, 40 m out and back, 60 m out and back. Five sets without rest, against the clock.',
    },
    equipmentIds: [['cones'], ['tape_measure'], ['stopwatch']],
    equipment: { de: '4 Markierungen, Massband, Stoppuhr', en: '4 markers, tape measure, stopwatch' },
  },
  {
    slug: 'ift_30_15',
    primaryMetric: 'vIftKmh',
    primaryUnit: 'km/h',
    fields: [{ key: 'vIftKmh', type: 'number', unit: 'km/h', required: true, min: 8, max: 26, step: 0.5 }, ...HR_RPE],
    protocol: { mode: 'stages' },
    requiresBodyWeight: true,
    // Eigener Schlüssel, nicht `vo2max_ml_kg_min`: eine andere Gleichung mit
    // einem anderen Fehler, und das Formelregister führt je Schlüssel genau
    // eine Rechnung.
    derivedMetrics: ['vo2max_ift_ml_kg_min'],
    derive: (values, ctx, put) => {
      const sex = ctx.sex === 'male' || ctx.sex === 'female' ? ctx.sex : null
      put('vo2max_ift_ml_kg_min', vo2maxFromIft(values.vIftKmh, ctx.ageYears, ctx.bodyWeightKg, sex))
    },
    sortOrder: 944,
    name: { de: '30-15 Intermittent Fitness Test', en: '30-15 Intermittent Fitness Test' },
    shortName: { de: '30-15 IFT', en: '30-15 IFT' },
    summary: {
      de: '30 Sekunden Pendellauf, 15 Sekunden Pause, mit steigendem Tempo. Ergebnis ist die Endgeschwindigkeit; daraus eine geschätzte VO2max (Fehler etwa ±5 ml/kg/min).',
      en: '30 seconds of shuttle running, 15 seconds of rest, at increasing speed. The result is the final speed; an estimated VO2max follows from it (error about ±5 ml/kg/min).',
    },
    instructions: {
      de: 'Pendellauf über 40 m nach Tonsignal: 30 s laufen, 15 s gehen. Start bei 8 km/h, jede Stufe 0,5 km/h schneller. Ergebnis ist die Geschwindigkeit der letzten vollständig gelaufenen Stufe.',
      en: 'Shuttle run over 40 m to an audio signal: 30 s running, 15 s walking. Start at 8 km/h, each stage 0.5 km/h faster. The result is the speed of the last completed stage.',
    },
    equipmentIds: [['cones'], ['tape_measure'], ['audio_protocol']],
    equipment: { de: '40 m markierte Strecke, Audio-Protokoll', en: '40 m marked course, audio protocol' },
  },
  {
    slug: 'vt1_talk_test',
    primaryMetric: 'thresholdSpeed',
    primaryUnit: 'km/h',
    fields: [
      { key: 'thresholdSpeed', type: 'number', unit: 'km/h', required: true, min: 4, max: 25, step: 0.1 },
      { key: 'thresholdHeartRate', type: 'integer', unit: 'bpm', required: false, min: 60, max: 220 },
      RPE,
    ],
    protocol: { mode: 'stages' },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 945,
    name: { de: 'Talk-Test (erste Schwelle)', en: 'Talk test (first threshold)' },
    shortName: { de: 'Talk-Test', en: 'Talk test' },
    summary: {
      de: 'Stufentest mit lautem Vorlesen. Die Stufe, ab der Sprechen erstmals schwerfällt, liegt nahe der ersten ventilatorischen Schwelle.',
      en: 'A stage test while reading aloud. The stage at which speaking first becomes difficult lies close to the first ventilatory threshold.',
    },
    instructions: {
      de: 'Laufband oder Bahn, Stufen von 2–3 Minuten mit steigendem Tempo. Am Ende jeder Stufe einen festen Text von etwa 30 Wörtern laut lesen. Eingetragen wird das Tempo der ersten Stufe, auf der Sprechen nicht mehr ganz mühelos ist.',
      en: 'Treadmill or track, stages of 2–3 minutes with increasing speed. At the end of each stage read a fixed text of about 30 words aloud. Enter the speed of the first stage at which speaking is no longer fully comfortable.',
    },
    equipmentIds: [['treadmill', 'track'], ['heart_rate_monitor']],
    equipment: { de: 'Laufband oder Bahn, Pulsmesser, Lesetext', en: 'Treadmill or track, heart rate monitor, reading text' },
  },
  {
    slug: 'ruffier_dickson_test',
    primaryMetric: 'dickson_index',
    primaryUnit: 'Index',
    fields: [
      { key: 'hrRest', type: 'integer', unit: 'bpm', required: true, min: 30, max: 140 },
      { key: 'hrEnd', type: 'integer', unit: 'bpm', required: true, min: 40, max: 220 },
      { key: 'hrAfter1min', type: 'integer', unit: 'bpm', required: true, min: 30, max: 220 },
    ],
    protocol: { mode: 'countdown', durationSeconds: 45 },
    requiresBodyWeight: false,
    derivedMetrics: ['ruffier_index', 'dickson_index'],
    derive: (values, _ctx, put) => {
      const r = ruffierIndices(values.hrRest, values.hrEnd, values.hrAfter1min)
      if (!r) return
      put('ruffier_index', r.ruffier)
      put('dickson_index', r.dickson)
    },
    sortOrder: 946,
    name: { de: 'Ruffier-Dickson-Test', en: 'Ruffier-Dickson test' },
    shortName: { de: 'Ruffier', en: 'Ruffier' },
    summary: {
      de: '30 Kniebeugen in 45 Sekunden, Puls davor, danach und nach einer Minute. Ein Index der Pulsreaktion — kein Mass für die Ausdauerleistung.',
      en: '30 squats in 45 seconds, pulse before, after and one minute later. An index of the heart-rate response — not a measure of endurance performance.',
    },
    instructions: {
      de: 'Fünf Minuten ruhig liegen, Ruhepuls messen. Dann 30 tiefe Kniebeugen in 45 Sekunden. Puls sofort danach im Stehen und nach einer Minute Ruhe im Liegen messen.',
      en: 'Lie still for five minutes, measure the resting pulse. Then 30 deep squats in 45 seconds. Measure the pulse immediately afterwards standing and after one minute of rest lying down.',
    },
    equipmentIds: [['heart_rate_monitor', 'stopwatch']],
    equipment: { de: 'Pulsmesser oder Stoppuhr', en: 'Heart rate monitor or stopwatch' },
  },

  // --- Schnellkraft und Schnelligkeit ---------------------------------------
  {
    slug: 'margaria_kalamen_stair',
    primaryMetric: 'stair_power_w',
    primaryUnit: 'W',
    fields: [
      { key: 'durationSeconds', type: 'number', unit: 's', required: true, min: 0.2, max: 3, step: 0.01 },
      { key: 'stairHeightM', type: 'number', unit: 'm', required: true, min: 0.5, max: 2, step: 0.01 },
      RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: true,
    // Handstoppung über eine halbe Sekunde ist zu ungenau; Lichtschranken
    // oder Kontaktmatten ergeben andere Werte als die Stoppuhr.
    deviceBound: 'high',
    derivedMetrics: ['stair_power_w', 'stair_power_w_per_kg'],
    derive: (values, ctx, put) => {
      if (!ctx.bodyWeightKg) return
      const w = stairPowerWatts(ctx.bodyWeightKg, values.stairHeightM, values.durationSeconds)
      put('stair_power_w', w)
      if (w != null) put('stair_power_w_per_kg', w / ctx.bodyWeightKg)
    },
    sortOrder: 947,
    name: { de: 'Margaria-Kalamen-Treppensprint', en: 'Margaria-Kalamen stair sprint' },
    shortName: { de: 'Margaria', en: 'Margaria' },
    summary: {
      de: 'Treppensprint mit Anlauf, je drei Stufen pro Schritt. Aus Körpermasse, Höhe und Zeit zwischen Stufe 3 und 9 entsteht die Leistung in Watt.',
      en: 'Stair sprint with a run-up, three steps per stride. Power in watts follows from body mass, height and the time between step 3 and step 9.',
    },
    instructions: {
      de: 'Sechs Meter Anlauf, dann die Treppe im Dreierschritt hinauf (Stufe 3, 6, 9). Gemessen wird die Zeit vom Aufsetzen auf Stufe 3 bis Stufe 9, am besten mit Kontaktmatten. Den Höhenunterschied zwischen Stufe 3 und 9 einmal ausmessen.',
      en: 'Six metres run-up, then up the stairs three steps at a time (step 3, 6, 9). Time is measured from contact on step 3 to step 9, ideally with contact mats. Measure the height difference between step 3 and step 9 once.',
    },
    equipmentIds: [['stairs'], ['timing_gates', 'stopwatch'], ['tape_measure']],
    equipment: { de: 'Treppe (mind. 9 Stufen), Zeitmessung, Massband', en: 'Stairs (at least 9 steps), timing, tape measure' },
  },
  {
    slug: 'flying_sprint_20m',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [{ key: 'durationSeconds', type: 'number', unit: 's', required: true, min: 1.5, max: 6, step: 0.01 }, RPE],
    protocol: { mode: 'attempts', attempts: 3, targetDistanceM: 20 },
    requiresBodyWeight: false,
    // Über 20 m fliegend ist Handstoppung ungeeignet (Haugen & Buchheit 2016).
    deviceBound: 'high',
    derivedMetrics: ['avg_velocity_m_s'],
    sortOrder: 948,
    name: { de: 'Fliegender 20-m-Sprint', en: 'Flying 20 m sprint' },
    shortName: { de: '20 m fliegend', en: '20 m flying' },
    summary: {
      de: '20 m Messstrecke nach Anlauf. Die Geschwindigkeit darauf ist die maximale Sprintgeschwindigkeit (MSS).',
      en: '20 m timed zone after a run-up. The speed through it is the maximal sprint speed (MSS).',
    },
    instructions: {
      de: 'Etwa 20–30 m Anlauf, dann mit voller Geschwindigkeit durch die 20-m-Messstrecke. Zeit mit Lichtschranken am Anfang und Ende der Messstrecke. Drei Versuche, volle Pausen.',
      en: 'About 20–30 m run-up, then through the 20 m timed zone at full speed. Time with timing gates at the start and end of the zone. Three attempts, full rest.',
    },
    equipmentIds: [['timing_gates'], ['tape_measure'], ['cones']],
    equipment: { de: 'Lichtschranken, Massband, Markierungen', en: 'Timing gates, tape measure, markers' },
  },
  {
    slug: 'drop_jump_rsi',
    primaryMetric: 'rsi_m_s',
    primaryUnit: 'm/s',
    fields: [
      { key: 'contactTimeMs', type: 'number', unit: 'ms', required: true, min: 80, max: 600, step: 1 },
      { key: 'flightTimeMs', type: 'number', unit: 'ms', required: false, min: 150, max: 1000, step: 1 },
      { key: 'reboundHeightCm', type: 'number', unit: 'cm', required: false, min: 3, max: 90, step: 0.5 },
      { key: 'dropHeightCm', type: 'number', unit: 'cm', required: true, min: 10, max: 80, step: 5 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    deviceBound: 'high',
    derivedMetrics: ['rsi_m_s', 'reboundHeightCm'],
    derive: (values, _ctx, put) => {
      // Die Höhe kommt aus der Flugzeit, wenn das Messsystem sie liefert —
      // so rechnen Sprungmatten selbst. Sonst die eingetragene Höhe.
      const height =
        values.flightTimeMs != null ? jumpHeightFromFlightTime(values.flightTimeMs / 1000) : values.reboundHeightCm
      if (height == null) return
      put('reboundHeightCm', height)
      put('rsi_m_s', reactiveStrengthIndex(height, values.contactTimeMs))
    },
    sortOrder: 949,
    name: { de: 'Drop Jump (Reaktivkraftindex)', en: 'Drop jump (reactive strength index)' },
    shortName: { de: 'Drop Jump', en: 'Drop jump' },
    summary: {
      de: 'Tiefsprung von einer Box mit sofortigem Absprung. Sprunghöhe geteilt durch Bodenkontaktzeit ergibt den Reaktivkraftindex (RSI).',
      en: 'Drop from a box with an immediate rebound. Jump height divided by ground contact time gives the reactive strength index (RSI).',
    },
    instructions: {
      de: 'Von einer Box (Standard 30 cm, Höhe eintragen) einen Schritt nach vorn fallen lassen, beidbeinig landen und so kurz wie möglich und so hoch wie möglich abspringen. Hände in den Hüften. Kontaktzeit und Flugzeit oder Sprunghöhe von der Sprungmatte übernehmen. Drei Versuche.',
      en: 'Step forward off a box (standard 30 cm, enter the height), land on both feet and jump as quickly and as high as possible. Hands on hips. Take contact time and flight time or jump height from the jump mat. Three attempts.',
    },
    equipmentIds: [['jump_mat', 'force_plate'], ['bench']],
    equipment: { de: 'Sprungmatte oder Kraftmessplatte, stabile Box', en: 'Jump mat or force plate, stable box' },
  },
  {
    slug: 'five_bound_test',
    primaryMetric: 'distanceM',
    primaryUnit: 'm',
    fields: [{ key: 'distanceM', type: 'number', unit: 'm', required: true, min: 4, max: 20, step: 0.01 }, RPE],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 950,
    name: { de: 'Fünfersprung (5-Bound-Test)', en: 'Five-bound test' },
    shortName: { de: '5-Bound', en: '5-bound' },
    summary: {
      de: 'Fünf Wechselsprünge aus dem Stand auf Weite. Misst horizontale, reaktive Sprungkraft.',
      en: 'Five alternating bounds from a standing start, for distance. Measures horizontal reactive jumping power.',
    },
    instructions: {
      de: 'Aus geschlossenem Stand fünf Wechselsprünge (links, rechts, links, rechts, links), Landung beidbeinig. Gemessen wird von der Startlinie bis zur hintersten Landespur. Drei Versuche.',
      en: 'From a closed stance, five alternating bounds (left, right, left, right, left), landing on both feet. Measured from the start line to the rearmost landing mark. Three attempts.',
    },
    equipmentIds: [['tape_measure'], ['open_space']],
    equipment: { de: 'Massband, ebene Fläche', en: 'Tape measure, level surface' },
  },
  {
    slug: 'bosco_jump_60s',
    primaryMetric: 'bosco_power_w_per_kg',
    primaryUnit: 'W/kg',
    fields: [
      { key: 'jumpCount', type: 'integer', unit: 'Sprünge', required: true, min: 10, max: 150 },
      { key: 'totalFlightTimeS', type: 'number', unit: 's', required: true, min: 3, max: 50, step: 0.01 },
      ...HR_RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 60 },
    requiresBodyWeight: false,
    deviceBound: 'high',
    derivedMetrics: ['bosco_power_w_per_kg'],
    derive: (values, _ctx, put) => {
      put('bosco_power_w_per_kg', boscoPowerWkg(values.totalFlightTimeS, 60, values.jumpCount))
    },
    sortOrder: 951,
    name: { de: 'Bosco-Sprungtest (60 s)', en: 'Bosco jump test (60 s)' },
    shortName: { de: 'Bosco 60 s', en: 'Bosco 60 s' },
    summary: {
      de: '60 Sekunden durchgehend maximal springen. Aus Flugzeit und Zahl der Sprünge entsteht die mittlere Leistung in W/kg.',
      en: '60 seconds of continuous maximal jumping. Average power in W/kg follows from flight time and the number of jumps.',
    },
    instructions: {
      de: 'Auf der Sprungmatte 60 Sekunden ohne Pause maximal springen, Hände in den Hüften, Knie bei der Landung etwa 90° gebeugt. Zahl der Sprünge und Summe der Flugzeiten von der Matte übernehmen.',
      en: 'Jump maximally on the jump mat for 60 seconds without pausing, hands on hips, knees bent to about 90° on landing. Take the number of jumps and the total flight time from the mat.',
    },
    equipmentIds: [['jump_mat']],
    equipment: { de: 'Sprungmatte mit Flugzeitmessung', en: 'Jump mat with flight-time measurement' },
  },
  {
    slug: 'seated_med_ball_throw',
    primaryMetric: 'distanceM',
    primaryUnit: 'm',
    fields: [
      { key: 'distanceM', type: 'number', unit: 'm', required: true, min: 1, max: 15, step: 0.01 },
      { key: 'ballKg', type: 'number', unit: 'kg', required: true, min: 1, max: 10, step: 0.5 },
    ],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 952,
    name: { de: 'Medizinballstoss im Sitzen', en: 'Seated medicine ball throw' },
    shortName: { de: 'Medball sitzend', en: 'Seated med ball' },
    summary: {
      de: 'Beidarmiger Brustwurf im Sitzen, Rücken an der Wand. Misst die Schnellkraft des Oberkörpers ohne Beinarbeit.',
      en: 'Two-handed chest pass while seated, back against the wall. Measures upper-body power without leg drive.',
    },
    instructions: {
      de: 'Mit gestreckten Beinen sitzen, Rücken an der Wand. Ball vor der Brust halten und so weit wie möglich nach vorn stossen, der Rücken bleibt an der Wand. Gemessen bis zum ersten Aufprall. Ballgewicht eintragen und bei Wiederholung gleich lassen.',
      en: 'Sit with legs straight, back against the wall. Hold the ball at the chest and push it as far forward as possible; the back stays on the wall. Measured to the first impact. Enter the ball mass and keep it the same when retesting.',
    },
    equipmentIds: [['wall_ball'], ['tape_measure']],
    equipment: { de: 'Medizinball, Wand, Massband', en: 'Medicine ball, wall, tape measure' },
  },
  {
    slug: 'plyo_push_up_10s',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [reps(40), RPE],
    protocol: { mode: 'countdown', durationSeconds: 10 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 953,
    name: { de: 'Explosive Liegestütze (10 s)', en: 'Plyometric push-ups (10 s)' },
    shortName: { de: 'Plyo-Liegestütz', en: 'Plyo push-up' },
    summary: {
      de: 'So viele Liegestütze mit Abheben der Hände wie möglich in 10 Sekunden. Schnellkraft des Oberkörpers ohne Gerät.',
      en: 'As many push-ups with the hands leaving the floor as possible in 10 seconds. Upper-body power with no equipment.',
    },
    instructions: {
      de: 'Liegestützposition. Jede Wiederholung so explosiv, dass beide Hände vom Boden abheben. Gezählt wird nur, was vollständig ist: Brust bis eine Faust über dem Boden, Arme oben gestreckt.',
      en: 'Push-up position. Each repetition explosive enough that both hands leave the floor. Only complete repetitions count: chest to one fist above the floor, arms extended at the top.',
    },
    equipmentIds: [['mat'], ['stopwatch']],
    equipment: { de: 'Matte, Stoppuhr', en: 'Mat, stopwatch' },
  },

  // --- Kraft und Kraftausdauer ----------------------------------------------
  {
    slug: 'wall_sit_hold',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [seconds(5, 900), RPE],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 954,
    name: { de: 'Wandsitz (90°)', en: 'Wall sit (90°)' },
    shortName: { de: 'Wandsitz', en: 'Wall sit' },
    summary: {
      de: 'Isometrisches Halten mit Rücken an der Wand und Knien im rechten Winkel. Kraftausdauer der Beinstrecker.',
      en: 'Isometric hold with the back against the wall and knees at a right angle. Strength endurance of the knee extensors.',
    },
    instructions: {
      de: 'Rücken an der Wand hinabgleiten, bis Ober- und Unterschenkel einen rechten Winkel bilden. Arme vor der Brust gekreuzt. Zeit bis zum Abbruch oder bis der Winkel deutlich nachgibt.',
      en: 'Slide down the wall until thighs and shins form a right angle. Arms crossed over the chest. Time until failure or until the angle clearly gives way.',
    },
    equipmentIds: [['stopwatch']],
    equipment: { de: 'Wand, Stoppuhr', en: 'Wall, stopwatch' },
  },
  {
    slug: 'pistol_squat_test',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [
      { key: 'repsLeft', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 100 },
      { key: 'repsRight', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 100 },
      RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['reps', 'asymmetryPercent'],
    derive: bilateral('repsLeft', 'repsRight', 'reps'),
    sortOrder: 955,
    name: { de: 'Einbeinige Kniebeuge (Pistol)', en: 'Single-leg squat (pistol)' },
    shortName: { de: 'Pistol', en: 'Pistol' },
    summary: {
      de: 'Maximale saubere Wiederholungen je Bein. Die schwächere Seite ist das Ergebnis, der Seitenunterschied steht daneben.',
      en: 'Maximum clean repetitions per leg. The weaker side is the result; the side-to-side difference is shown alongside.',
    },
    instructions: {
      de: 'Auf einem Bein stehend bis zum Kontakt mit einer Box (Kniehöhe) absenken und ohne Schwung aufstehen, das freie Bein vorn. Je Bein bis zum Abbruch; gezählt werden nur saubere Wiederholungen.',
      en: 'Standing on one leg, lower until touching a box (knee height) and stand up without momentum, free leg in front. Each leg to failure; only clean repetitions count.',
    },
    equipmentIds: [['bench']],
    equipment: { de: 'Box oder Bank in Kniehöhe', en: 'Box or bench at knee height' },
  },
  {
    slug: 'dips_max_reps',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [reps(100), RPE],
    protocol: { mode: 'attempts', attempts: 1 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 956,
    name: { de: 'Dips (maximal)', en: 'Dips (max reps)' },
    shortName: { de: 'Dips', en: 'Dips' },
    summary: {
      de: 'Maximale Wiederholungen am Barren. Drückkraftausdauer des Oberkörpers.',
      en: 'Maximum repetitions on parallel bars. Upper-body pressing strength endurance.',
    },
    instructions: {
      de: 'Stütz am Barren mit gestreckten Armen. Absenken, bis die Oberarme waagerecht sind, dann vollständig hochdrücken. Ohne Pause bis zum Abbruch.',
      en: 'Support on parallel bars with straight arms. Lower until the upper arms are horizontal, then press up fully. Without pausing until failure.',
    },
    equipmentIds: [['counter']],
    equipment: { de: 'Barren oder Dip-Station', en: 'Parallel bars or dip station' },
  },
  {
    slug: 'inverted_row_max_reps',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [reps(100), RPE],
    protocol: { mode: 'attempts', attempts: 1 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 957,
    name: { de: 'Körperrudern (maximal)', en: 'Inverted row (max reps)' },
    shortName: { de: 'Körperrudern', en: 'Inverted row' },
    summary: {
      de: 'Maximale Wiederholungen an einer hüfthohen Stange. Horizontale Zugkraftausdauer.',
      en: 'Maximum repetitions at a hip-height bar. Horizontal pulling strength endurance.',
    },
    instructions: {
      de: 'Unter einer hüfthohen Stange hängen, Körper gestreckt, Fersen am Boden. Brust zur Stange ziehen und vollständig ablassen. Stangenhöhe notieren und bei Wiederholung gleich lassen.',
      en: 'Hang under a hip-height bar, body straight, heels on the floor. Pull the chest to the bar and lower fully. Note the bar height and keep it the same when retesting.',
    },
    equipmentIds: [['pull_up_bar', 'barbell']],
    equipment: { de: 'Stange im Rack oder Ringe', en: 'Bar in a rack or rings' },
  },
  {
    slug: 'copenhagen_adductor_hold',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationLeftS', type: 'duration', unit: 's', required: true, min: 0, max: 300 },
      { key: 'durationRightS', type: 'duration', unit: 's', required: true, min: 0, max: 300 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['durationSeconds', 'asymmetryPercent'],
    derive: bilateral('durationLeftS', 'durationRightS', 'durationSeconds'),
    sortOrder: 958,
    name: { de: 'Copenhagen-Adduktorenhalten', en: 'Copenhagen adductor hold' },
    shortName: { de: 'Copenhagen', en: 'Copenhagen' },
    summary: {
      de: 'Seitstütz mit dem oberen Bein auf einer Bank. Haltezeit je Seite für die Adduktoren; die schwächere Seite ist das Ergebnis.',
      en: 'Side plank with the top leg on a bench. Hold time per side for the adductors; the weaker side is the result.',
    },
    instructions: {
      de: 'Seitstütz auf dem Unterarm, das obere Bein mit der Innenseite des Knies (leichter) oder des Knöchels (schwerer) auf einer Bank, das untere Bein frei. Körper gestreckt halten. Variante festhalten und bei Wiederholung gleich lassen.',
      en: 'Side plank on the forearm, the top leg resting with the inside of the knee (easier) or ankle (harder) on a bench, the bottom leg free. Keep the body straight. Note the variant and keep it the same when retesting.',
    },
    equipmentIds: [['bench'], ['stopwatch']],
    equipment: { de: 'Bank, Stoppuhr', en: 'Bench, stopwatch' },
  },
  {
    slug: 'single_leg_hamstring_bridge',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [
      { key: 'repsLeft', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 150 },
      { key: 'repsRight', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 150 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['reps', 'asymmetryPercent'],
    derive: bilateral('repsLeft', 'repsRight', 'reps'),
    sortOrder: 959,
    name: { de: 'Einbeinige Hamstring-Brücke', en: 'Single-leg hamstring bridge' },
    shortName: { de: 'SLHB', en: 'SLHB' },
    summary: {
      de: 'Einbeinige Hüftbrücken mit der Ferse auf einer 60-cm-Box, bis zur Erschöpfung. Kraftausdauer der hinteren Oberschenkel je Seite (Freckleton et al. 2014).',
      en: 'Single-leg hip bridges with the heel on a 60 cm box, to exhaustion. Hamstring strength endurance per side (Freckleton et al. 2014).',
    },
    instructions: {
      de: 'Rückenlage, Ferse auf einer 60 cm hohen Box, Knie leicht gebeugt, anderes Bein senkrecht. Hüfte vollständig strecken und absenken, ohne abzulegen. Je Bein bis zum Abbruch oder bis die Ausführung nachlässt.',
      en: 'Lie on your back, heel on a 60 cm box, knee slightly bent, other leg vertical. Extend the hips fully and lower without resting. Each leg until failure or until form breaks down.',
    },
    equipmentIds: [['bench'], ['mat']],
    equipment: { de: 'Box 60 cm, Matte', en: '60 cm box, mat' },
  },
  {
    slug: 'fv_profile_jump',
    primaryMetric: 'pmax_w_per_kg_fv',
    primaryUnit: 'W/kg',
    fields: [
      { key: 'pushOffCm', type: 'number', unit: 'cm', required: true, min: 15, max: 70, step: 0.5 },
      { key: 'sjHeight0Cm', type: 'number', unit: 'cm', required: true, min: 5, max: 90, step: 0.5 },
      { key: 'load1Kg', type: 'number', unit: 'kg', required: true, min: 5, max: 200, step: 0.5 },
      { key: 'sjHeight1Cm', type: 'number', unit: 'cm', required: true, min: 1, max: 80, step: 0.5 },
      { key: 'load2Kg', type: 'number', unit: 'kg', required: false, min: 5, max: 250, step: 0.5 },
      { key: 'sjHeight2Cm', type: 'number', unit: 'cm', required: false, min: 1, max: 80, step: 0.5 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: true,
    deviceBound: 'high',
    derivedMetrics: ['f0_n_per_kg', 'v0_m_s', 'pmax_w_per_kg_fv'],
    derive: (values, ctx, put) => {
      if (!ctx.bodyWeightKg) return
      const points = [
        { addedKg: 0, jumpHeightCm: values.sjHeight0Cm },
        { addedKg: values.load1Kg, jumpHeightCm: values.sjHeight1Cm },
        { addedKg: values.load2Kg, jumpHeightCm: values.sjHeight2Cm },
      ].filter((p) => p.addedKg != null && p.jumpHeightCm != null)
      const fv = samozinoJumpProfile(ctx.bodyWeightKg, values.pushOffCm / 100, points)
      if (!fv) return
      put('f0_n_per_kg', fv.f0NPerKg)
      put('v0_m_s', fv.v0Ms)
      put('pmax_w_per_kg_fv', fv.pmaxWPerKg)
    },
    sortOrder: 960,
    name: { de: 'Kraft-Geschwindigkeits-Profil (Squat Jump)', en: 'Force-velocity profile (squat jump)' },
    shortName: { de: 'FV-Profil Sprung', en: 'FV profile jump' },
    summary: {
      de: 'Squat Jumps ohne und mit Zusatzlast. Daraus nach Samozino die theoretische Maximalkraft (F0), Maximalgeschwindigkeit (v0) und Leistung (Pmax). Der Messfehler ist gross — für den Verlauf, nicht als Diagnose.',
      en: 'Squat jumps without and with added load. From them, after Samozino, theoretical maximal force (F0), maximal velocity (v0) and power (Pmax). The measurement error is large — for tracking, not as a diagnosis.',
    },
    instructions: {
      de: 'Abdruckweg einmal messen: Beinlänge gestreckt (Hüfte bis Fussspitze) minus Abstand Hüfte–Boden in der 90°-Hocke. Dann Squat Jumps aus 90° ohne Ausholen: ohne Last und mit ein bis zwei Zusatzlasten (z. B. 25 % und 50 % der Körpermasse). Je Last den besten von zwei Sprüngen eintragen.',
      en: 'Measure the push-off distance once: extended leg length (hip to toe) minus hip-to-floor distance in the 90° squat. Then squat jumps from 90° without a countermovement: unloaded and with one or two added loads (e.g. 25 % and 50 % of body mass). Enter the best of two jumps per load.',
    },
    equipmentIds: [['jump_mat'], ['barbell', 'added_load'], ['tape_measure']],
    equipment: { de: 'Sprungmatte, Langhantel oder Zusatzlast, Massband', en: 'Jump mat, barbell or added load, tape measure' },
  },

  // --- Conditioning, Einsatz, Agilität --------------------------------------
  {
    slug: 'sandbag_lunges_100m',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [seconds(30, 900), { key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 5, max: 60, step: 0.5 }, ...HR_RPE],
    protocol: { mode: 'stopwatch', targetDistanceM: 100 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 961,
    name: { de: 'Sandbag Lunges 100 m', en: 'Sandbag lunges 100 m' },
    shortName: { de: 'Sandbag Lunges', en: 'Sandbag lunges' },
    summary: {
      de: '100 m Ausfallschritte mit Sandsack auf den Schultern, auf Zeit. Die HYROX-Station als Einzeltest.',
      en: '100 m of walking lunges with a sandbag on the shoulders, against the clock. The HYROX station as a standalone test.',
    },
    instructions: {
      de: 'Sandsack auf Schultern oder Nacken, Last eintragen (Wettkampf: 10, 20 oder 30 kg). Ausfallschritte im Wechsel, das hintere Knie berührt den Boden, im Stand die Hüfte strecken. 100 m auf Zeit.',
      en: 'Sandbag on the shoulders or neck, enter the load (competition: 10, 20 or 30 kg). Alternating lunges, the back knee touches the floor, extend the hips at the top. 100 m against the clock.',
    },
    equipmentIds: [['added_load'], ['measured_course'], ['stopwatch']],
    equipment: { de: 'Sandsack, 100 m Strecke, Stoppuhr', en: 'Sandbag, 100 m course, stopwatch' },
  },
  {
    slug: 'burpee_test_3min',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [reps(150), ...HR_RPE],
    protocol: { mode: 'amrap', durationSeconds: 180 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 962,
    name: { de: '3-Minuten-Burpee-Test', en: '3-minute burpee test' },
    shortName: { de: 'Burpees 3 min', en: 'Burpees 3 min' },
    summary: {
      de: 'So viele vollständige Burpees wie möglich in drei Minuten. Gut reproduzierbar (CV unter 3 %).',
      en: 'As many complete burpees as possible in three minutes. Highly reproducible (CV below 3 %).',
    },
    instructions: {
      de: 'Aus dem Stand in die Hocke, Füsse in den Liegestütz zurückspringen, Füsse wieder nach vorn, aufrichten und strecken. Gezählt wird jede vollständige Wiederholung.',
      en: 'From standing into a squat, jump the feet back into a plank, jump the feet forward again, stand up and extend. Every complete repetition counts.',
    },
    equipmentIds: [['stopwatch'], ['counter']],
    equipment: { de: 'Stoppuhr, Zähler', en: 'Stopwatch, counter' },
  },
  {
    slug: 'sprawl_test_60s',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [reps(80), ...HR_RPE],
    protocol: { mode: 'amrap', durationSeconds: 60 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 963,
    name: { de: 'Sprawl-Test (60 s)', en: 'Sprawl test (60 s)' },
    shortName: { de: 'Sprawls 60 s', en: 'Sprawls 60 s' },
    summary: {
      de: 'So viele Sprawls wie möglich in 60 Sekunden — die Abwehrbewegung gegen den Takedown, ohne Partner.',
      en: 'As many sprawls as possible in 60 seconds — the defence against a takedown, without a partner.',
    },
    instructions: {
      de: 'Aus der Kampfstellung Hüfte und Beine nach hinten werfen, Hüfte am Boden, sofort zurück in die Kampfstellung. Gezählt wird jede Rückkehr in die Kampfstellung.',
      en: 'From the fighting stance throw hips and legs back, hips to the floor, then straight back into the fighting stance. Every return to the stance counts.',
    },
    equipmentIds: [['mat'], ['stopwatch']],
    equipment: { de: 'Matte, Stoppuhr', en: 'Mat, stopwatch' },
  },
  {
    slug: 'casualty_drag_20m',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [seconds(5, 180), { key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 30, max: 120, step: 1 }, RPE],
    protocol: { mode: 'stopwatch', targetDistanceM: 20 },
    requiresBodyWeight: false,
    derivedMetrics: ['load_relative'],
    sortOrder: 964,
    name: { de: 'Personenrettung ziehen (20 m)', en: 'Casualty drag (20 m)' },
    shortName: { de: 'Casualty Drag', en: 'Casualty drag' },
    summary: {
      de: 'Eine Puppe oder einen Partner im Rettungsgriff 20 m rückwärts ziehen. Einsatznahe Aufgabe für Feuerwehr, Polizei, Militär und Rettungsdienst.',
      en: 'Drag a dummy or partner 20 m backwards in a rescue grip. A job-related task for fire, police, military and emergency services.',
    },
    instructions: {
      de: 'Puppe oder Partner von hinten unter den Achseln greifen und 20 m rückwärts ziehen. Masse der Puppe eintragen und bei Wiederholung gleich lassen — sie bestimmt das Ergebnis mehr als alles andere.',
      en: 'Grip the dummy or partner from behind under the arms and drag 20 m backwards. Enter the dummy mass and keep it the same when retesting — it drives the result more than anything else.',
    },
    equipmentIds: [['added_load', 'partner'], ['measured_course'], ['stopwatch']],
    equipment: { de: 'Rettungspuppe oder Partner, 20 m Strecke, Stoppuhr', en: 'Rescue dummy or partner, 20 m course, stopwatch' },
  },
  {
    slug: 'shuttle_4x10m',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [{ key: 'durationSeconds', type: 'number', unit: 's', required: true, min: 7, max: 25, step: 0.01 }, RPE],
    protocol: { mode: 'attempts', attempts: 2, targetDistanceM: 40 },
    requiresBodyWeight: false,
    deviceBound: 'high',
    derivedMetrics: [],
    sortOrder: 965,
    name: { de: '4 × 10 m Pendellauf', en: '4 × 10 m shuttle run' },
    shortName: { de: '4×10 m', en: '4×10 m' },
    summary: {
      de: 'Pendellauf viermal über 10 m mit drei Richtungswechseln. Antritt und Wendigkeit auf kleinem Raum (HELENA-Batterie).',
      en: 'Shuttle run four times over 10 m with three changes of direction. Acceleration and agility in a small space (HELENA battery).',
    },
    instructions: {
      de: 'Zwei Linien im Abstand von 10 m. Auf Signal zur anderen Linie sprinten, mit einem Fuss hinter die Linie treten, zurück — insgesamt viermal 10 m. Zeit bis zum Überqueren der Ziellinie. Zwei Versuche.',
      en: 'Two lines 10 m apart. On the signal sprint to the other line, step behind it with one foot, and back — four times 10 m in total. Time until crossing the finish line. Two attempts.',
    },
    equipmentIds: [['cones'], ['tape_measure'], ['stopwatch', 'timing_gates']],
    equipment: { de: 'Markierungen, Massband, Stoppuhr oder Lichtschranke', en: 'Markers, tape measure, stopwatch or timing gates' },
  },
]
