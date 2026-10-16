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
