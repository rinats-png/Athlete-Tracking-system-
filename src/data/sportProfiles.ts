import type { PerformanceDimension } from '@/types/domain'

/**
 * Sportarten und Disziplinen (Zielgruppenliste).
 *
 * Zwei Ebenen: Kategorie und Disziplin. Die Kategorie bestimmt, gegen welche
 * anderen Disziplinen ein Vergleich überhaupt sinnvoll ist; die Disziplin
 * bestimmt die Anforderungskontur und die vorgeschlagene Testbatterie.
 *
 * ACHSENGEWICHTE: 0–1, bewusst NICHT auf Summe 1 normiert. Eine Normierung
 * würde erzwingen, dass eine Disziplin mit hohen Anforderungen auf vier
 * Achsen jede einzelne niedriger gewichtet als eine mit nur einer
 * Anforderung — das kehrt die Aussage um. Es sind unabhängige
 * Anforderungshöhen, keine Anteile.
 *
 * HERKUNFT DER GEWICHTE: aus der Belastungsstruktur der jeweiligen Disziplin
 * abgeleitet (Wettkampfdauer, Pausenstruktur, dominante Arbeitsweise), nicht
 * aus einer publizierten Quelle übernommen. Sie sind als Voreinstellung
 * dieser App gekennzeichnet und gehören durch belegte Werte ersetzt, sobald
 * welche vorliegen.
 *
 * FUSSBALL ist ausdrücklich nicht enthalten. Der Ausschluss ist als Datenregel
 * hinterlegt (BLOCKED_DISCIPLINES) und wird beim Bau geprüft, damit er bei
 * einer späteren Erweiterung nicht versehentlich zurückkommt.
 */

export type SportCategoryId =
  | 'combat'
  | 'hybrid'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'triathlon'
  | 'tactical'

/**
 * Ein Test in der Liste einer Disziplin, mit seiner Herkunft.
 *
 *   `document` — das Zielgruppendokument nennt ihn für diese Disziplin;
 *                `documentLabel` hält die dortige Bezeichnung fest, damit
 *                die Zeile im Dokument wiederauffindbar bleibt.
 *   `addition` — später hinzugefügt, mit ausgeschriebenem Grund. Eine
 *                Ergänzung kommt hinzu und ersetzt nie einen Dokumenttest.
 *
 * `role` trennt, was das Profil trägt (`core`), von dem, was es schärft
 * (`optional`).
 */
export interface DisciplineTest {
  slug: string
  role: 'core' | 'optional'
  provenance: 'document' | 'addition'
  /** Nur bei `document`: die Bezeichnung im Dokument. */
  documentLabel?: string
  /** Nur bei `addition`: warum dieser Test hinzugekommen ist. */
  reason?: string
}

const docCore = (slug: string, documentLabel: string): DisciplineTest => ({
  slug,
  role: 'core',
  provenance: 'document',
  documentLabel,
})
const docOptional = (slug: string, documentLabel: string): DisciplineTest => ({
  slug,
  role: 'optional',
  provenance: 'document',
  documentLabel,
})
/**
 * Ein Kerntest, den das Dokument nicht nennt. Steht bereit, wird aber im
 * Auslieferungsstand nirgends gebraucht: jeder Test, der ein Profil trägt,
 * stammt heute aus dem Dokument. Ergänzungen schärfen, sie tragen nicht.
 */
export const addedCore = (slug: string, reason: string): DisciplineTest => ({
  slug,
  role: 'core',
  provenance: 'addition',
  reason,
})
const addedOptional = (slug: string, reason: string): DisciplineTest => ({
  slug,
  role: 'optional',
  provenance: 'addition',
  reason,
})

export interface Discipline {
  id: string
  categoryId: SportCategoryId
  name: { de: string; en: string }
  /** Alternative Bezeichnungen, für die Suche. */
  aliases?: string[]
  /** Warum diese Disziplin diagnostisch eigenständig ist. */
  rationale: { de: string; en: string }
  dimensionWeights: Partial<Record<PerformanceDimension, number>>
  /**
   * Die Tests dieser Disziplin — eine Liste, Herkunft am Eintrag.
   *
   * Vorher standen dieselben Zuordnungen zweimal: hier als coreTests und
   * optionalTests, und in documentCoverage.ts noch einmal mit ihrer
   * Herkunft. Zehn Bautests hielten beide Listen synchron. Sie taten es
   * zuverlässig, aber zwei Listen, die immer übereinstimmen müssen, sind
   * eine Liste zu viel: jede Ergänzung war an zwei Stellen einzutragen,
   * und wer die zweite vergass, bekam einen roten Bautest statt eines
   * fertigen Gedankens.
   */
  tests: DisciplineTest[]
  /** Typische Wettkampfdauer in Sekunden. Null bei variabler Dauer. */
  eventDurationSeconds: [number, number] | null
  /** Achse, die erfahrungsgemäss zuerst begrenzt. */
  typicalLimiter: PerformanceDimension
  /**
   * Profilachsen dieser Disziplin (Kennungen aus `profileAxes.ts`).
   *
   * Sie ersetzen für diese Disziplin die sechs allgemeinen Achsen. Enthalten
   * ist nur, was ihre Kerntests auch erreichen können — sonst stünde im
   * Profil dauerhaft eine Lücke, die keine ist.
   */
  axisIds: string[]
}

export interface SportCategory {
  id: SportCategoryId
  name: { de: string; en: string }
  rationale: { de: string; en: string }
  /** Reihenfolge des Ausbaus, aus der MVP-Vorgabe. Kleiner = früher. */
  buildPriority: number
}

/**
 * Ausdrücklich ausgeschlossen. Der Grund steht dabei, damit die Entscheidung
 * nachvollziehbar bleibt und nicht versehentlich rückgängig gemacht wird.
 */
export const BLOCKED_DISCIPLINES: { id: string; reason: string }[] = [
  { id: 'football', reason: 'Auf Wunsch ausgeschlossen.' },
  { id: 'soccer', reason: 'Auf Wunsch ausgeschlossen.' },
  { id: 'fussball', reason: 'Auf Wunsch ausgeschlossen.' },
]

export const SPORT_CATEGORIES: SportCategory[] = [
  {
    id: 'combat',
    name: { de: 'Kampfsport', en: 'Combat sports' },
    rationale: {
      de: 'Intermittierende Maximalbelastung mit wechselnden Pausen. Entscheidend ist nicht das Maximum einer Achse, sondern die Wiederholbarkeit unter Ermüdung — und Gewichtsklassen machen Relativkraft zur zentralen Grösse.',
      en: 'Intermittent maximal effort with irregular rest. What decides a bout is not a peak value but repeatability under fatigue — and weight classes make relative strength the central quantity.',
    },
    buildPriority: 1,
  },
  {
    id: 'hybrid',
    name: { de: 'Hybrid / Functional Fitness', en: 'Hybrid / functional fitness' },
    rationale: {
      de: 'Definierend ist der Zwang, auf allen Achsen gleichzeitig wettbewerbsfähig zu sein. Das Profil ist hier nicht Beiwerk, sondern der Wettkampfgegenstand: die schwächste Achse begrenzt das Ergebnis unmittelbar.',
      en: 'Defined by the need to be competitive on every axis at once. The profile is not an accessory here but the object of competition: the weakest axis limits the result directly.',
    },
    buildPriority: 2,
  },
  {
    id: 'running',
    name: { de: 'Laufen', en: 'Running' },
    rationale: {
      de: 'Die Leistungsdeterminanten sind gut beschrieben: maximale Sauerstoffaufnahme, Schwelle, Laufökonomie und Renneinteilung. Eine Bestzeit fasst sie zu einer Zahl zusammen und verdeckt damit, welche davon begrenzt.',
      en: 'The determinants are well described: maximal oxygen uptake, threshold, running economy and pacing. A personal best collapses them into one number and hides which of them is limiting.',
    },
    buildPriority: 4,
  },
  {
    id: 'cycling',
    name: { de: 'Radsport', en: 'Cycling' },
    rationale: {
      de: 'Die einzige Ausdauersportart mit direkter Leistungsmessung in Watt. Dadurch sind Schwelle, Ermüdungsresistenz und Wirkungsgrad unmittelbar messbar statt geschätzt.',
      en: 'The one endurance sport with direct power measurement in watts. Threshold, fatigue resistance and efficiency are therefore measured rather than estimated.',
    },
    buildPriority: 5,
  },
  {
    id: 'swimming',
    name: { de: 'Schwimmen', en: 'Swimming' },
    rationale: {
      de: 'Stark technikbestimmt: zwei Schwimmer mit gleicher Ausdauer trennen sich über Zuglänge und Wasserlage. Deshalb gehören kinematische Kennwerte neben die physiologischen.',
      en: 'Strongly technique-driven: two swimmers with equal endurance are separated by stroke length and body position. Kinematic measures therefore belong beside the physiological ones.',
    },
    buildPriority: 6,
  },
  {
    id: 'triathlon',
    name: { de: 'Triathlon / Ironman', en: 'Triathlon / Ironman' },
    rationale: {
      de: 'Die diagnostische Kernfrage ist nicht die Einzeldisziplin, sondern die Leistung nach Vorermüdung und über die Wechsel hinweg — ein Wert, den drei getrennte Bestzeiten nicht zeigen.',
      en: 'The core diagnostic question is not the single discipline but performance after pre-fatigue and across transitions — a value three separate personal bests do not show.',
    },
    buildPriority: 4,
  },
  {
    id: 'tactical',
    name: { de: 'Tactical / Behörden', en: 'Tactical / duty' },
    rationale: {
      de: 'Kein Sport, sondern ein Anforderungsprofil: die Belastung ist berufsbedingt und tritt selten, unangekündigt und aus dem Ruhezustand auf. Gemessen wird gegen eine Untergrenze, nicht gegen ein Optimum.',
      en: 'Not a sport but a requirement profile: the load is occupational and occurs rarely, without warning and from rest. It is measured against a floor, not an optimum.',
    },
    buildPriority: 7,
  },
]

// --- Disziplinen -------------------------------------------------------------
// Kerntests verweisen auf Slugs des Testkatalogs. Wo ein sportartspezifischer
// Test noch fehlt, steht der nächstliegende vorhandene — der Ausbau folgt der
// MVP-Reihenfolge, und `catalog.spec.ts` prüft, dass jeder genannte Slug
// wirklich existiert.

const COMBAT: Discipline[] = [
  {
    id: 'judo',
    categoryId: 'combat',
    name: { de: 'Judo', en: 'Judo' },
    rationale: {
      de: 'Griff- und Wurfkampf in Gewichtsklassen. Entscheidend ist wiederholte maximale Anstrengung mit unvollständiger Erholung sowie Griffausdauer, die keine Bestleistung erfasst.',
      en: 'Gripping and throwing in weight classes. What decides it is repeated maximal effort with incomplete recovery, plus grip endurance that no personal best captures.',
    },
    dimensionWeights: { relative_strength: 1, strength_endurance: 0.9, power: 0.7, max_strength: 0.6, endurance: 0.5, agility: 0.4 },
    tests: [
      docCore('special_judo_fitness_test', 'Special Judo Fitness Test (SJFT)'),
      docCore('uchi_komi_fitness_test', 'Uchi-komi Fitness Test (UFT)'),
      docCore('grip_hang_time', 'Judogi-Grip-Tests'),
      docCore('pull_up_max_reps', 'Pull-up/Chin-up-Varianten'),
      docCore('sprint_10m', 'Sprint'),
      docCore('countermovement_jump', 'Jump'),
      docOptional('repeated_throws_30s', 'repeated throws'),
      addedOptional('grip_strength', 'Isolierte Griffkraft neben der Haltezeit — Maximum und Ausdauer trennen.'),
      addedOptional('deadlift_1rm', 'Ganzkörper-Maximalkraft. Das Dokument nennt für diese Disziplin Zugkraft, benennt aber keinen konkreten Test dafür.'),
      addedOptional('shuttle_5_10_5', 'Richtungswechsel unter Last, im Griffkampf ständig gefordert.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
    ],
    eventDurationSeconds: [240, 240],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'power', 'relative_strength', 'grip', 'fight_endurance'],
  },
  {
    id: 'wrestling',
    categoryId: 'combat',
    name: { de: 'Ringen', en: 'Wrestling' },
    // Die Vorlage führte «Ringen» und «Wrestling» als zwei Einträge. Es ist
    // dieselbe Sportart; doppelt geführt würde sie das Vergleichskollektiv
    // aufteilen und beide Hälften schwächen.
    aliases: ['Wrestling', 'Freistil', 'Griechisch-römisch'],
    rationale: {
      de: 'Belastungsstruktur aus Griffkraft, Rumpfkraft und wiederholten explosiven Aktionen unter Ermüdung. Nahe an Judo, aber mit deutlich höherem Anteil an Bodenarbeit und isometrischer Rumpfleistung.',
      en: 'A load structure of grip strength, trunk strength and repeated explosive actions under fatigue. Close to judo, but with a markedly higher share of ground work and isometric trunk output.',
    },
    dimensionWeights: { relative_strength: 1, strength_endurance: 1, max_strength: 0.7, power: 0.7, endurance: 0.5, agility: 0.4 },
    tests: [
      docCore('special_wrestling_fitness_test', 'Special Wrestling Fitness Test (SWFT)'),
      docCore('rope_climb', 'rope climbs'),
      docCore('repeated_throws_30s', 'dummy throws / repeated takedowns'),
      docCore('grip_hang_time', 'grip endurance'),
      docCore('sprint_10m', 'sprint'),
      docCore('countermovement_jump', 'jump'),
      addedOptional('grip_strength', 'Griffkraft als Bezugswert für alle griffgebundenen Aufgaben.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('deadlift_1rm', 'Ganzkörper-Maximalkraft. Das Dokument nennt für diese Disziplin Zugkraft, benennt aber keinen konkreten Test dafür.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
      addedOptional('shuttle_5_10_5', 'Richtungswechsel im Stand, für die Angriffsvorbereitung bestimmend.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
    ],
    eventDurationSeconds: [360, 360],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'max_strength', 'relative_strength', 'power', 'grip'],
  },
  {
    id: 'bjj',
    categoryId: 'combat',
    name: { de: 'Brazilian Jiu-Jitsu', en: 'Brazilian jiu-jitsu' },
    aliases: ['BJJ', 'Grappling'],
    rationale: {
      de: 'Lange Kampfdauer mit Positionswechseln am Boden. Griffkraft und isometrische Haltearbeit sind über zehn Minuten leistungsbegrenzend, nicht die Spitzenkraft.',
      en: 'Long bouts with positional changes on the ground. Over ten minutes, grip strength and isometric holding limit performance, not peak force.',
    },
    dimensionWeights: { strength_endurance: 1, relative_strength: 0.9, endurance: 0.6, max_strength: 0.5, power: 0.4 },
    tests: [
      docCore('jjapt', 'JJAPT'),
      docCore('grip_strength', 'grip strength'),
      docCore('pull_up_max_reps', 'chin-up'),
      docCore('grappling_circuit_5min', 'specific grappling circuits'),
      docCore('countermovement_jump', 'anaerobic jump/throw tests'),
      docCore('grip_hang_time', 'positional endurance'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
      addedOptional('deadlift_1rm', 'Ganzkörper-Maximalkraft. Das Dokument nennt für diese Disziplin Zugkraft, benennt aber keinen konkreten Test dafür.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('cindy_20min_amrap', 'Kraftausdauer über zwanzig Minuten, nah an der Länge eines Rollens.'),
    ],
    eventDurationSeconds: [300, 600],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'relative_strength', 'max_strength', 'grip', 'fight_endurance'],
  },
  {
    id: 'boxing',
    categoryId: 'combat',
    name: { de: 'Boxen', en: 'Boxing' },
    rationale: {
      de: 'Mehrere Runden mit kurzen Pausen. Schlagfrequenz über die Rundendauer und die Erholung zwischen den Runden bestimmen das Ergebnis stärker als die einzelne Schlagkraft.',
      en: 'Several rounds with short breaks. Punch rate across the round and recovery between rounds decide the outcome more than single-punch force.',
    },
    dimensionWeights: { strength_endurance: 1, endurance: 0.8, power: 0.7, agility: 0.6, relative_strength: 0.5 },
    tests: [
      docCore('punch_test_60s', '1-min punch test'),
      docCore('punch_test_180s', 'Boxing Conditioning/Fitness Test'),
      docCore('rope_skipping_3min', 'rope skipping'),
      docCore('sprint_30m', 'sprint'),
      docCore('plank_hold', 'core endurance'),
      addedOptional('countermovement_jump', 'Schnellkraft der Beine — Grundlage der Schlagkette von unten.'),
      addedOptional('shuttle_5_10_5', 'Beinarbeit mit Richtungswechsel.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('grip_strength', 'Griffkraft als Bezugswert für alle griffgebundenen Aufgaben.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('assault_bike_10min_cal', 'Ausdauer ohne Laufbelastung, für Athleten mit Beschwerden an der unteren Extremität.'),
    ],
    eventDurationSeconds: [540, 720],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'power', 'fatigue_resistance', 'endurance'],
  },
  {
    id: 'kickboxing',
    categoryId: 'combat',
    name: { de: 'Kickboxen', en: 'Kickboxing' },
    rationale: {
      de: 'Wie Boxen, zusätzlich mit hoher Beinarbeit. Die Wiederholbarkeit von Tritten unter Ermüdung ist die Grösse, die eine Bestleistung nicht zeigt.',
      en: 'As boxing, with a large lower-body share added. Repeatability of kicks under fatigue is the quantity a personal best does not show.',
    },
    dimensionWeights: { strength_endurance: 1, power: 0.8, endurance: 0.8, agility: 0.7, relative_strength: 0.5 },
    tests: [
      docCore('kick_test_60s', 'repeated kick test'),
      docCore('punch_test_60s', 'kick/punch interval test'),
      docCore('sprint_30m', 'sprint'),
      docCore('countermovement_jump', 'jump / lower-body power'),
      docCore('shuttle_5_10_5', 'agility'),
      docCore('fatigue_circuit_4x30s', 'fatigue circuits'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
      addedOptional('standing_broad_jump', 'Horizontale Schnellkraft neben der vertikalen des CMJ.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('assault_bike_10min_cal', 'Ausdauer ohne Laufbelastung, für Athleten mit Beschwerden an der unteren Extremität.'),
    ],
    eventDurationSeconds: [540, 720],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'power', 'agility', 'fatigue_resistance'],
  },
  {
    id: 'taekwondo',
    categoryId: 'combat',
    name: { de: 'Taekwondo', en: 'Taekwondo' },
    rationale: {
      de: 'Sehr kurze, sehr schnelle Aktionen mit langen Pausen dazwischen. Trittgeschwindigkeit und Antritt sind entscheidend, Maximalkraft kaum.',
      en: 'Very short, very fast actions with long pauses between them. Kicking speed and first-step acceleration decide; maximal strength barely does.',
    },
    dimensionWeights: { power: 1, agility: 0.9, strength_endurance: 0.7, endurance: 0.5, relative_strength: 0.4 },
    tests: [
      docCore('kick_test_60s', 'sport-specific kick tests'),
      docCore('shuttle_5_10_5', 'agility'),
      docCore('sprint_10m', 'sprint'),
      docCore('countermovement_jump', 'jump'),
      docCore('fatigue_circuit_4x30s', 'repeated technical actions'),
      addedOptional('standing_broad_jump', 'Horizontale Schnellkraft neben der vertikalen des CMJ.'),
      addedOptional('t_test_agility', 'Richtungswechsel über mehrere Ebenen, ergänzend zum Shuttle mit nur einer.'),
      addedOptional('repeated_jump_15s', 'Wiederholte Schnellkraft — der Unterschied zwischen einem und zwanzig Tritten.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
    ],
    eventDurationSeconds: [360, 360],
    typicalLimiter: 'power',
    axisIds: ['power', 'agility', 'strength_endurance', 'fatigue_resistance'],
  },
  {
    id: 'mma',
    categoryId: 'combat',
    name: { de: 'MMA', en: 'MMA' },
    rationale: {
      de: 'Verbindet Schlag-, Griff- und Bodenkampf. Kein Einzeltest bildet das ab — MMA braucht eine breite Batterie, gerade weil keine Achse ausgelassen werden darf.',
      en: 'Combines striking, clinch and ground work. No single test covers this — MMA needs a broad battery precisely because no axis may be left out.',
    },
    dimensionWeights: { strength_endurance: 1, relative_strength: 0.9, power: 0.8, endurance: 0.7, agility: 0.6, max_strength: 0.5 },
    tests: [
      docCore('deadlift_1rm', 'strength/power tests'),
      docCore('sprint_30m', 'sprint'),
      docCore('plank_hold', 'isometric strength'),
      docCore('grip_strength', 'grip'),
      docCore('fatigue_circuit_4x30s', 'intermittent circuits'),
      docCore('grappling_circuit_5min', 'MMA-specific anaerobic assessment'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('punch_test_60s', 'Schlagfrequenz unter Ermüdung — die Striking-Hälfte der Belastung.'),
      addedOptional('countermovement_jump', 'Schnellkraft als Grundlage von Takedown und Absprung.'),
      addedOptional('repeated_throws_30s', 'Wurfwiederholungen — die Grappling-Hälfte.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('shuttle_5_10_5', 'Richtungswechsel im Stand, für Distanzarbeit und Angriffsvorbereitung bestimmend.'),
      addedOptional('assault_bike_10min_cal', 'Ausdauer ohne Laufbelastung, für Athleten mit Beschwerden an der unteren Extremität.'),
    ],
    eventDurationSeconds: [900, 1500],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'max_strength', 'relative_strength', 'power', 'endurance'],
  },
  {
    id: 'karate',
    categoryId: 'combat',
    name: { de: 'Karate', en: 'Karate' },
    rationale: {
      de: 'Kumite lebt von Explosivität und Distanzkontrolle in sehr kurzen Aktionen. Reaktion und Antritt sind wichtiger als Kraftausdauer.',
      en: 'Kumite lives on explosiveness and distance control in very short actions. Reaction and first-step speed matter more than strength endurance.',
    },
    dimensionWeights: { power: 1, agility: 0.9, strength_endurance: 0.6, relative_strength: 0.5, endurance: 0.4 },
    tests: [
      docCore('countermovement_jump', 'CMJ'),
      docCore('shuttle_5_10_5', 'agility'),
      docCore('punch_test_60s', 'kick/punch combinations'),
      docCore('sprint_10m', 'sprint'),
      docCore('fatigue_circuit_4x30s', 'Karate-specific performance tests'),
      addedOptional('standing_broad_jump', 'Horizontale Schnellkraft neben der vertikalen des CMJ.'),
      addedOptional('t_test_agility', 'Richtungswechsel über mehrere Ebenen, ergänzend zum Shuttle mit nur einer.'),
      addedOptional('kick_test_60s', 'Trittfrequenz unter Ermüdung, im Wettkampf mit hohem Anteil.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
    ],
    eventDurationSeconds: [180, 180],
    typicalLimiter: 'power',
    axisIds: ['power', 'agility', 'strength_endurance', 'fatigue_resistance'],
  },
  {
    id: 'ju_jutsu',
    categoryId: 'combat',
    name: { de: 'Ju-Jutsu', en: 'Ju-jutsu' },
    rationale: {
      de: 'Mischform aus Schlag, Wurf und Bodenarbeit. Die Testbatterie ist deshalb bewusst breit und überschneidet sich mit Judo und MMA.',
      en: 'A mix of striking, throwing and ground work. The battery is deliberately broad and overlaps with judo and MMA.',
    },
    dimensionWeights: { strength_endurance: 0.9, relative_strength: 0.8, power: 0.7, agility: 0.6, endurance: 0.5 },
    tests: [
      docCore('grappling_circuit_5min', 'combined striking/grappling circuits'),
      docCore('grip_strength', 'grip'),
      docCore('sprint_30m', 'sprint'),
      docCore('countermovement_jump', 'jump'),
      docCore('fatigue_circuit_4x30s', 'intermittent endurance'),
      addedOptional('repeated_throws_30s', 'Wurfwiederholungen als messbarer Teil der Mischbelastung.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('punch_test_60s', 'Schlaganteil der Mischbelastung.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('shuttle_5_10_5', 'Richtungswechsel im Stand, für Distanzarbeit und Angriffsvorbereitung bestimmend.'),
    ],
    eventDurationSeconds: [180, 300],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'relative_strength', 'power', 'grip'],
  },
  {
    id: 'pencak_silat',
    categoryId: 'combat',
    name: { de: 'Pencak Silat', en: 'Pencak silat' },
    rationale: {
      de: 'Zur Belastungsstruktur gibt es bislang wenig Belastbares. Die Batterie besteht deshalb aus allgemeinen Feldtests und ist ausdrücklich als vorläufig zu lesen.',
      en: 'Little solid evidence on its load structure exists so far. The battery therefore consists of general field tests and is explicitly to be read as provisional.',
    },
    dimensionWeights: { power: 0.8, agility: 0.8, strength_endurance: 0.7, endurance: 0.5, relative_strength: 0.5 },
    tests: [
      docCore('shuttle_5_10_5', 'agility'),
      docCore('fatigue_circuit_4x30s', 'fatigue index'),
      docCore('sprint_10m', 'sprint'),
      docCore('countermovement_jump', 'jump'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
      addedOptional('standing_broad_jump', 'Horizontale Schnellkraft neben der vertikalen des CMJ.'),
      addedOptional('kick_test_60s', 'Trittanteil der Technik, mit vorhandenem Protokoll messbar.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
    ],
    eventDurationSeconds: [180, 180],
    typicalLimiter: 'agility',
    axisIds: ['agility', 'power', 'strength_endurance', 'fatigue_resistance'],
  },
  {
    id: 'fencing',
    categoryId: 'combat',
    name: { de: 'Fechten', en: 'Fencing' },
    rationale: {
      de: 'Sehr kurze Ausfallbewegungen in hoher Zahl, einseitig belastet. Antritt und Richtungswechsel auf der Planche sind die bestimmenden Grössen.',
      en: 'Very short lunges in high number, loaded asymmetrically. First-step speed and changes of direction on the piste are the decisive quantities.',
    },
    dimensionWeights: { agility: 1, power: 0.9, strength_endurance: 0.6, endurance: 0.5, relative_strength: 0.4 },
    tests: [
      docCore('shuttle_5_10_5', 'agility'),
      docCore('fatigue_circuit_4x30s', 'specific fencing circuits'),
      docCore('countermovement_jump', 'jump'),
      docCore('sprint_10m', 'sprint'),
      addedOptional('t_test_agility', 'Richtungswechsel über mehrere Ebenen, ergänzend zum Shuttle mit nur einer.'),
      addedOptional('standing_broad_jump', 'Horizontale Schnellkraft neben der vertikalen des CMJ.'),
      addedOptional('repeated_jump_15s', 'Wiederholte Explosivität — der Ausfall wird hunderte Male ausgeführt.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
    ],
    eventDurationSeconds: [180, 540],
    typicalLimiter: 'agility',
    axisIds: ['agility', 'power', 'strength_endurance', 'fatigue_resistance'],
  },
]

const HYBRID: Discipline[] = [
  {
    id: 'hyrox',
    categoryId: 'hybrid',
    name: { de: 'HYROX', en: 'HYROX' },
    rationale: {
      de: 'Acht 1-km-Läufe im Wechsel mit acht standardisierten Kraftausdauerstationen. Die Standardisierung macht das Format diagnostisch ungewöhnlich gut zugänglich; begrenzend ist regelmässig die Kraftausdauer, nicht die Laufleistung.',
      en: 'Eight 1 km runs alternating with eight standardised strength-endurance stations. The standardisation makes it unusually accessible diagnostically; the limiter is regularly strength endurance, not running.',
    },
    dimensionWeights: { strength_endurance: 1, endurance: 0.9, relative_strength: 0.7, max_strength: 0.4, power: 0.3 },
    tests: [
      docCore('run_5k', 'run splits'),
      docCore('sled_push', 'sled push'),
      docCore('sled_drag', 'sled pull'),
      docCore('ski_erg_1000m', 'ski erg'),
      docCore('row_1000m', 'row erg'),
      docCore('wall_balls_75', 'wall ball test'),
      docOptional('burpee_broad_jump_80m', 'burpee broad jump'),
      docOptional('farmers_carry', 'carry tests'),
      docOptional('fatigue_circuit_4x30s', 'repeated station simulation'),
      addedOptional('deadlift_1rm', 'Maximalkraft als Reserve hinter Schlitten und Carry — wer nah an seinem Maximum trägt, ermüdet schneller.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('assault_bike_10min_cal', 'Ausdauer ohne Laufbelastung, für Athleten mit Beschwerden an der unteren Extremität.'),
    ],
    eventDurationSeconds: [3600, 5400],
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'strength_endurance', 'relative_strength', 'load_carriage'],
  },
  {
    id: 'functional_fitness',
    categoryId: 'hybrid',
    name: { de: 'Functional Fitness', en: 'Functional fitness' },
    aliases: ['CrossFit', 'Hybrid Racing'],
    rationale: {
      de: 'Wettkampfformate wechseln von Jahr zu Jahr, die Anforderung bleibt: auf allen Achsen gleichzeitig bestehen. Ein vollständiges Profil ist hier kein Zusatznutzen, sondern die Vorbereitung selbst.',
      en: 'Competition formats change from year to year; the demand does not: hold up on every axis at once. A complete profile here is not an added benefit but the preparation itself.',
    },
    dimensionWeights: { strength_endurance: 1, max_strength: 0.8, endurance: 0.8, relative_strength: 0.8, power: 0.7, agility: 0.5 },
    tests: [
      docCore('cindy_20min_amrap', 'mixed modality circuits'),
      docCore('row_2000m', 'engine tests'),
      docCore('fran', 'strength endurance'),
      docCore('fatigue_circuit_4x30s', 'repeated sprint ability'),
      docCore('assault_bike_10min_cal', 'erg tests'),
      addedOptional('back_squat_1rm', 'Maximalkraft der Beinstreckung als Bezugsgrösse für alle Sprung- und Antrittswerte.'),
      addedOptional('clean_and_jerk_1rm', 'Olympische Hebung als Schnellkraftmass — in dieser Disziplin Wettkampfinhalt.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('grace', 'Kraftausdauer an der Langhantel mit fester Vorgabe, dadurch über Jahre vergleichbar.'),
      addedOptional('countermovement_jump', 'Schnellkraft als Grundlage der Hebungen.'),
      addedOptional('run_5k', 'Laufanteil, in Wettkämpfen regelmässig enthalten.'),
    ],
    eventDurationSeconds: [300, 1800],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'endurance', 'max_strength', 'power'],
  },
  {
    id: 'ocr',
    categoryId: 'hybrid',
    name: { de: 'Hindernislauf (OCR)', en: 'Obstacle course racing' },
    rationale: {
      de: 'Laufen unter Zusatzlast, mit Griff-, Zug- und Kletteranteilen. Die Griffkraft am Ende eines langen Laufs ist die Grösse, an der die meisten Läufe entschieden werden.',
      en: 'Running under added load with grip, pulling and climbing sections. Grip strength at the end of a long run is where most races are decided.',
    },
    dimensionWeights: { strength_endurance: 1, endurance: 0.9, relative_strength: 0.8, power: 0.4, agility: 0.4 },
    tests: [
      docCore('loaded_march', 'run-under-load'),
      docCore('farmers_carry', 'carry'),
      docCore('rope_climb', 'climb'),
      docCore('crawl_30m', 'crawl'),
      docCore('grip_strength', 'grip'),
      docCore('sprint_30m', 'sprint'),
      docOptional('obstacle_course_sim', 'obstacle simulation'),
      addedOptional('grip_hang_time', 'Griffausdauer — an Hangelhindernissen die begrenzende Grösse.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('run_5k', 'Laufanteil zwischen den Hindernissen.'),
      addedOptional('sled_push', 'Schiebearbeit, auf vielen Strecken enthalten.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
    ],
    eventDurationSeconds: [1800, 10800],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'relative_strength', 'grip', 'endurance', 'load_carriage'],
  },
]

const RUNNING: Discipline[] = [
  {
    id: 'run_5k_discipline',
    categoryId: 'running',
    name: { de: '5 km', en: '5 km' },
    rationale: {
      de: 'Kurz genug, dass die maximale Sauerstoffaufnahme dominiert, lang genug für einen deutlichen Schwellenanteil. Damit die Distanz, an der sich Grundlagenarbeit am schnellsten zeigt.',
      en: 'Short enough for maximal oxygen uptake to dominate, long enough for a clear threshold share. The distance where base work shows up fastest.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.4, power: 0.3 },
    tests: [
      docCore('run_5k', 'time trial'),
      docCore('threshold_run_30min', 'threshold test'),
      docCore('cooper_12min', 'VO2max test'),
      docCore('fatigue_circuit_4x30s', 'interval test'),
      docOptional('lactate_step_test', 'lactate test'),
      addedOptional('sprint_30m', 'Schnelligkeitsreserve — sie entscheidet den Zielsprint und begrenzt das Tempo an der Schwelle nach oben.'),
      addedOptional('countermovement_jump', 'Neuromuskuläre Frische; ein Einbruch zeigt Ermüdung vor der Zeitmessung.'),
      addedOptional('beep_test_20m', 'Feldalternative zum Cooper-Test bei begrenztem Platz.'),
    ],
    eventDurationSeconds: [840, 1800],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'run_economy', 'power'],
  },
  {
    id: 'run_10k_discipline',
    categoryId: 'running',
    name: { de: '10 km', en: '10 km' },
    rationale: {
      de: 'Nahe an der Schwelle über die volle Distanz. Wer hier nachlässt, hat meist ein Schwellenproblem und kein Problem der maximalen Sauerstoffaufnahme.',
      en: 'Close to threshold over the whole distance. Whoever fades here usually has a threshold problem, not a maximal-oxygen-uptake problem.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.5 },
    tests: [
      docCore('run_10k', 'time trial'),
      docCore('threshold_run_30min', 'threshold test'),
      docCore('cooper_12min', 'VO2max test'),
      docOptional('lactate_step_test', 'lactate test'),
      addedOptional('run_5k', 'Kürzere Distanz als Kontrollpunkt und für die Hochrechnung.'),
      addedOptional('beep_test_20m', 'Feldalternative zum Cooper-Test.'),
    ],
    eventDurationSeconds: [1800, 3900],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'run_economy'],
  },
  {
    id: 'half_marathon',
    categoryId: 'running',
    name: { de: 'Halbmarathon', en: 'Half marathon' },
    rationale: {
      de: 'Erste Distanz, auf der Ökonomie und Ermüdungsresistenz über die reine Sauerstoffaufnahme dominieren. Die 10-km-Zeit sagt die Halbmarathonzeit nur so gut voraus, wie die Ökonomie hält.',
      en: 'The first distance where economy and fatigue resistance dominate over raw oxygen uptake. A 10 km time predicts the half only as far as economy holds.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.6 },
    tests: [
      docCore('run_10k', '10-km-Prognose'),
      docCore('threshold_run_30min', 'threshold test'),
      docCore('run_5k', 'long-run pace test'),
      addedOptional('cooper_12min', 'Aerobe Kapazität als Feldwert.'),
      addedOptional('plank_hold', 'Rumpfstabilität; sie hält die Laufhaltung über die zweite Hälfte.'),
    ],
    eventDurationSeconds: [3900, 9000],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'run_economy', 'durability'],
  },
  {
    id: 'marathon',
    categoryId: 'running',
    name: { de: 'Marathon', en: 'Marathon' },
    rationale: {
      de: 'Multifaktoriell: Ökonomie, Ermüdungsresistenz, Körperzusammensetzung und Renneinteilung wirken zusammen. Eine einzelne Testzahl erklärt die Leistung hier am wenigsten von allen Laufdistanzen.',
      en: 'Multifactorial: economy, fatigue resistance, body composition and pacing act together. A single test number explains performance here less than at any other running distance.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.7 },
    tests: [
      docCore('cooper_12min', 'CPET/VO2max'),
      docCore('threshold_run_30min', 'race simulation'),
      docOptional('lactate_step_test', 'lactate threshold'),
      addedOptional('run_10k', 'Kontrollpunkt und Grundlage der Hochrechnung.'),
      addedOptional('run_5k', 'Kurzer Kontrollpunkt zwischen den langen Einheiten.'),
      addedOptional('plank_hold', 'Rumpfstabilität über die Distanz.'),
    ],
    eventDurationSeconds: [7200, 21600],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'run_economy', 'durability'],
  },
  {
    id: 'trail_running',
    categoryId: 'running',
    name: { de: 'Trailrunning', en: 'Trail running' },
    rationale: {
      de: 'Anstiege und Abfahrten verschieben die Belastung auf exzentrische Arbeit und Rumpfstabilität. Eine Bahnzeit ist hier ein schwacher Prädiktor.',
      en: 'Climbs and descents shift the load towards eccentric work and trunk stability. A track time is a weak predictor here.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.8, power: 0.4, agility: 0.3 },
    tests: [
      docCore('uphill_run_test', 'uphill running test'),
      docCore('downhill_run_test', 'downhill running test'),
      docCore('run_10k', 'terrain-specific time trial'),
      docCore('threshold_run_30min', 'fatigue resistance'),
      addedOptional('plank_hold', 'Rumpfstabilität auf unebenem Untergrund.'),
      addedOptional('repeated_jump_15s', 'Reaktive Kraft — im Gefälle die begrenzende Eigenschaft.'),
      addedOptional('run_5k', 'Kontrollpunkt auf ebener Strecke, um Gelände- von Formänderung zu trennen.'),
      addedOptional('standing_broad_jump', 'Horizontale Schnellkraft neben der vertikalen des CMJ.'),
      addedOptional('farmers_carry', 'Tragen der Pflichtausrüstung, auf langen Strecken vorgeschrieben.'),
    ],
    eventDurationSeconds: [3600, 43200],
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'climbing', 'power', 'strength_endurance'],
  },
  {
    id: 'ultramarathon',
    categoryId: 'running',
    name: { de: 'Ultramarathon', en: 'Ultramarathon' },
    rationale: {
      de: 'Über diese Dauer entscheidet nicht die Spitzenleistung, sondern der Wirkungsgrad bei niedriger Intensität und die Fähigkeit, ihn zu halten. Maximaltests sagen wenig.',
      en: 'Over this duration it is not peak output that decides but efficiency at low intensity and the ability to hold it. Maximal tests say little.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.9 },
    tests: [
      docCore('threshold_run_30min', 'submaximal efficiency'),
      docCore('run_10k', 'long-duration pacing'),
      docCore('hr_drift_test', 'HR drift'),
      addedOptional('plank_hold', 'Rumpfstabilität über viele Stunden.'),
      addedOptional('run_5k', 'Kurzer Kontrollpunkt zwischen den langen Einheiten, ohne mehrere Tage Erholung zu kosten.'),
      addedOptional('lactate_step_test', 'Schwellenbestimmung im Labor, wenn verfügbar.'),
      addedOptional('farmers_carry', 'Tragen von Ausrüstung und Verpflegung.'),
    ],
    eventDurationSeconds: [14400, 172800],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'durability', 'strength_endurance'],
  },
]

const CYCLING: Discipline[] = [
  {
    id: 'road_race',
    categoryId: 'cycling',
    name: { de: 'Strassenrennen', en: 'Road race' },
    rationale: {
      de: 'Lange Grundbelastung mit wiederholten harten Antritten. Entscheidend ist die Leistung an der Schwelle und die Fähigkeit, nach einem Antritt wieder dorthin zurückzukehren.',
      en: 'A long base load with repeated hard efforts. What decides it is power at threshold and the ability to return there after an attack.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.7, power: 0.5 },
    tests: [
      docCore('ftp_20min', '20-min TT'),
      docCore('ramp_test_bike', 'ramp test'),
      docCore('submax_efficiency_bike', 'submax test'),
      docCore('peak_power_5s', 'power profile'),
      docOptional('lactate_step_test', 'lactate threshold'),
      addedOptional('assault_bike_10min_cal', 'Ausdauer auf dem Ergometer, wenn kein Leistungsmesser am Rad vorhanden ist.'),
      addedOptional('row_2000m', 'Ganzkörperausdauer im Winter, wenn draussen nicht gefahren wird.'),
    ],
    eventDurationSeconds: [7200, 21600],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'bike_threshold', 'power'],
  },
  {
    id: 'time_trial',
    categoryId: 'cycling',
    name: { de: 'Zeitfahren', en: 'Time trial' },
    rationale: {
      de: 'Gleichmässige Maximalleistung ohne Windschatten. Die reinste Schwellenprüfung im Radsport — hier zählt nichts als die haltbare Leistung.',
      en: 'Steady maximal output with no draft. The purest threshold test in cycling — nothing counts but sustainable power.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.6 },
    tests: [
      docCore('ftp_20min', 'TT-specific tests'),
      docCore('ramp_test_bike', 'power-duration tests'),
      addedOptional('lactate_step_test', 'Schwellenbestimmung im Labor, genauer als die Feldschätzung.'),
      addedOptional('peak_power_5s', 'Antrittsvermögen für Start und Wende.'),
      addedOptional('submax_efficiency_bike', 'Wirkungsgrad in Wettkampfposition, wiederholbar ohne Windkanal.'),
    ],
    eventDurationSeconds: [1200, 3600],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'bike_threshold'],
  },
  {
    id: 'track_cycling',
    categoryId: 'cycling',
    name: { de: 'Bahnradsport', en: 'Track cycling' },
    rationale: {
      de: 'Sehr kurze Maximalbelastungen mit vollständiger Erholung. Spitzenleistung und ihre Wiederholbarkeit sind die einzigen relevanten Grössen; die Schwelle spielt kaum eine Rolle.',
      en: 'Very short maximal efforts with full recovery. Peak power and its repeatability are the only relevant quantities; threshold hardly matters.',
    },
    dimensionWeights: { power: 1, max_strength: 0.7, strength_endurance: 0.5, endurance: 0.3 },
    // Der Wingate-Test gehört fachlich hierher, steht aber unter den
    // optionalen: er braucht ein Ergometer mit Drehmomentmessung. Ein
    // Kerntest, den die meisten nicht durchführen können, macht jedes Profil
    // dauerhaft unvollständig.
    tests: [
      docCore('peak_power_5s', 'sprint tests'),
      docCore('repeated_sprint_bike', 'repeated sprint'),
      docOptional('wingate_30s', 'Wingate-style tests'),
      docOptional('lactate_step_test', 'lactate'),
      addedOptional('back_squat_1rm', 'Maximalkraft der Beinstreckung als Bezugsgrösse für alle Sprung- und Antrittswerte.'),
      addedOptional('countermovement_jump', 'Schnellkraft der Beine, direkte Entsprechung zum Antritt.'),
      addedOptional('ftp_20min', 'Schwellenleistung für die Ausdauerdisziplinen auf der Bahn.'),
    ],
    eventDurationSeconds: [10, 300],
    typicalLimiter: 'power',
    axisIds: ['power', 'max_strength', 'strength_endurance'],
  },
  {
    id: 'mtb',
    categoryId: 'cycling',
    name: { de: 'Mountainbike', en: 'Mountain bike' },
    rationale: {
      de: 'Ständiger Wechsel aus Antritt und Erholung im Gelände, dazu hohe Anforderungen an Rumpf und Oberkörper. Ein reines Schwellenprofil beschreibt das nur zur Hälfte.',
      en: 'A constant alternation of surge and recovery off-road, plus high demands on trunk and upper body. A pure threshold profile describes only half of it.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.8, power: 0.7, agility: 0.4 },
    tests: [
      docCore('uphill_run_test', 'climbing test'),
      docCore('repeated_sprint_bike', 'repeated bursts'),
      docCore('ftp_20min', 'power-duration profile'),
      addedOptional('peak_power_5s', 'Antritte an Steilstücken und aus technischen Passagen heraus, im Gelände ständig gefordert.'),
      addedOptional('ramp_test_bike', 'Maximale aerobe Leistung als Deckelwert.'),
      addedOptional('plank_hold', 'Rumpfstabilität im Gelände.'),
      addedOptional('grip_strength', 'Griffkraft — auf ruppigen Abfahrten begrenzend.'),
      addedOptional('wingate_30s', 'Anaerobe Kapazität im Labor, wenn verfügbar.'),
    ],
    eventDurationSeconds: [3600, 10800],
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'bike_threshold', 'power', 'strength_endurance'],
  },
  {
    id: 'gravel',
    categoryId: 'cycling',
    name: { de: 'Gravel', en: 'Gravel' },
    rationale: {
      de: 'Mischprofil aus Strasse und Gelände über sehr lange Dauer. Robustheit und Renneinteilung wiegen schwerer als die Spitzenleistung.',
      en: 'A mixed profile of road and off-road over very long duration. Robustness and pacing weigh more than peak output.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.8, power: 0.4 },
    tests: [
      docCore('ftp_20min', 'long TT'),
      docCore('submax_efficiency_bike', 'submax endurance'),
      docCore('ramp_test_bike', 'fatigue resistance'),
      addedOptional('peak_power_5s', 'Antritte an kurzen Rampen und aus Kurven heraus, auf Schotter häufiger als auf der Strasse.'),
      addedOptional('plank_hold', 'Rumpfstabilität über lange Distanzen im Gelände.'),
      addedOptional('lactate_step_test', 'Schwellenbestimmung im Labor, genauer als jede Feldschätzung.'),
    ],
    eventDurationSeconds: [7200, 36000],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'bike_threshold', 'durability'],
  },
]

const SWIMMING: Discipline[] = [
  {
    id: 'freestyle',
    categoryId: 'swimming',
    name: { de: 'Freistil', en: 'Freestyle' },
    rationale: {
      de: 'Die schnellste und am besten untersuchte Lage. Zuglänge und Zugfrequenz trennen Schwimmer mit gleicher Ausdauer deutlicher als jeder physiologische Wert.',
      en: 'The fastest and best-studied stroke. Stroke length and rate separate swimmers of equal endurance more sharply than any physiological value.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.7, power: 0.4, relative_strength: 0.4 },
    tests: [
      docCore('swim_incremental', 'stroke rate/length'),
      docCore('swim_100m', 'race-pace test'),
      docCore('swim_400m', 'split analysis'),
      docOptional('lactate_step_test', 'lactate step test'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('grip_strength', 'Griffkraft — der Wasserfassung vorgelagert.'),
      addedOptional('plank_hold', 'Rumpfspannung, sie trägt die Wasserlage.'),
    ],
    eventDurationSeconds: [20, 900],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'swim_technique', 'power'],
  },
  {
    id: 'backstroke',
    categoryId: 'swimming',
    name: { de: 'Rücken', en: 'Backstroke' },
    rationale: {
      de: 'Eigene Wasserlage und Atemrhythmik. Kennwerte aus dem Freistil lassen sich nicht übertragen, weshalb die Lage eine eigene Zeitmessung braucht.',
      en: 'Its own body position and breathing rhythm. Freestyle measures do not transfer, so the stroke needs its own timed trials.',
    },
    dimensionWeights: { endurance: 0.9, strength_endurance: 0.7, power: 0.5, relative_strength: 0.4 },
    tests: [
      docCore('swim_100m_backstroke', 'stroke-specific time trials'),
      docCore('swim_incremental', 'stroke metrics'),
      addedOptional('swim_100m', 'Freistilzeit als Bezugswert — der Unterschied zwischen den Lagen ist die eigentliche Aussage.'),
      addedOptional('swim_400m', 'Aerobe Grundlage, lagenunabhängig.'),
      addedOptional('plank_hold', 'Rumpfspannung, in Rückenlage besonders bestimmend.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
    ],
    eventDurationSeconds: [25, 300],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'swim_technique', 'strength_endurance'],
  },
  {
    id: 'breaststroke',
    categoryId: 'swimming',
    name: { de: 'Brust', en: 'Breaststroke' },
    rationale: {
      de: 'Am stärksten technikbestimmte Lage: der Wirkungsgrad schwankt zwischen Schwimmern stärker als die Kraft. Zuglänge ist hier die aussagekräftigste Einzelzahl.',
      en: 'The most technique-driven stroke: efficiency varies between swimmers more than strength does. Stroke length is the single most informative number.',
    },
    dimensionWeights: { endurance: 0.9, strength_endurance: 0.7, power: 0.6, relative_strength: 0.4 },
    tests: [
      docCore('swim_100m_breaststroke', 'stroke-specific test'),
      docCore('swim_incremental', 'stroke rate/efficiency'),
      docOptional('lactate_step_test', 'lactate response'),
      addedOptional('swim_100m', 'Freistilzeit als Bezugswert.'),
      addedOptional('swim_400m', 'Aerobe Grundlage im Wasser, unabhängig von der Lage.'),
      addedOptional('countermovement_jump', 'Beinschnellkraft — im Brustbeinschlag der Antrieb.'),
    ],
    eventDurationSeconds: [30, 330],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'swim_technique', 'power'],
  },
  {
    id: 'butterfly',
    categoryId: 'swimming',
    name: { de: 'Schmetterling', en: 'Butterfly' },
    rationale: {
      de: 'Höchste anaerobe Last aller Lagen bei kurzer Distanz. Kraftausdauer des Oberkörpers und Rumpfarbeit begrenzen früher als die Ausdauer.',
      en: 'The highest anaerobic load of all strokes over short distances. Upper-body strength endurance and trunk work limit before endurance does.',
    },
    dimensionWeights: { strength_endurance: 1, power: 0.8, endurance: 0.7, relative_strength: 0.6 },
    tests: [
      docCore('swim_100m_butterfly', 'power/endurance test'),
      docCore('swim_100m', 'race-pace set'),
      addedOptional('pull_up_max_reps', 'Zugkraft — im Delfin über beide Arme gleichzeitig gefordert.'),
      addedOptional('plank_hold', 'Rumpfspannung, sie trägt die Wellenbewegung.'),
      addedOptional('swim_400m', 'Aerobe Grundlage im Wasser, unabhängig von der Lage.'),
      addedOptional('countermovement_jump', 'Schnellkraft für Start und Wende.'),
    ],
    eventDurationSeconds: [25, 130],
    typicalLimiter: 'strength_endurance',
    axisIds: ['power', 'strength_endurance', 'endurance'],
  },
  {
    id: 'open_water',
    categoryId: 'swimming',
    name: { de: 'Freiwasser', en: 'Open water' },
    rationale: {
      de: 'Lange Dauer ohne Wand und ohne Bahnbegrenzung. Tempokontrolle und Orientierung wiegen schwerer als die Bestzeit über eine Bahnstrecke.',
      en: 'Long duration with no wall and no lane. Pace control and sighting weigh more than a best time over a pool distance.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.8 },
    tests: [
      docCore('swim_400m', 'endurance trial'),
      docCore('swim_incremental', 'pace control test'),
      addedOptional('swim_100m', 'Kurze Bezugszeit für die Tempoverteilung.'),
      addedOptional('threshold_run_30min', 'Aerobe Grundlage ausserhalb des Wassers, wenn keine Bahn verfügbar ist.'),
    ],
    eventDurationSeconds: [900, 14400],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'swim_technique', 'durability'],
  },
]

const TRIATHLON: Discipline[] = [
  {
    id: 'triathlon_sprint',
    categoryId: 'triathlon',
    name: { de: 'Triathlon Sprint', en: 'Sprint triathlon' },
    rationale: {
      de: '750 m / 20 km / 5 km. Kurz genug, dass durchgehend nahe der Schwelle gefahren und gelaufen wird — die Wechsel kosten hier anteilig am meisten.',
      en: '750 m / 20 km / 5 km. Short enough to ride and run near threshold throughout — transitions cost proportionally the most here.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.6, power: 0.4 },
    tests: [
      docCore('swim_400m', 'swim test'),
      docCore('ftp_20min', 'bike test'),
      docCore('run_5k', 'run test'),
      docCore('brick_bike_run', 'transition tests'),
      docCore('threshold_run_30min', 'threshold tests'),
      addedOptional('ramp_test_bike', 'Maximale aerobe Leistung auf dem Rad als oberer Deckelwert der Schwelle.'),
    ],
    eventDurationSeconds: [3300, 5400],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'bike_threshold', 'power'],
  },
  {
    id: 'triathlon_olympic',
    categoryId: 'triathlon',
    name: { de: 'Triathlon Olympisch', en: 'Olympic triathlon' },
    rationale: {
      de: '1,5 / 40 / 10 km. Die diagnostische Kernfrage ist die Laufleistung nach der Radbelastung — ein Wert, den drei getrennte Bestzeiten nicht zeigen.',
      en: '1.5 / 40 / 10 km. The core diagnostic question is running performance after the bike — a value three separate personal bests do not show.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.6, relative_strength: 0.4 },
    tests: [
      docCore('swim_400m', 'swim test'),
      docCore('ftp_20min', 'bike test'),
      docCore('run_10k', 'run test'),
      docCore('brick_bike_run', 'transition tests'),
      docCore('threshold_run_30min', 'threshold tests'),
      addedOptional('ramp_test_bike', 'Maximale aerobe Leistung auf dem Rad als oberer Deckelwert der Schwelle.'),
      addedOptional('swim_incremental', 'Schwellenpace im Wasser statt nur einer Zeit.'),
    ],
    eventDurationSeconds: [6600, 10800],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'bike_threshold', 'run_economy'],
  },
  {
    id: 'triathlon_70_3',
    categoryId: 'triathlon',
    name: { de: 'Triathlon Mitteldistanz (70.3)', en: 'Middle distance (70.3)' },
    rationale: {
      de: 'Erste Distanz, auf der Energieversorgung und Renneinteilung mit der Leistungsfähigkeit gleichziehen. Ein hoher Schwellenwert nützt wenig, wenn er nicht über vier Stunden trägt.',
      en: 'The first distance where fuelling and pacing draw level with capacity. A high threshold helps little if it does not hold for four hours.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.8 },
    tests: [
      docCore('threshold_run_30min', 'long aerobic tests'),
      docCore('brick_bike_run', 'fatigue resistance'),
      docCore('ftp_20min', 'pacing metrics'),
      docCore('swim_400m', 'swim test'),
      docCore('run_10k', 'run test'),
      addedOptional('lactate_step_test', 'Schwellenbestimmung im Labor, genauer als jede Feldschätzung.'),
      addedOptional('plank_hold', 'Rumpfstabilität über die Langdistanz.'),
    ],
    eventDurationSeconds: [14400, 28800],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'bike_threshold', 'run_economy', 'durability'],
  },
  {
    id: 'triathlon_ironman',
    categoryId: 'triathlon',
    name: { de: 'Ironman (Langdistanz)', en: 'Ironman (long distance)' },
    rationale: {
      de: 'Über diese Dauer entscheidet der Wirkungsgrad bei submaximaler Intensität, nicht die Spitzenleistung. Maximaltests sind hier die am wenigsten aussagekräftige Testart.',
      en: 'Over this duration efficiency at submaximal intensity decides, not peak output. Maximal tests are the least informative kind of test here.',
    },
    dimensionWeights: { endurance: 1, strength_endurance: 0.9 },
    tests: [
      docCore('threshold_run_30min', 'long aerobic tests'),
      docCore('brick_bike_run', 'fatigue resistance'),
      docCore('ftp_20min', 'pacing metrics'),
      docCore('swim_400m', 'swim test'),
      docCore('run_10k', 'run test'),
      addedOptional('lactate_step_test', 'Schwellenbestimmung im Labor, genauer als jede Feldschätzung.'),
      addedOptional('plank_hold', 'Rumpfstabilität über die Langdistanz.'),
      addedOptional('farmers_carry', 'Tragen von Rad und Ausrüstung im Wettkampfalltag.'),
      addedOptional('hr_drift_test', 'Herzfrequenzdrift als Mass der Dauerbelastbarkeit.'),
    ],
    eventDurationSeconds: [28800, 61200],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'bike_threshold', 'durability', 'strength_endurance'],
  },
]

const TACTICAL: Discipline[] = [
  {
    id: 'police',
    categoryId: 'tactical',
    name: { de: 'Polizei / Streifendienst', en: 'Police / patrol' },
    rationale: {
      de: 'Die Anforderung ist nicht Höchstleistung, sondern eine selten auftretende Maximalbelastung aus dem Ruhezustand sicher zu erbringen: Verfolgung, Fixierung, Tragen.',
      en: 'The requirement is not peak performance but reliably producing a rarely occurring maximal effort from rest: pursuit, restraint, carrying.',
    },
    dimensionWeights: { strength_endurance: 1, relative_strength: 0.9, endurance: 0.8, max_strength: 0.6, agility: 0.6 },
    tests: [
      docCore('run_1_5_mile', 'run tests'),
      docCore('shuttle_5_10_5', 'shuttle'),
      docCore('sled_drag', 'drag/carry'),
      docCore('farmers_carry', 'carry'),
      docCore('stair_climb', 'stair climb'),
      docCore('grip_strength', 'grip'),
      docOptional('countermovement_jump', 'power'),
      docOptional('obstacle_course_sim', 'obstacle simulation'),
      addedOptional('deadlift_1rm', 'Maximalkraft als Reserve hinter Ziehen und Tragen.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, beim Überwinden von Hindernissen gefordert.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'strength_endurance', 'relative_strength', 'agility', 'load_carriage'],
  },
  {
    id: 'firefighter',
    categoryId: 'tactical',
    name: { de: 'Feuerwehr', en: 'Firefighter' },
    rationale: {
      de: 'Arbeit unter Zusatzlast in Schutzausrüstung, häufig über Treppen. Die Belastung ist überwiegend Kraftausdauer bei eingeschränkter Atmung — Laufleistung allein bildet sie nicht ab.',
      en: 'Work under added load in protective equipment, often up stairs. The load is predominantly strength endurance with restricted breathing — running alone does not represent it.',
    },
    dimensionWeights: { strength_endurance: 1, max_strength: 0.8, relative_strength: 0.7, endurance: 0.7 },
    tests: [
      docCore('loaded_march', 'load carriage'),
      docCore('stair_climb', 'stair climb'),
      docCore('sled_drag', 'drag/carry'),
      docCore('rope_climb', 'climb'),
      docCore('grip_strength', 'grip'),
      docCore('fatigue_circuit_4x30s', 'anaerobic endurance'),
      addedOptional('farmers_carry', 'Tragen von Gerät über kurze Wege — die häufigste Form der Last im Einsatz.'),
      addedOptional('deadlift_1rm', 'Maximalkraft als Reserve hinter Ziehen und Heben.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'max_strength', 'load_carriage', 'grip'],
  },
  {
    id: 'military',
    categoryId: 'tactical',
    name: { de: 'Militär', en: 'Military' },
    rationale: {
      de: 'Marschleistung unter Last neben Kraft- und Sprintanforderungen. Die Kombination aus Zusatzlast und Dauer unterscheidet dieses Profil von jedem Sportprofil.',
      en: 'Loaded marching alongside strength and sprint requirements. The combination of added load and duration separates this profile from any sporting one.',
    },
    dimensionWeights: { strength_endurance: 1, endurance: 0.9, relative_strength: 0.8, max_strength: 0.6, power: 0.4 },
    tests: [
      docCore('loaded_march', 'loaded march'),
      docCore('run_1_5_mile', 'run'),
      docCore('sprint_30m', 'sprint'),
      docCore('farmers_carry', 'carry'),
      docCore('deadlift_1rm', 'strength'),
      docCore('countermovement_jump', 'power'),
      docOptional('obstacle_course_sim', 'obstacle course'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('sled_drag', 'Ziehen einer Last — Bergen von Personen.'),
      addedOptional('stair_climb', 'Steigarbeit unter Last — im Gebäude die häufigste Form der Dauerbelastung.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'strength_endurance', 'relative_strength', 'load_carriage', 'power'],
  },
  {
    id: 'special_forces',
    categoryId: 'tactical',
    name: { de: 'Spezialeinheiten', en: 'Special forces' },
    rationale: {
      de: 'Wiederholte Höchstleistung unter Last über lange Einsatzdauer. Von allen Profilen dasjenige mit der höchsten gleichzeitigen Anforderung auf allen Achsen.',
      en: 'Repeated maximal effort under load across long deployments. Of all profiles the one with the highest simultaneous demand on every axis.',
    },
    dimensionWeights: { strength_endurance: 1, relative_strength: 1, endurance: 0.9, max_strength: 0.7, power: 0.6, agility: 0.6 },
    tests: [
      docCore('fatigue_circuit_4x30s', 'high-load repeated effort tests'),
      docCore('obstacle_course_sim', 'obstacle circuits'),
      docCore('loaded_march', 'tactical endurance'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('farmers_carry', 'Tragen von Ausrüstung unter Zeitdruck über kurze Wege.'),
      addedOptional('run_1_5_mile', 'Feldtest für die aerobe Ausdauer ohne Labor — die im Dokument geforderte Grösse, feldtauglich erhoben.'),
      addedOptional('deadlift_1rm', 'Maximalkraft als Reserve hinter jedem Heben und Tragen im Einsatz.'),
      addedOptional('shuttle_5_10_5', 'Richtungswechsel unter Last, auf engem Raum und mit Ausrüstung.'),
      addedOptional('sled_drag', 'Ziehen einer Last am Boden — das Bergen einer bewusstlosen Person.'),
      addedOptional('stair_climb', 'Steigarbeit unter Last — im Gebäude die häufigste Form der Dauerbelastung.'),
      addedOptional('grip_hang_time', 'Griffausdauer beim Klettern und Hangeln.'),
      addedOptional('sprint_30m', 'Antritt aus dem Stand über kurze Distanz, im Einsatz aus dem Ruhezustand heraus.'),
      addedOptional('crawl_30m', 'Fortbewegung in Deckung; belastet Schulter und Rumpf anders als jeder Lauftest.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'strength_endurance', 'relative_strength', 'load_carriage', 'grip'],
  },
  {
    id: 'ems',
    categoryId: 'tactical',
    name: { de: 'Rettungsdienst', en: 'Emergency medical services' },
    rationale: {
      de: 'Tragen und Heben unter Zeitdruck, oft in engen Räumen und über Treppen. Die Belastung ist kurz und hoch, die Erholung dazwischen unplanbar.',
      en: 'Carrying and lifting under time pressure, often in confined spaces and up stairs. The effort is short and high, the recovery between unplannable.',
    },
    dimensionWeights: { strength_endurance: 1, max_strength: 0.7, relative_strength: 0.7, endurance: 0.6 },
    tests: [
      docCore('farmers_carry', 'carry'),
      docCore('stair_climb', 'stair'),
      docCore('sled_drag', 'drag'),
      docCore('sprint_30m', 'sprint'),
      docCore('shuttle_5_10_5', 'agility'),
      docCore('run_1_5_mile', 'endurance'),
      addedOptional('deadlift_1rm', 'Heben vom Boden — die häufigste Belastung im Rettungsdienst.'),
      addedOptional('grip_strength', 'Griffkraft als Bezugswert für alle griffgebundenen Aufgaben.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form dessen, was das Dokument «Rumpfausdauer» nennt.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'relative_strength', 'load_carriage', 'agility'],
  },
]

export const DISCIPLINES: Discipline[] = [
  ...COMBAT,
  ...HYBRID,
  ...RUNNING,
  ...CYCLING,
  ...SWIMMING,
  ...TRIATHLON,
  ...TACTICAL,
]

export const DISCIPLINE_BY_ID = new Map(DISCIPLINES.map((d) => [d.id, d]))
export const CATEGORY_BY_ID = new Map(SPORT_CATEGORIES.map((c) => [c.id, c]))

/** Disziplinen einer Kategorie, in Katalogreihenfolge. */
export function disciplinesFor(categoryId: SportCategoryId): Discipline[] {
  return DISCIPLINES.filter((d) => d.categoryId === categoryId)
}

export function disciplineById(id: string | null): Discipline | undefined {
  return id ? DISCIPLINE_BY_ID.get(id) : undefined
}

/** Die Tests, die das Profil dieser Disziplin tragen. */
export function coreSlugs(discipline: Discipline): string[] {
  return discipline.tests.filter((t) => t.role === 'core').map((t) => t.slug)
}

/** Tests, die das Profil schärfen, ohne für seine Vollständigkeit nötig zu sein. */
export function optionalSlugs(discipline: Discipline): string[] {
  return discipline.tests.filter((t) => t.role === 'optional').map((t) => t.slug)
}

/** Der Eintrag zu einem Test in dieser Disziplin, samt Herkunft. */
export function disciplineTest(
  disciplineId: string | null | undefined,
  slug: string,
): DisciplineTest | undefined {
  if (!disciplineId) return undefined
  return disciplineById(disciplineId)?.tests.find((t) => t.slug === slug)
}
