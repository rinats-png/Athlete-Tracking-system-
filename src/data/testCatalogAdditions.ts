import type { TestBlueprint, TestField } from './testCatalog'
import type { EquipmentId } from './equipment'
import { estimateOneRepMax } from '@/lib/metrics'

/**
 * Erweiterung des Testkatalogs (§12).
 *
 * Aufnahmekriterium, wörtlich aus dem Auftrag: ein Test kommt nur hinein,
 * wenn sich seine Berechnung UND seine Einordnung sinnvoll definieren lassen.
 * Danach sind mehrere naheliegende Kandidaten bewusst draussen geblieben —
 * die Begründungen stehen unten bei `DELIBERATELY_OMITTED`.
 *
 * Die sechs Achsen bleiben unverändert. Sprint- und Sprungtests zahlen auf
 * `power` ein, Richtungswechsel auf `agility`. Eine siebte Achse «Speed»
 * einzuführen hätte das gesamte Profil und jeden bisherigen Vergleich
 * umgeworfen, ohne eine Frage zu beantworten, die die sechs nicht schon
 * beantworten.
 */

const HR_RPE: TestField[] = [
  { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
]

// --- Sprint ------------------------------------------------------------------

const sprint = (
  slug: string,
  meters: number,
  sortOrder: number,
  nameDe: string,
  nameEn: string,
  maxSeconds: number,
): TestBlueprint => ({
  slug,
  primaryMetric: 'durationSeconds',
  primaryUnit: 's',
  fields: [
    { key: 'durationSeconds', type: 'number', unit: 's', required: true, min: 0.8, max: maxSeconds, step: 0.01 },
    ...HR_RPE,
  ],
  protocol: { mode: 'attempts', attempts: 3, targetDistanceM: meters },
  requiresBodyWeight: false,
  derivedMetrics: ['avg_velocity_m_s'],
  sortOrder,
  name: { de: nameDe, en: nameEn },
  shortName: { de: nameDe, en: nameEn },
  summary: {
    de: `Beschleunigung über ${meters} m aus dem Stand. Kurze Distanzen messen Antritt, längere die Höchstgeschwindigkeit.`,
    en: `Acceleration over ${meters} m from a standing start. Short distances measure the first step, longer ones top speed.`,
  },
  instructions: {
    de: 'Gründlich aufwärmen, inklusive Steigerungsläufe. Start aus dem Stand ohne Anlauf, Zeitnahme bei der ersten Bewegung. Drei Versuche mit voller Pause dazwischen — ohne Pause misst man Ermüdung statt Schnelligkeit.',
    en: 'Warm up thoroughly, including build-ups. Standing start with no run-up, timing begins on first movement. Three attempts with full recovery between them — without it you measure fatigue, not speed.',
  },
  equipmentIds: [['measured_course'], ['cones'], ['stopwatch']],
  equipment: {
    de: 'Gerade Strecke, Markierungen, Stoppuhr oder Lichtschranke',
    en: 'Straight track, markers, stopwatch or timing gates',
  },
})

export const SPEED_TESTS: TestBlueprint[] = [
  sprint('sprint_10m', 10, 400, '10 m Sprint', '10 m sprint', 5),
  sprint('sprint_20m', 20, 401, '20 m Sprint', '20 m sprint', 8),
  sprint('sprint_30m', 30, 402, '30 m Sprint', '30 m sprint', 12),
  sprint('sprint_40yd', 36.58, 403, '40 Yards Sprint', '40 yard dash', 12),
]

// --- Agilität ----------------------------------------------------------------

export const AGILITY_TESTS: TestBlueprint[] = [
  {
    slug: 'shuttle_5_10_5',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'number', unit: 's', required: true, min: 3, max: 15, step: 0.01 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 410,
    name: { de: '5-10-5 Shuttle (Pro Agility)', en: '5-10-5 shuttle (pro agility)' },
    shortName: { de: '5-10-5', en: '5-10-5' },
    summary: {
      de: 'Zwei 180-Grad-Richtungswechsel über insgesamt 20 Yards. «Pro Agility» ist derselbe Test unter anderem Namen — deshalb steht er hier einmal und nicht zweimal.',
      en: 'Two 180-degree changes of direction over 20 yards in total. “Pro agility” is the same test under a different name — hence one entry, not two.',
    },
    instructions: {
      de: 'Drei Linien im Abstand von 4,57 m (5 Yards). Start mittig, erst 5 Yards zur einen Seite, 10 Yards zur anderen, 5 Yards zurück zur Mitte. Jede Linie muss mit der Hand berührt werden.',
      en: 'Three lines 4.57 m (5 yards) apart. Start in the middle, 5 yards one way, 10 yards the other, 5 yards back to the middle. Each line must be touched by hand.',
    },
    equipmentIds: [['cones'], ['stopwatch']],
    equipment: { de: 'Drei Markierungen, Stoppuhr', en: 'Three markers, stopwatch' },
  },
  {
    slug: 't_test_agility',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'number', unit: 's', required: true, min: 6, max: 25, step: 0.01 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 411,
    name: { de: 'T-Test', en: 'T-test' },
    shortName: { de: 'T-Test', en: 'T-test' },
    summary: {
      de: 'Vorwärts, seitlich in beide Richtungen, rückwärts. Prüft im Gegensatz zum 5-10-5 auch seitliche Fortbewegung und Rückwärtslauf.',
      en: 'Forward, lateral in both directions, backward. Unlike the 5-10-5 it also tests lateral movement and backpedalling.',
    },
    instructions: {
      de: 'T-Form aus vier Markierungen: 9,14 m vorwärts, 4,57 m seitlich links, 9,14 m seitlich rechts, 4,57 m seitlich zurück, dann rückwärts zum Start. Seitwärts ohne Überkreuzen der Beine.',
      en: 'A T of four markers: 9.14 m forward, 4.57 m left, 9.14 m right, 4.57 m back to the centre, then backpedal to the start. Shuffle laterally without crossing the feet.',
    },
    equipmentIds: [['cones'], ['stopwatch']],
    equipment: { de: 'Vier Markierungen, Stoppuhr', en: 'Four markers, stopwatch' },
  },
]

// --- Sprung / Schnellkraft ---------------------------------------------------

const jump = (
  slug: string,
  sortOrder: number,
  nameDe: string,
  nameEn: string,
  shortDe: string,
  summaryDe: string,
  summaryEn: string,
  instructionsDe: string,
  instructionsEn: string,
): TestBlueprint => ({
  slug,
  primaryMetric: 'jumpHeightCm',
  primaryUnit: 'cm',
  fields: [
    { key: 'jumpHeightCm', type: 'number', unit: 'cm', required: true, min: 5, max: 120, step: 0.5 },
    ...HR_RPE,
  ],
  protocol: { mode: 'attempts', attempts: 3 },
  // Für die Spitzenleistung nach Sayers wird das Körpergewicht gebraucht.
  requiresBodyWeight: true,
  derivedMetrics: ['peak_power_w', 'peak_power_w_per_kg'],
  sortOrder,
  name: { de: nameDe, en: nameEn },
  shortName: { de: shortDe, en: shortDe },
  summary: { de: summaryDe, en: summaryEn },
  instructions: { de: instructionsDe, en: instructionsEn },
  equipmentIds: [['jump_mat']],
  equipment: {
    de: 'Sprungmatte, Messsystem oder Videoanalyse',
    en: 'Jump mat, measurement system or video analysis',
  },
})

export const JUMP_TESTS: TestBlueprint[] = [
  jump(
    'countermovement_jump',
    330,
    'Countermovement Jump',
    'Countermovement jump',
    'CMJ',
    'Vertikalsprung mit Ausholbewegung. Nutzt den Dehnungs-Verkürzungs-Zyklus und liegt deshalb über dem Squat Jump.',
    'Vertical jump with a countermovement. Uses the stretch-shortening cycle and therefore exceeds the squat jump.',
    'Aus dem Stand zügig in die Hocke und ohne Pause maximal nach oben springen. Hände in die Hüften, damit der Armschwung das Ergebnis nicht verfälscht. Beidbeinig landen.',
    'From standing, dip quickly and jump maximally without pausing. Hands on hips so arm swing does not distort the result. Land on both feet.',
  ),
  jump(
    'squat_jump',
    331,
    'Squat Jump',
    'Squat jump',
    'SJ',
    'Vertikalsprung aus gehaltener Hocke, ohne Ausholbewegung. Die Differenz zum CMJ zeigt, wie gut der Dehnungs-Verkürzungs-Zyklus genutzt wird.',
    'Vertical jump from a held squat, without a countermovement. The gap to the CMJ shows how well the stretch-shortening cycle is used.',
    'Hocke einnehmen, drei Sekunden ruhig halten, dann ohne Nachfedern maximal nach oben springen. Jeder Ausholimpuls macht den Versuch ungültig.',
    'Hold a squat position still for three seconds, then jump maximally with no dip. Any countermovement invalidates the attempt.',
  ),
  jump(
    'vertical_jump_reach',
    332,
    'Vertikalsprung (Reichhöhe)',
    'Vertical jump (reach)',
    'Vertikal',
    'Sprunghöhe als Differenz zwischen Standreichhöhe und höchstem erreichtem Punkt. Braucht kein Messsystem, ist dafür ungenauer als CMJ und SJ.',
    'Jump height as the difference between standing reach and the highest point touched. Needs no measurement system, but is less precise than CMJ and SJ.',
    'Standreichhöhe mit ausgestrecktem Arm an der Wand markieren. Dann mit Anlaufschritt oder aus dem Stand maximal springen und den höchsten Punkt markieren. Die Differenz ist das Ergebnis.',
    'Mark standing reach against the wall with an outstretched arm. Then jump maximally and mark the highest point touched. The difference is the result.',
  ),
]

export const REPEATED_JUMP: TestBlueprint = {
  slug: 'repeated_jump_15s',
  primaryMetric: 'avg_jump_height_cm',
  primaryUnit: 'cm',
  fields: [
    { key: 'jumpCount', type: 'integer', unit: 'Sprünge', required: true, min: 5, max: 60 },
    { key: 'totalHeightCm', type: 'number', unit: 'cm', required: true, min: 20, max: 2000, step: 1 },
    ...HR_RPE,
  ],
  protocol: { mode: 'countdown', durationSeconds: 15 },
  requiresBodyWeight: true,
  derivedMetrics: ['avg_jump_height_cm'],
  derive: (values, _ctx, put) => {
    // Der Mittelwert wird gebildet, nicht eingegeben: zwei Zahlen, die
    // dasselbe beschreiben, könnten auseinanderlaufen.
    const count = values.jumpCount
    if (count != null && count > 0 && values.totalHeightCm != null) {
      put('avg_jump_height_cm', values.totalHeightCm / count)
    }
  },
  sortOrder: 333,
  name: { de: 'Wiederholungssprünge 15 s', en: 'Repeated jumps 15 s' },
  shortName: { de: '15-s-Sprünge', en: '15 s jumps' },
  summary: {
    de: 'Mittlere Sprunghöhe über 15 Sekunden Dauersprung. Misst reaktive Schnellkraft unter Ermüdung — die Zahl der Sprünge zahlt zusätzlich auf Kraftausdauer ein.',
    en: 'Average jump height over 15 seconds of continuous jumping. Measures reactive power under fatigue — the jump count additionally feeds strength endurance.',
  },
  instructions: {
    de: 'Fünfzehn Sekunden lang ohne Pause maximal hoch springen, Bodenkontakt so kurz wie möglich, Hände in den Hüften. Erfasst werden die Zahl der Sprünge und die Summe der Sprunghöhen; die App bildet daraus den Mittelwert.',
    en: 'Jump maximally for fifteen seconds without pausing, ground contact as short as possible, hands on hips. Record the number of jumps and the sum of their heights; the app forms the average.',
  },
  equipmentIds: [['jump_mat']],
  equipment: { de: 'Sprungmatte oder Messsystem', en: 'Jump mat or measurement system' },
}

// --- Kraft -------------------------------------------------------------------

export const STRENGTH_TESTS: TestBlueprint[] = [
  {
    slug: 'overhead_press_1rm',
    primaryMetric: 'one_rm_kg',
    primaryUnit: 'kg',
    fields: [
      { key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 10, max: 150, step: 2.5 },
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 1, max: 10 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 5 },
    requiresBodyWeight: true,
    derivedMetrics: ['one_rm_kg', 'relative_strength_bw'],
    sortOrder: 143,
    name: { de: 'Schulterdrücken (Overhead Press)', en: 'Overhead press 1RM' },
    shortName: { de: 'OHP', en: 'OHP' },
    summary: {
      de: 'Maximalkraft über Kopf, aus dem Stand ohne Beineinsatz.',
      en: 'Maximal overhead strength, standing, without leg drive.',
    },
    instructions: {
      de: 'Aus dem Stand, Hantel auf Höhe der Schlüsselbeine, ohne Beineinsatz nach oben drücken bis zur vollen Streckung. Kein Ausweichen ins Hohlkreuz.',
      en: 'Standing, bar at collarbone height, press overhead to full lockout without leg drive. No excessive back arch.',
    },
    equipmentIds: [['barbell']],
    equipment: { de: 'Langhantel, Scheiben', en: 'Barbell, plates' },
  },
  {
    slug: 'clean_1rm',
    primaryMetric: 'one_rm_kg',
    primaryUnit: 'kg',
    fields: [
      { key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 20, max: 220, step: 1 },
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 1, max: 3 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 6 },
    requiresBodyWeight: true,
    derivedMetrics: ['one_rm_kg', 'relative_strength_bw', 'sinclair_points'],
    sortOrder: 141,
    name: { de: 'Umsetzen (Clean)', en: 'Clean 1RM' },
    shortName: { de: 'Clean', en: 'Clean' },
    summary: {
      de: 'Umsetzen ohne Ausstossen. Zahlt auf Maxkraft, Relativkraft und Schnellkraft ein.',
      en: 'Clean without the jerk. Feeds max strength, relative strength and power.',
    },
    instructions: {
      de: 'Aufwärmsätze, dann Steigerungsversuche bis zum Maximum. Gewertet wird nur ein sauber im Frontstütz aufgefangener und aufgestandener Versuch.',
      en: 'Warm-up sets, then increasing attempts to a maximum. Only a lift caught cleanly in the front rack and stood up counts.',
    },
    equipmentIds: [['barbell']],
    equipment: { de: 'Olympische Langhantel, Bumper, Plattform', en: 'Olympic barbell, bumper plates, platform' },
  },
  {
    slug: 'pull_up_max_reps',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 100 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 1 },
    requiresBodyWeight: true,
    derivedMetrics: [],
    sortOrder: 212,
    name: { de: 'Klimmzüge maximal', en: 'Max pull-ups' },
    shortName: { de: 'Klimmzüge', en: 'Pull-ups' },
    summary: {
      de: 'Maximale Wiederholungszahl ohne Zusatzgewicht. Reine Relativkraftleistung: derselbe Wert bedeutet bei höherem Körpergewicht mehr geleistete Arbeit.',
      en: 'Maximum repetitions without added weight. A pure relative-strength effort: at a higher body weight the same number means more work done.',
    },
    instructions: {
      de: 'Aus dem vollständigen Hang, Kinn über die Stange, kontrolliert ablassen bis zur vollen Streckung. Kein Schwung aus der Hüfte. Gezählt wird bis zum ersten unsauberen Versuch.',
      en: 'From a full hang, chin over the bar, lower under control to full extension. No kipping. Count up to the first repetition that breaks form.',
    },
    equipmentIds: [['pull_up_bar']],
    equipment: { de: 'Klimmzugstange', en: 'Pull-up bar' },
  },
  {
    slug: 'weighted_pull_up_1rm',
    primaryMetric: 'total_load_kg',
    primaryUnit: 'kg',
    fields: [
      { key: 'addedLoadKg', type: 'number', unit: 'kg', required: true, min: 0, max: 120, step: 1.25 },
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 1, max: 5 },
      ...HR_RPE,
    ],
    protocol: { mode: 'attempts', attempts: 5 },
    requiresBodyWeight: true,
    derivedMetrics: ['total_load_kg', 'total_load_bw'],
    derive: (values, ctx, put) => {
      // Gewertet wird die bewegte Gesamtlast. Das Zusatzgewicht allein wäre
      // ohne das Körpergewicht daneben nicht vergleichbar.
      if (ctx.bodyWeightKg != null && values.addedLoadKg != null) {
        const total = estimateOneRepMax(
          ctx.bodyWeightKg + values.addedLoadKg,
          values.reps ?? 1,
          'epley',
        )
        put('total_load_kg', total)
        put('total_load_bw', total / ctx.bodyWeightKg)
      }
    },
    sortOrder: 213,
    name: { de: 'Klimmzug mit Zusatzgewicht', en: 'Weighted pull-up 1RM' },
    shortName: { de: 'Klimmzug +kg', en: 'Weighted pull-up' },
    summary: {
      de: 'Gewertet wird die bewegte Gesamtlast aus Körpergewicht und Zusatzgewicht — das Zusatzgewicht allein wäre ohne das Körpergewicht daneben nicht vergleichbar.',
      en: 'Scored on total load moved: body weight plus added weight — the added weight alone would not be comparable without body weight beside it.',
    },
    instructions: {
      de: 'Zusatzgewicht am Gürtel oder in der Weste. Aus dem vollständigen Hang, Kinn über die Stange. Ohne hinterlegtes Körpergewicht lässt sich die Gesamtlast nicht bilden.',
      en: 'Added weight on a belt or in a vest. From a full hang, chin over the bar. Without a stored body weight the total load cannot be formed.',
    },
    equipmentIds: [['pull_up_bar'], ['added_load']],
    equipment: { de: 'Klimmzugstange, Dipgürtel oder Gewichtsweste', en: 'Pull-up bar, dip belt or weight vest' },
  },
]

// --- Ausdauer ----------------------------------------------------------------

export const ENDURANCE_TESTS: TestBlueprint[] = [
  {
    slug: 'run_1_5_mile',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 240, max: 2400 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch', targetDistanceM: 2414 },
    requiresBodyWeight: false,
    derivedMetrics: ['avg_pace_s_per_km'],
    sortOrder: 105,
    name: { de: '1,5 Meilen Lauf (2414 m)', en: '1.5 mile run' },
    shortName: { de: '1,5 Meilen', en: '1.5 mile' },
    summary: {
      de: 'Zeitlauf über 2414 m. Verbreiteter Behörden- und Militärstandard.',
      en: 'Timed run over 2414 m. A common standard in tactical and military testing.',
    },
    instructions: {
      de: 'Nach Aufwärmen die Strecke so schnell wie möglich laufen, gleichmässig einteilen. Bahn oder vermessene flache Strecke; Gelände und Wind verändern das Ergebnis deutlich.',
      en: 'After warming up, cover the distance as fast as possible, pacing evenly. Use a track or a measured flat route; terrain and wind change the result markedly.',
    },
    equipmentIds: [['track', 'measured_course'], ['stopwatch']],
    equipment: { de: 'Laufbahn oder vermessene Strecke, Stoppuhr', en: 'Track or measured route, stopwatch' },
  },
  {
    slug: 'run_5k',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 720, max: 5400 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch', targetDistanceM: 5000 },
    requiresBodyWeight: false,
    derivedMetrics: ['avg_pace_s_per_km'],
    sortOrder: 106,
    name: { de: '5 km Lauf', en: '5 km run' },
    shortName: { de: '5 km', en: '5 km' },
    summary: {
      de: 'Zeitlauf über 5 km. Längeres Zeitfenster als der Cooper-Test und dadurch stärker von der aeroben Schwelle geprägt.',
      en: 'Timed 5 km run. A longer time domain than the Cooper test and therefore more shaped by the aerobic threshold.',
    },
    instructions: {
      de: 'Vermessene flache Strecke oder Bahn, gleichmässige Einteilung. An einem anderen Tag als andere Ausdauertests durchführen.',
      en: 'Measured flat route or track, evenly paced. Perform on a different day from other endurance tests.',
    },
    equipmentIds: [['measured_course'], ['stopwatch']],
    equipment: { de: 'Vermessene Strecke, Stoppuhr', en: 'Measured route, stopwatch' },
  },
]

// --- Conditioning ------------------------------------------------------------

const forTime = (
  slug: string,
  sortOrder: number,
  nameDe: string,
  nameEn: string,
  short: string,
  minSeconds: number,
  maxSeconds: number,
  summaryDe: string,
  summaryEn: string,
  instructionsDe: string,
  instructionsEn: string,
  equipmentDe: string,
  equipmentEn: string,
  equipmentIds: EquipmentId[][],
): TestBlueprint => ({
  slug,
  primaryMetric: 'durationSeconds',
  primaryUnit: 's',
  fields: [
    { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: minSeconds, max: maxSeconds },
    ...HR_RPE,
  ],
  protocol: { mode: 'stopwatch' },
  requiresBodyWeight: false,
  derivedMetrics: [],
  sortOrder,
  name: { de: nameDe, en: nameEn },
  shortName: { de: short, en: short },
  summary: { de: summaryDe, en: summaryEn },
  instructions: { de: instructionsDe, en: instructionsEn },
  equipmentIds,
  equipment: { de: equipmentDe, en: equipmentEn },
})

export const CONDITIONING_TESTS: TestBlueprint[] = [
  forTime(
    'fran',
    260,
    'Fran (21-15-9)',
    'Fran (21-15-9)',
    'Fran',
    90,
    1800,
    'Thruster und Klimmzüge im Schema 21-15-9 auf Zeit. Kurzes, sehr intensives Zeitfenster.',
    'Thrusters and pull-ups in a 21-15-9 scheme, for time. A short, very intense time domain.',
    'Thruster mit 43 kg (Männer) bzw. 30 kg (Frauen) und Klimmzüge, je 21, 15 und 9 Wiederholungen ohne vorgeschriebene Pause. Nur mit der Standardlast ist das Ergebnis vergleichbar — eine abweichende Last gehört in die Notiz.',
    'Thrusters at 43 kg (men) or 30 kg (women) and pull-ups, 21, 15 and 9 repetitions with no prescribed rest. Only the standard load makes the result comparable — note any deviation.',
    'Langhantel, Scheiben, Klimmzugstange',
    'Barbell, plates, pull-up bar',
      [['barbell'], ['pull_up_bar']],
  ),
  forTime(
    'grace',
    261,
    'Grace (30 Clean & Jerks)',
    'Grace (30 clean & jerks)',
    'Grace',
    60,
    1800,
    'Dreissig Umsetzen und Ausstossen auf Zeit. Misst Kraftausdauer an einer festen Last.',
    'Thirty clean & jerks for time. Measures strength endurance at a fixed load.',
    'Dreissig Wiederholungen Umsetzen und Ausstossen mit 61 kg (Männer) bzw. 43 kg (Frauen), so schnell wie möglich. Eine abweichende Last macht den Wert nicht vergleichbar und gehört in die Notiz.',
    'Thirty clean & jerks at 61 kg (men) or 43 kg (women), as fast as possible. A different load makes the value incomparable and belongs in the note.',
    'Langhantel, Bumper, Plattform',
    'Barbell, bumper plates, platform',
      [['barbell']],
  ),
  forTime(
    'murph',
    262,
    'Murph',
    'Murph',
    'Murph',
    1500,
    9000,
    'Eine Meile Laufen, 100 Klimmzüge, 200 Liegestütze, 300 Kniebeugen, eine Meile Laufen. Sehr langes Zeitfenster mit hohem Anteil Kraftausdauer.',
    'One mile run, 100 pull-ups, 200 push-ups, 300 air squats, one mile run. A very long time domain with a large strength-endurance share.',
    'In dieser Reihenfolge, Aufteilung der Wiederholungen frei. Mit oder ohne Gewichtsweste — welche Variante gelaufen wurde, gehört in die Notiz, sonst sind zwei Ergebnisse nicht vergleichbar.',
    'In this order, repetitions may be partitioned freely. With or without a weight vest — record which variant was used, otherwise two results are not comparable.',
    'Klimmzugstange, Laufstrecke, optional Gewichtsweste',
    'Pull-up bar, running route, optional weight vest',
      [['pull_up_bar'], ['measured_course']],
  ),
]

/**
 * Bewusst NICHT aufgenommen — mit Begründung, damit die Entscheidung
 * nachvollziehbar bleibt und nicht später versehentlich rückgängig gemacht
 * wird.
 *
 * `pro_agility`  Identisch mit dem 5-10-5 Shuttle, nur ein anderer Name.
 *                Zweimal geführt würde derselbe Test zweimal auf dieselbe
 *                Achse einzahlen und sie doppelt gewichten.
 *
 * `reactive_agility`  Braucht einen externen Reiz (Lichtsystem, Partner).
 *                Ohne standardisierten Reiz misst jeder Durchlauf etwas
 *                anderes, und ein Vergleich über Zeit wäre wertlos.
 *
 * `emom`         Ein Belastungsformat, kein Test: ohne festgelegte Übung,
 *                Last und Dauer entsteht keine vergleichbare Zahl.
 *
 * `mobility`     Im Auftrag ausdrücklich als «optional später» markiert.
 *                Für ein Benchmarking bräuchte es Winkelmessungen, die mit
 *                den vorhandenen Eingabefeldern nicht erhebbar sind.
 */
export const DELIBERATELY_OMITTED = [
  'pro_agility',
  'reactive_agility',
  'emom',
  'mobility',
] as const
