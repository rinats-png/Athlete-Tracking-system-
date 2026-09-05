import type { TestBlueprint } from './testCatalog'

/**
 * Tests aus der erweiterten Quelltabelle.
 *
 * AUFNAHMEKRITERIUM, und es ist strenger als «die Quelle nennt den Test»:
 * das Protokoll muss so genau beschreibbar sein, dass zwei Menschen an zwei
 * Orten dasselbe messen. Ein Test, dessen Ablauf sich zwei Personen
 * verschieden auslegen, misst die Auslegung und nicht die Leistung.
 *
 * Deshalb stehen hier fünf Tests und nicht neun. Der karatespezifische
 * KSAT und der Taekwondo-TAAA-Test sind validiert und ihre Kennwerte
 * beziffert, aber die vorliegende Quelle beschreibt ihre Abläufe nicht in
 * dieser Genauigkeit — sie stehen mit Grund in `REFERENCE_GAPS`, ihre
 * VO2max-Kohortenwerte sind trotzdem übernommen.
 *
 * DIE VIER AFT-TESTS gehören zusammen: der US Army Fitness Test ist seit
 * Juni 2025 der offizielle Standard und die einzige Behördenbatterie mit
 * vollständigen, öffentlich zugänglichen Punktetabellen. Für die App sind
 * sie einzelne Tests — wer nur den Sprint-Drag-Carry macht, soll ihn
 * eintragen können, ohne die ganze Batterie zu absolvieren.
 */

const RPE = { key: 'rpe', type: 'rpe', required: false, min: 1, max: 10 } as const
const HR_RPE = [
  { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  { key: 'maxHeartRate', type: 'integer', unit: 'bpm', required: false, min: 30, max: 240 },
  RPE,
] as const

export const EXTENDED_TESTS: TestBlueprint[] = [
  // --- Schwimmen: die kritische Schwimmgeschwindigkeit ----------------------
  //
  // Das Gegenstück zur FTP im Radsport, und der einzige Schwellenwert im
  // Wasser, der ohne Labor auskommt: zwei maximale Zeitfahren, eine
  // Subtraktion. Die Rechnung stammt unverändert aus der Quelle.
  {
    slug: 'swim_css_test',
    primaryMetric: 'css_pace_s_100m',
    primaryUnit: 's/100 m',
    fields: [
      { key: 'time400S', type: 'duration', unit: 's', required: true, min: 180, max: 1200 },
      { key: 'time200S', type: 'duration', unit: 's', required: true, min: 80, max: 600 },
      { key: 'avgHeartRate', type: 'integer', unit: 'bpm', required: false, min: 80, max: 220 },
      RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['css_pace_s_100m', 'css_speed_m_s'],
    derive: (values, _ctx, put) => {
      const t400 = values.time400S
      const t200 = values.time200S
      if (t400 == null || t200 == null) return
      // Die 200 m stecken in den 400 m: die Differenz ist die Zeit für die
      // zweiten 200 m, also für 200 m im Schwellentempo. Geteilt durch zwei
      // ergibt das die Zeit für 100 m.
      const pace = (t400 - t200) / 2
      // Eine 400er-Zeit unter dem Doppelten der 200er-Zeit ist physikalisch
      // möglich (Wende, Start), aber dann misst der Test nichts: die
      // Rechnung setzt voraus, dass die längere Strecke langsamer war.
      if (pace <= 0) return
      put('css_pace_s_100m', pace)
      put('css_speed_m_s', 100 / pace)
    },
    sortOrder: 704,
    name: { de: 'Kritische Schwimmgeschwindigkeit (CSS)', en: 'Critical swim speed (CSS)' },
    shortName: { de: 'CSS', en: 'CSS' },
    summary: {
      de: 'Die Schwelle im Wasser, aus zwei Zeitfahren gerechnet — das Gegenstück zur FTP im Radsport. Braucht kein Labor und keine Laktatmessung.',
      en: 'The threshold in the water, computed from two time trials — the counterpart to cycling FTP. Needs neither a laboratory nor lactate sampling.',
    },
    instructions: {
      de: '400 m maximal schwimmen, ausreichend erholen (mindestens zehn Minuten locker), dann 200 m maximal. Beide vom Abstoss, nicht vom Startsprung. Das Tempo je 100 m ergibt sich aus der Differenz der beiden Zeiten geteilt durch zwei. Bahnlänge festhalten: Kurz- und Langbahn unterscheiden sich um mehrere Sekunden, und ein Wechsel dazwischen sieht aus wie eine Formveränderung.',
      en: 'Swim 400 m maximally, recover fully (at least ten easy minutes), then 200 m maximally. Both from a push start, not a dive. The pace per 100 m follows from the difference between the two times divided by two. Record the pool length: short and long course differ by several seconds, and switching between them looks like a change in form.',
    },
    equipmentIds: [['pool'], ['stopwatch']],
    equipment: { de: 'Schwimmbahn, Stoppuhr', en: 'Pool lane, stopwatch' },
  },

  // --- Griffkampf: Griffausdauer am Anzug ----------------------------------
  //
  // Nicht dasselbe wie der Hang am gestreckten Arm: dort greift die Hand um
  // eine Stange, hier um Stoff. Die Studienlage im Ringen und im BJJ misst
  // ausschliesslich die zweite Form, und die Werte der beiden Tests sind
  // nicht austauschbar — deshalb ein eigener Test statt einer Variante.
  {
    slug: 'gi_grip_hang',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 1, max: 300 },
      RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 700,
    name: { de: 'Griffausdauer am Anzug', en: 'Gi grip endurance' },
    shortName: { de: 'Anzuggriff', en: 'Gi grip' },
    summary: {
      de: 'Hang an zwei über eine Stange gelegten Anzugaufschlägen. Die Griffform, die im Griffkampf tatsächlich vorkommt — Stoff gibt nach, eine Stange nicht.',
      en: 'Hanging from two gi lapels draped over a bar. The grip that actually occurs in gripping exchanges — cloth yields, a bar does not.',
    },
    instructions: {
      de: 'Zwei Anzugaufschläge über eine Klimmzugstange legen und je einen mit einer Hand fassen, Arme gestreckt, Füsse frei. Zeit bis zum Lösen. Dieselbe Anzugstärke über die Termine hinweg verwenden: ein dickerer Aufschlag verändert das Ergebnis mehr als ein Trainingsblock.',
      en: 'Drape two gi lapels over a pull-up bar and hold one in each hand, arms extended, feet off the ground. Time until release. Use the same gi weight across sessions: a thicker lapel changes the result more than a training block does.',
    },
    equipmentIds: [['pull_up_bar'], ['gi'], ['stopwatch']],
    equipment: { de: 'Klimmzugstange, Judogi oder Gi, Stoppuhr', en: 'Pull-up bar, judogi or gi, stopwatch' },
  },

  // --- US Army Fitness Test: die vier fehlenden Disziplinen -----------------
  //
  // Unterarmstütz und Kreuzheben führt die App schon; ihre AFT-Bezugswerte
  // stehen bei den Referenzen. Hier kommen die vier dazu, die fehlten.
  {
    slug: 'hand_release_push_up',
    primaryMetric: 'reps',
    primaryUnit: 'Wdh.',
    fields: [
      { key: 'reps', type: 'integer', unit: 'Wdh.', required: true, min: 0, max: 120 },
      RPE,
    ],
    protocol: { mode: 'countdown', durationSeconds: 120 },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 701,
    name: { de: 'Liegestütz mit Handlösen', en: 'Hand-release push-up' },
    shortName: { de: 'Liegestütz', en: 'Push-up' },
    summary: {
      de: 'Liegestütz, bei dem die Hände am tiefsten Punkt vom Boden gehen. Das schliesst den Prellschwung aus, den ein gewöhnlicher Liegestütz zulässt — und macht die Wiederholungen zwischen zwei Terminen vergleichbar.',
      en: 'A push-up in which the hands leave the ground at the bottom. That removes the bounce an ordinary push-up allows — and makes repetitions comparable between sessions.',
    },
    instructions: {
      de: 'Zwei Minuten, so viele Wiederholungen wie möglich. Brust berührt den Boden, dann die Hände heben und die Arme seitlich zu einem T strecken, Hände zurücksetzen, Körper als Einheit hochdrücken. Der Körper bleibt in einer Linie. Pausen sind erlaubt, solange die Grundstellung gehalten wird.',
      en: 'Two minutes, as many repetitions as possible. Chest touches the ground, then lift the hands and extend the arms to the side into a T, return the hands, press the body up as one unit. The body stays in a straight line. Rests are allowed as long as the front leaning rest is held.',
    },
    equipmentIds: [['open_space'], ['stopwatch']],
    equipment: { de: 'Ebene Fläche, Stoppuhr', en: 'Level ground, stopwatch' },
  },
  {
    slug: 'sprint_drag_carry',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 60, max: 400 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: [],
    sortOrder: 702,
    name: { de: 'Sprint-Drag-Carry', en: 'Sprint-drag-carry' },
    shortName: { de: 'SDC', en: 'SDC' },
    summary: {
      de: 'Fünf Pendelstrecken über je 50 m mit wechselnder Aufgabe: Sprint, Schlittenziehen, seitliches Laufen, Tragen, Sprint. Der einzige Test der Batterie, der Kraft und Ausdauer im selben Durchgang belastet.',
      en: 'Five 50 m shuttles with changing tasks: sprint, sled drag, lateral run, carry, sprint. The only test in the battery that loads strength and endurance in one run.',
    },
    instructions: {
      de: 'Auf einer 25-m-Strecke, jede Aufgabe hin und zurück: Sprint · Schlitten mit 41 kg rückwärts ziehen · seitliches Überkreuzlaufen · zwei Kettlebells zu je 18 kg tragen · Sprint. Ohne Pause zwischen den Abschnitten, Zeit vom Start bis zur letzten Linie. Gewichte und Bodenbelag festhalten: Schlittenreibung auf Kunstrasen und auf Hallenboden unterscheidet sich erheblich.',
      en: 'On a 25 m lane, each task down and back: sprint · drag a 41 kg sled backwards · lateral shuffle · carry two 18 kg kettlebells · sprint. No rest between segments, timed from the start to the final line. Record weights and surface: sled friction differs considerably between artificial turf and a gym floor.',
    },
    equipmentIds: [['measured_course'], ['sled'], ['kettlebell'], ['stopwatch']],
    equipment: {
      de: '25-m-Strecke, Schlitten mit 41 kg, zwei Kettlebells zu 18 kg, Stoppuhr',
      en: '25 m lane, sled with 41 kg, two 18 kg kettlebells, stopwatch',
    },
  },
  {
    slug: 'run_2_mile',
    primaryMetric: 'durationSeconds',
    primaryUnit: 's',
    fields: [
      { key: 'durationSeconds', type: 'duration', unit: 's', required: true, min: 480, max: 2400 },
      ...HR_RPE,
    ],
    protocol: { mode: 'stopwatch' },
    requiresBodyWeight: false,
    derivedMetrics: ['avg_pace_s_km'],
    derive: (values, _ctx, put) => {
      const seconds = values.durationSeconds
      if (seconds == null) return
      // Zwei Meilen sind 3,219 km.
      put('avg_pace_s_km', seconds / 3.21869)
    },
    sortOrder: 703,
    name: { de: '2-Meilen-Lauf', en: 'Two-mile run' },
    shortName: { de: '2 Meilen', en: '2 miles' },
    summary: {
      de: 'Die Laufdisziplin des US Army Fitness Test über 3,22 km. Kürzer als der 1,5-Meilen-Lauf ist sie nicht — sie ist die Distanz, für die die offiziellen Punktetabellen gelten.',
      en: 'The running event of the US Army Fitness Test over 3.22 km. It is not shorter than the 1.5 mile run — it is the distance the official scoring tables apply to.',
    },
    instructions: {
      de: 'Nach lockerem Einlaufen 3,22 km (zwei Meilen) so schnell wie möglich, auf ebener Strecke oder Bahn. Strecke und Untergrund festhalten — ein Höhenunterschied von zwanzig Metern verschiebt die Zeit deutlicher als ein Trainingsblock.',
      en: 'After an easy warm-up, run 3.22 km (two miles) as fast as possible on a level course or track. Record the course and surface — twenty metres of elevation shift the time more than a training block does.',
    },
    equipmentIds: [['track', 'measured_course'], ['stopwatch']],
    equipment: { de: 'Bahn oder vermessene Strecke, Stoppuhr', en: 'Track or measured course, stopwatch' },
  },
]
