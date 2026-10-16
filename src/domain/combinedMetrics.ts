import type { StoredResult } from '@/lib/store/localStore'
import { eccentricUtilizationRatio, speedReserve } from './fieldPhysiology'

/**
 * Kennzahlen, die zwei Tests brauchen.
 *
 * Wie die kritische Geschwindigkeit in `sportModule.ts` kann keine davon in
 * einer Testdefinition stehen: sie verbinden zwei Messungen. Damit die
 * Verbindung etwas beschreibt, gelten dieselben Bedingungen:
 *
 *   - beide Messungen sind die jüngsten ihres Tests,
 *   - sie liegen höchstens {@link MAX_DAYS_APART} Tage auseinander — zwei
 *     Werte aus verschiedenen Trainingsphasen beschreiben zwei verschiedene
 *     Athleten,
 *   - für das CMJ/SJ-Verhältnis gilt derselbe Tag, weil beide Sprünge vom
 *     selben Messsystem und derselben Tagesform stammen müssen.
 *
 * Keine Bewertung, keine Profilgrenzen: die Zahlen und ihre Formel. Warum,
 * steht in `fieldPhysiology.ts`.
 */
export const MAX_DAYS_APART = 30

const DAY = 86_400_000

function latest(results: StoredResult[], slug: string): StoredResult | null {
  let best: StoredResult | null = null
  for (const r of results) {
    if (r.testSlug !== slug) continue
    if (!best || r.performedAt > best.performedAt) best = r
  }
  return best
}

function daysApart(a: StoredResult, b: StoredResult): number {
  return Math.abs(new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()) / DAY
}

const metricOf = (r: StoredResult, key: string): number | null => {
  const v = r.metrics[key] ?? r.values[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export interface SpeedReserveReadout {
  /** Maximale Sprintgeschwindigkeit in m/s (fliegender 20-m-Sprint). */
  mss: number
  /** Maximale aerobe Geschwindigkeit in m/s (5-Minuten-Lauf). */
  mas: number
  /** Anaerobic Speed Reserve in m/s. */
  asr: number
  /** Speed Reserve Ratio, dimensionslos. */
  srr: number
  from: [StoredResult, StoredResult]
}

/** ASR und SRR aus dem jüngsten fliegenden Sprint und dem jüngsten MAS-Lauf. */
export function speedReserveReadout(results: StoredResult[]): SpeedReserveReadout | null {
  const sprint = latest(results, 'flying_sprint_20m')
  const masRun = latest(results, 'run_5min_mas')
  if (!sprint || !masRun || daysApart(sprint, masRun) > MAX_DAYS_APART) return null
  const mss = metricOf(sprint, 'avg_velocity_m_s')
  const masKmh = metricOf(masRun, 'mas_kmh')
  if (mss == null || masKmh == null) return null
  const mas = masKmh / 3.6
  const r = speedReserve(mss, mas)
  if (!r) return null
  return { mss, mas, asr: r.asr, srr: r.srr, from: [sprint, masRun] }
}

export interface EurReadout {
  cmjCm: number
  sjCm: number
  ratio: number
  performedAt: string
}

/** CMJ/SJ-Verhältnis aus Sprüngen desselben Tages. */
export function eurReadout(results: StoredResult[]): EurReadout | null {
  const cmj = latest(results, 'countermovement_jump')
  const sj = latest(results, 'squat_jump')
  if (!cmj || !sj || cmj.performedAt.slice(0, 10) !== sj.performedAt.slice(0, 10)) return null
  const cmjCm = metricOf(cmj, 'jumpHeightCm')
  const sjCm = metricOf(sj, 'jumpHeightCm')
  if (cmjCm == null || sjCm == null) return null
  const ratio = eccentricUtilizationRatio(cmjCm, sjCm)
  if (ratio == null) return null
  return { cmjCm, sjCm, ratio, performedAt: cmj.performedAt }
}
