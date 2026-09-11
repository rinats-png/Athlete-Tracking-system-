/**
 * Durchführungsvorschriften: wie ein Test abläuft, damit zwei Messungen
 * desselben Tests vergleichbar sind.
 *
 * `instructions` im Katalog sagt in ein bis zwei Sätzen, was zu tun ist. Das
 * genügt, um einen Test einmal durchzuführen — aber nicht, um ihn ein
 * halbes Jahr später unter denselben Bedingungen zu wiederholen. Genau daran
 * hängt in KYDON alles: eine Veränderung ist nur dann eine Veränderung,
 * wenn nicht das Vorgehen sich geändert hat.
 *
 * Deshalb steht hier je Test, was `instructions` offen lässt:
 * Vorbereitung, Versuche und Pausen, wann ein Versuch zählt, wann
 * abgebrochen wird, und was zwischen zwei Messungen gleich bleiben muss.
 *
 * Keine dieser Angaben ist eine medizinische Empfehlung (§82). Wo eine
 * Vorschrift einem veröffentlichten Protokoll folgt, steht die Herkunft im
 * Feld `origin`; wo sie das nicht tut, steht dort nichts — erfundene
 * Quellen wären schlimmer als gar keine (§81).
 */

import type { ProtocolMode, TestDefinition } from './testCatalog'

import type { Localized } from '@/i18n/pick'

/** Historischer Name — die Objekte tragen inzwischen alle Sprachen der App. */
export type Bilingual = Localized

export type TestProcedure = {
  /** Was vor dem ersten Versuch passiert. */
  prepare: Bilingual[]
  /** Wie viele Versuche, mit welchen Pausen, und welcher zählt. */
  attempts: Bilingual
  /** Woran erkennbar ist, dass ein Versuch zählt. */
  valid: Bilingual[]
  /** Wann abgebrochen wird — ohne Wertung, es ist dann einfach kein Ergebnis. */
  abort: Bilingual[]
  /**
   * Was bei der Wiederholung gleich bleiben muss. Das ist der eigentliche
   * Zweck dieser Datei: ohne diese Liste misst die zweite Messung etwas
   * anderes als die erste.
   */
  standardise: Bilingual[]
  /** Veröffentlichtes Protokoll, dem diese Vorschrift folgt. Sonst leer. */
  origin?: string
}

/** Woher eine Vorschrift stammt: eigens geschrieben oder aus dem Modus abgeleitet. */
export type ProcedureSource = 'specific' | 'generic'

/**
 * Vorschriften, die aus dem Testmodus folgen.
 *
 * Sie stehen hier, damit kein Test ohne Durchführungsvorschrift dasteht.
 * Sie sagen weniger als eine eigens geschriebene Vorschrift und sind als
 * solche gekennzeichnet — ein allgemeiner Hinweis, der sich als Protokoll
 * ausgibt, wäre schlechter als ein sichtbar allgemeiner Hinweis.
 */
const GENERIC: Record<ProtocolMode, TestProcedure> = {
  attempts: {
    prepare: [
      {
        de: 'Allgemein aufwärmen, dann die Bewegung des Tests mit steigender Intensität vorbereiten.',
        en: 'Warm up generally, then rehearse the test movement with rising intensity.',
      },
      {
        de: 'Einen Probeversuch unter Wettkampftempo, um Ablauf und Markierungen zu prüfen.',
        en: 'One practice attempt below full effort to check the sequence and the markings.',
      },
    ],
    attempts: {
      de: 'Mehrere Versuche mit vollständiger Pause dazwischen. Gewertet wird der beste.',
      en: 'Several attempts with full recovery between them. The best one counts.',
    },
    valid: [
      {
        de: 'Der Ablauf entspricht der Beschreibung, und das Ergebnis wurde vollständig erfasst.',
        en: 'The sequence matches the description and the result was recorded in full.',
      },
    ],
    abort: [
      {
        de: 'Bei Schmerz, Schwindel oder wenn die Bewegung nicht mehr sauber gelingt: abbrechen. Ein abgebrochener Versuch wird nicht eingetragen.',
        en: 'Stop on pain, dizziness, or when the movement can no longer be performed cleanly. An aborted attempt is not recorded.',
      },
    ],
    standardise: [
      {
        de: 'Aufwärmen, Untergrund, Schuhe, Tageszeit und Pausenlänge bei der Wiederholung gleich halten.',
        en: 'Keep warm-up, surface, footwear, time of day and rest length the same on repeat.',
      },
    ],
  },
  countdown: {
    prepare: [
      {
        de: 'Aufwärmen, bis die Zielintensität kurz anliegt, dann fünf Minuten locker.',
        en: 'Warm up until the target intensity is briefly reached, then five easy minutes.',
      },
      {
        de: 'Zeitmessung und Signalgeber vor dem Start prüfen.',
        en: 'Check timer and signal before the start.',
      },
    ],
    attempts: {
      de: 'Ein Versuch. Die Dauer steht fest; gemessen wird, was in dieser Zeit erreicht wird.',
      en: 'One attempt. The duration is fixed; what is achieved within it is measured.',
    },
    valid: [
      {
        de: 'Die volle Zeit wurde durchgehalten und der erreichte Wert am Ende abgelesen.',
        en: 'The full duration was completed and the achieved value read at the end.',
      },
    ],
    abort: [
      {
        de: 'Bei Schmerz, Schwindel oder Übelkeit abbrechen. Ein Abbruch ist kein schlechtes Ergebnis, sondern keines.',
        en: 'Stop on pain, dizziness or nausea. An abort is not a poor result, it is no result.',
      },
    ],
    standardise: [
      {
        de: 'Dauer, Startsignal, Umgebung und Zeitpunkt im Trainingsverlauf gleich halten.',
        en: 'Keep duration, start signal, environment and point in the training week the same.',
      },
    ],
  },
  stopwatch: {
    prepare: [
      {
        de: 'Aufwärmen mit steigender Belastung bis nahe an das erwartete Tempo.',
        en: 'Warm up with rising load until close to the expected pace.',
      },
      {
        de: 'Strecke, Wendepunkte und Start-/Ziellinie vor dem Versuch festlegen.',
        en: 'Fix the course, turning points and start/finish line before the attempt.',
      },
    ],
    attempts: {
      de: 'Ein Versuch auf Zeit. Ein zweiter am selben Tag misst Ermüdung, nicht Leistung.',
      en: 'One timed attempt. A second one on the same day measures fatigue, not performance.',
    },
    valid: [
      {
        de: 'Die volle Strecke wurde zurückgelegt und die Zeit von der ersten Bewegung bis zum Ziel genommen.',
        en: 'The full distance was covered and time taken from first movement to the finish.',
      },
    ],
    abort: [
      {
        de: 'Bei Schmerz oder Schwindel abbrechen; die Teilzeit nicht eintragen.',
        en: 'Stop on pain or dizziness; do not record a partial time.',
      },
    ],
    standardise: [
      {
        de: 'Strecke, Untergrund, Wetter, Schuhe und Tageszeit bei der Wiederholung gleich halten.',
        en: 'Keep course, surface, weather, footwear and time of day the same on repeat.',
      },
    ],
  },
  stages: {
    prepare: [
      {
        de: 'Locker aufwärmen und die ersten Stufen als Teil des Aufwärmens verstehen.',
        en: 'Warm up easily and treat the first stages as part of the warm-up.',
      },
      {
        de: 'Signalgeber, Lautstärke und Streckenmarkierung vor dem Start prüfen.',
        en: 'Check the signal source, its volume and the course markings before the start.',
      },
    ],
    attempts: {
      de: 'Ein Versuch. Die Belastung steigt in festen Stufen bis zur Ausbelastung.',
      en: 'One attempt. Load rises in fixed stages until exhaustion.',
    },
    valid: [
      {
        de: 'Jede Stufe wurde vollständig bewältigt; die zuletzt vollständig erreichte Stufe zählt.',
        en: 'Each stage was completed in full; the last fully completed stage counts.',
      },
    ],
    abort: [
      {
        de: 'Der Test endet nach der Abbruchbedingung des Protokolls — oder früher bei Schmerz, Schwindel oder Übelkeit.',
        en: "The test ends at the protocol's termination criterion — or earlier on pain, dizziness or nausea.",
      },
    ],
    standardise: [
      {
        de: 'Stufenprotokoll, Signalquelle, Streckenlänge und Untergrund gleich halten.',
        en: 'Keep the stage protocol, signal source, course length and surface the same.',
      },
    ],
  },
  amrap: {
    prepare: [
      {
        de: 'Aufwärmen und jede Übung des Durchgangs mit wenigen Wiederholungen vorbereiten.',
        en: 'Warm up and rehearse every movement of the round for a few repetitions.',
      },
      {
        de: 'Lasten, Höhen und Weiten vor dem Start einstellen und notieren.',
        en: 'Set and note loads, heights and distances before the start.',
      },
    ],
    attempts: {
      de: 'Ein Versuch über die feste Zeit. Gezählt werden vollständige Runden und die Wiederholungen der angefangenen Runde.',
      en: 'One attempt over the fixed time. Count complete rounds plus the reps of the round in progress.',
    },
    valid: [
      {
        de: 'Nur Wiederholungen zählen, die den Bewegungsstandard vollständig erfüllen.',
        en: 'Only repetitions meeting the movement standard in full are counted.',
      },
    ],
    abort: [
      {
        de: 'Bei Schmerz oder wenn der Bewegungsstandard dauerhaft nicht mehr eingehalten wird: abbrechen.',
        en: 'Stop on pain, or when the movement standard can no longer be held.',
      },
    ],
    standardise: [
      {
        de: 'Lasten, Höhen, Weiten, Reihenfolge und Bewegungsstandard bei jeder Wiederholung gleich halten.',
        en: 'Keep loads, heights, distances, order and movement standard identical each time.',
      },
    ],
  },
}

// --- Familien ----------------------------------------------------------------
// Tests desselben Protokolls teilen ihre Vorschrift. Was sie unterscheidet,
// steht als Parameter davor — so bleibt sichtbar, dass Kniebeuge und Bankdrücken
// nach demselben Verfahren gemessen werden.

/**
 * Maximalkraft in einer Wiederholung.
 *
 * Der Aufbau der Aufwärmsätze folgt dem üblichen Vorgehen der Kraftdiagnostik:
 * wenige Sätze mit steigender Last und wachsender Pause, damit die Ermüdung
 * das Ergebnis nicht vor dem letzten Versuch begrenzt.
 */
const oneRepMax = (lift: Bilingual, depth: Bilingual): TestProcedure => ({
  prepare: [
    {
      de: 'Allgemein aufwärmen, dann Aufwärmsätze mit steigender Last: etwa 8 Wiederholungen leicht, 5 mittel, 3 schwer, 1 nahe am erwarteten Maximum.',
      en: 'Warm up generally, then ramping sets: roughly 8 reps light, 5 moderate, 3 heavy, 1 near the expected maximum.',
    },
    {
      de: `Aufbau der ${lift.de} vor dem ersten schweren Satz festlegen: Griff- und Standbreite, Ablagen, Hilfsmittel.`,
      en: `Fix the setup for the ${lift.en} before the first heavy set: grip and stance width, rack position, aids.`,
    },
  ],
  attempts: {
    de: 'Nach dem Aufwärmen höchstens drei bis fünf schwere Einzelversuche mit 3 bis 5 Minuten Pause. Gewertet wird die höchste Last mit gültiger Ausführung.',
    en: 'After warm-up, at most three to five heavy singles with 3 to 5 minutes rest. The heaviest load with valid execution counts.',
  },
  valid: [
    depth,
    {
      de: 'Die Wiederholung wird ohne fremde Hilfe und ohne Absetzen abgeschlossen.',
      en: 'The repetition is completed without assistance and without re-setting.',
    },
    {
      de: 'Die Last steht am Ende kontrolliert; ein gerettetes Gewicht zählt nicht.',
      en: 'The load is controlled at the end; a rescued lift does not count.',
    },
  ],
  abort: [
    {
      de: 'Bei Schmerz, wegbrechender Technik oder wenn die letzte Last nur noch mit Hilfe bewegt wurde: keinen weiteren Versuch.',
      en: 'On pain, collapsing technique, or after a lift that needed assistance: no further attempt.',
    },
    {
      de: 'Ohne Sicherheitsablagen oder eine sichernde Person keinen Maximalversuch durchführen.',
      en: 'Do not attempt a maximum without safety bars or a spotter.',
    },
  ],
  standardise: [
    {
      de: 'Aufbau, Aufwärmsätze, Pausenlänge und Hilfsmittel (Gürtel, Schuhe, Bandagen) bei der Wiederholung gleich halten.',
      en: 'Keep setup, warm-up sets, rest length and aids (belt, shoes, wraps) the same on repeat.',
    },
    {
      de: 'Den Test an einem ausgeruhten Tag ansetzen, nicht nach einer harten Trainingswoche.',
      en: 'Schedule the test on a rested day, not after a hard training week.',
    },
    {
      de: 'Das Körpergewicht am selben Tag erfassen — die Relativkraft hängt daran.',
      en: 'Record body weight on the same day — relative strength depends on it.',
    },
  ],
})

/** Sprint über eine kurze Strecke aus dem Stand. */
const sprintProcedure = (meters: string): TestProcedure => ({
  prepare: [
    {
      de: 'Mindestens 15 Minuten aufwärmen, darin drei bis vier Steigerungsläufe bis nahe an das Sprinttempo.',
      en: 'Warm up for at least 15 minutes, including three to four build-ups close to sprint pace.',
    },
    {
      de: `Start- und Ziellinie auf ${meters} vermessen und markieren; hinter dem Ziel genug Auslauf frei halten.`,
      en: `Measure and mark start and finish at ${meters}; keep enough run-out beyond the finish.`,
    },
  ],
  attempts: {
    de: 'Drei Versuche mit voller Pause (3 bis 5 Minuten). Gewertet wird der schnellste. Ohne diese Pause misst man Ermüdung statt Schnelligkeit.',
    en: 'Three attempts with full recovery (3 to 5 minutes). The fastest counts. Without that rest you measure fatigue, not speed.',
  },
  valid: [
    {
      de: 'Start aus dem Stand ohne Anlauf und ohne Wippen; die Zeit beginnt mit der ersten Bewegung.',
      en: 'Standing start with no run-up and no rocking; timing starts on first movement.',
    },
    {
      de: 'Die Ziellinie wird durchlaufen, nicht angebremst.',
      en: 'The finish line is run through, not decelerated into.',
    },
  ],
  abort: [
    {
      de: 'Bei Ziehen in der hinteren Oberschenkel- oder Wadenmuskulatur den Versuch nicht wiederholen.',
      en: 'On any pull in hamstring or calf, do not repeat the attempt.',
    },
  ],
  standardise: [
    {
      de: 'Zeitnahme gleich halten: Handstoppung und Lichtschranke ergeben systematisch verschiedene Zeiten und sind nicht vergleichbar.',
      en: 'Keep the timing method: hand timing and light gates give systematically different times and are not comparable.',
    },
    {
      de: 'Untergrund, Schuhe, Windrichtung und Startkommando gleich halten.',
      en: 'Keep surface, footwear, wind direction and start command the same.',
    },
  ],
})

/** Vertikaler Sprung auf einer Matte, per Reichhöhe oder aus dem Video. */
const verticalJump = (style: Bilingual, extraValid: Bilingual[]): TestProcedure => ({
  prepare: [
    {
      de: 'Aufwärmen mit Hüpfen und drei bis fünf submaximalen Sprüngen der gleichen Art.',
      en: 'Warm up with skipping and three to five submaximal jumps of the same kind.',
    },
    style,
  ],
  attempts: {
    de: 'Drei gültige Versuche mit mindestens 30 Sekunden Pause. Gewertet wird der höchste.',
    en: 'Three valid attempts with at least 30 seconds rest. The highest counts.',
  },
  valid: [
    {
      de: 'Landung im Stand am selben Ort wie der Absprung, ohne Ausfallschritt.',
      en: 'Land standing at the take-off spot, without a recovery step.',
    },
    ...extraValid,
  ],
  abort: [
    {
      de: 'Wenn die Landung nicht mehr kontrolliert gelingt, keinen weiteren Versuch.',
      en: 'If landings are no longer controlled, take no further attempt.',
    },
  ],
  standardise: [
    {
      de: 'Messverfahren gleich halten: Matte, Reichhöhe und Video ergeben verschiedene Werte für denselben Sprung.',
      en: 'Keep the measurement method: mat, reach height and video give different values for the same jump.',
    },
    {
      de: 'Armeinsatz, Schuhe und Untergrund gleich halten.',
      en: 'Keep arm swing, footwear and surface the same.',
    },
  ],
})

/** Richtungswechsel auf einem festen Parcours. */
const agilityCourse = (layout: Bilingual): TestProcedure => ({
  prepare: [
    {
      de: 'Aufwärmen mit Läufen, Richtungswechseln und zwei langsamen Durchgängen des Parcours.',
      en: 'Warm up with running, changes of direction and two slow walk-throughs of the course.',
    },
    layout,
  ],
  attempts: {
    de: 'Zwei bis drei Versuche mit mindestens 3 Minuten Pause. Gewertet wird der schnellste gültige.',
    en: 'Two to three attempts with at least 3 minutes rest. The fastest valid one counts.',
  },
  valid: [
    {
      de: 'Jede Markierung wurde in der vorgesehenen Reihenfolge berührt oder umlaufen; ausgelassene oder umgestossene Markierungen machen den Versuch ungültig.',
      en: 'Every marker was touched or rounded in the prescribed order; a missed or knocked marker voids the attempt.',
    },
  ],
  abort: [
    {
      de: 'Bei wegrutschendem Untergrund oder Schmerz im Sprunggelenk oder Knie abbrechen.',
      en: 'Stop on a slipping surface or pain in ankle or knee.',
    },
  ],
  standardise: [
    {
      de: 'Massband statt Schrittmass: schon 20 cm Abweichung im Aufbau verschieben die Zeit deutlich.',
      en: 'Measure the layout with a tape, not by paces: even 20 cm changes the time noticeably.',
    },
    {
      de: 'Untergrund, Schuhe, Startseite und Zeitnahme gleich halten.',
      en: 'Keep surface, footwear, starting side and timing method the same.',
    },
  ],
})

/** Lauf über eine feste Distanz auf Zeit. */
const distanceRun = (distance: string): TestProcedure => ({
  prepare: [
    {
      de: 'Zehn bis fünfzehn Minuten locker einlaufen, danach zwei bis drei kurze Steigerungen.',
      en: 'Jog easily for ten to fifteen minutes, then two to three short build-ups.',
    },
    {
      de: `Die ${distance} auf einer vermessenen Strecke oder Bahn festlegen; eine GPS-Schätzung reicht für einen Vergleich über Monate nicht.`,
      en: `Set the ${distance} on a measured course or track; a GPS estimate is not enough for a comparison across months.`,
    },
  ],
  attempts: {
    de: 'Ein Versuch. Gleichmässig einteilen — ein zu schneller Beginn kostet mehr Zeit, als er am Anfang gewinnt.',
    en: 'One attempt. Pace it evenly — starting too fast costs more time than it gains.',
  },
  valid: [
    {
      de: 'Die volle Strecke wurde gelaufen und die Zeit von Start bis Ziel genommen.',
      en: 'The full distance was run and time taken from start to finish.',
    },
  ],
  abort: [
    {
      de: 'Bei Schmerz, Schwindel oder Übelkeit abbrechen; eine Teilstrecke nicht eintragen.',
      en: 'Stop on pain, dizziness or nausea; do not record a partial distance.',
    },
  ],
  standardise: [
    {
      de: 'Strecke, Untergrund, Höhenprofil, Tageszeit und Schuhe gleich halten.',
      en: 'Keep course, surface, elevation profile, time of day and footwear the same.',
    },
    {
      de: 'Wetter notieren: Hitze, Kälte und Wind verschieben die Zeit unabhängig von der Form.',
      en: 'Note the weather: heat, cold and wind shift the time independently of fitness.',
    },
  ],
})

/** Zeitfahren auf einem Ergometer. */
const ergTimeTrial = (distance: string): TestProcedure => ({
  prepare: [
    {
      de: 'Zehn Minuten locker einfahren, darin zwei kurze Antritte im Zieltempo.',
      en: 'Ten easy minutes on the machine, including two short efforts at target pace.',
    },
    {
      de: 'Widerstand beziehungsweise Dämpferstellung einstellen und den Wert notieren; er gehört zum Ergebnis.',
      en: 'Set the resistance or damper and note the value; it is part of the result.',
    },
  ],
  attempts: {
    de: `Ein Versuch über die ${distance}. Ein zweiter am selben Tag misst Ermüdung.`,
    en: `One attempt over the ${distance}. A second one on the same day measures fatigue.`,
  },
  valid: [
    {
      de: 'Die volle Distanz wurde ohne Pause zurückgelegt und die Endzeit vom Gerät abgelesen.',
      en: 'The full distance was covered without pause and the final time read from the machine.',
    },
  ],
  abort: [
    {
      de: 'Bei Schmerz, Schwindel oder Übelkeit abbrechen.',
      en: 'Stop on pain, dizziness or nausea.',
    },
  ],
  standardise: [
    {
      de: 'Gerät, Widerstand beziehungsweise Dämpferstellung und Sitz- oder Fusseinstellung gleich halten; auch das Gerätemodell gehört dazu.',
      en: 'Keep machine, resistance or damper and seat or foot settings the same; the machine model counts too.',
    },
    {
      de: 'Raumtemperatur und Belüftung gleich halten.',
      en: 'Keep room temperature and ventilation the same.',
    },
  ],
})

// --- Zuordnung ---------------------------------------------------------------

const bi = (de: string, en: string): Bilingual => ({ de, en })

/**
 * Eigens geschriebene Vorschriften.
 *
 * Was hier nicht steht, bekommt die Vorschrift seines Modus. Diese Liste
 * wächst mit dem Katalog; sie muss ihn nicht einholen, aber die Tests, die
 * am häufigsten wiederholt werden, gehören hierher.
 */
export const TEST_PROCEDURES: Record<string, TestProcedure> = {
  // Maximalkraft
  back_squat_1rm: oneRepMax(
    bi('Kniebeuge', 'back squat'),
    bi(
      'Die Hüfte kommt unter die Höhe des Knies; darüber ist es eine andere Übung und nicht vergleichbar.',
      'The hip drops below the top of the knee; higher up it is a different exercise and not comparable.',
    ),
  ),
  bench_press_1rm: oneRepMax(
    bi('Bankdrücken', 'bench press'),
    bi(
      'Die Hantel berührt die Brust und wird bis zur gestreckten Armhaltung gedrückt; das Gesäss bleibt auf der Bank.',
      'The bar touches the chest and is pressed to full arm extension; the hips stay on the bench.',
    ),
  ),
  deadlift_1rm: oneRepMax(
    bi('Kreuzheben', 'deadlift'),
    bi(
      'Die Hantel wird bis zum aufrechten Stand mit gestreckter Hüfte und gestreckten Knien gehoben.',
      'The bar is lifted to a standing position with hips and knees extended.',
    ),
  ),
  overhead_press_1rm: oneRepMax(
    bi('Überkopfdrücken', 'overhead press'),
    bi(
      'Die Hantel wird ohne Beineinsatz bis über den Kopf gedrückt und dort kontrolliert gehalten.',
      'The bar is pressed overhead without leg drive and held there under control.',
    ),
  ),
  clean_1rm: oneRepMax(
    bi('Umsetzen', 'clean'),
    bi(
      'Die Hantel wird in einer Bewegung auf den Schultern aufgefangen und im aufrechten Stand kontrolliert.',
      'The bar is received on the shoulders in one movement and controlled standing upright.',
    ),
  ),
  snatch_1rm: oneRepMax(
    bi('Reissen', 'snatch'),
    bi(
      'Die Hantel geht in einer Bewegung vom Boden über den Kopf und wird dort im Stand kontrolliert.',
      'The bar travels from floor to overhead in one movement and is controlled standing.',
    ),
  ),
  clean_and_jerk_1rm: oneRepMax(
    bi('Umsetzen und Stossen', 'clean and jerk'),
    bi(
      'Beide Teile werden abgeschlossen; die Hantel steht am Ende über dem Kopf, Arme und Beine gestreckt.',
      'Both parts are completed; the bar finishes overhead with arms and legs extended.',
    ),
  ),
  weighted_pull_up_1rm: oneRepMax(
    bi('Klimmzug mit Zusatzlast', 'weighted pull-up'),
    bi(
      'Aus gestreckten Armen bis das Kinn über die Stange kommt; kein Schwung aus der Hüfte.',
      'From straight arms until the chin clears the bar; no hip swing.',
    ),
  ),

  // Sprint
  sprint_10m: sprintProcedure('10 m'),
  sprint_20m: sprintProcedure('20 m'),
  sprint_30m: sprintProcedure('30 m'),
  sprint_40yd: sprintProcedure('36,58 m (40 yd)'),

  // Sprung
  countermovement_jump: verticalJump(
    bi(
      'Aus dem Stand, mit Ausholbewegung nach unten unmittelbar vor dem Absprung.',
      'From standing, with a downward countermovement immediately before take-off.',
    ),
    [
      bi(
        'Die Ausholbewegung geht ohne Pause in den Absprung über.',
        'The countermovement flows into the take-off without a pause.',
      ),
    ],
  ),
  squat_jump: verticalJump(
    bi(
      'Aus der gehaltenen Hocke, etwa 90 Grad im Knie, zwei Sekunden ruhig stehen.',
      'From a held squat, about 90 degrees at the knee, still for two seconds.',
    ),
    [
      bi(
        'Kein Absenken vor dem Absprung — jede Ausholbewegung macht den Versuch ungültig.',
        'No dip before take-off — any countermovement voids the attempt.',
      ),
    ],
  ),
  vertical_jump_reach: verticalJump(
    bi(
      'Reichhöhe im Stand mit gestrecktem Arm zuerst messen und notieren; sie ist der Bezugspunkt.',
      'Measure and note standing reach with an extended arm first; it is the reference point.',
    ),
    [
      bi(
        'Die Markierung wird im höchsten Punkt gesetzt, nicht im Fallen.',
        'The mark is set at the highest point, not on the way down.',
      ),
    ],
  ),
  standing_broad_jump: {
    prepare: [
      bi(
        'Aufwärmen mit Hüpfen und zwei bis drei submaximalen Weitsprüngen aus dem Stand.',
        'Warm up with skipping and two to three submaximal standing jumps.',
      ),
      bi(
        'Absprunglinie markieren und das Massband rechtwinklig dazu auslegen.',
        'Mark the take-off line and lay the tape at a right angle to it.',
      ),
    ],
    attempts: bi(
      'Drei Versuche mit mindestens einer Minute Pause. Gewertet wird der weiteste gültige.',
      'Three attempts with at least one minute rest. The longest valid one counts.',
    ),
    valid: [
      bi(
        'Beidbeiniger Absprung ohne Anlauf, beide Füsse hinter der Linie.',
        'Two-footed take-off without a run-up, both feet behind the line.',
      ),
      bi(
        'Beidbeinige Landung ohne Rückfallen; gemessen wird zur hintersten Spur.',
        'Two-footed landing without falling back; measured to the rearmost mark.',
      ),
    ],
    abort: [
      bi(
        'Bei rutschendem Untergrund abbrechen — die Landung ist die verletzungsträchtige Stelle.',
        'Stop if the surface is slippery — the landing is where injuries happen.',
      ),
    ],
    standardise: [
      bi(
        'Untergrund, Schuhe und Landefläche gleich halten; Sand und Hallenboden ergeben verschiedene Weiten.',
        'Keep surface, footwear and landing area the same; sand and gym floor give different distances.',
      ),
    ],
  },

  // Richtungswechsel
  shuttle_5_10_5: agilityCourse(
    bi(
      'Drei Markierungen in einer Linie im Abstand von 4,57 m (5 yd) setzen; Start an der mittleren.',
      'Set three markers in a line 4.57 m (5 yd) apart; start at the middle one.',
    ),
  ),
  t_test_agility: agilityCourse(
    bi(
      'T-Form auslegen: 9,14 m vom Start zur Mitte, von dort 4,57 m nach jeder Seite.',
      'Lay out the T: 9.14 m from start to centre, then 4.57 m to each side.',
    ),
  ),
  illinois_agility: agilityCourse(
    bi(
      'Feld von 10 m Länge und 5 m Breite abstecken, vier Markierungen mittig im Abstand von 3,3 m.',
      'Mark a 10 m by 5 m area with four cones down the centre 3.3 m apart.',
    ),
  ),

  // Ausdauer über feste Distanz
  run_5k: distanceRun('5 km'),
  run_10k: distanceRun('10 km'),
  run_1_5_mile: distanceRun('2,41 km (1,5 Meilen)'),
  run_2_mile: distanceRun('3,22 km (2 Meilen)'),

  // Ergometer
  row_2000m: ergTimeTrial('2000 m'),
  row_1000m: ergTimeTrial('1000 m'),
  ski_erg_1000m: ergTimeTrial('1000 m'),

  cooper_12min: {
    prepare: [
      bi(
        'Zehn Minuten locker einlaufen, danach zwei bis drei kurze Steigerungen und fünf Minuten Ruhe.',
        'Jog easily for ten minutes, then two to three short build-ups and five minutes of rest.',
      ),
      bi(
        'Eine Bahn oder eine vermessene Rundstrecke wählen, damit die Distanz auf 10 m genau ablesbar ist.',
        'Use a track or a measured loop so the distance can be read to the nearest 10 m.',
      ),
    ],
    attempts: bi(
      'Ein Versuch über genau 12 Minuten. Gleichmässig einteilen: der Test misst die Distanz, nicht das Anfangstempo.',
      'One attempt over exactly 12 minutes. Pace it evenly: the test measures distance, not the opening pace.',
    ),
    valid: [
      bi(
        'Die vollen 12 Minuten wurden gelaufen; Gehpausen sind erlaubt, zählen aber zur Zeit.',
        'The full 12 minutes were covered; walking is allowed but counts against the time.',
      ),
      bi(
        'Die Position beim Signal wird markiert und die Distanz von dort abgelesen.',
        'The position at the signal is marked and the distance read from there.',
      ),
    ],
    abort: [
      bi(
        'Bei Schmerz, Schwindel oder Übelkeit abbrechen; eine Teilzeit nicht eintragen.',
        'Stop on pain, dizziness or nausea; do not record a partial effort.',
      ),
    ],
    standardise: [
      bi(
        'Strecke, Untergrund, Tageszeit und Schuhe gleich halten.',
        'Keep course, surface, time of day and footwear the same.',
      ),
      bi(
        'Wetter notieren; Hitze und Wind verschieben die Distanz um mehr, als eine Trainingsperiode sie bewegt.',
        'Note the weather; heat and wind shift the distance by more than a training block does.',
      ),
    ],
  },

  beep_test_20m: {
    prepare: [
      bi(
        'Locker aufwärmen; die ersten Stufen sind langsam und gehören zum Aufwärmen.',
        'Warm up easily; the first stages are slow and count as part of the warm-up.',
      ),
      bi(
        'Die 20 m mit dem Massband abstecken und beide Linien deutlich markieren.',
        'Measure the 20 m with a tape and mark both lines clearly.',
      ),
      bi(
        'Audio-Protokoll und Lautstärke prüfen — die Signalquelle gehört zum Testaufbau.',
        'Check the audio protocol and its volume — the signal source is part of the setup.',
      ),
    ],
    attempts: bi(
      'Ein Versuch. Bei jedem Signalton muss die Linie erreicht sein.',
      'One attempt. The line must be reached on every beep.',
    ),
    valid: [
      bi(
        'Die Linie wird mit einem Fuss berührt oder überschritten, bevor der Ton kommt.',
        'The line is touched or crossed with one foot before the beep sounds.',
      ),
      bi(
        'Gewertet wird die zuletzt vollständig erreichte Stufe.',
        'The last fully completed stage counts.',
      ),
    ],
    abort: [
      bi(
        'Der Test endet, wenn die Linie zweimal in Folge verfehlt wird — oder früher bei Schmerz, Schwindel oder Übelkeit.',
        'The test ends after missing the line twice in a row — or earlier on pain, dizziness or nausea.',
      ),
    ],
    standardise: [
      bi(
        'Dasselbe Audio-Protokoll verwenden: verschiedene Fassungen haben verschiedene Stufenlängen und ergeben verschiedene Stufen.',
        'Use the same audio protocol: versions differ in stage length and give different levels.',
      ),
      bi(
        'Untergrund und Schuhe gleich halten; Halle und Rasen sind nicht vergleichbar.',
        'Keep surface and footwear the same; indoor floor and grass are not comparable.',
      ),
    ],
  },

  ftp_20min: {
    prepare: [
      bi(
        'Zwanzig Minuten einfahren, darin drei kurze Antritte und eine Minute nahe am Zieltempo.',
        'Twenty minutes of riding in, including three short efforts and one minute near target pace.',
      ),
      bi(
        'Leistungsmessung nullen und die Sitzposition prüfen.',
        'Zero the power meter and check the riding position.',
      ),
    ],
    attempts: bi(
      'Ein Versuch über 20 Minuten. Gleichmässig fahren — die mittlere Leistung zählt, nicht die höchste.',
      'One attempt over 20 minutes. Ride evenly — average power counts, not peak power.',
    ),
    valid: [
      bi(
        'Die vollen 20 Minuten wurden ohne Unterbrechung gefahren.',
        'The full 20 minutes were ridden without interruption.',
      ),
    ],
    abort: [
      bi(
        'Bei Schmerz, Schwindel oder Übelkeit abbrechen.',
        'Stop on pain, dizziness or nausea.',
      ),
    ],
    standardise: [
      bi(
        'Dieselbe Leistungsmessung verwenden: zwei Geräte weichen genug voneinander ab, um eine Veränderung vorzutäuschen.',
        'Use the same power meter: two devices differ enough to fake a change.',
      ),
      bi(
        'Rad, Rolle, Reifendruck, Raumtemperatur und Belüftung gleich halten.',
        'Keep bike, trainer, tyre pressure, room temperature and ventilation the same.',
      ),
    ],
  },

  wingate_30s: {
    prepare: [
      bi(
        'Fünf bis zehn Minuten locker einfahren mit zwei bis drei Antritten von wenigen Sekunden.',
        'Five to ten easy minutes with two to three efforts of a few seconds.',
      ),
      bi(
        'Widerstand nach dem Körpergewicht einstellen und den eingestellten Wert notieren.',
        'Set the resistance from body weight and note the value used.',
      ),
    ],
    attempts: bi(
      'Ein Versuch über 30 Sekunden, von Beginn an maximal. Ein zweiter Versuch am selben Tag ist kein Vergleichswert.',
      'One attempt over 30 seconds, maximal from the start. A second attempt on the same day is not a comparable value.',
    ),
    valid: [
      bi(
        'Die vollen 30 Sekunden wurden getreten, auch im Einbruch.',
        'The full 30 seconds were pedalled, including through the drop-off.',
      ),
    ],
    abort: [
      bi(
        'Bei Schwindel oder Übelkeit abbrechen; danach mehrere Minuten locker ausfahren.',
        'Stop on dizziness or nausea; afterwards spin easily for several minutes.',
      ),
    ],
    standardise: [
      bi(
        'Widerstand, Gerät und Sitzhöhe gleich halten; der Widerstand hängt am Körpergewicht und muss mit erfasst werden.',
        'Keep resistance, machine and seat height the same; resistance depends on body weight and must be recorded with it.',
      ),
    ],
  },

  plank_hold: {
    prepare: [
      bi(
        'Kurz aufwärmen und die Position einmal für zehn Sekunden einnehmen, um den Aufbau zu prüfen.',
        'Warm up briefly and hold the position for ten seconds once to check the setup.',
      ),
      bi(
        'Ellenbogen unter den Schultern, Füsse hüftbreit; die Position vor dem Start festlegen.',
        'Elbows under the shoulders, feet hip width; fix the position before the start.',
      ),
    ],
    attempts: bi(
      'Ein Versuch. Die Zeit läuft, bis die Position aufgegeben wird.',
      'One attempt. The clock runs until the position is given up.',
    ),
    valid: [
      bi(
        'Schulter, Hüfte und Knie bleiben in einer Linie; ein Absinken der Hüfte beendet den Versuch.',
        'Shoulder, hip and knee stay in line; a dropping hip ends the attempt.',
      ),
    ],
    abort: [
      bi(
        'Bei Schmerz im unteren Rücken sofort abbrechen.',
        'Stop immediately on pain in the lower back.',
      ),
    ],
    standardise: [
      bi(
        'Dieselbe Abbruchregel anwenden: einmal beim ersten Absinken, einmal nach einer Korrektur — das sind zwei verschiedene Tests.',
        'Apply the same stop rule: at the first drop, or after one correction — those are two different tests.',
      ),
      bi(
        'Unterlage und Fussabstand gleich halten.',
        'Keep the surface and foot spacing the same.',
      ),
    ],
  },

  grip_strength: {
    prepare: [
      bi(
        'Hände und Unterarme locker aufwärmen; zwei submaximale Griffe je Seite.',
        'Warm up hands and forearms; two submaximal squeezes per side.',
      ),
      bi(
        'Griffweite des Dynamometers auf die Hand einstellen und die Einstellung notieren.',
        'Set the dynamometer grip span to the hand and note the setting.',
      ),
    ],
    attempts: bi(
      'Drei Versuche je Hand im Wechsel, mit mindestens 30 Sekunden Pause. Gewertet wird der höchste Wert je Hand.',
      'Three attempts per hand, alternating, with at least 30 seconds rest. The highest value per hand counts.',
    ),
    valid: [
      bi(
        'Der Arm bleibt in der festgelegten Haltung; kein Schwung, kein Anlehnen an den Körper.',
        'The arm stays in the fixed position; no swinging, no bracing against the body.',
      ),
      bi(
        'Der Druck wird zwei bis drei Sekunden gehalten, nicht ruckartig gegeben.',
        'The squeeze is held for two to three seconds, not applied as a jerk.',
      ),
    ],
    abort: [
      bi(
        'Bei Schmerz in Hand, Handgelenk oder Ellenbogen abbrechen.',
        'Stop on pain in hand, wrist or elbow.',
      ),
    ],
    standardise: [
      bi(
        'Armhaltung gleich halten: am Körper anliegend oder ausgestreckt ergibt verschiedene Werte.',
        'Keep the arm position: at the side or extended gives different values.',
      ),
      bi(
        'Dasselbe Gerät und dieselbe Griffweite verwenden.',
        'Use the same device and the same grip span.',
      ),
    ],
  },

  pull_up_max_reps: {
    prepare: [
      bi(
        'Schultern und Rücken aufwärmen, dann drei bis fünf lockere Wiederholungen.',
        'Warm up shoulders and back, then three to five easy repetitions.',
      ),
      bi(
        'Griffart und Griffbreite vor dem Satz festlegen.',
        'Fix the grip type and width before the set.',
      ),
    ],
    attempts: bi(
      'Ein Satz bis zum Ende. Ein zweiter Satz am selben Tag ist kein Vergleichswert.',
      'One set to failure. A second set on the same day is not a comparable value.',
    ),
    valid: [
      bi(
        'Aus gestreckten Armen bis das Kinn über die Stange kommt.',
        'From straight arms until the chin clears the bar.',
      ),
      bi(
        'Kein Schwung aus der Hüfte; unvollständige Wiederholungen zählen nicht mit.',
        'No hip swing; partial repetitions are not counted.',
      ),
    ],
    abort: [
      bi(
        'Bei Schmerz in Schulter oder Ellenbogen abbrechen.',
        'Stop on pain in shoulder or elbow.',
      ),
    ],
    standardise: [
      bi(
        'Griffart, Griffbreite und Stange gleich halten; Ober- und Untergriff sind zwei verschiedene Tests.',
        'Keep grip type, width and bar the same; overhand and underhand are two different tests.',
      ),
      bi(
        'Das Körpergewicht am selben Tag erfassen — es bestimmt die Last mit.',
        'Record body weight on the same day — it is part of the load.',
      ),
    ],
  },
}

/**
 * Die Vorschrift zu einem Test, mit der Angabe, woher sie stammt.
 *
 * `generic` heisst: aus dem Testmodus abgeleitet, nicht für diesen Test
 * geschrieben. Die Oberfläche muss das kenntlich machen, sonst liest sich ein
 * allgemeiner Hinweis wie ein geprüftes Protokoll.
 */
export function procedureFor(test: TestDefinition): {
  procedure: TestProcedure
  source: ProcedureSource
} {
  const specific = TEST_PROCEDURES[test.slug]
  if (specific) return { procedure: specific, source: 'specific' }
  return { procedure: GENERIC[test.protocol.mode], source: 'generic' }
}
