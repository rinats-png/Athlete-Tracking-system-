import { getTest } from '@/data/testCatalog'
import { DETECTION_FACTOR, typicalErrorPercent } from '@/domain/change'
import type { StoredAthlete, StoredResult } from '@/lib/store/localStore'

/**
 * Der Wirksamkeitsnachweis — was sich über ein Jahr Betreuung belegen lässt.
 *
 * WOFÜR DAS IST: ein Trainer, der einem Elternteil, einem Vorstand oder
 * einem Sponsor gegenübersitzt, hat zwei Möglichkeiten. «Läuft gut.» Oder:
 * zwanzig Athleten, zwölf Monate, so viele belegte Verbesserungen, so viele
 * belegte Rückgänge, so viele Veränderungen innerhalb der Schwankung. Das
 * zweite gewinnt den Vertrag — und es ist das, was diese Datei rechnet.
 *
 * DERSELBE MASSSTAB WIE AM EINZELNEN ERGEBNIS: eine Veränderung zählt nur,
 * wenn sie grösser ist als die eigene Streuung des Athleten in diesem Test
 * mal DETECTION_FACTOR (change.ts). Ein Nachweis, der Tagesform als Erfolg
 * zählte, wäre am Tag der Nachfrage wertlos. Deshalb stehen die Rückgänge
 * genauso dabei wie die Verbesserungen, und die unbelegten daneben.
 *
 * WAS HIER NICHT PASSIERT: keine Ursachenzuschreibung. Dass sich etwas
 * verbessert hat, während jemand betreut wurde, ist eine Beobachtung — kein
 * Beweis, dass die Betreuung es war. Der Nachweis sagt, WAS sich verändert
 * hat, und lässt die Frage nach dem Warum beim Trainer.
 */

export type ProofVerdict = 'gain' | 'drop' | 'within_noise' | 'unknown_error'

export interface ProofChange {
  testSlug: string
  first: number
  last: number
  firstAt: string
  lastAt: string
  /** Richtungsbereinigt: positiv heisst besser. */
  changePercent: number
  verdict: ProofVerdict
}

export interface AthleteProof {
  athleteId: string
  name: string
  /** Messungen im Fenster. */
  results: number
  /** Tests mit mindestens zwei Messungen im Fenster. */
  testsCompared: number
  gains: number
  drops: number
  withinNoise: number
  unknown: number
  changes: ProofChange[]
  /** Grösste belegte Verbesserung, null ohne. */
  bestGain: ProofChange | null
}

export interface TestProof {
  testSlug: string
  /** Athleten mit Vergleich in diesem Test. */
  compared: number
  gains: number
  drops: number
  withinNoise: number
  unknown: number
}

export interface CoachProof {
  from: string
  to: string
  athletes: AthleteProof[]
  /** Athleten mit mindestens einer Messung im Fenster. */
  athletesMeasured: number
  /** Athleten mit mindestens einer belegten Verbesserung. */
  athletesWithGain: number
  /** Athleten mit mindestens einem belegten Rückgang. */
  athletesWithDrop: number
  totalGains: number
  totalDrops: number
  totalWithinNoise: number
  totalUnknown: number
  /** Median der belegten Verbesserungen in Prozent, null ohne. */
  medianGainPercent: number | null
  tests: TestProof[]
}

/** Standardfenster: die zurückliegenden zwölf Monate. */
export const PROOF_WINDOW_DAYS = 365

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function changesFor(results: StoredResult[], from: number, to: number): ProofChange[] {
  const inWindow = results.filter((r) => {
    if (r.score == null) return false
    const t = new Date(r.performedAt).getTime()
    return t >= from && t <= to
  })
  const bySlug = new Map<string, StoredResult[]>()
  for (const r of inWindow) bySlug.set(r.testSlug, [...(bySlug.get(r.testSlug) ?? []), r])

  const out: ProofChange[] = []
  for (const [slug, list] of bySlug) {
    const test = getTest(slug)
    if (!test || list.length < 2) continue
    const series = [...list].sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    const first = series[0].score as number
    const last = series[series.length - 1].score as number
    if (first === 0) continue
    const raw = ((last - first) / Math.abs(first)) * 100
    const changePercent = Math.round((test.direction === 'lower_is_better' ? -raw : raw) * 10) / 10
    // Die Streuung aus der GESAMTEN Historie, nicht nur dem Fenster: mehr
    // Messungen, bessere Schätzung — und derselbe Wert wie am Ergebnis.
    const typical = typicalErrorPercent(results, slug)
    let verdict: ProofVerdict
    if (typical == null) verdict = 'unknown_error'
    else if (Math.abs(changePercent) <= typical * DETECTION_FACTOR) verdict = 'within_noise'
    else verdict = changePercent > 0 ? 'gain' : 'drop'
    out.push({
      testSlug: slug,
      first,
      last,
      firstAt: series[0].performedAt,
      lastAt: series[series.length - 1].performedAt,
      changePercent,
      verdict,
    })
  }
  return out.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
}

export function coachProof(
  athletes: StoredAthlete[],
  asOf: Date = new Date(),
  windowDays: number = PROOF_WINDOW_DAYS,
): CoachProof {
  const to = asOf.getTime()
  const from = to - windowDays * 86_400_000

  const perAthlete: AthleteProof[] = athletes
    .filter((a) => !a.archived)
    .map((athlete) => {
      const changes = changesFor(athlete.results, from, to)
      const results = athlete.results.filter((r) => {
        const t = new Date(r.performedAt).getTime()
        return r.score != null && t >= from && t <= to
      }).length
      const gains = changes.filter((c) => c.verdict === 'gain')
      return {
        athleteId: athlete.id,
        name: athlete.name || athlete.profile.firstName || '',
        results,
        testsCompared: changes.length,
        gains: gains.length,
        drops: changes.filter((c) => c.verdict === 'drop').length,
        withinNoise: changes.filter((c) => c.verdict === 'within_noise').length,
        unknown: changes.filter((c) => c.verdict === 'unknown_error').length,
        changes,
        bestGain: gains[0] ?? null,
      }
    })
    .sort((a, b) => b.gains - a.gains || b.results - a.results || a.name.localeCompare(b.name))

  const byTest = new Map<string, TestProof>()
  for (const athlete of perAthlete) {
    for (const change of athlete.changes) {
      const entry = byTest.get(change.testSlug) ?? {
        testSlug: change.testSlug,
        compared: 0,
        gains: 0,
        drops: 0,
        withinNoise: 0,
        unknown: 0,
      }
      entry.compared++
      if (change.verdict === 'gain') entry.gains++
      else if (change.verdict === 'drop') entry.drops++
      else if (change.verdict === 'within_noise') entry.withinNoise++
      else entry.unknown++
      byTest.set(change.testSlug, entry)
    }
  }

  const allGains = perAthlete.flatMap((a) => a.changes.filter((c) => c.verdict === 'gain').map((c) => c.changePercent))

  return {
    from: new Date(from).toISOString().slice(0, 10),
    to: new Date(to).toISOString().slice(0, 10),
    athletes: perAthlete,
    athletesMeasured: perAthlete.filter((a) => a.results > 0).length,
    athletesWithGain: perAthlete.filter((a) => a.gains > 0).length,
    athletesWithDrop: perAthlete.filter((a) => a.drops > 0).length,
    totalGains: perAthlete.reduce((s, a) => s + a.gains, 0),
    totalDrops: perAthlete.reduce((s, a) => s + a.drops, 0),
    totalWithinNoise: perAthlete.reduce((s, a) => s + a.withinNoise, 0),
    totalUnknown: perAthlete.reduce((s, a) => s + a.unknown, 0),
    medianGainPercent: median(allGains) == null ? null : Math.round((median(allGains) as number) * 10) / 10,
    tests: [...byTest.values()].sort((a, b) => b.compared - a.compared || b.gains - a.gains),
  }
}
