import { getTest } from '@/data/testCatalog'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Die Performance Journey: der Verlauf als Folge von EREIGNISSEN.
 *
 * Der Unterschied zu einer Liste von Messungen ist die Auswahl. Eine Liste
 * zeigt alles gleich gewichtet; eine Journey zeigt, was passiert ist —
 * der Anfang, ein neuer Bestwert, eine abgeschlossene Diagnostik, heute.
 *
 * WAS HIER NICHT PASSIERT: es wird nichts erzählt, was die Daten nicht
 * hergeben. Kein «du warst fleissig», kein «starker Monat». Jeder Knoten
 * entspricht einem konkreten Ereignis mit Datum, und wo nichts war, steht
 * auch nichts.
 */

export type JourneyKind = 'start' | 'personal_best' | 'assessment' | 'now'

export interface JourneyNode {
  kind: JourneyKind
  /** ISO-Tag des Ereignisses. */
  on: string
  /** Test, auf den sich der Knoten bezieht — bei `start`/`now` leer. */
  testSlug: string | null
  /** Messwert am Knoten, soweit einer dazugehört. */
  value: number | null
}

/** Höchstens so viele Knoten: eine Achse mit dreissig Punkten ist eine Liste. */
export const MAX_NODES = 6

export function journey(
  results: StoredResult[],
  assessments: { performedOn: string; status: string }[],
  now = new Date(),
): JourneyNode[] {
  const scored = results
    .filter((r) => r.score != null)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  if (scored.length === 0) return []

  const nodes: JourneyNode[] = [
    {
      kind: 'start',
      on: scored[0].performedAt.slice(0, 10),
      testSlug: scored[0].testSlug,
      value: scored[0].score,
    },
  ]

  // Bestwerte: die erste Messung eines Tests ist ein Anfang, kein Rekord.
  const best = new Map<string, number>()
  for (const result of scored) {
    const test = getTest(result.testSlug)
    const score = result.score as number
    const previous = best.get(result.testSlug)
    if (test && previous != null) {
      const better =
        test.direction === 'lower_is_better' ? score < previous : score > previous
      if (better) {
        nodes.push({
          kind: 'personal_best',
          on: result.performedAt.slice(0, 10),
          testSlug: result.testSlug,
          value: score,
        })
      }
    }
    best.set(
      result.testSlug,
      previous == null
        ? score
        : getTest(result.testSlug)?.direction === 'lower_is_better'
          ? Math.min(previous, score)
          : Math.max(previous, score),
    )
  }

  for (const assessment of assessments) {
    if (assessment.status !== 'completed') continue
    nodes.push({ kind: 'assessment', on: assessment.performedOn, testSlug: null, value: null })
  }

  nodes.sort((a, b) => a.on.localeCompare(b.on))

  /*
   * Ausdünnen, wenn es zu viele werden: der Anfang bleibt immer stehen, und
   * vom Rest die JÜNGSTEN. Wer zwanzig Bestwerte hat, will die letzten
   * sehen — die von vor drei Jahren stehen im Verlauf.
   */
  const trimmed =
    nodes.length > MAX_NODES - 1
      ? [nodes[0], ...nodes.slice(-(MAX_NODES - 2))]
      : nodes

  trimmed.push({ kind: 'now', on: now.toISOString().slice(0, 10), testSlug: null, value: null })
  return trimmed
}
