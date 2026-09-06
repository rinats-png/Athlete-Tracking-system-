import { disciplineById } from '@/data/sportProfiles'
import { axisById } from '@/data/profileAxes'
import { axisIdsFor } from '@/lib/scoring'
import type { PerformanceDimension, RadarAxis } from '@/types/domain'
import type { Evidence } from '@/domain/insights'

/**
 * Die Anforderungslücke — wo acht Wochen am meisten bringen.
 *
 * DAS PROBLEM, DAS DIESE DATEI LÖST: die meisten trainieren, was sie schon
 * können. Der Judoka mit sehr guter Maximalkraft steigert weiter das
 * Kreuzheben, obwohl seine Disziplin vor allem Griffausdauer verlangt. Die
 * Achse «grösstes Potenzial» (insights.ts) findet die Achse, die gegenüber
 * den ÜBRIGEN abfällt. Das ist eine Aussage über das Profil. Diese Datei
 * stellt die andere Frage: gegenüber der DISZIPLIN — welche Achse verlangt
 * sie am stärksten, und wie weit ist der Athlet dort?
 *
 * WIE GERECHNET WIRD: jede Disziplin trägt in `sportProfiles.ts` eine
 * Anforderungshöhe je Fähigkeit (0–1, ausdrücklich als Voreinstellung dieser
 * App gekennzeichnet, nicht als Literaturwert). Das Profil liefert je Achse
 * ein Perzentil (0–100). Der Hebel einer Achse ist
 *
 *     Anforderung × (100 − Perzentil) / 100
 *
 * Eine Achse mit hoher Anforderung und viel Luft nach oben steht vorn; eine
 * mit geringer Anforderung fällt auch bei niedrigem Perzentil zurück. Das ist
 * keine Prognose eines Trainingseffekts, sondern eine Rangfolge: WO die Zeit
 * hingehört. WAS dort zu tun ist, sagt die App nicht (§81).
 *
 * WAS HIER NICHT PASSIERT: Kennzahlachsen ohne Anforderungshöhe (Laufökonomie,
 * Griffwert) werden nicht eingereiht — für sie gibt es kein Gewicht, und ein
 * angenommenes wäre erfunden. Sie stehen gesondert, mit ihrem Wert.
 * Ungemessene Achsen werden nicht als schwach gezählt: nicht gemessen und
 * schlecht sind zwei Aussagen (§89). Sie stehen als offene Frage daneben.
 */

export interface RequirementRow {
  axisId: string
  dimension: PerformanceDimension | null
  /** Anforderungshöhe der Disziplin, 0–1. Null bei Kennzahlachsen. */
  requirement: number | null
  /** Perzentil gegenüber der Referenz, 0–100. Null ohne Referenz. */
  score: number | null
  /** Anforderung × Luft nach oben, 0–100. Grundlage der Rangfolge. */
  leverage: number | null
  /** Ob die Achse als offen gilt — siehe OPEN_AXIS_MIN_REQUIREMENT / _MAX_SCORE. */
  open: boolean
  measurements: number
  evidence: Evidence
}

export interface RequirementGap {
  disciplineId: string | null
  /** Eingereihte Achsen, grösster Hebel zuerst. */
  ranked: RequirementRow[]
  /** Achsen der Disziplin ohne Messung — die grösste Unbekannte, kein Befund. */
  unmeasured: RequirementRow[]
  /** Kennzahlachsen ohne Anforderungshöhe: gemessen, aber nicht einzureihen. */
  unweighted: RequirementRow[]
  /** Anzahl der offenen Achsen unter den eingereihten. */
  openCount: number
}

/**
 * Ab welcher Anforderungshöhe eine Achse für die Disziplin wesentlich ist,
 * und unterhalb welchen Perzentils sie als offen gilt.
 *
 * Beides Produktentscheidungen, keine Messungen. Die Referenzmitte (P50) als
 * Schwelle ist die einzige, die sich ohne Sportartkohorte begründen lässt:
 * wer in einer Fähigkeit, die seine Disziplin stark verlangt, unter der
 * Hälfte der Referenz liegt, hat dort seine grösste Lücke.
 */
export const OPEN_AXIS_MIN_REQUIREMENT = 0.7
export const OPEN_AXIS_MAX_SCORE = 50

function evidenceFrom(measurements: number): Evidence {
  if (measurements >= 3) return 'strong'
  if (measurements === 2) return 'moderate'
  return 'weak'
}

export function requirementGap(axes: RadarAxis[], disciplineId: string | null | undefined): RequirementGap {
  const discipline = disciplineId ? disciplineById(disciplineId) : undefined
  const weights = discipline?.dimensionWeights ?? {}
  const byId = new Map(axes.map((a) => [a.axisId, a]))

  const rows: RequirementRow[] = axisIdsFor(disciplineId ?? null).map((axisId) => {
    const axis = byId.get(axisId)
    const def = axisById(axisId)
    const dimension = def?.source.kind === 'dimension' ? def.source.dimension : null
    const requirement = dimension ? (weights[dimension] ?? null) : null
    const score = axis?.score ?? null
    const leverage =
      requirement != null && score != null ? Math.round(requirement * (100 - score) * 10) / 10 : null
    const measurements = axis?.testCount ?? 0
    return {
      axisId,
      dimension,
      requirement,
      score,
      leverage,
      open: requirement != null && score != null && requirement >= OPEN_AXIS_MIN_REQUIREMENT && score < OPEN_AXIS_MAX_SCORE,
      measurements,
      evidence: evidenceFrom(measurements),
    }
  })

  const ranked = rows
    .filter((r) => r.leverage != null)
    .sort((a, b) => (b.leverage ?? 0) - (a.leverage ?? 0) || (b.requirement ?? 0) - (a.requirement ?? 0))
  const unmeasured = rows.filter((r) => r.score == null)
  const unweighted = rows.filter((r) => r.score != null && r.requirement == null)

  return {
    disciplineId: discipline?.id ?? null,
    ranked,
    unmeasured,
    unweighted,
    openCount: ranked.filter((r) => r.open).length,
  }
}

/** Die Achse, die den grössten Hebel trägt — oder null, wenn nichts einzureihen ist. */
export function biggestLever(gap: RequirementGap): RequirementRow | null {
  return gap.ranked[0] ?? null
}
