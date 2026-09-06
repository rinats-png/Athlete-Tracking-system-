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
  /**
   * `document` — das Zielgruppendokument nennt den Test.
   * `concept`  — das Produktkonzept nennt ihn (Allgemeine Fitness, universelle
   *              Tests wie Handgrip, VO₂max, CMJ, Sprint).
   * `addition` — später hinzugefügt, mit Grund. Trägt nie ein Profil.
   */
  provenance: 'document' | 'concept' | 'addition'
  /** Bei `document` und `concept`: die Bezeichnung in der Quelle. */
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
const conceptCore = (slug: string, documentLabel: string): DisciplineTest => ({
  slug,
  role: 'core',
  provenance: 'concept',
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
    buildPriority: 1,
  },
  {
    id: 'hybrid',
    name: { de: 'Hybrid / Functional Fitness', en: 'Hybrid / functional fitness' },
    buildPriority: 2,
  },
  {
    id: 'running',
    name: { de: 'Laufen', en: 'Running' },
    buildPriority: 4,
  },
  {
    id: 'cycling',
    name: { de: 'Radsport', en: 'Cycling' },
    buildPriority: 5,
  },
  {
    id: 'swimming',
    name: { de: 'Schwimmen', en: 'Swimming' },
    buildPriority: 6,
  },
  {
    id: 'triathlon',
    name: { de: 'Triathlon / Ironman', en: 'Triathlon / Ironman' },
    buildPriority: 4,
  },
  {
    id: 'tactical',
    name: { de: 'Tactical / Behörden', en: 'Tactical / duty' },
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
    dimensionWeights: { relative_strength: 1, strength_endurance: 0.9, power: 0.7, max_strength: 0.6, endurance: 0.5, agility: 0.4 },
    tests: [
      docCore('special_judo_fitness_test', 'Special Judo Fitness Test (SJFT)'),
      docCore('uchi_komi_fitness_test', 'Uchi-komi Fitness Test (UFT)'),
      docCore('grip_hang_time', 'Judogi-Grip-Tests'),
      addedOptional('gi_grip_hang', 'Griffausdauer am Anzug statt an der Stange — die Griffform, die im Kampf vorkommt, und die einzige, für die es Kohortenwerte gibt.'),
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
    dimensionWeights: { strength_endurance: 1, relative_strength: 0.9, endurance: 0.6, max_strength: 0.5, power: 0.4 },
    tests: [
      docCore('jjapt', 'JJAPT'),
      docCore('grip_strength', 'grip strength'),
      docCore('pull_up_max_reps', 'chin-up'),
      docCore('grappling_circuit_5min', 'specific grappling circuits'),
      docCore('countermovement_jump', 'anaerobic jump/throw tests'),
      docCore('grip_hang_time', 'positional endurance'),
      addedOptional('gi_grip_hang', 'Griffausdauer am Anzug statt an der Stange — im Gi-Rollen die bestimmende Griffform, mit Kohortenwerten aus neun Studien.'),
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
      addedOptional('gi_grip_hang', 'Griffausdauer am Anzug — die Griffform des Gi-Anteils.'),
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
      addedOptional('gi_grip_hang', 'Griffausdauer am Anzug — die Griffform des Gi-Anteils.'),
    ],
    eventDurationSeconds: [180, 300],
    typicalLimiter: 'strength_endurance',
    axisIds: ['strength_endurance', 'relative_strength', 'power', 'grip'],
  },
  {
    id: 'pencak_silat',
    categoryId: 'combat',
    name: { de: 'Pencak Silat', en: 'Pencak silat' },
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
    id: 'general_fitness',
    categoryId: 'hybrid',
    name: { de: 'Allgemeine Fitness', en: 'General fitness' },
    aliases: ['Fitness', 'Gesundheitssport', 'Ohne Sportart'],
    dimensionWeights: { endurance: 0.8, max_strength: 0.7, relative_strength: 0.7, strength_endurance: 0.7, power: 0.7, agility: 0.6 },
    tests: [
      conceptCore('grip_strength', 'Handgrip Strength'),
      conceptCore('cooper_12min', 'VO₂max'),
      conceptCore('countermovement_jump', 'CMJ'),
      conceptCore('sprint_10m', 'Sprint'),
      addedOptional('back_squat_1rm', 'Maximalkraft der Beinstreckung als Bezugsgrösse für alle Sprung- und Antrittswerte.'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht — die verbreitetste Kraftausdauerprobe ohne Gerät.'),
      addedOptional('shuttle_5_10_5', 'Richtungswechsel unter Zeitdruck, die einzige Agilitätsprobe ohne Halle.'),
      addedOptional('plank_hold', 'Isometrische Rumpfleistung als messbare Form der Rumpfausdauer.'),
      addedOptional('run_5k', 'Ausdauer über eine Strecke, die jeder kennt und vergleichen kann.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'max_strength', 'relative_strength', 'strength_endurance', 'power', 'agility'],
  },
  {
    id: 'ocr',
    categoryId: 'hybrid',
    name: { de: 'Hindernislauf (OCR)', en: 'Obstacle course racing' },
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
    dimensionWeights: { endurance: 1, strength_endurance: 0.7, power: 0.4, relative_strength: 0.4 },
    tests: [
      docCore('swim_incremental', 'stroke rate/length'),
      docCore('swim_100m', 'race-pace test'),
      docCore('swim_400m', 'split analysis'),
      docOptional('lactate_step_test', 'lactate step test'),
      addedOptional('pull_up_max_reps', 'Zugkraft am eigenen Körpergewicht, in Gewichtsklassensportarten die aussagekräftigere Form.'),
      addedOptional('grip_strength', 'Griffkraft — der Wasserfassung vorgelagert.'),
      addedOptional('plank_hold', 'Rumpfspannung, sie trägt die Wasserlage.'),
      addedOptional('swim_css_test', 'Schwellentempo im Wasser aus zwei Zeitfahren — die Grösse, an der sich das Training einteilt.'),
    ],
    eventDurationSeconds: [20, 900],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'swim_technique', 'power'],
  },
  {
    id: 'backstroke',
    categoryId: 'swimming',
    name: { de: 'Rücken', en: 'Backstroke' },
    dimensionWeights: { endurance: 0.9, strength_endurance: 0.7, power: 0.5, relative_strength: 0.4 },
    tests: [
      docCore('swim_100m_backstroke', 'stroke-specific time trials'),
      docCore('swim_incremental', 'stroke metrics'),
      addedOptional('swim_100m', 'Freistilzeit als Bezugswert — der Unterschied zwischen den Lagen ist die eigentliche Aussage.'),
      addedOptional('swim_400m', 'Aerobe Grundlage, lagenunabhängig.'),
      addedOptional('swim_css_test', 'Schwellentempo im Wasser aus zwei Zeitfahren.'),
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
    dimensionWeights: { endurance: 0.9, strength_endurance: 0.7, power: 0.6, relative_strength: 0.4 },
    tests: [
      docCore('swim_100m_breaststroke', 'stroke-specific test'),
      docCore('swim_incremental', 'stroke rate/efficiency'),
      docOptional('lactate_step_test', 'lactate response'),
      addedOptional('swim_100m', 'Freistilzeit als Bezugswert.'),
      addedOptional('swim_400m', 'Aerobe Grundlage im Wasser, unabhängig von der Lage.'),
      addedOptional('swim_css_test', 'Schwellentempo im Wasser aus zwei Zeitfahren.'),
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
    dimensionWeights: { strength_endurance: 1, power: 0.8, endurance: 0.7, relative_strength: 0.6 },
    tests: [
      docCore('swim_100m_butterfly', 'power/endurance test'),
      docCore('swim_100m', 'race-pace set'),
      addedOptional('pull_up_max_reps', 'Zugkraft — im Delfin über beide Arme gleichzeitig gefordert.'),
      addedOptional('plank_hold', 'Rumpfspannung, sie trägt die Wellenbewegung.'),
      addedOptional('swim_400m', 'Aerobe Grundlage im Wasser, unabhängig von der Lage.'),
      addedOptional('swim_css_test', 'Schwellentempo im Wasser aus zwei Zeitfahren.'),
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
    dimensionWeights: { endurance: 1, strength_endurance: 0.8 },
    tests: [
      docCore('swim_400m', 'endurance trial'),
      docCore('swim_incremental', 'pace control test'),
      addedOptional('swim_100m', 'Kurze Bezugszeit für die Tempoverteilung.'),
      addedOptional('threshold_run_30min', 'Aerobe Grundlage ausserhalb des Wassers, wenn keine Bahn verfügbar ist.'),
      addedOptional('swim_css_test', 'Die Schwelle im Wasser aus zwei Zeitfahren — im Freiwasser die Grösse, die das Renntempo bestimmt.'),
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
    dimensionWeights: { endurance: 1, strength_endurance: 0.6, relative_strength: 0.4 },
    tests: [
      docCore('swim_400m', 'swim test'),
      docCore('ftp_20min', 'bike test'),
      docCore('run_10k', 'run test'),
      docCore('brick_bike_run', 'transition tests'),
      docCore('threshold_run_30min', 'threshold tests'),
      addedOptional('ramp_test_bike', 'Maximale aerobe Leistung auf dem Rad als oberer Deckelwert der Schwelle.'),
      addedOptional('swim_incremental', 'Schwellenpace im Wasser statt nur einer Zeit.'),
      addedOptional('swim_css_test', 'Schwellentempo im Wasser ohne Labor, aus 400 m und 200 m gerechnet.'),
    ],
    eventDurationSeconds: [6600, 10800],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'bike_threshold', 'run_economy'],
  },
  {
    id: 'triathlon_70_3',
    categoryId: 'triathlon',
    name: { de: 'Triathlon Mitteldistanz (70.3)', en: 'Middle distance (70.3)' },
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
      addedOptional('run_2_mile', 'Die Laufdistanz des offiziellen Behördentests — die Punktetabellen gelten für zwei Meilen, nicht für 1,5.'),
      addedOptional('hand_release_push_up', 'Liegestütz mit Handlösen, wie ihn der offizielle Behördentest wertet: ohne Prellschwung und damit zwischen zwei Terminen vergleichbar.'),
      addedOptional('sprint_drag_carry', 'Sprint, Ziehen, Tragen in einem Durchgang — die Disziplin des Behördentests, die dem Einsatz am nächsten kommt.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'strength_endurance', 'relative_strength', 'agility', 'load_carriage'],
  },
  {
    id: 'firefighter',
    categoryId: 'tactical',
    name: { de: 'Feuerwehr', en: 'Firefighter' },
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
      addedOptional('run_2_mile', 'Die Laufdistanz des offiziellen Behördentests — die Punktetabellen gelten für zwei Meilen, nicht für 1,5.'),
      addedOptional('hand_release_push_up', 'Liegestütz mit Handlösen, wie ihn der offizielle Behördentest wertet: ohne Prellschwung und damit zwischen zwei Terminen vergleichbar.'),
      addedOptional('sprint_drag_carry', 'Sprint, Ziehen, Tragen in einem Durchgang — die Disziplin des Behördentests, die dem Einsatz am nächsten kommt.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'strength_endurance', 'relative_strength', 'load_carriage', 'power'],
  },
  {
    id: 'special_forces',
    categoryId: 'tactical',
    name: { de: 'Spezialeinheiten', en: 'Special forces' },
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
      addedOptional('run_2_mile', 'Die Laufdistanz des offiziellen Behördentests — die Punktetabellen gelten für zwei Meilen, nicht für 1,5.'),
      addedOptional('hand_release_push_up', 'Liegestütz mit Handlösen, wie ihn der offizielle Behördentest wertet: ohne Prellschwung und damit zwischen zwei Terminen vergleichbar.'),
      addedOptional('sprint_drag_carry', 'Sprint, Ziehen, Tragen in einem Durchgang — die Disziplin des Behördentests, die dem Einsatz am nächsten kommt.'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'strength_endurance',
    axisIds: ['endurance', 'strength_endurance', 'relative_strength', 'load_carriage', 'grip'],
  },
  {
    id: 'ems',
    categoryId: 'tactical',
    name: { de: 'Rettungsdienst', en: 'Emergency medical services' },
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
