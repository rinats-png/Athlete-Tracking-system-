import { TEST_CATALOG } from '@/data/testCatalog'
import { rateResult } from '@/domain/rating'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import type { PerformanceDimension } from '@/types/domain'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Einordnung eines Messwerts (§14, §15, §17).
 *
 * Ein Perzentil allein sagt einem Athleten wenig — «P82» ist eine Zahl, kein
 * Bild. Ein Band gibt ihr Bedeutung. Entscheidend ist aber, dass das Band
 * nicht mehr behauptet als das Perzentil: es ist eine andere Darstellung
 * derselben Zahl, keine zusätzliche Erkenntnis. Deshalb reist die Herkunft
 * der Referenz immer mit.
 */

/**
 * Perzentil eines Ergebnisses gegen die BEVÖLKERUNG.
 *
 * WAS SICH HIER GEÄNDERT HAT
 *
 * Bis hierher kam dieser Wert aus `norms.ts`, einer Startbelegung, die über
 * sich selbst `validated: false` sagte: an übliche Grössenordnungen
 * angelehnt, aus keiner Normstudie übernommen. Diese Zahlen standen im
 * Bericht, im CSV-Export und über den Rückfall in `radarProfile` auch im
 * Leistungsprofil auf der Übersicht — als «Perzentil gegenüber der passenden
 * Referenz». Ein erfundenes Perzentil ist schlimmer als eine leere Achse,
 * und an der sichtbarsten Stelle der App war genau eines zu sehen.
 *
 * Jetzt gibt es ein Perzentil nur dort, wo eine benannte Kohorte mit Quelle
 * es hergibt. Sonst null, und die Oberfläche sagt warum.
 *
 * Bewusst ohne Sportartkohorte: der Bericht und der Export vergleichen mit
 * der Allgemeinheit. Die sportartspezifische Einordnung leistet `rateResult`
 * mit dem vollen Kontext.
 */
export function lookupPercentile(result: StoredResult): number | null {
  const rating = rateResult(result, {
    sex: result.sex,
    birthDate: null,
    disciplineIds: [],
  })
  return rating.comparison?.percentile ?? null
}

// --- Testabdeckung je Achse (§17) -------------------------------------------

export interface DimensionCoverage {
  dimension: PerformanceDimension
  /** Wie viele der Tests dieser Achse wurden gemessen? */
  measured: number
  available: number
  percent: number
}

/**
 * Abdeckung je Achse in Prozent.
 *
 * Bezugsgrösse ist die Zahl der Tests im Katalog, die auf diese Achse
 * einzahlen. Damit wird sichtbar, was ein Gesamtwert wert ist: 82 Punkte bei
 * 40 % Abdeckung sind eine andere Aussage als 82 bei 100 %.
 */
export function coverageByDimension(results: StoredResult[]): DimensionCoverage[] {
  const measured = new Set(results.filter((r) => r.score != null).map((r) => r.testSlug))

  return PERFORMANCE_DIMENSIONS.map((dimension) => {
    const tests = TEST_CATALOG.filter((t) => dimension in t.dimensionMetrics)
    const hit = tests.filter((t) => measured.has(t.slug)).length
    return {
      dimension,
      measured: hit,
      available: tests.length,
      percent: tests.length === 0 ? 0 : Math.round((hit / tests.length) * 100),
    }
  })
}
