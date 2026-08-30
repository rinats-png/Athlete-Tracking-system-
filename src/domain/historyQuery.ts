import { getTest, TEST_CATALOG } from '@/data/testCatalog'
import type { AppLocale, PerformanceDimension, TestCategory } from '@/types/domain'
import type { AthleteData, StoredResult } from '@/lib/store/localStore'

/**
 * Filtern, Suchen und Sortieren der Historie (§66, §67, §68).
 *
 * Absichtlich eine reine Funktion ohne Zustand: derselbe Filter wird von der
 * Historie und vom Bericht gebraucht, und zwei Implementierungen derselben
 * Auswahl liefern früher oder später zwei verschiedene Listen.
 */

export type HistorySort = 'newest' | 'oldest' | 'best' | 'worst'

export interface HistoryQuery {
  /** Freitext über Testname, Kurzname und Kategorie. */
  search: string
  category: TestCategory | 'all'
  dimension: PerformanceDimension | 'all'
  assessmentId: string | 'all'
  /** ISO-Tage. Leer heisst unbegrenzt. */
  from: string
  to: string
  sort: HistorySort
}

export const EMPTY_QUERY: HistoryQuery = {
  search: '',
  category: 'all',
  dimension: 'all',
  assessmentId: 'all',
  from: '',
  to: '',
  sort: 'newest',
}

/** Ab wie vielen Tests die Suche überhaupt angeboten wird (§67). */
export const SEARCH_THRESHOLD = 12

export function searchWorthwhile(): boolean {
  // Der Auftrag verlangt Suche, «wenn der Datenumfang es rechtfertigt».
  // Bei 32 Tests im Katalog ist das der Fall — bei einer Handvoll wäre ein
  // Suchfeld nur ein zusätzliches Bedienelement.
  return TEST_CATALOG.length >= SEARCH_THRESHOLD
}

/**
 * «Bester» und «schlechtester» hängen an der Richtung des Tests.
 *
 * Über verschiedene Tests hinweg lassen sich Rohwerte nicht vergleichen —
 * 165 kg und 2400 m sind keine Skala. Sortiert wird deshalb nach dem
 * Abstand zur eigenen Bestleistung dieses Tests, in Prozent. Damit steht
 * oben, was für den Athleten am nächsten an seinem Maximum liegt.
 */
function relativeToBest(result: StoredResult, all: StoredResult[]): number {
  const test = getTest(result.testSlug)
  if (!test || result.score == null) return 0

  const scores = all
    .filter((r) => r.testSlug === result.testSlug && r.score != null)
    .map((r) => r.score as number)
  if (scores.length === 0) return 0

  const best = test.direction === 'higher_is_better' ? Math.max(...scores) : Math.min(...scores)
  if (best === 0) return 0

  return test.direction === 'higher_is_better' ? result.score / best : best / result.score
}

export function queryHistory(
  data: AthleteData,
  query: HistoryQuery,
  locale: AppLocale,
): StoredResult[] {
  const needle = query.search.trim().toLowerCase()

  const filtered = data.results.filter((result) => {
    const test = getTest(result.testSlug)
    if (!test) return false

    if (query.category !== 'all' && test.category !== query.category) return false
    if (query.dimension !== 'all' && !(query.dimension in test.dimensionMetrics)) return false
    if (query.assessmentId !== 'all' && result.assessmentId !== query.assessmentId) return false

    const day = result.performedAt.slice(0, 10)
    if (query.from && day < query.from) return false
    if (query.to && day > query.to) return false

    if (needle) {
      const haystack = [
        test.name[locale],
        test.shortName[locale],
        test.name.de,
        test.name.en,
        result.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(needle)) return false
    }

    return true
  })

  const sorted = [...filtered]
  switch (query.sort) {
    case 'oldest':
      sorted.sort((a, b) => a.performedAt.localeCompare(b.performedAt))
      break
    case 'best':
      sorted.sort((a, b) => relativeToBest(b, data.results) - relativeToBest(a, data.results))
      break
    case 'worst':
      sorted.sort((a, b) => relativeToBest(a, data.results) - relativeToBest(b, data.results))
      break
    default:
      sorted.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  }
  return sorted
}

/**
 * Bestleistungen je Test (§69).
 *
 * Nur Tests mit mindestens einer auswertbaren Messung. Das Datum steht
 * dabei, weil eine Bestleistung von vor zwei Jahren etwas anderes aussagt
 * als eine von letzter Woche.
 */
export interface PersonalBest {
  testSlug: string
  result: StoredResult
  /** Wie viele Messungen dieses Tests gibt es insgesamt? */
  attempts: number
}

export function personalBests(results: StoredResult[]): PersonalBest[] {
  const bySlug = new Map<string, StoredResult[]>()
  for (const result of results) {
    if (result.score == null) continue
    const list = bySlug.get(result.testSlug) ?? []
    list.push(result)
    bySlug.set(result.testSlug, list)
  }

  const out: PersonalBest[] = []
  for (const [testSlug, list] of bySlug) {
    const test = getTest(testSlug)
    if (!test) continue
    const best = list.reduce((acc, r) =>
      test.direction === 'higher_is_better'
        ? (r.score as number) > (acc.score as number)
          ? r
          : acc
        : (r.score as number) < (acc.score as number)
          ? r
          : acc,
    )
    out.push({ testSlug, result: best, attempts: list.length })
  }

  return out.sort((a, b) => {
    const ta = getTest(a.testSlug)
    const tb = getTest(b.testSlug)
    return (ta?.sortOrder ?? 0) - (tb?.sortOrder ?? 0)
  })
}
