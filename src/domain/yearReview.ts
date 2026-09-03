import { getTest } from '@/data/testCatalog'
import { typicalErrorPercent, DETECTION_FACTOR } from '@/domain/change'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Was in einem Jahr passiert ist.
 *
 * Der Rückblick ist die eine Ansicht, die jemand freiwillig öffnet und
 * weitergibt — und genau deshalb muss er beim Zählen streng sein. Ein
 * «grösster Fortschritt», der aus einer Tagesschwankung stammt, wäre die
 * peinlichste Stelle der App: sie steht dann als Bild in einem Gruppenchat.
 *
 * Deshalb gilt hier dasselbe Mass wie am einzelnen Ergebnis: eine
 * Verbesserung zählt nur, wenn sie grösser ist als die eigene Streuung mal
 * {@link DETECTION_FACTOR}. Was darunter liegt, erscheint als «stabil», nicht
 * als Fortschritt.
 *
 * Ein persönlicher Bestwert dagegen ist ein Fakt und braucht kein Mass: die
 * Zahl war so gemessen. Er wird gezählt, aber nicht als Entwicklung
 * ausgegeben.
 */

export interface YearTestChange {
  testSlug: string
  first: number
  last: number
  changePercent: number
  /** Grösser als die eigene Streuung? Null, wenn die Streuung unbekannt ist. */
  proven: boolean | null
}

export interface YearReview {
  year: number
  results: number
  testsUsed: number
  assessments: number
  /** Messungen, die im Jahr einen persönlichen Bestwert gesetzt haben. */
  personalBests: number
  /** Grösste belegte Verbesserung des Jahres. */
  biggestGain: YearTestChange | null
  /** Grösster belegter Rückgang — er gehört genauso dazu. */
  biggestDrop: YearTestChange | null
  /** Alle Tests mit zwei Messungen im Jahr, stärkste Veränderung zuerst. */
  changes: YearTestChange[]
  /** Monate mit mindestens einer Messung, 0–12. */
  activeMonths: number
}

export function yearReview(
  results: StoredResult[],
  assessments: { performedOn: string; status: string }[],
  year: number,
): YearReview {
  const inYear = results.filter(
    (r) => r.score != null && new Date(r.performedAt).getUTCFullYear() === year,
  )

  const bySlug = new Map<string, StoredResult[]>()
  for (const result of inYear) {
    const list = bySlug.get(result.testSlug) ?? []
    list.push(result)
    bySlug.set(result.testSlug, list)
  }

  const changes: YearTestChange[] = []
  for (const [testSlug, list] of bySlug) {
    const test = getTest(testSlug)
    if (!test || list.length < 2) continue
    const sorted = [...list].sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    const first = sorted[0].score as number
    const last = sorted[sorted.length - 1].score as number
    if (first === 0) continue
    const raw = ((last - first) / Math.abs(first)) * 100
    const changePercent =
      Math.round((test.direction === 'lower_is_better' ? -raw : raw) * 10) / 10

    // Das Mass kommt aus der GESAMTEN Historie, nicht nur aus dem Jahr: die
    // Streuung eines Tests ist eine Eigenschaft des Tests und des Athleten,
    // keine des Kalenders.
    const error = typicalErrorPercent(results, testSlug)
    changes.push({
      testSlug,
      first,
      last,
      changePercent,
      proven: error == null ? null : Math.abs(changePercent) > error * DETECTION_FACTOR,
    })
  }
  changes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))

  const proven = changes.filter((c) => c.proven === true)
  const biggestGain = proven.filter((c) => c.changePercent > 0)[0] ?? null
  // `proven` ist nach dem Betrag der Änderung sortiert — der erste Rückgang
  // ist damit der grösste, nicht der kleinste.
  const biggestDrop = proven.find((c) => c.changePercent < 0) ?? null

  return {
    year,
    results: inYear.length,
    testsUsed: bySlug.size,
    assessments: assessments.filter(
      (a) => a.status === 'completed' && a.performedOn.startsWith(String(year)),
    ).length,
    personalBests: countPersonalBests(results, year),
    biggestGain,
    biggestDrop,
    changes,
    activeMonths: new Set(inYear.map((r) => new Date(r.performedAt).getUTCMonth())).size,
  }
}

/**
 * Messungen des Jahres, die besser waren als alles davor.
 *
 * Verglichen wird gegen die gesamte Historie vor der Messung, nicht nur gegen
 * das Jahr — sonst wäre die erste Messung jedes Januars ein «Bestwert».
 */
function countPersonalBests(results: StoredResult[], year: number): number {
  const bySlug = new Map<string, StoredResult[]>()
  for (const result of results) {
    if (result.score == null) continue
    const list = bySlug.get(result.testSlug) ?? []
    list.push(result)
    bySlug.set(result.testSlug, list)
  }

  let count = 0
  for (const [testSlug, list] of bySlug) {
    const test = getTest(testSlug)
    if (!test) continue
    const sorted = [...list].sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    let best: number | null = null
    for (const result of sorted) {
      const score = result.score as number
      const isBest =
        best == null
          ? false // Die allererste Messung ist ein Anfang, kein Rekord.
          : test.direction === 'lower_is_better'
            ? score < best
            : score > best
      if (isBest && new Date(result.performedAt).getUTCFullYear() === year) count++
      best =
        best == null
          ? score
          : test.direction === 'lower_is_better'
            ? Math.min(best, score)
            : Math.max(best, score)
    }
  }
  return count
}
