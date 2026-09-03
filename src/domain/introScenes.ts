import { getTest } from '@/data/testCatalog'
import { UNIVERSAL_TEST_SLUGS } from '@/domain/diagnosticProfile'
import { rateResult, type RatingContext } from '@/domain/rating'
import type { PerformanceDimension } from '@/types/domain'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Was die Intro-Sequenz zeigt.
 *
 * DIE ENTSCHEIDUNG, DIE HIER ZÄHLT: die Vorlage der Sequenz trägt erfundene
 * Zahlen — «Impakt 1.240 N», «100-m-Prognose 58,4 s». Solche Werte gibt es
 * in dieser App nicht, und sie zu zeigen wäre doppelt falsch: es sind
 * erfundene Daten (§81, und das Designsystem verbietet sie selbst), und wer
 * die App öffnet, sähe Zahlen, die aussehen wie seine eigenen.
 *
 * Deshalb kommt der Inhalt aus dem Bestand:
 *
 *   mit Messungen  → die eigenen letzten Werte, mit ihrem Perzentil als
 *                    Balken, wo eine belegte Referenz vorliegt.
 *   ohne Messungen → die vier universellen Tests als das, was gemessen
 *                    WIRD: Name und Einheit, Balken leer, keine Zahl.
 *
 * Damit ist die Sequenz beim zweiten Start das, was die Vorlage erreichen
 * wollte: die eigenen Zahlen ziehen vorbei.
 */

export interface IntroCallout {
  /** Beschriftung, z. B. der Testname. */
  label: string
  /** Der Wert als fertiger Text — oder null, wenn noch nichts gemessen ist. */
  value: string | null
  /** Einheit, wenn kein Wert vorliegt: «kg», «ml/kg/min». */
  unit: string | null
  /** Balkenfüllung 0–100 aus dem Perzentil. Null ohne belegte Referenz. */
  fill: number | null
  /** Körperregion, an der der Callout hängt. */
  dimension: PerformanceDimension
}

export interface IntroScene {
  key: string
  callouts: IntroCallout[]
}

/** So viele Szenen laufen höchstens. Mehr wäre ein Werbefilm, kein Start. */
export const MAX_SCENES = 3

export function introScenes(
  results: StoredResult[],
  context: RatingContext,
  locale: 'de' | 'en',
  formatValue: (result: StoredResult) => string,
): IntroScene[] {
  const measured = results.filter((r) => r.score != null)

  /** Der jüngste Wert je Test, damit keine zwei Callouts dasselbe zeigen. */
  const latestPerTest = new Map<string, StoredResult>()
  for (const result of [...measured].sort((a, b) => b.performedAt.localeCompare(a.performedAt))) {
    if (!latestPerTest.has(result.testSlug)) latestPerTest.set(result.testSlug, result)
  }

  const callouts: IntroCallout[] = []

  for (const result of [...latestPerTest.values()].slice(0, MAX_SCENES * 2)) {
    const test = getTest(result.testSlug)
    if (!test) continue
    const rating = rateResult(result, context)
    callouts.push({
      label: test.shortName[locale],
      value: formatValue(result),
      unit: null,
      // Nur ein belegtes Perzentil füllt den Balken. Ohne Referenz bleibt er
      // leer — ein voller Balken ohne Grundlage wäre eine Behauptung.
      fill: rating.comparison?.percentile ?? null,
      dimension: test.dimension,
    })
  }

  // Auffüllen mit dem, was gemessen werden KANN — ohne Zahl.
  if (callouts.length < MAX_SCENES * 2) {
    for (const slug of UNIVERSAL_TEST_SLUGS) {
      if (callouts.length >= MAX_SCENES * 2) break
      const test = getTest(slug)
      if (!test || callouts.some((c) => c.label === test.shortName[locale])) continue
      callouts.push({
        label: test.shortName[locale],
        value: null,
        unit: test.primaryUnit,
        fill: null,
        dimension: test.dimension,
      })
    }
  }

  const scenes: IntroScene[] = []
  for (let i = 0; i < callouts.length; i += 2) {
    const pair = callouts.slice(i, i + 2)
    if (pair.length === 0) break
    scenes.push({ key: `scene-${i / 2}`, callouts: pair })
    if (scenes.length >= MAX_SCENES) break
  }
  return scenes
}
