import type { Localized } from '@/i18n/pick'

/**
 * Standardisierte Testdokumentation, Protokoll v1.0 (23.09.2026).
 *
 * Für dreizehn Tests sind die offenen Punkte der Durchführung entschieden:
 * Beep-Test-Fassung, Kniebeugentiefe, Kreuzhebe-Variante, Pause beim
 * Bankdrücken und so weiter. Diese Datei hält die Entscheidungen fest; die
 * Vorschrift in `testProcedure.ts` bekommt sie als Zusatzregeln angehängt.
 *
 * Ein Ergebnis trägt die Protokollversion, unter der es gemessen wurde.
 * Ältere Ergebnisse haben keine — sie gelten als «Protokoll unbekannt»,
 * nicht als ungültig. Zwei Messungen unter verschiedenen Protokollen lassen
 * sich nicht ohne Vorbehalt vergleichen; die Version macht das sichtbar.
 *
 * Nichts hier ist eine Empfehlung an eine Person (§81) oder eine
 * medizinische Aussage (§82): es sind Durchführungsregeln für die Messung.
 */

export const PROTOCOL_VERSION = '1.0'

/**
 * Wie gemessen wurde. Handzeit und Lichtschranke, direktes und geschätztes
 * 1RM sind verschiedene Messungen desselben Tests — deshalb steht die
 * Methode am Ergebnis und nicht am Test.
 */
export const MEASUREMENT_METHODS = [
  'direct_1rm',
  'estimated_e1rm',
  'hand_stopwatch',
  'light_gate',
  'ergometer_display',
  'tape_measure',
  'audio_protocol',
  'rep_count',
] as const
export type MeasurementMethod = (typeof MEASUREMENT_METHODS)[number]

/** Vorgegebene Gründe für einen ungültigen Versuch; «other» mit Freitext. */
export const INVALID_REASONS = [
  'depth',
  'technique',
  'assisted',
  'false_start',
  'line_missed',
  'equipment',
  'other',
] as const
export type InvalidReason = (typeof INVALID_REASONS)[number]

export interface ProtocolSpec {
  /** Zulässige Methoden; die erste ist die Standardmethode. */
  methods: MeasurementMethod[]
  /** Zusätzliche Gültigkeitsregeln aus v1.0. */
  valid?: Localized[]
  /** Zusätzliche Regeln zum Ablauf der Versuche. */
  attempts?: Localized
  /** Zusätzliche Standardisierungsregeln. */
  standardise?: Localized[]
  /** Was bei einer vom Standard abweichenden Methode festzuhalten ist. */
  methodNote?: Partial<Record<MeasurementMethod, Localized>>
}

const bi = (de: string, en: string): Localized => ({ de, en })

const WARM_UP = bi(
  'Standardisiertes Aufwärmen von etwa 10 Minuten; Inhalt bei der Wiederholung gleich halten.',
  'Standardised warm-up of about 10 minutes; keep its content the same on repeat.',
)
const RETEST = bi(
  'Wiederholungsmessung frühestens nach 48 Stunden, möglichst zur selben Tageszeit.',
  'Repeat measurement no earlier than 48 hours later, ideally at the same time of day.',
)
const ONE_RM_ATTEMPTS = bi(
  'Protokoll v1.0: direkt getestetes 1RM ist der Standard, 3–5 Minuten Pause zwischen den schweren Versuchen. Ein aus mehreren Wiederholungen nach Epley geschätztes 1RM ist eine eigene Methode und wird als solche gekennzeichnet.',
  'Protocol v1.0: a directly tested 1RM is the standard, 3–5 minutes rest between heavy attempts. A 1RM estimated from several repetitions using Epley is a separate method and is labelled as such.',
)
const E1RM_NOTE = bi(
  'Geschätztes 1RM (Epley) — nicht direkt mit einem getesteten 1RM vergleichbar.',
  'Estimated 1RM (Epley) — not directly comparable with a tested 1RM.',
)
const HAND_NOTE = bi(
  'Handzeit — Handstoppungen liegen typischerweise unter der Lichtschrankenzeit und sind nicht direkt vergleichbar.',
  'Hand-timed — hand times typically read faster than light-gate times and are not directly comparable.',
)

const oneRm = (valid: Localized[]): ProtocolSpec => ({
  methods: ['direct_1rm', 'estimated_e1rm'],
  attempts: ONE_RM_ATTEMPTS,
  valid,
  standardise: [WARM_UP, RETEST],
  methodNote: { estimated_e1rm: E1RM_NOTE },
})

const iwf = (lift: Localized): ProtocolSpec =>
  oneRm([
    bi(
      `${lift.de}: Wertung nach den Regeln des Wettkampf-Gewichthebens (IWF). Power-Varianten (Fangen über der Parallelen) sind eine eigene Übung und gehören in die Notiz, nicht in dieses Ergebnis.`,
      `${lift.en}: judged by competitive weightlifting (IWF) rules. Power variants (received above parallel) are a different exercise and belong in the note, not in this result.`,
    ),
    bi(
      'Maximallasttest mit höchstens sechs Versuchen, die schwerste gültige Last zählt.',
      'Maximum-load test with at most six attempts; the heaviest valid load counts.',
    ),
  ])

export const PROTOCOL_V1: Record<string, ProtocolSpec> = {
  cooper_12min: {
    methods: ['hand_stopwatch'],
    standardise: [WARM_UP, RETEST],
  },
  beep_test_20m: {
    methods: ['audio_protocol'],
    valid: [
      bi(
        'Fassung nach Léger (1988). Eine andere Fassung ergibt andere Stufen und ist eine Protokollabweichung.',
        'Léger (1988) version. A different version gives different levels and is a protocol deviation.',
      ),
      bi(
        'Ende nach zwei in Folge verfehlten Linien; gewertet wird die letzte vollständig erreichte Strecke.',
        'Ends after two consecutive missed lines; the last fully completed shuttle counts.',
      ),
    ],
    standardise: [WARM_UP, RETEST],
  },
  row_2000m: {
    methods: ['ergometer_display'],
    standardise: [WARM_UP, RETEST],
  },
  back_squat_1rm: oneRm([
    bi(
      'Tiefe: die Hüftfalte kommt unter die Oberkante des Knies.',
      'Depth: the hip crease drops below the top of the knee.',
    ),
  ]),
  deadlift_1rm: oneRm([
    bi(
      'Konventionelles Kreuzheben ist der Standard. Sumo ist eine eigene Methode und muss als Protokollabweichung vermerkt werden.',
      'Conventional deadlift is the standard. Sumo is a separate method and must be recorded as a protocol deviation.',
    ),
    bi(
      'Gürtel erlaubt, Zughilfen (Straps) nicht; beides im Feld «Ausrüstung» festhalten.',
      'Belt allowed, lifting straps not; record both in the «equipment» field.',
    ),
  ]),
  bench_press_1rm: oneRm([
    bi(
      'Kurze, sichtbare Pause auf der Brust; kein Abfedern.',
      'A brief, visible pause on the chest; no bouncing.',
    ),
    bi(
      'Füsse flach am Boden, Gesäss und Schulterblätter auf der Bank.',
      'Feet flat on the floor, hips and shoulder blades on the bench.',
    ),
  ]),
  clean_and_jerk_1rm: iwf(bi('Umsetzen und Stossen', 'Clean and jerk')),
  snatch_1rm: iwf(bi('Reissen', 'Snatch')),
  bear_complex: {
    methods: ['direct_1rm'],
    attempts: bi(
      'Protokoll v1.0: 3–5 Minuten Pause zwischen den Runden mit steigender Last.',
      'Protocol v1.0: 3–5 minutes rest between rounds of increasing load.',
    ),
    valid: [
      bi(
        'Eine Runde: 7 Wiederholungen der Folge Power Clean, Front Squat, Push Press, Back Squat, Push Press, ohne die Hantel abzusetzen. Wird abgesetzt, ist die Runde ungültig.',
        'One round: 7 repetitions of power clean, front squat, push press, back squat, push press without setting the bar down. Setting it down invalidates the round.',
      ),
    ],
    standardise: [WARM_UP, RETEST],
  },
  cindy_20min_amrap: {
    methods: ['rep_count'],
    valid: [
      bi(
        'Klimmzug: das Kinn kommt über die Stange. Liegestütz: Brust berührt den Boden, Arme oben gestreckt. Air Squat: die Hüfte kommt unter das Knie, oben volle Streckung.',
        'Pull-up: chin over the bar. Push-up: chest touches the floor, arms straight at the top. Air squat: hip below the knee, full extension at the top.',
      ),
      bi(
        'Klimmzüge strikt, mit Kipping oder Butterfly sind erlaubt; die Variante gehört in die Notiz.',
        'Strict, kipping or butterfly pull-ups are allowed; record the variant in the note.',
      ),
    ],
    standardise: [WARM_UP, RETEST],
  },
  assault_bike_10min_cal: {
    methods: ['ergometer_display'],
    standardise: [
      bi(
        'Das Gerätemodell im Feld «Ausrüstung» festhalten — Kalorien verschiedener Modelle sind nicht vergleichbar.',
        'Record the bike model in the «equipment» field — calories from different models are not comparable.',
      ),
      WARM_UP,
      RETEST,
    ],
  },
  illinois_agility: {
    methods: ['light_gate', 'hand_stopwatch'],
    valid: [
      bi(
        'Start in Bauchlage, Hände auf Schulterhöhe, Kopf zur Startlinie.',
        'Start lying prone, hands at shoulder level, head at the start line.',
      ),
      bi(
        'Zwei Versuche mit vollständiger Erholung; der schnellste gültige zählt. Eine umgestossene Markierung macht den Versuch ungültig.',
        'Two attempts with full recovery; the fastest valid one counts. A knocked-over cone invalidates the attempt.',
      ),
    ],
    standardise: [WARM_UP, RETEST],
    methodNote: { hand_stopwatch: HAND_NOTE },
  },
  standing_broad_jump: {
    methods: ['tape_measure'],
    attempts: bi(
      'Protokoll v1.0: drei Versuche, der weiteste gültige zählt. Gemessen wird bis zur hintersten Ferse.',
      'Protocol v1.0: three attempts, the longest valid one counts. Measured to the rearmost heel.',
    ),
    standardise: [WARM_UP, RETEST],
  },
}

export function protocolSpecFor(slug: string): ProtocolSpec | null {
  return PROTOCOL_V1[slug] ?? null
}
