import { getTest } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { referencesForTest } from '@/domain/testModel'
import { ageFromBirthDate } from '@/lib/format'
import type { StoredResult } from '@/lib/store/localStore'
import type { Sex } from '@/types/domain'

/**
 * Das automatische Diagnostikprofil (Konzept §4).
 *
 * Nach dem Einstieg sieht der Nutzer nicht die Datenbank, sondern die Tests,
 * die für ihn relevant sind: «8 relevante Tests gefunden — zum Start
 * empfohlen: drei». Die Reihenfolge ist keine Meinung, sondern ein
 * nachvollziehbarer Rang aus vier Fragen:
 *
 *   Trägt der Test das Profil dieser Sportart? (Kerntest)
 *   Gibt es für diese Person eine Referenz? (Geschlecht, Alter, Sportart)
 *   Lässt er sich ohne Labor durchführen?
 *   Wurde er schon gemessen? (dann hat ein anderer beim Start Vorrang)
 *
 * Universelle Tests (§26) kommen immer dazu: Griffkraft, aerobe Kapazität,
 * Sprung, Antritt — die vier Grössen, die sich über alle Sportarten und
 * gegen die Allgemeinbevölkerung vergleichen lassen.
 */

export const UNIVERSAL_TEST_SLUGS = [
  'grip_strength',
  'cooper_12min',
  'countermovement_jump',
  'sprint_10m',
] as const

export const START_RECOMMENDATION_COUNT = 3

export interface RankedTest {
  slug: string
  role: 'core' | 'optional' | 'universal'
  /** Nachvollziehbare Gründe für den Rang — die Oberfläche nennt sie. */
  reasons: ('core' | 'reference' | 'field' | 'not_measured' | 'universal')[]
  score: number
  measured: boolean
}

export interface DiagnosticProfile {
  disciplineId: string | null
  /** Alle relevanten Tests, bestgereiht zuerst. */
  ranked: RankedTest[]
  /** Die ersten drei ungemessenen — «zum Start empfohlen». */
  recommendedStart: RankedTest[]
  /** Der Rest. */
  further: RankedTest[]
}

export interface DiagnosticProfileInput {
  disciplineId: string | null
  sex: Sex | null
  birthDate: string | null
  results: StoredResult[]
}

function hasReferenceFor(slug: string, sex: Sex | null, age: number | null, disciplineId: string | null) {
  const test = getTest(slug)
  if (!test) return false
  return referencesForTest(test).some(
    (entry) =>
      (entry.sex === 'all' || entry.sex === sex) &&
      (age == null || (age >= entry.ageMin && age <= entry.ageMax)) &&
      (!entry.disciplineIds || (disciplineId != null && entry.disciplineIds.includes(disciplineId))),
  )
}

export function buildDiagnosticProfile(input: DiagnosticProfileInput): DiagnosticProfile {
  const discipline = input.disciplineId ? disciplineById(input.disciplineId) : undefined
  const age = ageFromBirthDate(input.birthDate)
  const measured = new Set(input.results.filter((r) => r.score != null).map((r) => r.testSlug))

  const candidates = new Map<string, RankedTest['role']>()
  for (const entry of discipline?.tests ?? []) candidates.set(entry.slug, entry.role)
  for (const slug of UNIVERSAL_TEST_SLUGS) if (!candidates.has(slug)) candidates.set(slug, 'universal')

  const ranked: RankedTest[] = []
  for (const [slug, role] of candidates) {
    const test = getTest(slug)
    if (!test) continue
    const reasons: RankedTest['reasons'] = []
    let score = 0
    if (role === 'core') {
      score += 3
      reasons.push('core')
    }
    if (role === 'universal') {
      score += 1
      reasons.push('universal')
    }
    if (hasReferenceFor(slug, input.sex, age, input.disciplineId)) {
      score += 2
      reasons.push('reference')
    }
    if (test.setting !== 'lab') {
      score += 1
      reasons.push('field')
    } else {
      score -= 2
    }
    const isMeasured = measured.has(slug)
    if (!isMeasured) reasons.push('not_measured')
    ranked.push({ slug, role, reasons, score, measured: isMeasured })
  }

  ranked.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))

  const unmeasured = ranked.filter((t) => !t.measured)
  const recommendedStart = (unmeasured.length > 0 ? unmeasured : ranked).slice(
    0,
    START_RECOMMENDATION_COUNT,
  )
  const startSlugs = new Set(recommendedStart.map((t) => t.slug))
  return {
    disciplineId: input.disciplineId,
    ranked,
    recommendedStart,
    further: ranked.filter((t) => !startSlugs.has(t.slug)),
  }
}
