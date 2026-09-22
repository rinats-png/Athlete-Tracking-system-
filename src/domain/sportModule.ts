import { RUN_DISTANCES, moduleFor, type ModuleMetric, type SportModule } from '@/data/sportModules'
import type { SportCategoryId } from '@/data/sportProfiles'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Das Sportmodul eines Athleten — die Rechnung dahinter.
 *
 * SIE IST BEWUSST DÜNN. Die Kennzahlen sind schon gerechnet; diese Datei
 * sucht heraus, welche zu dieser Sportart gehören, holt die jüngste Messung
 * und die davor und sagt, um wie viel sich die Zahl verändert hat.
 *
 * WAS SIE NICHT SAGT: ob das gut ist. Eine Veränderung ist eine
 * Veränderung — kein Fortschritt, kein Einbruch, kein Handlungsbedarf
 * (§81). Ob sie über dem Messfehler liegt, beantwortet der Testverlauf mit
 * seinen 2,77 Standardfehlern; hier steht die Zahl.
 *
 * NICHT GEMESSEN IST NICHT SCHWACH (§89). Eine Kennzahl ohne Messung
 * kommt als `latest: null` durch und wird als «noch nicht gemessen»
 * angezeigt, nie als Null und nie stillschweigend weggelassen.
 */

export interface MetricReadout {
  key: string
  /** Die jüngste Messung, oder null. */
  latest: number | null
  latestAt: string | null
  /** Aus welchem Test die jüngste Zahl kam. */
  fromTest: string | null
  /** Die Messung davor — für die Veränderung. Null, wenn es nur eine gibt. */
  previous: number | null
  previousAt: string | null
  /** latest − previous. Ohne Vorzeichenumkehr: die Zahl ist die Zahl. */
  change: number | null
  lowerIsBetter: boolean
  digits: number
}

function pick(results: StoredResult[], metric: ModuleMetric): MetricReadout {
  const matching = results
    .filter((r) => metric.fromTests.includes(r.testSlug) && typeof r.metrics[metric.key] === 'number')
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))

  const latest = matching[0] ?? null
  const previous = matching[1] ?? null
  const latestValue = latest ? latest.metrics[metric.key] : null
  const previousValue = previous ? previous.metrics[metric.key] : null

  return {
    key: metric.key,
    latest: latestValue ?? null,
    latestAt: latest?.performedAt ?? null,
    fromTest: latest?.testSlug ?? null,
    previous: previousValue ?? null,
    previousAt: previous?.performedAt ?? null,
    change: latestValue != null && previousValue != null ? latestValue - previousValue : null,
    lowerIsBetter: Boolean(metric.lowerIsBetter),
    digits: metric.digits ?? 0,
  }
}

export interface ModuleReadout {
  category: SportCategoryId
  metrics: MetricReadout[]
  /** Wie viele der Kennzahlen überhaupt eine Messung haben. */
  measured: number
}

export function moduleReadout(results: StoredResult[], category: SportCategoryId | null): ModuleReadout | null {
  const module: SportModule | null = moduleFor(category)
  if (!module) return null
  const metrics = module.metrics.map((m) => pick(results, m))
  return { category: module.category, metrics, measured: metrics.filter((m) => m.latest != null).length }
}

/** Quelle des Modells hinter {@link criticalSpeed}. */
export const CRITICAL_SPEED_SOURCE = 'Monod & Scherrer 1965; Hughson, Orok & Staudt 1984'
export const CRITICAL_SPEED_FORMULA = 'd = CS · t + D′ — aus zwei maximalen Läufen verschiedener Dauer'

export interface CriticalSpeed {
  /** Meter je Sekunde. */
  speed: number
  /** Die anaerobe Distanzreserve D′ in Metern. */
  reserve: number
  /** Die beiden Läufe, aus denen sie entstand. */
  from: { testSlug: string; meters: number; seconds: number; performedAt: string }[]
}

/**
 * Kritische Geschwindigkeit aus zwei maximalen Läufen.
 *
 * DIE EINZIGE KENNZAHL IN DIESER APP, DIE ZWEI TESTS BRAUCHT — und deshalb
 * die einzige, die nicht in einer Testdefinition stehen kann.
 *
 * Das Modell ist linear: Über zwei maximale Läufe verschiedener Dauer gilt
 * `d = CS · t + D′`. Die Steigung ist die Geschwindigkeit, die sich lange
 * halten lässt; der Achsenabschnitt die Distanzreserve darüber hinaus.
 *
 * DREI BEDINGUNGEN, sonst gibt es keine Zahl:
 *
 *   1. Zwei Läufe unterschiedlicher Dauer. Bei gleicher Dauer ist die
 *      Steigung nicht bestimmt.
 *   2. Beide aus demselben Zeitraum — hier: höchstens 90 Tage auseinander.
 *      Zwei Läufe aus verschiedenen Jahren beschreiben zwei verschiedene
 *      Athleten, und die Gerade dazwischen beschreibt keinen.
 *   3. Eine positive Steigung. Ergibt die Rechnung eine negative
 *      Geschwindigkeit oder eine negative Reserve, passt das Modell nicht
 *      zu diesen beiden Läufen — dann gibt es keine Zahl statt einer
 *      falschen.
 */
const MAX_DAYS_APART = 90

export function criticalSpeed(results: StoredResult[]): CriticalSpeed | null {
  const runs: { testSlug: string; meters: number; seconds: number; performedAt: string }[] = []
  for (const result of results) {
    const spec = RUN_DISTANCES[result.testSlug]
    if (!spec) continue
    const meters = spec.meters ?? result.values.distanceM
    const seconds = spec.secondsFixed ?? result.values.durationSeconds
    if (typeof meters !== 'number' || typeof seconds !== 'number' || meters <= 0 || seconds <= 0) continue
    runs.push({ testSlug: result.testSlug, meters, seconds, performedAt: result.performedAt })
  }
  if (runs.length < 2) return null

  runs.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  const recent = runs[0]
  // Der jüngste Lauf und der jüngste ANDERSLANGE Lauf innerhalb des Fensters.
  const partner = runs
    .slice(1)
    .find(
      (r) =>
        Math.abs(r.seconds - recent.seconds) > 60 &&
        Math.abs(new Date(recent.performedAt).getTime() - new Date(r.performedAt).getTime()) <= MAX_DAYS_APART * 86_400_000,
    )
  if (!partner) return null

  const longer = recent.seconds > partner.seconds ? recent : partner
  const shorter = longer === recent ? partner : recent
  const speed = (longer.meters - shorter.meters) / (longer.seconds - shorter.seconds)
  const reserve = shorter.meters - speed * shorter.seconds
  if (!Number.isFinite(speed) || speed <= 0 || reserve <= 0) return null

  return { speed, reserve, from: [recent, partner] }
}
