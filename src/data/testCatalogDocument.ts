import type { TestDefinition, TestField } from './testCatalog'

/**
 * Tests, die das Zielgruppendokument namentlich nennt.
 *
 * Getrennt von `testCatalogSportSpecific.ts`, weil die Herkunft hier die
 * Aufnahmebegründung ist: diese Verfahren stehen im Katalog, WEIL das Dokument
 * sie für eine Disziplin verlangt. Die Trennung macht später sichtbar, was
 * verschwände, wenn man die Quelle austauscht.
 *
 * Nicht enthalten sind die Verfahren, die ohne Fremdgerät nicht messbar sind
 * (Schlagkraft auf der Kraftmessplatte, Laufökonomie per Spiroergometrie,
 * Reaktionszeit im Fechten). Sie stehen mit Grund in `documentCoverage.ts` als
 * offene Lücke — eine geschätzte Schlagkraft wäre eine erfundene Zahl.
 *
 * PROTOKOLLTREUE: wo ein Verfahren publiziert ist (SWFT, UFT, JJAPT), steht in
 * der Anleitung das Originalprotokoll. Ein abgewandeltes Protokoll ergibt eine
 * Zahl, die mit publizierten Referenzwerten nichts mehr zu tun hat — deshalb
 * steht die Bedingung ausdrücklich dabei.
 */

const RPE: TestField = { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 }
const HR_AFTER: TestField[] = [
  { key: 'hrEnd', type: 'integer', unit: 'bpm', required: true, min: 80, max: 240 },
  { key: 'hrAfter1min', type: 'integer', unit: 'bpm', required: true, min: 60, max: 240 },
]

// --- Kampfsport: die drei publizierten Spezialtests ---------------------------

export const DOCUMENT_COMBAT_TESTS: TestDefinition[] = [
  {
    slug: 'special_wrestling_fitness_test',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'swft_index', power: 'totalThrows' },
    // Wie beim SJFT eine Belastungskennzahl: weniger ist besser.
    direction: 'lower_is_better',
    primaryMetric: 'swft_index',
    primaryUnit: 'Index',
    fields: [
      { key: 'throwsA', type: 'integer', unit: 'Würfe', required: true, min: 0, max: 40 },
      { key: 'throwsB', type: 'integer', unit: 'Würfe', required: true, min: 0, max: 40 },
      { key: 'throwsC', type: 'integer', unit: 'Würfe', required: true, min: 0, max: 40 },
      ...HR_AFTER,
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 90 },
    requiresBodyWeight: false,
    derivedMetrics: ['swft_index', 'totalThrows'],
    sortOrder: 601,
    name: { de: 'Special Wrestling Fitness Test', en: 'Special wrestling fitness test' },
    shortName: { de: 'SWFT', en: 'SWFT' },
    summary: {
      de: 'Das ringerspezifische Gegenstück zum SJFT: wiederholte Würfe an einem Partner mit unvollständiger Erholung, bewertet über Wurfzahl und Herzfrequenzantwort.',
      en: 'The wrestling counterpart to the SJFT: repeated throws on a partner with incomplete recovery, scored from throw count and heart rate response.',
    },
    instructions: {
      de: 'Drei Serien à 30 s Würfe an einem Partner gleicher Gewichtsklasse, dazwischen 30 s Pause. Herzfrequenz direkt nach der letzten Serie und nach einer Minute Pause erfassen. Der Index ist die Summe beider Herzfrequenzen geteilt durch die Gesamtzahl der Würfe. Nur mit diesem Protokoll und gleicher Wurftechnik über die Termine hinweg vergleichbar.',
      en: 'Three 30 s sets of throws on a partner of the same weight class, with 30 s rest between. Record heart rate immediately after the last set and after one minute of rest. The index is the sum of both heart rates divided by total throws. Comparable across sessions only with this protocol and the same throwing technique.',
    },
    equipment: { de: 'Partner gleicher Gewichtsklasse, Matte, Pulsmesser', en: 'Partner of the same weight class, mat, heart rate monitor' },
  },
  {
    slug: 'uchi_komi_fitness_test',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', power: 'repsFirst30' },
    direction: 'higher_is_better',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 400 },
      { key: 'repsFirst30', type: 'integer', unit: 'Wdh.', required: false, min: 0, max: 200 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 240 },
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 120 },
    requiresBodyWeight: false,
    derivedMetrics: ['fatigue_index_percent', 'reps_per_minute'],
    sortOrder: 602,
    name: { de: 'Uchi-komi Fitness Test', en: 'Uchi-komi fitness test' },
    shortName: { de: 'UFT', en: 'UFT' },
    summary: {
      de: 'Eingangsbewegungen ohne Wurf, zwei Minuten am Stück. Misst die Wiederholbarkeit der Angriffsvorbereitung — die Bewegung, die im Kampf am häufigsten vorkommt.',
      en: 'Entry movements without the throw, two minutes straight. Measures repeatability of attack preparation — the movement that occurs most often in a bout.',
    },
    instructions: {
      de: 'Zwei Minuten Uchi-komi in gleichbleibender Technik an einem Partner ähnlicher Grösse; jede vollständige Eindrehung zählt. Die Wiederholungen der ersten 30 Sekunden getrennt notieren — der Abfall über die zwei Minuten ist die eigentliche Aussage. Technik nicht wechseln, sonst ist der Wert nicht vergleichbar.',
      en: 'Two minutes of uchi-komi with one constant technique on a partner of similar size; each complete entry counts. Note the first 30 seconds separately — the drop-off across the two minutes is the actual finding. Do not switch technique, or the value is not comparable.',
    },
    equipment: { de: 'Partner ähnlicher Grösse, Matte', en: 'Partner of similar size, mat' },
  },
  {
    slug: 'jjapt',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps' },
    direction: 'higher_is_better',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 200 },
      { key: 'repsFirst30', type: 'integer', unit: 'Wdh.', required: false, min: 0, max: 120 },
      ...HR_AFTER,
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 180 },
    requiresBodyWeight: false,
    derivedMetrics: ['fatigue_index_percent'],
    sortOrder: 603,
    name: { de: 'JJAPT (BJJ-Anaerobtest)', en: 'JJAPT (BJJ anaerobic test)' },
    shortName: { de: 'JJAPT', en: 'JJAPT' },
    summary: {
      de: 'Wiederholte Griff- und Positionswechsel unter Zeitdruck. Bildet die anaerobe Belastung im Bodenkampf ab, die ein Lauf- oder Radtest nicht erfasst.',
      en: 'Repeated gripping and position changes under time pressure. Reflects the anaerobic load of ground fighting, which a running or cycling test does not capture.',
    },
    instructions: {
      de: 'Drei Minuten wiederholte Aufnahme aus der Wächterposition mit vollständigem Positionswechsel; jeder abgeschlossene Wechsel zählt. Herzfrequenz direkt danach und nach einer Minute erfassen. Partner und Griffart über die Termine gleich halten.',
      en: 'Three minutes of repeated entries from guard with a complete position change; each completed change counts. Record heart rate immediately after and after one minute. Keep partner and grip type constant across sessions.',
    },
    equipment: { de: 'Partner ähnlicher Grösse, Matte, Pulsmesser', en: 'Partner of similar size, mat, heart rate monitor' },
  },
  {
    slug: 'punch_test_180s',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps' },
    direction: 'higher_is_better',
    primaryMetric: 'reps',
    primaryUnit: 'Schläge',
    fields: [
      { key: 'reps', type: 'integer', unit: 'Schläge', required: true, min: 0, max: 900 },
      { key: 'repsFirst30', type: 'integer', unit: 'Schläge', required: false, min: 0, max: 300 },
      { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 240 },
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 180 },
    requiresBodyWeight: false,
    derivedMetrics: ['fatigue_index_percent', 'reps_per_minute'],
    sortOrder: 604,
    name: { de: 'Schlagtest über 3 Minuten', en: 'Three-minute punch test' },
    shortName: { de: '3-min Schlag', en: '3-min punch' },
    summary: {
      de: 'Eine volle Runde statt einer Minute. Der Unterschied zum 60-Sekunden-Test ist die eigentliche Aussage: wer beide macht, sieht, ob die Frequenz oder die Ausdauer begrenzt.',
      en: 'A full round instead of one minute. The difference from the 60-second test is the actual finding: doing both shows whether frequency or endurance is the limit.',
    },
    instructions: {
      de: 'Drei Minuten Schläge am Sandsack in gleichbleibender Kombination, maximale Frequenz. Die Schläge der ersten 30 Sekunden getrennt notieren. Gezählt wird die Zahl, nicht die Härte — Schlagkraft misst dieser Test ausdrücklich nicht.',
      en: 'Three minutes of punches on a bag with one constant combination, maximal frequency. Note the first 30 seconds separately. What is counted is the number, not the force — this test explicitly does not measure punching power.',
    },
    equipment: { de: 'Sandsack, Zähler oder Videoaufzeichnung', en: 'Heavy bag, counter or video recording' },
  },
  {
    slug: 'grappling_circuit_5min',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'rounds' },
    direction: 'higher_is_better',
    primaryMetric: 'rounds',
    primaryUnit: 'Runden',
    fields: [
      { key: 'rounds', type: 'integer', unit: 'Runden', required: true, min: 0, max: 40 },
      { key: 'partialReps', type: 'integer', unit: 'Wdh.', required: false, min: 0, max: 30 },
      ...HR_AFTER,
      RPE,
    ],
    protocol: { mode: 'amrap', durationSeconds: 300 },
    requiresBodyWeight: false,
    derivedMetrics: ['total_reps'],
    sortOrder: 605,
    name: { de: 'Grappling-Zirkel 5 Minuten', en: 'Five-minute grappling circuit' },
    shortName: { de: 'Grappling 5′', en: 'Grappling 5′' },
    summary: {
      de: 'Fester Zirkel aus Wurf, Positionswechsel und Aufstehen, fünf Minuten am Stück. Standardisiert das, was das Dokument als «kombinierte Zirkel» beschreibt.',
      en: 'A fixed circuit of throw, position change and stand-up, five minutes straight. Standardises what the document calls "combined circuits".',
    },
    instructions: {
      de: 'Eine Runde: ein Wurf oder Takedown, ein vollständiger Positionswechsel am Boden, einmal Aufstehen. So viele vollständige Runden wie möglich in fünf Minuten. Partner, Wurf und Position über die Termine gleich halten — der Zirkel ist nur gegen sich selbst vergleichbar, nicht gegen andere Athleten.',
      en: 'One round: one throw or takedown, one complete position change on the ground, one stand-up. As many complete rounds as possible in five minutes. Keep partner, throw and position constant across sessions — the circuit compares against yourself, not against other athletes.',
    },
    equipment: { de: 'Partner ähnlicher Grösse, Matte, Pulsmesser', en: 'Partner of similar size, mat, heart rate monitor' },
  },
  {
    slug: 'fatigue_circuit_4x30s',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps' },
    direction: 'higher_is_better',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [
      { key: 'repsSet1', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 200 },
      { key: 'repsSet2', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 200 },
      { key: 'repsSet3', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 200 },
      { key: 'repsSet4', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 200 },
      RPE,
    ],
    protocol: { mode: 'attempts', attempts: 4 },
    requiresBodyWeight: false,
    derivedMetrics: ['reps', 'fatigue_index_percent'],
    sortOrder: 606,
    name: { de: 'Ermüdungszirkel 4 × 30 s', en: 'Fatigue circuit 4 × 30 s' },
    shortName: { de: '4 × 30 s', en: '4 × 30 s' },
    summary: {
      de: 'Vier maximale Sätze mit kurzer Pause. Nicht die Gesamtzahl ist die Aussage, sondern der Abfall vom ersten zum letzten Satz — die Wiederholbarkeit unter Ermüdung.',
      en: 'Four maximal sets with short rest. The finding is not the total but the drop from first to last set — repeatability under fatigue.',
    },
    instructions: {
      de: 'Vier Sätze à 30 s maximale technische Aktionen der eigenen Sportart (Schläge, Tritte, Eindrehungen, Antritte), dazwischen jeweils 30 s Pause. Jeden Satz einzeln zählen. Die gewählte Aktion über die Termine gleich halten — ein Wechsel macht den Verlauf wertlos.',
      en: 'Four 30 s sets of maximal technical actions from your own sport (punches, kicks, entries, bursts) with 30 s rest between. Count each set separately. Keep the chosen action constant across sessions — switching makes the trend worthless.',
    },
    equipment: { de: 'Stoppuhr, je nach Aktion Sandsack oder Partner', en: 'Stopwatch, bag or partner depending on the action' },
  },
  {
    slug: 'rope_climb',
    category: 'strength_endurance',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', max_strength: 'reps' },
    direction: 'higher_is_better',
    primaryMetric: 'reps',
    primaryUnit: 'Aufstiege',
    fields: [
      { key: 'reps', type: 'integer', unit: 'Aufstiege', required: true, min: 0, max: 30 },
      { key: 'heightM', type: 'number', unit: 'm', required: true, min: 2, max: 12, step: 0.5 },
      { key: 'durationSeconds', type: 'duration', unit: 's', required: false, min: 5, max: 900 },
      RPE,
    ],
    protocol: { mode: 'amrap', durationSeconds: 300 },
    requiresBodyWeight: true,
    derivedMetrics: ['climb_meters_total'],
    sortOrder: 607,
    name: { de: 'Seilklettern', en: 'Rope climb' },
    shortName: { de: 'Seil', en: 'Rope' },
    summary: {
      de: 'Zugkraft und Griffkraft am eigenen Körpergewicht in der Bewegung, die im Ringen und auf Hindernisbahnen unmittelbar vorkommt.',
      en: 'Pulling and grip strength at body weight, in the movement that occurs directly in wrestling and on obstacle courses.',
    },
    instructions: {
      de: 'So viele vollständige Aufstiege wie möglich in fünf Minuten, ohne Beineinsatz gewertet nur, wenn ohne Beine geklettert wird — die gewählte Form über die Termine beibehalten. Höhe des Seils eintragen; die geleistete Steighöhe wird daraus gerechnet.',
      en: 'As many complete climbs as possible in five minutes. Legless only counts as legless if climbed without legs — keep the chosen form across sessions. Enter the rope height; total climbed height is computed from it.',
    },
    equipment: { de: 'Kletterseil mit bekannter Höhe, Matte', en: 'Climbing rope of known height, mat' },
  },
  {
    slug: 'rope_skipping_3min',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'reps', power: 'reps' },
    direction: 'higher_is_better',
    primaryMetric: 'reps',
    primaryUnit: 'Sprünge',
    fields: [
      { key: 'reps', type: 'integer', unit: 'Sprünge', required: true, min: 0, max: 900 },
      { key: 'breaks', type: 'integer', unit: 'Unterbrechungen', required: false, min: 0, max: 50 },
      { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 240 },
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 180 },
    requiresBodyWeight: false,
    derivedMetrics: ['reps_per_minute'],
    sortOrder: 608,
    name: { de: 'Seilspringen 3 Minuten', en: 'Rope skipping, three minutes' },
    shortName: { de: 'Seilspringen', en: 'Skipping' },
    summary: {
      de: 'Fussgelenkssteifigkeit und Rhythmus über eine volle Runde. Im Boxen Teil des Aufwärmens und deshalb ohne Zusatzaufwand messbar.',
      en: 'Ankle stiffness and rhythm over a full round. In boxing it is part of the warm-up, so it is measurable without extra effort.',
    },
    instructions: {
      de: 'Drei Minuten Seilspringen, einfache Durchschläge, maximale Zahl. Unterbrechungen zählen und eintragen — sie sind der aussagekräftigere Wert als die reine Sprungzahl.',
      en: 'Three minutes of skipping, single unders, maximum count. Count and enter the breaks — they are more informative than the raw jump count.',
    },
    equipment: { de: 'Springseil, ebener Boden', en: 'Skipping rope, level floor' },
  },
]

// --- Hybrid, Tactical, Gelände ----------------------------------------------

export const DOCUMENT_TASK_TESTS: TestDefinition[] = [
  {
    slug: 'ski_erg_1000m',
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds', strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 120, max: 900 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 240 },
      RPE,
    ],
    protocol: { mode: 'stopwatch', targetDistanceM: 1000 },
    requiresBodyWeight: false,
    derivedMetrics: ['avg_pace_s_per_500m'],
    sortOrder: 620,
    name: { de: 'Ski-Ergometer 1000 m', en: 'Ski erg 1000 m' },
    shortName: { de: 'Ski 1000', en: 'Ski 1000' },
    summary: {
      de: 'Oberkörperlastige Ausdauer. In HYROX eine eigene Station und über das Rudern nicht abgedeckt: der Zug kommt von oben statt von hinten.',
      en: 'Upper-body dominant endurance. A station of its own in HYROX and not covered by rowing: the pull comes from above rather than behind.',
    },
    instructions: {
      de: 'Widerstand auf die gewohnte Einstellung setzen und notieren — eine andere Einstellung macht den Vergleich wertlos. 1000 m so schnell wie möglich.',
      en: 'Set the damper to your usual setting and note it — a different setting makes the comparison worthless. 1000 m as fast as possible.',
    },
    equipment: { de: 'Ski-Ergometer', en: 'Ski ergometer' },
  },
  {
    slug: 'crawl_30m',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 10, max: 300 },
      RPE,
    ],
    protocol: { mode: 'stopwatch', targetDistanceM: 30 },
    requiresBodyWeight: true,
    derivedMetrics: [],
    sortOrder: 621,
    name: { de: 'Kriechen 30 m', en: 'Crawl 30 m' },
    shortName: { de: 'Kriechen', en: 'Crawl' },
    summary: {
      de: 'Fortbewegung in Deckung, bei Hindernisläufen und im Einsatz gleichermassen gefordert. Belastet Schulter und Rumpf in einer Weise, die kein Lauftest abbildet.',
      en: 'Movement under cover, demanded alike in obstacle racing and on duty. Loads shoulder and trunk in a way no running test reflects.',
    },
    instructions: {
      de: '30 m Bärengang oder Robben — die Form vorher festlegen und beibehalten. Bauch und Knie dürfen bei der Robbe den Boden berühren, beim Bärengang nicht.',
      en: '30 m bear crawl or low crawl — decide the form beforehand and keep it. In the low crawl, stomach and knees may touch the ground; in the bear crawl they may not.',
    },
    equipment: { de: 'Ebene Strecke, 30 m', en: 'Level course, 30 m' },
  },
  {
    slug: 'obstacle_course_sim',
    category: 'conditioning',
    dimension: 'strength_endurance',
    dimensionMetrics: { strength_endurance: 'durationSeconds', endurance: 'durationSeconds' },
    direction: 'lower_is_better',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 30, max: 1800 },
      { key: 'stations', type: 'integer', unit: 'Stationen', required: true, min: 2, max: 20 },
      { key: 'penalties', type: 'integer', unit: 'Fehlversuche', required: false, min: 0, max: 40 },
      { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 240 },
      RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: true,
    derivedMetrics: ['seconds_per_station'],
    sortOrder: 622,
    name: { de: 'Hindernisbahn', en: 'Obstacle course' },
    shortName: { de: 'Hindernisbahn', en: 'Obstacle' },
    summary: {
      de: 'Die eigene Bahn, gegen sich selbst gemessen. Zahl der Stationen und Fehlversuche stehen dabei, weil eine Zeit ohne sie nichts aussagt.',
      en: 'Your own course, measured against yourself. Station count and failed attempts are recorded with it, because a time alone says nothing.',
    },
    instructions: {
      de: 'Die eigene Bahn einmal festlegen und ab dann unverändert lassen: dieselben Stationen, dieselbe Reihenfolge, dieselben Höhen. Zeit, Stationszahl und Fehlversuche eintragen. Der Wert ist ausdrücklich nicht gegen andere Athleten vergleichbar — nur gegen den eigenen Vorwert auf derselben Bahn.',
      en: 'Define your course once and leave it unchanged: same stations, same order, same heights. Record time, station count and failed attempts. The value is explicitly not comparable against other athletes — only against your own previous result on the same course.',
    },
    equipment: { de: 'Feste Hindernisbahn, Stoppuhr', en: 'Fixed obstacle course, stopwatch' },
  },
]

// --- Laufen im Gelände und über Stunden --------------------------------------

export const DOCUMENT_RUNNING_TESTS: TestDefinition[] = [
  {
    slug: 'uphill_run_test',
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds', strength_endurance: 'durationSeconds' },
    direction: 'lower_is_better',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 120, max: 3600 },
      { key: 'distanceM', type: 'number', unit: 'm', required: true, min: 200, max: 8000, step: 10 },
      { key: 'elevationGainM', type: 'number', unit: 'Hm', required: true, min: 20, max: 1500, step: 5 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 240 },
      RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['vertical_speed_m_per_h', 'grade_percent'],
    sortOrder: 630,
    name: { de: 'Bergauflauf', en: 'Uphill run test' },
    shortName: { de: 'Bergauf', en: 'Uphill' },
    summary: {
      de: 'Steigleistung in Höhenmetern je Stunde. Am Berg entscheidet sie über die Zeit, und sie lässt sich aus einer Flachbestzeit nicht ableiten.',
      en: 'Climbing performance in vertical metres per hour. On a climb it decides the time, and it cannot be derived from a flat personal best.',
    },
    instructions: {
      de: 'Eine feste Steigung wählen und beibehalten. Distanz und Höhenmeter eintragen; daraus wird die Steigleistung gerechnet. Ein Wechsel der Strecke macht den Verlauf wertlos — die Steigung geht unmittelbar in das Ergebnis ein.',
      en: 'Choose one fixed climb and keep it. Enter distance and elevation gain; vertical speed is computed from them. Changing the course makes the trend worthless — gradient enters the result directly.',
    },
    equipment: { de: 'Vermessene Steigung, Uhr mit Höhenmesser oder bekannte Höhenangabe', en: 'Measured climb, watch with altimeter or known elevation' },
  },
  {
    slug: 'downhill_run_test',
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'durationSeconds', power: 'durationSeconds' },
    direction: 'lower_is_better',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 60, max: 2400 },
      { key: 'distanceM', type: 'number', unit: 'm', required: true, min: 200, max: 8000, step: 10 },
      { key: 'elevationLossM', type: 'number', unit: 'Hm', required: true, min: 20, max: 1500, step: 5 },
      RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['grade_percent'],
    sortOrder: 631,
    name: { de: 'Bergablauf', en: 'Downhill run test' },
    shortName: { de: 'Bergab', en: 'Downhill' },
    summary: {
      de: 'Die exzentrische Seite des Geländelaufs. Sie begrenzt lange Trailrennen häufiger als die Steigleistung und wird selten gemessen.',
      en: 'The eccentric side of trail running. It limits long trail races more often than climbing does, and is rarely measured.',
    },
    instructions: {
      de: 'Dieselbe Strecke wie beim Bergauflauf, in umgekehrter Richtung, kontrolliert schnell. Nicht in der Woche vor einem Wettkampf durchführen: die exzentrische Belastung braucht mehrere Tage Erholung. Bei Beschwerden abbrechen.',
      en: 'The same course as the uphill test, in reverse, controlled and fast. Do not run it in the week before a competition: eccentric load needs several days of recovery. Stop if it hurts.',
    },
    equipment: { de: 'Dieselbe vermessene Strecke wie bergauf', en: 'The same measured course as uphill' },
  },
  {
    slug: 'hr_drift_test',
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'hr_drift_percent' },
    // Weniger Drift ist besser: die Herzfrequenz bleibt bei gleicher Leistung stabil.
    direction: 'lower_is_better',
    primaryMetric: 'hr_drift_percent',
    primaryUnit: '%',
    fields: [
      { key: 'hrFirstHalf', type: 'integer', unit: 'bpm', required: true, min: 80, max: 220 },
      { key: 'hrSecondHalf', type: 'integer', unit: 'bpm', required: true, min: 80, max: 220 },
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 1800, max: 10800 },
      { key: 'distanceM', type: 'number', unit: 'm', required: false, min: 3000, max: 60000, step: 100 },
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 3600 },
    requiresBodyWeight: false,
    derivedMetrics: ['hr_drift_percent', 'avg_pace_s_per_km'],
    sortOrder: 632,
    name: { de: 'Herzfrequenzdrift', en: 'Heart rate drift' },
    shortName: { de: 'HF-Drift', en: 'HR drift' },
    summary: {
      de: 'Der Anstieg der Herzfrequenz bei gleichbleibendem Tempo. Auf Langdistanzen sagt er mehr über die Dauerbelastbarkeit als jeder Maximalwert.',
      en: 'The rise in heart rate at constant pace. Over long distances it says more about durability than any maximal value.',
    },
    instructions: {
      de: 'Mindestens 60 Minuten in gleichbleibendem, ruhigem Tempo. Mittlere Herzfrequenz der ersten und der zweiten Hälfte getrennt eintragen. Das Tempo muss über beide Hälften gleich bleiben — sonst misst der Wert die Tempoänderung, nicht die Drift. Nicht bei Hitze durchführen, wenn der Vorwert bei Kühle entstand.',
      en: 'At least 60 minutes at a constant, easy pace. Enter mean heart rate for the first and second half separately. Pace must stay equal across both halves — otherwise the value measures the pace change, not the drift. Do not run it in heat if the previous result was recorded in cool conditions.',
    },
    equipment: { de: 'Pulsgurt, ebene Strecke oder Laufband', en: 'Heart rate strap, flat course or treadmill' },
  },
]

// --- Rad ---------------------------------------------------------------------

export const DOCUMENT_CYCLING_TESTS: TestDefinition[] = [
  {
    slug: 'submax_efficiency_bike',
    category: 'endurance',
    dimension: 'endurance',
    dimensionMetrics: { endurance: 'efficiency_w_per_bpm' },
    direction: 'higher_is_better',
    primaryMetric: 'efficiency_w_per_bpm',
    primaryUnit: 'W/bpm',
    fields: [
      { key: 'targetPowerW', type: 'number', unit: 'W', required: true, min: 50, max: 400, step: 5 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: true, min: 80, max: 200 },
      { key: 'cadence', type: 'integer', unit: '/min', required: false, min: 40, max: 130 },
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 600 },
    requiresBodyWeight: true,
    derivedMetrics: ['efficiency_w_per_bpm', 'watts_per_kg'],
    sortOrder: 640,
    name: { de: 'Submaximaler Effizienztest', en: 'Submaximal efficiency test' },
    shortName: { de: 'Submax Rad', en: 'Submax bike' },
    summary: {
      de: 'Leistung je Herzschlag bei fester Wattzahl. Der einzige Test dieser Liste, der sich wöchentlich wiederholen lässt, ohne Erholung zu kosten — und genau deshalb für die Verlaufsbeobachtung der nützlichste.',
      en: 'Power per heartbeat at fixed watts. The one test in this list that can be repeated weekly without costing recovery — and for that reason the most useful for tracking.',
    },
    instructions: {
      de: 'Zehn Minuten bei fest eingestellter Leistung, ungefähr 70 % der Schwelle, nach 15 Minuten Einfahren. Mittlere Herzfrequenz der letzten fünf Minuten eintragen. Dieselbe Wattzahl über die Termine beibehalten — der Vergleich lebt davon. Nicht nach harten Einheiten und nicht bei Hitze durchführen.',
      en: 'Ten minutes at a fixed power, roughly 70 % of threshold, after 15 minutes of warm-up. Enter mean heart rate for the final five minutes. Keep the same wattage across sessions — the comparison depends on it. Do not perform it after hard sessions or in heat.',
    },
    equipment: { de: 'Leistungsmesser oder Ergometer, Pulsgurt', en: 'Power meter or ergometer, heart rate strap' },
  },
  {
    slug: 'repeated_sprint_bike',
    category: 'conditioning',
    dimension: 'power',
    dimensionMetrics: { power: 'peakPowerW', strength_endurance: 'fatigue_index_percent' },
    direction: 'higher_is_better',
    primaryMetric: 'peakPowerW',
    primaryUnit: 'W',
    fields: [
      { key: 'peakPowerW', type: 'number', unit: 'W', required: true, min: 200, max: 2500, step: 1 },
      { key: 'lastSprintPowerW', type: 'number', unit: 'W', required: true, min: 100, max: 2500, step: 1 },
      { key: 'sprintCount', type: 'integer', unit: 'Sprints', required: true, min: 3, max: 15 },
      RPE,
    ],
    protocol: { mode: 'attempts', attempts: 6 },
    requiresBodyWeight: true,
    derivedMetrics: ['fatigue_index_percent', 'watts_per_kg'],
    sortOrder: 641,
    name: { de: 'Wiederholter Sprint auf dem Rad', en: 'Repeated sprint, bike' },
    shortName: { de: 'Wdh.-Sprint', en: 'Rep. sprint' },
    summary: {
      de: 'Sechs Antritte mit kurzer Pause. Im Rennen entscheidet nicht der erste Antritt, sondern der sechste — und der Abfall dazwischen ist der eigentliche Messwert.',
      en: 'Six efforts with short rest. In a race it is not the first effort that decides but the sixth — and the drop between them is the actual measurement.',
    },
    instructions: {
      de: 'Sechs Sprints à 10 s aus dem Rollen, dazwischen 30 s locker. Höchste und niedrigste Spitzenleistung eintragen. Immer dieselbe Zahl an Sprints und dieselbe Pausenlänge — beides geht direkt in den Ermüdungsindex ein.',
      en: 'Six 10 s sprints from a rolling start with 30 s easy between. Enter the highest and the lowest peak power. Always the same number of sprints and the same rest — both enter the fatigue index directly.',
    },
    equipment: { de: 'Leistungsmesser oder Ergometer', en: 'Power meter or ergometer' },
  },
]

// --- Schwimmen: die Lagen einzeln --------------------------------------------

const strokeTimeTrial = (
  slug: string,
  sortOrder: number,
  nameDe: string,
  nameEn: string,
  summaryDe: string,
  summaryEn: string,
): TestDefinition => ({
  slug,
  category: 'endurance',
  dimension: 'endurance',
  dimensionMetrics: { endurance: 'durationSeconds' },
  direction: 'lower_is_better',
  primaryMetric: 'durationSeconds',
  primaryUnit: 's',
  fields: [
    { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 40, max: 300 },
    { key: 'strokeCount', type: 'integer', unit: 'Züge', required: false, min: 10, max: 200 },
    { key: 'poolLengthM', type: 'integer', unit: 'm', required: true, min: 20, max: 50 },
    RPE,
  ],
  protocol: { mode: 'stopwatch', targetDistanceM: 100 },
  requiresBodyWeight: false,
  derivedMetrics: ['strokes_per_100m'],
  sortOrder,
  name: { de: nameDe, en: nameEn },
  shortName: { de: nameDe, en: nameEn },
  summary: { de: summaryDe, en: summaryEn },
  instructions: {
    de: '100 m in der angegebenen Lage, maximal. Bahnlänge eintragen — eine 25-m-Bahn hat doppelt so viele Wenden wie eine 50-m-Bahn und ergibt dadurch eine schnellere Zeit. Zugzahl mitzählen lassen, wenn jemand am Beckenrand steht.',
    en: '100 m in the given stroke, maximal. Enter the pool length — a 25 m pool has twice the turns of a 50 m pool and therefore yields a faster time. Have someone count strokes from the poolside if possible.',
  },
  equipment: { de: 'Schwimmbahn, Stoppuhr', en: 'Pool lane, stopwatch' },
})

export const DOCUMENT_SWIM_TESTS: TestDefinition[] = [
  strokeTimeTrial(
    'swim_100m_backstroke',
    650,
    'Rücken 100 m',
    'Backstroke 100 m',
    'Die Rückenzeit neben der Freistilzeit zeigt, ob eine Schwäche an der Ausdauer liegt oder an der Lage.',
    'Backstroke time beside freestyle time shows whether a weakness lies in endurance or in the stroke.',
  ),
  strokeTimeTrial(
    'swim_100m_breaststroke',
    651,
    'Brust 100 m',
    'Breaststroke 100 m',
    'Die technikabhängigste Lage: hier trennt die Zugeffizienz zwei Schwimmer mit gleicher Ausdauer am deutlichsten.',
    'The most technique-dependent stroke: here stroke efficiency separates two swimmers of equal endurance most clearly.',
  ),
  strokeTimeTrial(
    'swim_100m_butterfly',
    652,
    'Schmetterling 100 m',
    'Butterfly 100 m',
    'Höchste anaerobe Last aller Lagen. Der Einbruch auf der zweiten Bahnhälfte ist hier der aussagekräftigste Teil der Zeit.',
    'The highest anaerobic load of all strokes. The drop on the second half is the most informative part of the time here.',
  ),
]

export const DOCUMENT_TESTS: TestDefinition[] = [
  ...DOCUMENT_COMBAT_TESTS,
  ...DOCUMENT_TASK_TESTS,
  ...DOCUMENT_RUNNING_TESTS,
  ...DOCUMENT_CYCLING_TESTS,
  ...DOCUMENT_SWIM_TESTS,
]
