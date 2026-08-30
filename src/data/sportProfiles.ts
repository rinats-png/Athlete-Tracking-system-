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

export interface Discipline {
  id: string
  categoryId: SportCategoryId
  name: { de: string; en: string }
  /** Alternative Bezeichnungen, für die Suche. */
  aliases?: string[]
  /** Warum diese Disziplin diagnostisch eigenständig ist. */
  rationale: { de: string; en: string }
  dimensionWeights: Partial<Record<PerformanceDimension, number>>
  /** Tests aus dem Katalog, die das Profil tragen. */
  coreTests: string[]
  /** Sinnvoll, aber nicht nötig für ein vollständiges Profil. */
  optionalTests: string[]
  /** Typische Wettkampfdauer in Sekunden. Null bei variabler Dauer. */
  eventDurationSeconds: [number, number] | null
  /** Achse, die erfahrungsgemäss zuerst begrenzt. */
  typicalLimiter: PerformanceDimension
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
    coreTests: [
      'special_judo_fitness_test',
      'uchi_komi_fitness_test',
      'grip_hang_time',
      'pull_up_max_reps',
      'sprint_10m',
      'countermovement_jump',
    ],
    optionalTests: [
      'repeated_throws_30s',
      'grip_strength',
      'deadlift_1rm',
      'shuttle_5_10_5',
      'run_1_5_mile',
    ],
    eventDurationSeconds: [240, 240],
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'special_wrestling_fitness_test',
      'rope_climb',
      'repeated_throws_30s',
      'grip_hang_time',
      'sprint_10m',
      'countermovement_jump',
    ],
    optionalTests: [
      'grip_strength',
      'pull_up_max_reps',
      'deadlift_1rm',
      'plank_hold',
      'shuttle_5_10_5',
      'run_1_5_mile',
    ],
    eventDurationSeconds: [360, 360],
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'jjapt',
      'grip_strength',
      'pull_up_max_reps',
      'grappling_circuit_5min',
      'countermovement_jump',
      'grip_hang_time',
    ],
    optionalTests: ['plank_hold', 'deadlift_1rm', 'run_1_5_mile', 'cindy_20min_amrap'],
    eventDurationSeconds: [300, 600],
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'punch_test_60s',
      'punch_test_180s',
      'rope_skipping_3min',
      'sprint_30m',
      'plank_hold',
    ],
    optionalTests: [
      'countermovement_jump',
      'shuttle_5_10_5',
      'run_1_5_mile',
      'grip_strength',
      'pull_up_max_reps',
      'assault_bike_10min_cal',
    ],
    eventDurationSeconds: [540, 720],
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'kick_test_60s',
      'punch_test_60s',
      'sprint_30m',
      'countermovement_jump',
      'shuttle_5_10_5',
      'fatigue_circuit_4x30s',
    ],
    optionalTests: ['plank_hold', 'standing_broad_jump', 'run_1_5_mile', 'assault_bike_10min_cal'],
    eventDurationSeconds: [540, 720],
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'kick_test_60s',
      'shuttle_5_10_5',
      'sprint_10m',
      'countermovement_jump',
      'fatigue_circuit_4x30s',
    ],
    optionalTests: ['standing_broad_jump', 't_test_agility', 'repeated_jump_15s', 'run_1_5_mile'],
    eventDurationSeconds: [360, 360],
    typicalLimiter: 'power',
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
    coreTests: [
      'deadlift_1rm',
      'sprint_30m',
      'plank_hold',
      'grip_strength',
      'fatigue_circuit_4x30s',
      'grappling_circuit_5min',
    ],
    optionalTests: [
      'pull_up_max_reps',
      'punch_test_60s',
      'countermovement_jump',
      'repeated_throws_30s',
      'run_1_5_mile',
      'shuttle_5_10_5',
      'assault_bike_10min_cal',
    ],
    eventDurationSeconds: [900, 1500],
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'countermovement_jump',
      'shuttle_5_10_5',
      'punch_test_60s',
      'sprint_10m',
      'fatigue_circuit_4x30s',
    ],
    optionalTests: ['standing_broad_jump', 't_test_agility', 'kick_test_60s', 'run_1_5_mile'],
    eventDurationSeconds: [180, 180],
    typicalLimiter: 'power',
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
    coreTests: [
      'grappling_circuit_5min',
      'grip_strength',
      'sprint_30m',
      'countermovement_jump',
      'fatigue_circuit_4x30s',
    ],
    optionalTests: [
      'repeated_throws_30s',
      'pull_up_max_reps',
      'punch_test_60s',
      'plank_hold',
      'run_1_5_mile',
      'shuttle_5_10_5',
    ],
    eventDurationSeconds: [180, 300],
    typicalLimiter: 'strength_endurance',
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
    coreTests: ['shuttle_5_10_5', 'fatigue_circuit_4x30s', 'sprint_10m', 'countermovement_jump'],
    optionalTests: ['plank_hold', 'standing_broad_jump', 'kick_test_60s', 'run_1_5_mile'],
    eventDurationSeconds: [180, 180],
    typicalLimiter: 'agility',
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
    coreTests: ['shuttle_5_10_5', 'fatigue_circuit_4x30s', 'countermovement_jump', 'sprint_10m'],
    optionalTests: [
      't_test_agility',
      'standing_broad_jump',
      'repeated_jump_15s',
      'run_1_5_mile',
      'plank_hold',
    ],
    eventDurationSeconds: [180, 540],
    typicalLimiter: 'agility',
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
    coreTests: ['run_5k', 'sled_push', 'sled_drag', 'ski_erg_1000m', 'row_1000m', 'wall_balls_75'],
    optionalTests: [
      'burpee_broad_jump_80m',
      'farmers_carry',
      'fatigue_circuit_4x30s',
      'deadlift_1rm',
      'run_1_5_mile',
      'assault_bike_10min_cal',
    ],
    eventDurationSeconds: [3600, 5400],
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'cindy_20min_amrap',
      'row_2000m',
      'fran',
      'fatigue_circuit_4x30s',
      'assault_bike_10min_cal',
    ],
    optionalTests: [
      'back_squat_1rm',
      'clean_and_jerk_1rm',
      'pull_up_max_reps',
      'grace',
      'countermovement_jump',
      'run_5k',
    ],
    eventDurationSeconds: [300, 1800],
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'loaded_march',
      'farmers_carry',
      'rope_climb',
      'crawl_30m',
      'grip_strength',
      'sprint_30m',
    ],
    optionalTests: [
      'obstacle_course_sim',
      'grip_hang_time',
      'pull_up_max_reps',
      'run_5k',
      'sled_push',
      'run_1_5_mile',
      'plank_hold',
    ],
    eventDurationSeconds: [1800, 10800],
    typicalLimiter: 'strength_endurance',
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
    coreTests: ['run_5k', 'threshold_run_30min', 'cooper_12min', 'fatigue_circuit_4x30s'],
    optionalTests: ['lactate_step_test', 'sprint_30m', 'countermovement_jump', 'beep_test_20m'],
    eventDurationSeconds: [840, 1800],
    typicalLimiter: 'endurance',
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
    coreTests: ['run_10k', 'threshold_run_30min', 'cooper_12min'],
    optionalTests: ['lactate_step_test', 'run_5k', 'beep_test_20m'],
    eventDurationSeconds: [1800, 3900],
    typicalLimiter: 'endurance',
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
    coreTests: ['run_10k', 'threshold_run_30min', 'run_5k'],
    optionalTests: ['cooper_12min', 'plank_hold'],
    eventDurationSeconds: [3900, 9000],
    typicalLimiter: 'endurance',
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
    coreTests: ['cooper_12min', 'threshold_run_30min'],
    optionalTests: ['lactate_step_test', 'run_10k', 'run_5k', 'plank_hold'],
    eventDurationSeconds: [7200, 21600],
    typicalLimiter: 'endurance',
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
    coreTests: ['uphill_run_test', 'downhill_run_test', 'run_10k', 'threshold_run_30min'],
    optionalTests: [
      'plank_hold',
      'repeated_jump_15s',
      'run_5k',
      'standing_broad_jump',
      'farmers_carry',
    ],
    eventDurationSeconds: [3600, 43200],
    typicalLimiter: 'strength_endurance',
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
    coreTests: ['threshold_run_30min', 'run_10k', 'hr_drift_test'],
    optionalTests: ['plank_hold', 'run_5k', 'lactate_step_test', 'farmers_carry'],
    eventDurationSeconds: [14400, 172800],
    typicalLimiter: 'endurance',
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
    coreTests: ['ftp_20min', 'ramp_test_bike', 'submax_efficiency_bike', 'peak_power_5s'],
    optionalTests: ['lactate_step_test', 'assault_bike_10min_cal', 'row_2000m'],
    eventDurationSeconds: [7200, 21600],
    typicalLimiter: 'endurance',
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
    coreTests: ['ftp_20min', 'ramp_test_bike'],
    optionalTests: ['lactate_step_test', 'peak_power_5s', 'submax_efficiency_bike'],
    eventDurationSeconds: [1200, 3600],
    typicalLimiter: 'endurance',
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
    coreTests: ['peak_power_5s', 'repeated_sprint_bike'],
    optionalTests: [
      'wingate_30s',
      'lactate_step_test',
      'back_squat_1rm',
      'countermovement_jump',
      'ftp_20min',
    ],
    eventDurationSeconds: [10, 300],
    typicalLimiter: 'power',
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
    coreTests: ['uphill_run_test', 'repeated_sprint_bike', 'ftp_20min'],
    optionalTests: [
      'peak_power_5s',
      'ramp_test_bike',
      'plank_hold',
      'grip_strength',
      'wingate_30s',
    ],
    eventDurationSeconds: [3600, 10800],
    typicalLimiter: 'strength_endurance',
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
    coreTests: ['ftp_20min', 'submax_efficiency_bike', 'ramp_test_bike'],
    optionalTests: ['peak_power_5s', 'plank_hold', 'lactate_step_test'],
    eventDurationSeconds: [7200, 36000],
    typicalLimiter: 'endurance',
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
    coreTests: ['swim_incremental', 'swim_100m', 'swim_400m'],
    optionalTests: ['lactate_step_test', 'pull_up_max_reps', 'grip_strength', 'plank_hold'],
    eventDurationSeconds: [20, 900],
    typicalLimiter: 'endurance',
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
    coreTests: ['swim_100m_backstroke', 'swim_incremental'],
    optionalTests: ['swim_100m', 'swim_400m', 'plank_hold', 'pull_up_max_reps'],
    eventDurationSeconds: [25, 300],
    typicalLimiter: 'endurance',
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
    coreTests: ['swim_100m_breaststroke', 'swim_incremental'],
    optionalTests: ['lactate_step_test', 'swim_100m', 'swim_400m', 'countermovement_jump'],
    eventDurationSeconds: [30, 330],
    typicalLimiter: 'endurance',
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
    coreTests: ['swim_100m_butterfly', 'swim_100m'],
    optionalTests: ['pull_up_max_reps', 'plank_hold', 'swim_400m', 'countermovement_jump'],
    eventDurationSeconds: [25, 130],
    typicalLimiter: 'strength_endurance',
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
    coreTests: ['swim_400m', 'swim_incremental'],
    optionalTests: ['swim_100m', 'threshold_run_30min'],
    eventDurationSeconds: [900, 14400],
    typicalLimiter: 'endurance',
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
    coreTests: ['swim_400m', 'ftp_20min', 'run_5k', 'brick_bike_run', 'threshold_run_30min'],
    optionalTests: ['ramp_test_bike'],
    eventDurationSeconds: [3300, 5400],
    typicalLimiter: 'endurance',
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
    coreTests: ['swim_400m', 'ftp_20min', 'run_10k', 'brick_bike_run', 'threshold_run_30min'],
    optionalTests: ['ramp_test_bike', 'swim_incremental'],
    eventDurationSeconds: [6600, 10800],
    typicalLimiter: 'endurance',
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
    coreTests: ['threshold_run_30min', 'brick_bike_run', 'ftp_20min', 'swim_400m', 'run_10k'],
    optionalTests: ['lactate_step_test', 'plank_hold'],
    eventDurationSeconds: [14400, 28800],
    typicalLimiter: 'endurance',
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
    coreTests: ['threshold_run_30min', 'brick_bike_run', 'ftp_20min', 'swim_400m', 'run_10k'],
    optionalTests: ['lactate_step_test', 'plank_hold', 'farmers_carry', 'hr_drift_test'],
    eventDurationSeconds: [28800, 61200],
    typicalLimiter: 'endurance',
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
    coreTests: [
      'run_1_5_mile',
      'shuttle_5_10_5',
      'sled_drag',
      'farmers_carry',
      'stair_climb',
      'grip_strength',
    ],
    optionalTests: [
      'countermovement_jump',
      'obstacle_course_sim',
      'deadlift_1rm',
      'pull_up_max_reps',
      'plank_hold',
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'loaded_march',
      'stair_climb',
      'sled_drag',
      'rope_climb',
      'grip_strength',
      'fatigue_circuit_4x30s',
    ],
    optionalTests: [
      'farmers_carry',
      'deadlift_1rm',
      'run_1_5_mile',
      'pull_up_max_reps',
      'plank_hold',
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'loaded_march',
      'run_1_5_mile',
      'sprint_30m',
      'farmers_carry',
      'deadlift_1rm',
      'countermovement_jump',
    ],
    optionalTests: [
      'obstacle_course_sim',
      'pull_up_max_reps',
      'sled_drag',
      'stair_climb',
      'plank_hold',
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
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
    coreTests: ['fatigue_circuit_4x30s', 'obstacle_course_sim', 'loaded_march'],
    optionalTests: [
      'pull_up_max_reps',
      'farmers_carry',
      'run_1_5_mile',
      'deadlift_1rm',
      'shuttle_5_10_5',
      'sled_drag',
      'stair_climb',
      'grip_hang_time',
      'sprint_30m',
      'crawl_30m',
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
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
    coreTests: [
      'farmers_carry',
      'stair_climb',
      'sled_drag',
      'sprint_30m',
      'shuttle_5_10_5',
      'run_1_5_mile',
    ],
    optionalTests: ['deadlift_1rm', 'grip_strength', 'plank_hold'],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
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
