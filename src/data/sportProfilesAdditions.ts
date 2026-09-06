import type { Discipline, DisciplineTest, SportCategory } from './sportProfiles'

/**
 * Herkunft «Mastertabelle», hier lokal definiert.
 *
 * Nicht aus `sportProfiles.ts` importiert, obwohl die Funktionen dort
 * hineinpassten: diese Datei wird von dort importiert, und ein Import in
 * beide Richtungen liefe beim Laden ins Leere — `tableCore` wäre in dem
 * Moment noch undefiniert, in dem die Disziplinen gebaut werden.
 */
const tableCore = (slug: string, documentLabel: string): DisciplineTest => ({
  slug,
  role: 'core',
  provenance: 'master_table',
  documentLabel,
})
const tableOptional = (slug: string, documentLabel: string): DisciplineTest => ({
  slug,
  role: 'optional',
  provenance: 'master_table',
  documentLabel,
})

/**
 * Disziplinen aus der Mastertabelle des Auftraggebers.
 *
 * WARUM SIE HIER UND NICHT IN `sportProfiles.ts` STEHEN: sie kommen aus einer
 * anderen Quelle als die ursprünglichen vierzig. Das Zielgruppendokument und
 * die Mastertabelle sind zwei Belege mit verschiedener Reichweite, und wer
 * später fragt, woher eine Disziplin stammt, soll es an der Datei ablesen
 * können statt an einem Kommentar.
 *
 * WAS SICH MIT IHNEN ÄNDERT: die App führte bis hierher ausschliesslich
 * Einzel-, Kampf-, Ausdauer- und Einsatzsport. Mannschaftssport bringt eine
 * Grösse mit, die es vorher nicht gab — die POSITION. Ein Innenverteidiger
 * und ein Flügelspieler sind nicht dasselbe, und ein Profil, das sie
 * gleichsetzt, ordnet beide falsch ein. Das Feld dafür steht am Athleten.
 *
 * FUSSBALL FEHLT ABSICHTLICH. Er steht in `BLOCKED_DISCIPLINES` und bleibt
 * dort, bis der Auftraggeber ausdrücklich etwas anderes sagt. Die
 * Mastertabelle nennt ihn, das genügt nicht: die Sperre ist eine
 * Grundsatzentscheidung und wird nicht durch eine Datenlieferung aufgehoben.
 *
 * Die AXEN je Disziplin enthalten nur, was ihre Kerntests auch erreichen
 * können — sonst stünde im Profil dauerhaft eine Lücke, die keine ist.
 */

export const ADDITIONAL_CATEGORIES: SportCategory[] = [
  { id: 'team', name: { de: 'Mannschaftssport', en: 'Team sports' }, buildPriority: 8 },
  { id: 'athletics', name: { de: 'Leichtathletik', en: 'Athletics' }, buildPriority: 9 },
  { id: 'rowing', name: { de: 'Rudern', en: 'Rowing' }, buildPriority: 10 },
  { id: 'strength', name: { de: 'Kraftsport', en: 'Strength sports' }, buildPriority: 11 },
]

export const TEAM_SPORTS: Discipline[] = [
  {
    id: 'basketball',
    categoryId: 'team',
    name: { de: 'Basketball', en: 'Basketball' },
    dimensionWeights: { power: 1, agility: 0.9, endurance: 0.7, max_strength: 0.5 },
    tests: [
      tableCore('countermovement_jump', 'Countermovement/Vertical Jump'),
      tableCore('vertical_jump_reach', 'Vertical Jump (Reichhöhe)'),
      tableCore('sprint_20m', '20-m Sprint'),
      tableCore('shuttle_5_10_5', 'Change-of-direction'),
      tableCore('beep_test_20m', 'Intermittierende Ausdauer'),
      tableOptional('back_squat_1rm', 'Lower-body strength'),
      tableOptional('standing_broad_jump', 'Horizontale Sprungkraft'),
    ],
    eventDurationSeconds: [2400, 2880],
    typicalLimiter: 'power',
    axisIds: ['power', 'agility', 'endurance', 'max_strength'],
  },
  {
    id: 'handball',
    categoryId: 'team',
    name: { de: 'Handball', en: 'Handball' },
    dimensionWeights: { power: 1, agility: 0.9, max_strength: 0.7, endurance: 0.7 },
    tests: [
      tableCore('sprint_20m', 'Speed'),
      tableCore('t_test_agility', 'Agility Test'),
      tableCore('countermovement_jump', 'Sprungkraft'),
      tableCore('beep_test_20m', 'Intermittierende Ausdauer'),
      tableOptional('bench_press_1rm', 'Oberkörperkraft'),
      tableOptional('grip_strength', 'Griffkraft für Wurf und Zweikampf'),
    ],
    eventDurationSeconds: [3600, 3600],
    typicalLimiter: 'power',
    axisIds: ['power', 'agility', 'max_strength', 'endurance'],
  },
  {
    id: 'volleyball',
    categoryId: 'team',
    name: { de: 'Volleyball', en: 'Volleyball' },
    dimensionWeights: { power: 1, agility: 0.8, max_strength: 0.6, endurance: 0.5 },
    tests: [
      tableCore('vertical_jump_reach', 'Vertical Jump'),
      tableCore('countermovement_jump', 'Sprungkraft mit Ausholbewegung'),
      tableCore('squat_jump', 'Sprungkraft ohne Ausholbewegung'),
      tableCore('shuttle_5_10_5', 'Richtungswechsel am Netz'),
      // Die Mastertabelle nennt den Wingate für Volleyball. Er bleibt
      // trotzdem OPTIONAL: er braucht ein Laborergometer, und ein Kerntest,
      // den nur ein Institut durchführen kann, machte das Profil für jeden
      // Verein dauerhaft unvollständig.
      tableOptional('wingate_30s', 'Wingate anaerobic power'),
      tableOptional('back_squat_1rm', 'Beinkraft'),
    ],
    eventDurationSeconds: [4500, 7200],
    typicalLimiter: 'power',
    axisIds: ['power', 'agility', 'max_strength', 'endurance'],
  },
  {
    id: 'rugby',
    categoryId: 'team',
    name: { de: 'Rugby', en: 'Rugby' },
    aliases: ['Rugby Union', 'Rugby League'],
    dimensionWeights: { max_strength: 1, power: 0.9, endurance: 0.8, agility: 0.6 },
    tests: [
      tableCore('sprint_30m', 'Sprint speed'),
      tableCore('back_squat_1rm', 'Lower-body strength'),
      tableCore('countermovement_jump', 'Sprungkraft'),
      tableCore('cooper_12min', 'Aerobe Grundlage'),
      tableOptional('sprint_10m', 'Antritt aus dem Stand'),
      tableOptional('deadlift_1rm', 'Ganzkörperkraft'),
      tableOptional('sprint_drag_carry', 'Tragen und Ziehen im Kontakt'),
    ],
    eventDurationSeconds: [4800, 4800],
    typicalLimiter: 'max_strength',
    axisIds: ['max_strength', 'power', 'endurance', 'agility', 'relative_strength'],
  },
  {
    id: 'cricket',
    categoryId: 'team',
    name: { de: 'Cricket', en: 'Cricket' },
    dimensionWeights: { power: 0.9, agility: 0.8, endurance: 0.6, max_strength: 0.4 },
    tests: [
      tableCore('sprint_40yd', '40-yard sprint'),
      tableCore('sprint_20m', 'Antritt zwischen den Wickets'),
      tableCore('countermovement_jump', 'Sprungkraft'),
      tableCore('shuttle_5_10_5', 'Richtungswechsel im Feld'),
      tableOptional('beep_test_20m', 'Ausdauer über lange Spielzeit'),
    ],
    eventDurationSeconds: [10800, 28800],
    typicalLimiter: 'power',
    axisIds: ['power', 'agility', 'endurance'],
  },
]

export const ATHLETICS: Discipline[] = [
  {
    id: 'long_jump',
    categoryId: 'athletics',
    name: { de: 'Weitsprung', en: 'Long jump' },
    dimensionWeights: { power: 1, max_strength: 0.7, relative_strength: 0.7 },
    tests: [
      tableCore('standing_broad_jump', 'Jump performance'),
      tableCore('countermovement_jump', 'Sprungdiagnostik'),
      tableCore('sprint_30m', 'Anlaufgeschwindigkeit'),
      tableCore('squat_jump', 'Sprungkraft ohne Ausholbewegung'),
      tableOptional('sprint_10m', 'Antritt'),
      tableOptional('back_squat_1rm', 'Kraftgrundlage'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'power',
    axisIds: ['power', 'max_strength', 'relative_strength'],
  },
  {
    id: 'sprint_athletics',
    categoryId: 'athletics',
    name: { de: 'Sprint / Schnellkraft', en: 'Sprint / power' },
    aliases: ['Kurzsprint', 'Power'],
    dimensionWeights: { power: 1, max_strength: 0.8, relative_strength: 0.7 },
    tests: [
      tableCore('sprint_10m', '10-m Sprint'),
      tableCore('sprint_20m', '20-m Sprint'),
      tableCore('sprint_30m', '30-m Sprint'),
      tableCore('countermovement_jump', 'CMJ Ground Reaction Force'),
      tableOptional('squat_jump', 'Sprungkraft ohne Ausholbewegung'),
      tableOptional('back_squat_1rm', 'Kraftgrundlage'),
      tableOptional('wingate_30s', 'Anaerobe Leistung'),
    ],
    eventDurationSeconds: [10, 45],
    typicalLimiter: 'power',
    axisIds: ['power', 'max_strength', 'relative_strength'],
  },
]

export const ROWING: Discipline[] = [
  {
    id: 'rowing',
    categoryId: 'rowing',
    name: { de: 'Rudern', en: 'Rowing' },
    aliases: ['RowErg', 'Ergometer'],
    dimensionWeights: { endurance: 1, strength_endurance: 0.9, max_strength: 0.7 },
    tests: [
      tableCore('row_2000m', '2000-m Ergometer'),
      tableCore('row_1000m', '1000-m Ergometer'),
      tableCore('back_squat_1rm', 'Beinkraft'),
      tableOptional('ski_erg_1000m', 'Oberkörperausdauer'),
      tableOptional('deadlift_1rm', 'Ganzkörperkraft'),
      tableOptional('cooper_12min', 'Aerobe Grundlage ausserhalb des Boots'),
    ],
    eventDurationSeconds: [340, 480],
    typicalLimiter: 'endurance',
    axisIds: ['endurance', 'strength_endurance', 'max_strength'],
  },
]

export const STRENGTH_SPORTS: Discipline[] = [
  {
    id: 'powerlifting',
    categoryId: 'strength',
    name: { de: 'Kraftdreikampf', en: 'Powerlifting' },
    aliases: ['Powerlifting', 'Kraftsport'],
    dimensionWeights: { max_strength: 1, relative_strength: 0.9 },
    tests: [
      tableCore('back_squat_1rm', '1RM Squat'),
      tableCore('bench_press_1rm', '1RM Bench'),
      tableCore('deadlift_1rm', '1RM Deadlift'),
      tableOptional('grip_strength', 'Griffkraft als Begrenzer beim Kreuzheben'),
      tableOptional('overhead_press_1rm', 'Oberkörperkraft über Kopf'),
    ],
    eventDurationSeconds: null,
    typicalLimiter: 'max_strength',
    axisIds: ['max_strength', 'relative_strength'],
  },
]

export const TABLE_DISCIPLINES: Discipline[] = [
  ...TEAM_SPORTS,
  ...ATHLETICS,
  ...ROWING,
  ...STRENGTH_SPORTS,
]
