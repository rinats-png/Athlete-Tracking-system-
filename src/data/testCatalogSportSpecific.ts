import type { TestBlueprint, TestField } from './testCatalog'
import type { EquipmentId } from './equipment'
import {
  bikeThresholdScore,
  fatigueIndexPercent,
  functionalThresholdPower,
  pacePerKm,
  sjftIndex,
  swimTechniqueScore,
} from '@/lib/metrics'
import { deriveRowing } from './testDeriveShared'
import { strikeTest } from './testProtocols'

/**
 * Sportartspezifische Tests zur Zielgruppenliste.
 *
 * Aufnahmekriterium wie im übrigen Katalog: ein Test kommt hinein, wenn sich
 * Berechnung UND Einordnung sinnvoll definieren lassen.
 *
 * AUSRÜSTUNG: mehrere dieser Tests brauchen Geräte, die nicht jeder hat —
 * Kraftmessplatte, Leistungsmesser, Laktatmessgerät, Schwimmbahn. Sie tragen
 * `setting: 'lab'` bzw. `equipmentBarrier` und werden nie für ein
 * vollständiges Profil verlangt. Wer Zugang hat, gewinnt Genauigkeit; wer
 * nicht, verliert nichts.
 */

const HR_RPE: TestField[] = [
  { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
]

/** Kurzschreibweise für einen Zeittest über eine feste Strecke. */
const timeTrial = (
  slug: string,
  sortOrder: number,
  meters: number,
  minS: number,
  maxS: number,
  nameDe: string,
  nameEn: string,
  shortName: string,
  summaryDe: string,
  summaryEn: string,
  instructionsDe: string,
  instructionsEn: string,
  equipmentDe: string,
  equipmentEn: string,
  equipmentIds: EquipmentId[][],
  derived: string[] = [],
): TestBlueprint => ({
  slug,
  primaryMetric: 'durationSeconds',
  primaryUnit: 's',
  fields: [
    { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: minS, max: maxS },
    ...HR_RPE,
  ],
  protocol: { mode: 'stopwatch', targetDistanceM: meters },
  requiresBodyWeight: false,
  derivedMetrics: derived,
  sortOrder,
  name: { de: nameDe, en: nameEn },
  shortName: { de: shortName, en: shortName },
  summary: { de: summaryDe, en: summaryEn },
  instructions: { de: instructionsDe, en: instructionsEn },
  equipmentIds,
  equipment: { de: equipmentDe, en: equipmentEn },
})

// --- Kampfsport --------------------------------------------------------------

export const COMBAT_TESTS: TestBlueprint[] = [
  {
    slug: 'special_judo_fitness_test',
    // Der Index ist eine Belastungskennzahl: weniger ist besser.
    primaryMetric: 'sjft_index',
    primaryUnit: 'Index',
    fields: [
      { key: 'throwsA', type: 'integer', unit: 'Würfe', required: true, min: 0, max: 30 },
      { key: 'throwsB', type: 'integer', unit: 'Würfe', required: true, min: 0, max: 40 },
      { key: 'throwsC', type: 'integer', unit: 'Würfe', required: true, min: 0, max: 40 },
      { key: 'hrEnd', type: 'integer', unit: 'bpm', required: true, min: 80, max: 240 },
      { key: 'hrAfter1min', type: 'integer', unit: 'bpm', required: true, min: 60, max: 240 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'countdown', durationSeconds: 75 },
    requiresBodyWeight: false,
    derivedMetrics: ['sjft_index', 'totalThrows'],
    derive: (values, _ctx, put) => {
      const total = (values.throwsA ?? 0) + (values.throwsB ?? 0) + (values.throwsC ?? 0)
      put('totalThrows', total)
      put('sjft_index', sjftIndex(total, values.hrEnd, values.hrAfter1min))
    },
    sortOrder: 500,
    name: { de: 'Special Judo Fitness Test', en: 'Special judo fitness test' },
    shortName: { de: 'SJFT', en: 'SJFT' },
    summary: {
      de: 'Der etablierteste sportartspezifische Test im Kampfsport. Bildet die Wettkampfstruktur unmittelbar ab: wiederholte maximale Würfe mit unvollständiger Erholung.',
      en: 'The most established sport-specific test in combat sports. It mirrors the competition structure directly: repeated maximal throws with incomplete recovery.',
    },
    instructions: {
      de: 'Drei Serien Ippon-seoi-nage auf zwei Partner: 15 s, 30 s, 30 s, dazwischen jeweils 10 s Pause. Herzfrequenz direkt nach der letzten Serie und nach einer Minute Pause erfassen. Der Index ist die Summe beider Herzfrequenzen geteilt durch die Zahl aller Würfe — je kleiner, desto besser.',
      en: 'Three sets of ippon-seoi-nage on two partners: 15 s, 30 s, 30 s with 10 s rest between. Record heart rate immediately after the last set and after one minute of rest. The index is the sum of both heart rates divided by total throws — the lower the better.',
    },
    equipmentIds: [['partner'], ['mat'], ['heart_rate_monitor']],
    equipment: { de: 'Zwei Partner ähnlicher Grösse, Matte, Pulsmesser', en: 'Two partners of similar size, mat, heart rate monitor' },
  },
  {
    slug: 'grip_strength',
    primaryMetric: 'gripKg',
    primaryUnit: 'kg',
    fields: [
      { key: 'gripKg', type: 'number', unit: 'kg', required: true, min: 5, max: 120, step: 0.5 },
      { key: 'gripLeftKg', type: 'number', unit: 'kg', required: false, min: 5, max: 120, step: 0.5 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: true,
    derivedMetrics: ['grip_relative', 'grip_asymmetry_percent'],
    derive: (values, ctx, put) => {
      if (ctx.bodyWeightKg && values.gripKg != null) {
        put('grip_relative', values.gripKg / ctx.bodyWeightKg)
      }
      // Seitenunterschied nur, wenn beide Seiten gemessen wurden. Aus einer
      // Seite eine Asymmetrie zu rechnen wäre eine erfundene Zahl.
      if (values.gripKg != null && values.gripLeftKg != null) {
        const best = Math.max(values.gripKg, values.gripLeftKg)
        const worst = Math.min(values.gripKg, values.gripLeftKg)
        put('grip_asymmetry_percent', fatigueIndexPercent(best, worst))
      }
    },
    sortOrder: 501,
    name: { de: 'Griffkraft (Handdynamometer)', en: 'Grip strength (dynamometer)' },
    shortName: { de: 'Griffkraft', en: 'Grip' },
    summary: {
      de: 'Maximale isometrische Griffkraft. In allen Griffkampfsportarten regelmässig leistungsbegrenzend und in keiner Wettkampfleistung enthalten.',
      en: 'Maximal isometric grip strength. Regularly limiting in every grappling sport and contained in no competition result.',
    },
    instructions: {
      de: 'Aufrecht stehen, Arm am Körper, Ellenbogen 90 Grad. Drei Versuche je Hand mit einer Minute Pause. Wird die zweite Hand mit erfasst, weist die App die Seitendifferenz aus.',
      en: 'Stand upright, arm at the side, elbow at 90 degrees. Three attempts per hand with one minute rest. If the second hand is recorded, the app reports the side difference.',
    },
    equipmentIds: [['hand_dynamometer']],
    equipment: { de: 'Handdynamometer', en: 'Hand dynamometer' },
  },
  {
    slug: 'grip_hang_time',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 1, max: 600 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: true,
    derivedMetrics: [],
    sortOrder: 502,
    name: { de: 'Hang am gestreckten Arm', en: 'Dead hang' },
    shortName: { de: 'Hang', en: 'Hang' },
    summary: {
      de: 'Griffausdauer unter dem eigenen Körpergewicht. Die Grösse, die im Griffkampf über die letzten Minuten entscheidet.',
      en: 'Grip endurance under body weight. The quantity that decides the last minutes of a gripping contest.',
    },
    instructions: {
      de: 'Aus dem vollständigen Hang, Arme gestreckt, ohne Hilfsmittel. Gemessen wird bis zum Loslassen. Kein Wechsel des Griffs während der Messung.',
      en: 'From a full hang, arms extended, no straps. Timed until release. No re-gripping during the measurement.',
    },
    equipmentIds: [['pull_up_bar']],
    equipment: { de: 'Klimmzugstange', en: 'Pull-up bar' },
  },
  {
    slug: 'repeated_throws_30s',
    primaryMetric: 'reps',
    primaryUnit: 'Würfe',
    fields: [
      { key: 'reps', type: 'integer', unit: 'Würfe', required: true, min: 0, max: 60 },
      ...HR_RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 30 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 503,
    name: { de: 'Wiederholte Würfe 30 s', en: 'Repeated throws 30 s' },
    shortName: { de: 'Würfe 30 s', en: 'Throws 30 s' },
    summary: {
      de: 'Maximale Wurfzahl in 30 Sekunden. Bildet den entscheidenden Abschnitt eines Kampfes ab, in dem trotz Ermüdung weiter angegriffen werden muss.',
      en: 'Maximum number of throws in 30 seconds. Represents the decisive passage of a bout where attacking must continue despite fatigue.',
    },
    instructions: {
      de: 'Ein Partner, eine Wurftechnik, 30 Sekunden maximale Wiederholungszahl. Nur vollständig durchgeführte Würfe zählen. Technik und Partnergewicht in der Notiz festhalten, sonst sind zwei Messungen nicht vergleichbar.',
      en: 'One partner, one throwing technique, maximum repetitions in 30 seconds. Only completed throws count. Record technique and partner weight in the note, otherwise two measurements are not comparable.',
    },
    equipmentIds: [['partner'], ['mat']],
    equipment: { de: 'Partner, Matte', en: 'Partner, mat' },
  },
  strikeTest({
    slug: 'punch_test_60s',
    sortOrder: 504,
    durationSeconds: 60,
    action: 'punch',
    maxReps: 400,
    name: { de: 'Schlagtest 60 s', en: 'Punch test 60 s' },
    shortName: { de: 'Schläge 60 s', en: 'Punches 60 s' },
    summary: {
      de: 'Maximale Schlagzahl in einer Minute. Wird die erste halbe Minute mit erfasst, zeigt die App den Abfall — die aussagekräftigere Zahl als die Gesamtsumme.',
      en: 'Maximum punches in one minute. If the first half minute is recorded too, the app shows the drop-off — a more informative number than the total.',
    },
  }),
  strikeTest({
    slug: 'kick_test_60s',
    sortOrder: 505,
    durationSeconds: 60,
    action: 'kick',
    maxReps: 250,
    name: { de: 'Tritttest 60 s', en: 'Kick test 60 s' },
    shortName: { de: 'Tritte 60 s', en: 'Kicks 60 s' },
    summary: {
      de: 'Maximale Trittzahl in einer Minute, Seiten wechselnd. Misst die Wiederholbarkeit der Beinarbeit unter Ermüdung.',
      en: 'Maximum kicks in one minute, alternating sides. Measures repeatability of leg work under fatigue.',
    },
  }),
  {
    slug: 'plank_hold',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 5, max: 900 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 506,
    name: { de: 'Unterarmstütz (isometrisch)', en: 'Plank hold' },
    shortName: { de: 'Unterarmstütz', en: 'Plank' },
    summary: {
      de: 'Isometrische Rumpfausdauer. In Kampfsport, Trail und Ausdauerdisziplinen die Grösse, an der der Wirkungsgrad über die Dauer hängt.',
      en: 'Isometric trunk endurance. In combat sports, trail and endurance disciplines the quantity that efficiency over duration depends on.',
    },
    instructions: {
      de: 'Unterarme und Fussspitzen, Körper in einer Linie. Gemessen wird bis zum ersten sichtbaren Absinken der Hüfte, nicht bis zum Abbruch.',
      en: 'Forearms and toes, body in one line. Timed to the first visible drop of the hips, not to failure.',
    },
    equipmentIds: [['mat'], ['stopwatch']],
    equipment: { de: 'Matte, Stoppuhr', en: 'Mat, stopwatch' },
  },
]

// --- Hybrid und Tactical -----------------------------------------------------

/** Zusammengesetzte Aufgabe unter Last: Tragen, Ziehen, Steigen. */
const loadedTask = (
  slug: string,
  sortOrder: number,
  nameDe: string,
  nameEn: string,
  shortName: string,
  minS: number,
  maxS: number,
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
    { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: minS, max: maxS },
    { key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 5, max: 300, step: 2.5 },
    { key: 'distanceM', type: 'number', unit: 'm', required: false, min: 5, max: 2000, step: 1 },
    ...HR_RPE,
  ],
  // Ohne Körpergewicht lässt sich die getragene Last nicht einordnen.
  protocol: { mode: 'stopwatch' },
  requiresBodyWeight: true,
  derivedMetrics: ['load_relative'],
  sortOrder,
  name: { de: nameDe, en: nameEn },
  shortName: { de: shortName, en: shortName },
  summary: { de: summaryDe, en: summaryEn },
  instructions: { de: instructionsDe, en: instructionsEn },
  equipmentIds,
  equipment: { de: equipmentDe, en: equipmentEn },
})

export const LOADED_TESTS: TestBlueprint[] = [
  loadedTask(
    'farmers_carry', 520, 'Farmers Carry', 'Farmers carry', 'Carry', 5, 900,
    'Tragen unter Last über eine feste Strecke. Zusammengesetzte Aufgabe aus Griff-, Rumpf- und Beinarbeit — in Hybrid und Einsatzdienst regelmässig die begrenzende Grösse.',
    'Carrying under load over a set distance. A composite task of grip, trunk and leg work — regularly the limiting quantity in hybrid and duty contexts.',
    'Zwei gleiche Gewichte, aufrechter Gang, keine Ablage. Last und Strecke müssen zwischen zwei Messungen gleich sein, sonst ist die Zeit nicht vergleichbar.',
    'Two equal weights, upright gait, no setting down. Load and distance must match between measurements, otherwise the time is not comparable.',
    'Zwei Kurzhanteln oder Farmers-Griffe, vermessene Strecke',
    'Two dumbbells or farmers handles, measured distance',
      [['dumbbells'], ['measured_course']],
  ),
  loadedTask(
    'sled_push', 521, 'Sled Push', 'Sled push', 'Sled Push', 5, 600,
    'Schieben eines beladenen Schlittens. Reine konzentrische Beinarbeit ohne exzentrischen Anteil, dadurch wenig muskelkatererzeugend und häufig testbar.',
    'Pushing a loaded sled. Purely concentric leg work with no eccentric component, hence little soreness and frequently testable.',
    'Schlitten mit fester Zuladung über eine vermessene Strecke schieben. Untergrund in der Notiz festhalten — Kunstrasen und Beton unterscheiden sich erheblich.',
    'Push a sled with fixed load over a measured distance. Record the surface in the note — turf and concrete differ considerably.',
    'Schlitten, Gewichtsscheiben, vermessene Strecke',
    'Sled, plates, measured distance',
      [['sled'], ['added_load'], ['measured_course']],
  ),
  loadedTask(
    'sled_drag', 522, 'Sled Drag / Ziehen', 'Sled drag', 'Sled Drag', 5, 600,
    'Ziehen einer Last, rückwärts oder am Gurt. Bildet die Rettungs- und Bergebewegung im Einsatzdienst am direktesten ab.',
    'Dragging a load, backwards or on a harness. The closest representation of a rescue or extraction movement in duty contexts.',
    'Last über eine vermessene Strecke ziehen, ohne abzusetzen. Zugrichtung und Untergrund gehören in die Notiz.',
    'Drag the load over a measured distance without stopping. Direction of pull and surface belong in the note.',
    'Schlitten oder Gurtsystem, Gewichte, vermessene Strecke',
    'Sled or harness, weights, measured distance',
      [['sled'], ['added_load'], ['measured_course']],
  ),
  loadedTask(
    'stair_climb', 523, 'Treppensteigen unter Last', 'Loaded stair climb', 'Treppe', 10, 1200,
    'Steigen unter Zusatzlast. Für Feuerwehr und Rettungsdienst die tätigkeitsnächste Belastung überhaupt.',
    'Climbing under added load. For firefighting and EMS the closest load to the actual task.',
    'Feste Stockwerkszahl mit fester Zuladung, ohne Pause. Stockwerke, Last und ob mit Atemschutz getragen wurde in der Notiz festhalten.',
    'A fixed number of floors with fixed load, without pause. Record floors, load and whether breathing apparatus was worn.',
    'Treppenhaus, Gewichtsweste oder Ausrüstung',
    'Stairwell, weight vest or equipment',
      [['stairs'], ['added_load']],
  ),
  loadedTask(
    'loaded_march', 524, 'Marsch unter Last', 'Loaded march', 'Marsch', 600, 28800,
    'Gehen oder Laufen mit Rucksacklast über lange Distanz. Die Kombination aus Zusatzlast und Dauer unterscheidet das militärische Profil von jedem Sportprofil.',
    'Walking or running with pack load over long distance. The combination of added load and duration separates the military profile from any sporting one.',
    'Feste Strecke mit fester Last, so schnell wie möglich. Last, Strecke und Höhenmeter müssen zwischen zwei Messungen gleich sein.',
    'A fixed route with fixed load, as fast as possible. Load, distance and elevation must match between measurements.',
    'Rucksack mit definierter Last, vermessene Strecke',
    'Pack with defined load, measured route',
      [['added_load'], ['measured_course']],
  ),
]

export const HYBRID_TESTS: TestBlueprint[] = [
  {
    slug: 'wall_balls_75',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 60, max: 1800 },
      { key: 'loadKg', type: 'number', unit: 'kg', required: true, min: 2, max: 15, step: 0.5 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 530,
    name: { de: 'Wall Balls (75 Wdh.)', en: 'Wall balls (75 reps)' },
    shortName: { de: 'Wall Balls', en: 'Wall balls' },
    summary: {
      de: 'Die abschliessende Station im HYROX-Format und regelmässig die, an der das Rennen entschieden wird. Ganzkörper-Kraftausdauer unter hoher Atemlast.',
      en: 'The closing station of the HYROX format and regularly where the race is decided. Whole-body strength endurance under high respiratory load.',
    },
    instructions: {
      de: '75 Wiederholungen auf Zeit, volle Hocke und Zielhöhe erreichen. Ballgewicht und Zielhöhe festhalten — beides verändert die Zeit erheblich.',
      en: '75 repetitions for time, full squat and target height reached. Record ball weight and target height — both change the time considerably.',
    },
    equipmentIds: [['wall_ball'], ['cones']],
    equipment: { de: 'Wall Ball, Zielmarkierung', en: 'Wall ball, target mark' },
  },
  {
    slug: 'burpee_broad_jump_80m',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 60, max: 900 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch', targetDistanceM: 80 },
    requiresBodyWeight: true,
    derivedMetrics: [],
    sortOrder: 531,
    name: { de: 'Burpee Broad Jump 80 m', en: 'Burpee broad jump 80 m' },
    shortName: { de: 'Burpee Jump', en: 'Burpee jump' },
    summary: {
      de: 'Verbindet Schnellkraft mit Kraftausdauer unter hoher Atemlast. Die Station, die im Hybridformat am stärksten auf beide Achsen gleichzeitig zieht.',
      en: 'Combines power with strength endurance under high respiratory load. The station that draws on both axes simultaneously more than any other.',
    },
    instructions: {
      de: '80 m im Wechsel aus Burpee und Weitsprung aus dem Stand, auf Zeit. Brust und Oberschenkel müssen den Boden berühren.',
      en: '80 m alternating burpee and standing broad jump, for time. Chest and thighs must touch the ground.',
    },
    equipmentIds: [['measured_course']],
    equipment: { de: 'Vermessene Strecke von 80 m', en: 'Measured 80 m lane' },
  },
  {
    slug: 'row_1000m',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 120, max: 600 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch', targetDistanceM: 1000 },
    requiresBodyWeight: true,
    derivedMetrics: ['avg_pace_s_per_500m', 'avg_power_w', 'watts_per_kg'],
    derive: deriveRowing,
    sortOrder: 532,
    name: { de: '1000 m Rudern', en: '1000 m row' },
    shortName: { de: '1000 m Rudern', en: '1000 m row' },
    summary: {
      de: 'Kürzeres Zeitfenster als die 2000 m und dadurch stärker anaerob geprägt. Im HYROX-Format die einzige Station mit direkter Leistungsmessung.',
      en: 'A shorter time domain than the 2000 m and therefore more anaerobic. In the HYROX format the only station with direct power measurement.',
    },
    instructions: {
      de: 'Widerstand auf einen festen Wert einstellen und festhalten. 1000 m so schnell wie möglich, gleichmässig eingeteilt.',
      en: 'Set the damper to a fixed value and record it. 1000 m as fast as possible, evenly paced.',
    },
    equipmentIds: [['rowing_erg']],
    equipment: { de: 'Ruderergometer', en: 'Rowing ergometer' },
  },
]

// --- Laufen, Rad, Schwimmen, Triathlon ---------------------------------------

export const ENDURANCE_SPORT_TESTS: TestBlueprint[] = [
  timeTrial(
    'run_10k', 540, 10000, 1500, 6000, '10 km Lauf', '10 km run', '10 km', 'Nahe an der Schwelle über die volle Distanz. Wer hier nachlässt, hat meist ein Schwellenproblem und kein Problem der maximalen Sauerstoffaufnahme.',
    'Close to threshold over the whole distance. Whoever fades here usually has a threshold problem, not a maximal-oxygen-uptake problem.',
    'Vermessene flache Strecke oder Bahn, gleichmässig eingeteilt. An einem anderen Tag als andere Ausdauertests durchführen.',
    'Measured flat route or track, evenly paced. Perform on a different day from other endurance tests.',
    'Vermessene Strecke, Stoppuhr', 'Measured route, stopwatch', [['measured_course'], ['stopwatch']], ['avg_pace_s_per_km'],
  ),
  {
    slug: 'threshold_run_30min',
    primaryMetric: 'distanceM',
    primaryUnit: 'm',
    fields: [
      { key: 'distanceM', type: 'number', unit: 'm', required: true, min: 2000, max: 12000, step: 10 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 220 },
      { key: 'hrLast20min', type: 'integer', unit: 'bpm', required: false, min: 80, max: 220 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'countdown', durationSeconds: 1800 },
    requiresBodyWeight: false,
    derivedMetrics: ['avg_pace_s_per_km'],
    derive: (values, _ctx, put, test) => {
      // Die Pace kommt hier aus der Protokolldauer, nicht aus einem Feld: der
      // Test läuft feste 30 Minuten, eingegeben wird nur die Distanz. Ohne
      // diese Zeile kündigte der Test eine Kennzahl an, die er nie bildete.
      const seconds = test.protocol.durationSeconds
      if (seconds != null && values.distanceM != null && values.distanceM > 0) {
        put('avg_pace_s_per_km', pacePerKm(seconds, values.distanceM))
      }
    },
    sortOrder: 541,
    name: { de: '30-Minuten-Schwellentest', en: '30-minute threshold test' },
    shortName: { de: 'Schwelle 30 min', en: 'Threshold 30 min' },
    summary: {
      de: 'Maximale Distanz in 30 Minuten. Über Stunden ist die Schwelle der bessere Prädiktor als die maximale Sauerstoffaufnahme — und dieser Test kommt ohne Labor an sie heran.',
      en: 'Maximum distance in 30 minutes. Over hours, threshold predicts better than maximal oxygen uptake — and this test approaches it without a lab.',
    },
    instructions: {
      de: 'Nach Aufwärmen 30 Minuten maximal gleichmässig laufen. Die mittlere Herzfrequenz der letzten 20 Minuten ist die gebräuchliche Schätzung der Schwellenherzfrequenz.',
      en: 'After warming up, run 30 minutes at a maximal steady effort. Mean heart rate over the last 20 minutes is the common estimate of threshold heart rate.',
    },
    equipmentIds: [['track', 'measured_course'], ['heart_rate_monitor']],
    equipment: { de: 'Bahn oder vermessene Strecke, Pulsmesser', en: 'Track or measured route, heart rate monitor' },
  },
  {
    slug: 'ftp_20min',
    primaryMetric: 'ftp_watt',
    primaryUnit: 'W',
    fields: [
      { key: 'avgPowerW', type: 'number', unit: 'W', required: true, min: 50, max: 600, step: 1 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 220 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'countdown', durationSeconds: 1200 },
    requiresBodyWeight: true,
    derivedMetrics: ['ftp_watt', 'ftp_watt_per_kg', 'bike_threshold_score'],
    derive: (values, ctx, put) => {
      const ftp = functionalThresholdPower(values.avgPowerW)
      put('ftp_watt', ftp)
      if (ftp != null && ctx.bodyWeightKg) put('ftp_watt_per_kg', ftp / ctx.bodyWeightKg)
      put('bike_threshold_score', bikeThresholdScore(ftp, ctx.bodyWeightKg))
    },
    sortOrder: 550,
    name: { de: 'FTP-Test (20 Minuten)', en: 'FTP test (20 minutes)' },
    shortName: { de: 'FTP 20 min', en: 'FTP 20 min' },
    summary: {
      de: 'Die etablierte Feldschätzung der Schwellenleistung: 95 % der mittleren Leistung über 20 Minuten. Kein Laborwert, aber die genaueste Zahl, die ohne Labor erreichbar ist.',
      en: 'The established field estimate of threshold power: 95 % of mean power over 20 minutes. Not a lab value, but the most accurate number obtainable without one.',
    },
    instructions: {
      de: 'Nach gründlichem Aufwärmen 20 Minuten maximal gleichmässig fahren. Die App rechnet 95 % daraus als FTP. Gleiches Rad und gleiche Position wie beim Vergleichswert.',
      en: 'After a thorough warm-up, ride 20 minutes at a maximal steady effort. The app takes 95 % of it as FTP. Same bike and position as the comparison value.',
    },
    equipmentIds: [['power_meter', 'bike_erg']],
    equipment: { de: 'Leistungsmesser oder Smart-Trainer', en: 'Power meter or smart trainer' },
  },
  {
    slug: 'ramp_test_bike',
    primaryMetric: 'peakPowerW',
    primaryUnit: 'W',
    fields: [
      { key: 'peakPowerW', type: 'number', unit: 'W', required: true, min: 80, max: 800, step: 1 },
      { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 100, max: 240 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'stages' },
    requiresBodyWeight: true,
    derivedMetrics: ['watts_per_kg'],
    sortOrder: 551,
    name: { de: 'Rampentest (Rad)', en: 'Ramp test (bike)' },
    shortName: { de: 'Rampentest', en: 'Ramp test' },
    summary: {
      de: 'Stufenweise Steigerung bis zur Ausbelastung. Kürzer und weniger belastend als ein 20-Minuten-Test, dafür stärker von der anaeroben Kapazität beeinflusst.',
      en: 'Stepwise increase to exhaustion. Shorter and less taxing than a 20-minute test, but more influenced by anaerobic capacity.',
    },
    instructions: {
      de: 'Stufen von einer Minute mit fester Steigerung bis zum Abbruch. Stufenhöhe in der Notiz festhalten — sie verändert das Ergebnis erheblich.',
      en: 'One-minute steps with a fixed increment until failure. Record the increment in the note — it changes the result considerably.',
    },
    equipmentIds: [['bike_erg']],
    equipment: { de: 'Smart-Trainer oder Ergometer', en: 'Smart trainer or ergometer' },
  },
  {
    slug: 'peak_power_5s',
    primaryMetric: 'peakPowerW',
    primaryUnit: 'W',
    fields: [
      { key: 'peakPowerW', type: 'number', unit: 'W', required: true, min: 200, max: 2500, step: 1 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'attempts', attempts: 3 },
    requiresBodyWeight: true,
    derivedMetrics: ['watts_per_kg'],
    sortOrder: 552,
    name: { de: 'Spitzenleistung 5 s', en: 'Peak power 5 s' },
    shortName: { de: 'Peak Power', en: 'Peak power' },
    summary: {
      de: 'Maximale Leistung über fünf Sekunden aus dem Rollen. Im Bahnradsport die zentrale Grösse, auf der Strasse entscheidend für den Zielsprint.',
      en: 'Maximal power over five seconds from a rolling start. The central quantity in track cycling and decisive for the finish sprint on the road.',
    },
    instructions: {
      de: 'Drei Versuche mit vollständiger Erholung dazwischen. Aus dem Rollen antreten, nicht aus dem Stand — sonst misst man die Anfahrt statt der Spitzenleistung.',
      en: 'Three attempts with full recovery between. Start from a roll, not from standstill — otherwise you measure the launch, not peak power.',
    },
    equipmentIds: [['power_meter']],
    equipment: { de: 'Leistungsmesser', en: 'Power meter' },
  },
  {
    slug: 'wingate_30s',
    primaryMetric: 'avgPowerW',
    primaryUnit: 'W',
    fields: [
      { key: 'peakPowerW', type: 'number', unit: 'W', required: true, min: 200, max: 2500, step: 1 },
      { key: 'avgPowerW', type: 'number', unit: 'W', required: true, min: 100, max: 1500, step: 1 },
      { key: 'minPowerW', type: 'number', unit: 'W', required: false, min: 50, max: 1200, step: 1 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'countdown', durationSeconds: 30 },
    requiresBodyWeight: true,
    setting: 'lab',
    derivedMetrics: ['watts_per_kg', 'fatigue_index_percent'],
    derive: (values, _ctx, put) => {
      put('fatigue_index_percent', fatigueIndexPercent(values.peakPowerW, values.minPowerW))
    },
    sortOrder: 553,
    name: { de: 'Wingate-Test (30 s)', en: 'Wingate test (30 s)' },
    shortName: { de: 'Wingate', en: 'Wingate' },
    summary: {
      de: 'Anaerobe Leistungsfähigkeit über 30 Sekunden. Der Abfall von der Spitzen- zur Endleistung ist die aussagekräftigere Zahl als die mittlere Leistung.',
      en: 'Anaerobic capacity over 30 seconds. The drop from peak to end power is more informative than mean power.',
    },
    instructions: {
      de: 'Widerstand nach Körpergewicht einstellen, 30 Sekunden maximal. Sehr belastend — nicht am selben Tag wie andere Maximaltests.',
      en: 'Set resistance by body weight, 30 seconds maximal. Very taxing — not on the same day as other maximal tests.',
    },
    equipmentIds: [['bike_erg']],
    equipment: { de: 'Ergometer mit definierbarem Widerstand', en: 'Ergometer with settable resistance' },
  },
  {
    slug: 'lactate_step_test',
    primaryMetric: 'thresholdSpeed',
    primaryUnit: 'km/h',
    fields: [
      { key: 'thresholdSpeed', type: 'number', unit: 'km/h', required: true, min: 4, max: 25, step: 0.1 },
      { key: 'thresholdHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 220 },
      { key: 'maxLactate', type: 'number', unit: 'mmol/l', required: false, min: 0.5, max: 25, step: 0.1 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'stages' },
    requiresBodyWeight: false,
    setting: 'lab',
    derivedMetrics: [],
    sortOrder: 542,
    name: { de: 'Laktatstufentest', en: 'Lactate step test' },
    shortName: { de: 'Laktattest', en: 'Lactate test' },
    summary: {
      de: 'Stufentest mit Laktatmessung. Trennt die Schwelle von der maximalen Sauerstoffaufnahme — das leistet kein Feldtest. Braucht Messgerät und Betreuung.',
      en: 'A step test with lactate sampling. Separates threshold from maximal oxygen uptake — no field test does that. Requires equipment and supervision.',
    },
    instructions: {
      de: 'Stufen von 3–5 Minuten mit fester Steigerung, Blutentnahme am Ende jeder Stufe. Erfasst wird das Ergebnis der Auswertung: Geschwindigkeit an der Schwelle. Stufenlänge und Schwellenmodell in der Notiz festhalten — ohne sie sind zwei Tests nicht vergleichbar.',
      en: 'Steps of 3–5 minutes with a fixed increment, blood sample at the end of each step. Recorded here is the outcome of the analysis: speed at threshold. Note step length and threshold model — without them two tests are not comparable.',
    },
    equipmentIds: [['lactate_analyser'], ['treadmill', 'track'], ['partner']],
    equipment: { de: 'Laktatmessgerät, Laufband oder Bahn, Betreuung', en: 'Lactate analyser, treadmill or track, supervision' },
  },
]

export const SWIM_TESTS: TestBlueprint[] = [
  timeTrial(
    'swim_100m', 560, 100, 25, 300, '100 m Schwimmen', '100 m swim', '100 m', 'Kurzdistanz mit hohem anaeroben Anteil. Trennt Schwimmer mit gleicher Grundlagenausdauer über Antritt und Wendetechnik.',
    'A short distance with a high anaerobic share. Separates swimmers of equal aerobic base through start and turn technique.',
    'Aus dem Startsprung, maximale Zeit. Bahnlänge in der Notiz festhalten — Kurz- und Langbahn unterscheiden sich um mehrere Sekunden.',
    'From a dive start, maximal effort. Record the pool length — short and long course differ by several seconds.',
    'Schwimmbahn, Stoppuhr', 'Pool lane, stopwatch',
      [['pool'], ['stopwatch']],
  ),
  timeTrial(
    'swim_400m', 561, 400, 200, 1500, '400 m Schwimmen', '400 m swim', '400 m', 'Die gebräuchlichste Distanz zur Beurteilung der Grundlagenausdauer im Wasser. Lang genug für einen klaren Schwellenanteil, kurz genug für eine regelmässige Wiederholung.',
    'The most common distance for assessing aerobic base in the water. Long enough for a clear threshold share, short enough to repeat regularly.',
    'Gleichmässig eingeteilt, maximale Zeit. Bahnlänge und ob mit Neoprenanzug geschwommen wurde gehören in die Notiz.',
    'Evenly paced, maximal effort. Pool length and whether a wetsuit was worn belong in the note.',
    'Schwimmbahn, Stoppuhr', 'Pool lane, stopwatch',
      [['pool'], ['stopwatch']],
  ),
  {
    slug: 'swim_incremental',
    primaryMetric: 'thresholdPaceS100',
    primaryUnit: 's',
    fields: [
      { key: 'thresholdPaceS100', type: 'duration', unit: 's', required: true, min: 40, max: 240 },
      { key: 'strokeRate', type: 'number', unit: '/min', required: false, min: 10, max: 90, step: 0.5 },
      { key: 'strokeLengthM', type: 'number', unit: 'm', required: false, min: 0.5, max: 3.5, step: 0.05 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 220 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'stages' },
    requiresBodyWeight: false,
    derivedMetrics: ['swim_technique_score'],
    derive: (values, _ctx, put) => {
      put('swim_technique_score', swimTechniqueScore(values.strokeLengthM, values.thresholdPaceS100))
    },
    sortOrder: 562,
    name: { de: 'Inkrementeller Schwimmtest', en: 'Incremental swim test' },
    shortName: { de: 'Stufentest Schwimmen', en: 'Swim step test' },
    summary: {
      de: 'Stufentest im Wasser mit Erfassung von Zugfrequenz und Zuglänge. Nur im Wasser lässt sich die Schwimmleistung sauber erfassen — ein Landtest ersetzt ihn nicht.',
      en: 'A step test in the water recording stroke rate and length. Swimming performance can only be captured properly in water — no dry-land test replaces it.',
    },
    instructions: {
      de: 'Stufen über je 100 oder 200 m mit fester Steigerung. Erfasst wird die Pace an der Schwelle je 100 m; Zugfrequenz und Zuglänge sind freiwillig, machen aber erst den Technikwert möglich.',
      en: 'Steps of 100 or 200 m each with a fixed increment. Recorded is threshold pace per 100 m; stroke rate and length are optional but are what make the technique measure possible.',
    },
    equipmentIds: [['pool'], ['stopwatch'], ['counter']],
    equipment: { de: 'Schwimmbahn, Stoppuhr, Zähler für Zugzahl', en: 'Pool lane, stopwatch, stroke counter' },
  },
]

export const TRIATHLON_TESTS: TestBlueprint[] = [
  {
    slug: 'brick_bike_run',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 300, max: 5400 },
      { key: 'bikeMinutes', type: 'integer', unit: 'min', required: true, min: 10, max: 300 },
      { key: 'runDistanceM', type: 'number', unit: 'm', required: true, min: 1000, max: 21100, step: 100 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 220 },
      { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 },
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['avg_pace_s_per_km'],
    derive: (values, _ctx, put) => {
      // Die Pace bezieht sich auf den Laufteil, nicht auf die Gesamtzeit.
      const runSeconds =
        values.durationSeconds != null && values.bikeMinutes != null
          ? values.durationSeconds - values.bikeMinutes * 60
          : null
      if (runSeconds != null && runSeconds > 0) {
        put('avg_pace_s_per_km', pacePerKm(runSeconds, values.runDistanceM))
      }
    },
    sortOrder: 570,
    name: { de: 'Brick-Test (Rad auf Lauf)', en: 'Brick test (bike to run)' },
    shortName: { de: 'Brick', en: 'Brick' },
    summary: {
      de: 'Laufzeit unmittelbar nach definierter Radbelastung. Misst genau die Grösse, die drei getrennte Bestzeiten nicht zeigen — die Leistung unter Vorermüdung und über den Wechsel hinweg.',
      en: 'Run time immediately after a defined bike load. Measures precisely what three separate personal bests do not show — performance under pre-fatigue and across the transition.',
    },
    instructions: {
      de: 'Feste Radbelastung in Dauer und Intensität, dann ohne Pause die Laufstrecke. Raddauer, Intensität und Laufstrecke müssen zwischen zwei Messungen gleich sein, sonst ist der Vergleich wertlos.',
      en: 'A fixed bike load in duration and intensity, then the run without pause. Bike duration, intensity and run distance must match between measurements, otherwise the comparison is worthless.',
    },
    equipmentIds: [['bike_erg'], ['measured_course']],
    equipment: { de: 'Rad oder Ergometer, Laufstrecke', en: 'Bike or ergometer, running route' },
  },
]

export const SPORT_SPECIFIC_TESTS: TestBlueprint[] = [
  ...COMBAT_TESTS,
  ...LOADED_TESTS,
  ...HYBRID_TESTS,
  ...ENDURANCE_SPORT_TESTS,
  ...SWIM_TESTS,
  ...TRIATHLON_TESTS,
]
