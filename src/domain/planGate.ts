import { MIN_MEASUREMENTS } from '@/domain/trainingPlan'
import { OPEN_AXIS_MIN_REQUIREMENT, type RequirementGap, type RequirementRow } from '@/domain/requirementGap'
import type { ConfidenceLevel } from '@/domain/performanceView'
import type { RadarAxis, PerformanceDimension } from '@/types/domain'

/**
 * Bewertungstor vor dem Planvorschlag (Trainingsbereich Etappe 6, Doktrin §10, §14).
 *
 * Der berechnete Plan wird nur freigegeben, wenn jede PFLICHT-Dimension der
 * Disziplin ausreichend gemessen ist und die Datenzuverlässigkeit insgesamt
 * mindestens MODERATE ist. Nicht die Zahl der Tests entscheidet, sondern:
 * welche Dimensionen die Sportart verlangt, wie aktuell und wie oft gemessen.
 *
 * Abdeckung steht als ANZAHL («3 von 4 Pflichtdimensionen»), nie als Prozent:
 * ein Prozentwert klänge wie eine Bereitschaft (Doktrin §14, §22).
 *
 * PRODUKTENTSCHEIDUNGEN, keine Literaturwerte (Teil der fachlichen Prüfung):
 *  - Pflicht = Anforderungshöhe der Disziplin ≥ `OPEN_AXIS_MIN_REQUIREMENT`;
 *  - «ausreichend» = mindestens `MIN_MEASUREMENTS` Messungen, die jüngste nicht
 *    älter als `GATE_MAX_AGE_DAYS`;
 *  - drei Stufen: ERKLÄREN immer; ANALYSIEREN bei Datenzuverlässigkeit ≥ MODERATE
 *    und mindestens der Hälfte der Pflichtdimensionen; VERORDNEN, wenn alle
 *    Pflichtdimensionen ausreichend sind und die Zuverlässigkeit ≥ MODERATE.
 */
export const GATE_MAX_AGE_DAYS = 120

export type GateStatus = 'ok' | 'thin' | 'stale' | 'missing'
export type GateLevel = 'EXPLAIN' | 'ANALYZE' | 'PRESCRIBE'

export interface GateRow {
  axisId: string
  dimension: PerformanceDimension
  required: boolean
  status: GateStatus
  /** Zuverlässigkeit dieser Dimension: ≥ 3 aktuelle Messungen HIGH, 2 MODERATE, sonst LOW, ungemessen INSUFFICIENT. */
  confidence: ConfidenceLevel
  measurements: number
  latest: string | null
  /** Tage seit der letzten Messung. */
  ageDays: number | null
}

export interface GateResult {
  rows: GateRow[]
  requiredTotal: number
  requiredOk: number
  /** Pflichtdimensionen, die noch nicht ausreichen: das, was zu messen bleibt. */
  missing: GateRow[]
  overall: ConfidenceLevel
  level: GateLevel
  open: boolean
}

const DAY = 86_400_000
const rank: Record<ConfidenceLevel, number> = { INSUFFICIENT: 0, LOW: 1, MODERATE: 2, HIGH: 3 }

export function assessmentGate(gap: RequirementGap, axes: RadarAxis[], overall: ConfidenceLevel, asOf: Date = new Date()): GateResult {
  const byId = new Map(axes.map((a) => [a.axisId, a]))
  const weighted = [...gap.ranked, ...gap.unmeasured].filter((r): r is RequirementRow & { dimension: PerformanceDimension } => r.dimension != null && r.requirement != null)
  const rows: GateRow[] = weighted.map((r) => {
    const latest = byId.get(r.axisId)?.latestPerformedAt ?? null
    const ageDays = latest ? Math.floor((asOf.getTime() - Date.parse(latest)) / DAY) : null
    const status: GateStatus = r.measurements === 0 ? 'missing' : r.measurements < MIN_MEASUREMENTS ? 'thin' : ageDays != null && ageDays > GATE_MAX_AGE_DAYS ? 'stale' : 'ok'
    const confidence: ConfidenceLevel = status === 'missing' ? 'INSUFFICIENT' : status === 'ok' ? (r.measurements >= 3 ? 'HIGH' : 'MODERATE') : 'LOW'
    return { axisId: r.axisId, dimension: r.dimension, required: (r.requirement ?? 0) >= OPEN_AXIS_MIN_REQUIREMENT, status, confidence, measurements: r.measurements, latest, ageDays }
  })
  const required = rows.filter((r) => r.required)
  const requiredOk = required.filter((r) => r.status === 'ok').length
  const reliable = rank[overall] >= rank.MODERATE
  const open = required.length > 0 && requiredOk === required.length && reliable
  const level: GateLevel = open ? 'PRESCRIBE' : reliable && required.length > 0 && requiredOk * 2 >= required.length ? 'ANALYZE' : 'EXPLAIN'
  return { rows, requiredTotal: required.length, requiredOk, missing: required.filter((r) => r.status !== 'ok'), overall, level, open }
}
