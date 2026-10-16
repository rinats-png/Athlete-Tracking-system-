import type { DisciplineTest } from './sportProfiles'

/**
 * Zuordnungen aus der Mastertabelle v2 des Auftraggebers (160 Tests).
 *
 * WAS HIER STEHT: Tests, die die Mastertabelle v2 einer Disziplin zuordnet,
 * die sie dort noch nicht hatten — die fünfzehn Tests, die bis dahin keiner
 * Disziplin angehörten, und die neuen Feldtests.
 *
 * WARUM ALLES ALS ZUSATZTEST: Die Tabelle nennt einige davon als Kerntest.
 * Ein neuer Kerntest verändert für jeden Athleten dieser Disziplin, was ein
 * vollständiges Profil ist, und verlängert die Testbatterie des Testtags —
 * ein bestehendes Profil würde über Nacht unvollständig, ohne dass sich am
 * Athleten etwas geändert hat. Die Rolle aus der Tabelle steht deshalb im
 * `documentLabel`; das Hochstufen zum Kerntest ist eine eigene Entscheidung
 * je Disziplin.
 *
 * Eigene Datei, weil die Herkunft eine andere ist als die der ursprünglichen
 * Disziplinen — wer fragt, woher eine Zuordnung stammt, liest es hier ab.
 * Nur Typen werden importiert, sonst liefe der Import im Kreis
 * (siehe `sportProfilesAdditions.ts`).
 */

const v2 = (slug: string, tableRole: 'Kern' | 'Zusatz'): DisciplineTest => ({
  slug,
  role: 'optional',
  provenance: 'master_table',
  documentLabel: `Mastertabelle v2 (${tableRole})`,
})

/** Disziplin → Zuordnungen. Schlüssel sind Disziplin-Kennungen. */
const RAW: Record<string, [string, 'Kern' | 'Zusatz'][]> = {}

function add(slug: string, core: string[], optional: string[]): void {
  for (const id of core) (RAW[id] ??= []).push([slug, 'Kern'])
  for (const id of optional) (RAW[id] ??= []).push([slug, 'Zusatz'])
}

// --- Tests, die bis zur Mastertabelle v2 keiner Disziplin angehörten ------
add('row_500m', ['rowing'], ['functional_fitness', 'hyrox', 'mma', 'wrestling'])
add('hyrox_half_sim', ['hyrox'], ['functional_fitness', 'ocr'])
add('gpp_circuit', ['general_fitness'], ['functional_fitness', 'firefighter', 'police', 'ems'])
add('hr_recovery_60s', [], ['boxing', 'judo', 'mma', 'muay_thai', 'football', 'basketball', 'special_forces'])
add('clean_1rm', [], ['functional_fitness', 'rugby', 'sprint_athletics', 'long_jump', 'wrestling'])
add('snatch_1rm', [], ['functional_fitness'])
add('weighted_pull_up_1rm', ['special_forces'], ['judo', 'bjj', 'wrestling', 'mma', 'military', 'firefighter', 'ocr'])
add('strength_5rm', [], ['powerlifting', 'rugby', 'military', 'police'])
add('strength_3rm', [], ['powerlifting', 'rugby'])
add('strength_10rm', [], ['general_fitness', 'functional_fitness', 'powerlifting'])
add('opener_simulation', [], ['powerlifting'])
add('bear_complex', [], ['functional_fitness', 'special_forces', 'military', 'mma'])
add('row_30s_power', [], ['rowing', 'functional_fitness', 'hyrox'])
add('illinois_agility', ['football', 'rugby'], ['basketball', 'handball', 'police', 'ju_jutsu', 'kickboxing'])
add('murph', [], ['functional_fitness', 'special_forces', 'military', 'ocr'])

// --- Neue Feldtests (testCatalogFieldV2.ts) --------------------------------
// «Hockey» und «Kugelstossen/Kraft» stehen in der Tabelle, sind aber keine
// Disziplinen der App; diese Nennungen entfallen. `run_6min_mas` heisst hier
// `run_5min_mas` (Begründung in testCatalogFieldV2.ts). BOLT, Knee-to-Wall
// und Y-Balance stehen nicht als Tests im Katalog und deshalb nicht hier.
add('critical_speed_run', ['run_1500m', 'run_5k_discipline', 'run_10k_discipline', 'hyrox'], ['run_800m', 'half_marathon', 'marathon', 'triathlon_sprint', 'triathlon_olympic', 'special_forces'])
add('run_3min_all_out', ['run_800m'], ['run_1500m', 'run_5k_discipline', 'hyrox', 'functional_fitness', 'football', 'rugby', 'mma', 'boxing'])
add('run_5min_mas', ['run_1500m', 'football'], ['run_800m', 'run_5k_discipline', 'run_10k_discipline', 'hyrox', 'rugby', 'handball', 'military', 'police'])
add('bronco_shuttle_1200m', ['rugby'], ['football', 'basketball', 'handball', 'functional_fitness', 'hyrox', 'mma', 'wrestling', 'military', 'special_forces'])
add('ift_30_15', ['football', 'handball', 'basketball'], ['rugby', 'cricket', 'volleyball', 'boxing', 'mma', 'judo', 'karate', 'taekwondo', 'special_forces'])
add('vt1_talk_test', ['ultramarathon', 'triathlon_ironman'], ['run_10k_discipline', 'half_marathon', 'marathon', 'trail_running', 'triathlon_70_3', 'gravel', 'road_race', 'hyrox'])
add('ruffier_dickson_test', [], ['general_fitness', 'police', 'firefighter', 'ems', 'boxing', 'judo'])
add('margaria_kalamen_stair', ['firefighter', 'ems'], ['boxing', 'kickboxing', 'muay_thai', 'mma', 'wrestling', 'judo', 'rugby', 'football', 'sprint_athletics', 'police'])
add('flying_sprint_20m', ['sprint_athletics', 'run_800m'], ['long_jump', 'run_1500m', 'football', 'rugby', 'cricket', 'basketball', 'handball'])
add('drop_jump_rsi', ['sprint_athletics', 'long_jump', 'volleyball'], ['run_800m', 'run_1500m', 'run_5k_discipline', 'run_10k_discipline', 'marathon', 'trail_running', 'basketball', 'football', 'handball', 'karate', 'taekwondo', 'fencing', 'boxing'])
add('five_bound_test', ['long_jump'], ['sprint_athletics', 'run_800m', 'run_1500m', 'trail_running', 'football', 'rugby', 'basketball', 'handball', 'karate', 'taekwondo', 'fencing'])
add('bosco_jump_60s', [], ['judo', 'wrestling', 'mma', 'kickboxing', 'muay_thai', 'taekwondo', 'karate', 'volleyball', 'basketball', 'sprint_athletics', 'mtb', 'functional_fitness'])
add('seated_med_ball_throw', ['boxing', 'handball'], ['kickboxing', 'muay_thai', 'mma', 'wrestling', 'judo', 'karate', 'basketball', 'rugby', 'cricket', 'volleyball', 'general_fitness', 'military', 'police'])
add('plyo_push_up_10s', ['boxing', 'kickboxing', 'karate'], ['muay_thai', 'mma', 'judo', 'wrestling', 'ju_jutsu', 'pencak_silat', 'handball', 'rugby', 'general_fitness', 'special_forces'])
add('wall_sit_hold', ['trail_running'], ['ultramarathon', 'marathon', 'half_marathon', 'run_10k_discipline', 'mtb', 'gravel', 'road_race', 'rowing', 'hyrox', 'general_fitness', 'fencing', 'wrestling'])
add('pistol_squat_test', ['general_fitness'], ['functional_fitness', 'trail_running', 'ocr', 'karate', 'taekwondo', 'kickboxing', 'muay_thai', 'fencing', 'pencak_silat', 'football', 'basketball', 'volleyball', 'special_forces'])
add('dips_max_reps', [], ['functional_fitness', 'general_fitness', 'ocr', 'boxing', 'mma', 'wrestling', 'judo', 'bjj', 'powerlifting', 'military', 'special_forces', 'firefighter'])
add('inverted_row_max_reps', ['rowing'], ['general_fitness', 'freestyle', 'backstroke', 'judo', 'bjj', 'wrestling', 'police', 'ems'])
add('copenhagen_adductor_hold', ['football'], ['rugby', 'handball', 'basketball', 'cricket', 'sprint_athletics', 'taekwondo', 'karate', 'kickboxing', 'muay_thai', 'mma', 'bjj'])
add('single_leg_hamstring_bridge', ['football', 'sprint_athletics'], ['rugby', 'basketball', 'handball', 'cricket', 'long_jump', 'run_800m', 'run_1500m', 'run_5k_discipline', 'trail_running', 'mma', 'bjj', 'wrestling'])
add('sandbag_lunges_100m', ['hyrox'], ['functional_fitness', 'ocr', 'military', 'special_forces', 'firefighter'])
add('burpee_test_3min', ['general_fitness', 'mma', 'kickboxing'], ['boxing', 'muay_thai', 'judo', 'wrestling', 'bjj', 'ju_jutsu', 'karate', 'taekwondo', 'functional_fitness', 'hyrox', 'ocr', 'military', 'police', 'firefighter', 'special_forces', 'rugby'])
add('sprawl_test_60s', ['mma', 'wrestling'], ['bjj', 'judo', 'ju_jutsu', 'boxing', 'kickboxing', 'muay_thai', 'police', 'special_forces'])
add('casualty_drag_20m', ['firefighter', 'ems'], ['police', 'military', 'special_forces'])
add('shuttle_4x10m', ['firefighter', 'ems', 'police'], ['military', 'special_forces', 'general_fitness', 'basketball', 'handball', 'football', 'volleyball', 'boxing', 'ju_jutsu'])

/**
 * Die Zusatztests einer Disziplin aus der Mastertabelle v2, ohne die, die
 * sie schon führt — eine Zuordnung zweimal hiesse, derselbe Test zählte
 * doppelt.
 */
export function masterV2Tests(disciplineId: string, existing: DisciplineTest[]): DisciplineTest[] {
  const have = new Set(existing.map((t) => t.slug))
  const out: DisciplineTest[] = []
  for (const [slug, role] of RAW[disciplineId] ?? []) {
    if (have.has(slug)) continue
    have.add(slug)
    out.push(v2(slug, role))
  }
  return out
}

/** Alle Disziplin-Kennungen, die hier vorkommen — für die Prüfung. */
export const MASTER_V2_DISCIPLINE_IDS = Object.keys(RAW)
