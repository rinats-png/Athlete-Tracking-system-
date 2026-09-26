import { assessQuality } from '@/domain/dataQuality'
import { DETECTION_FACTOR } from '@/domain/change'
import { buildMetric, type DerivedMetric } from '@/domain/metricContract'
import type { InsightRule, RuleHit } from '@/domain/insightEngine'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Ermüdungsresistenz (Durability) aus Tests — Master-Spezifikation D4.
 *
 * WAS GEMESSEN WIRD: wie viel von der frischen Leistung unter Ermüdung
 * übrig bleibt, in Prozent (Erhalt). 100 % heisst: ermüdet so gut wie
 * frisch. Die Spezifikation denkt dabei an Leistungsdaten aus langen
 * Einheiten (Watt nach 2000 kJ); ohne Sensoranbindung (Entscheidung 2)
 * kommt die Zahl hier aus Tests, die frisch und ermüdet IN SICH tragen:
 *
 *   - Ermüdungszirkel 4 × 30 s: Satz 4 gegen Satz 1 (Wiederholungen)
 *   - Wiederholter Sprint Rad: letzter gegen höchsten Sprint (Watt)
 *   - SJFT: Wurfrate der Serie C (30 s) gegen Serie A (15 s)
 *   - Brick Rad → Lauf: Laufpace nach dem Rad gegen die frische 5-km-Pace
 *     aus höchstens 56 Tagen davor
 *
 * RICHTUNG: Erhalt ist immer «höher ist besser» — beim Brick ist die Pace
 * deshalb umgedreht (frisch / ermüdet).
 *
 * VERÄNDERUNG nur gegen die eigene Streuung, wie überall (§19 Regel 7): Es
 * gibt keinen veröffentlichten Messfehler für diese Quotienten. Die
 * Schwelle kommt aus den eigenen früheren Werten (typischer Fehler aus
 * aufeinanderfolgenden Differenzen, × 1,96·√2), mit einer Untergrenze von
 * DURABILITY_MIN_CHANGE_PP Prozentpunkten. Diese Untergrenze ist gesetzt,
 * nicht belegt — sie steht deshalb als vorläufig im Formelregister.
 */

export const DURABILITY_ALGORITHM = 'durability_retention_pct'
export const DURABILITY_VERSION = '1.0.0'
/** Untergrenze der erkennbaren Veränderung, in Prozentpunkten. Vorläufig. */
export const DURABILITY_MIN_CHANGE_PP = 3
/** So viele frühere Werte braucht die eigene Streuung. */
export const DURABILITY_MIN_BASELINE = 4
/** Höchster Abstand zwischen frischem 5-km-Lauf und Brick-Test. */
export const BRICK_FRESH_MAX_DAYS = 56

export type DurabilitySource = 'fatigue_circuit_4x30s' | 'repeated_sprint_bike' | 'special_judo_fitness_test' | 'brick_bike_run'
export const DURABILITY_SOURCES: DurabilitySource[] = ['fatigue_circuit_4x30s', 'repeated_sprint_bike', 'special_judo_fitness_test', 'brick_bike_run']

export interface DurabilityPoint {
  source: DurabilitySource
  resultId: string
  day: string
  /** Ermüdet in Prozent von frisch. */
  retentionPct: number
  fresh: number
  fatigued: number
  /** Einheit von frisch/ermüdet: 'reps' | 'W' | 'throws_per_s' | 's_per_km'. */
  unit: string
  /** Beim Brick: das Ergebnis, aus dem die frische Pace stammt. */
  freshResultId?: string
}

export type DurabilityVerdict = 'improved' | 'worsened' | 'within_noise' | 'unknown'

export interface DurabilitySeries {
  source: DurabilitySource
  points: DurabilityPoint[]
  latest: DerivedMetric<number>
  /** Median der früheren Werte (ohne die jüngsten zwei). */
  baselineMedian: number | null
  /** Erkennbare Veränderung in Prozentpunkten, oder null ohne genug Vorlauf. */
  detectablePp: number | null
  verdict: DurabilityVerdict
}

const DAY = 86_400_000

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

function point(r: StoredResult, fresh: number | null, fatigued: number | null, unit: string, source: DurabilitySource): DurabilityPoint | null {
  if (fresh == null || fatigued == null || fresh <= 0 || fatigued < 0) return null
  return { source, resultId: r.id, day: r.performedAt.slice(0, 10), retentionPct: round1((fatigued / fresh) * 100), fresh, fatigued, unit }
}

/** Frische 5-km-Pace in s/km aus einem Ergebnis. */
function freshPace(r: StoredResult): number | null {
  const pace = num(r.metrics.avg_pace_s_per_km)
  if (pace != null) return pace
  const d = num(r.values.durationSeconds)
  return d == null ? null : d / 5
}

/** Ein Punkt je gültigem Ergebnis der vier Quellen, älteste zuerst. */
export function durabilityPoints(results: StoredResult[]): DurabilityPoint[] {
  const valid = results
    // Ein Satz mit niedriger Anstrengung (RPE) ist kein Erhalt unter Ermüdung.
    .filter((r) => assessQuality(r).status !== 'questionable')
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  const fives = valid.filter((r) => r.testSlug === 'run_5k')
  const out: DurabilityPoint[] = []
  for (const r of valid) {
    const v = r.values
    let p: DurabilityPoint | null = null
    switch (r.testSlug) {
      case 'fatigue_circuit_4x30s':
        p = point(r, num(v.repsSet1), num(v.repsSet4), 'reps', r.testSlug)
        break
      case 'repeated_sprint_bike':
        p = point(r, num(v.peakPowerW), num(v.lastSprintPowerW), 'W', r.testSlug)
        break
      case 'special_judo_fitness_test': {
        const a = num(v.throwsA)
        const c = num(v.throwsC)
        p = point(r, a == null ? null : a / 15, c == null ? null : c / 30, 'throws_per_s', r.testSlug)
        break
      }
      case 'brick_bike_run': {
        const brickPace = num(r.metrics.avg_pace_s_per_km)
        const at = Date.parse(r.performedAt)
        const fresh = fives
          .filter((f) => Date.parse(f.performedAt) <= at && at - Date.parse(f.performedAt) <= BRICK_FRESH_MAX_DAYS * DAY)
          .at(-1)
        const fp = fresh ? freshPace(fresh) : null
        // Pace: kleiner ist schneller — Erhalt ist frisch / ermüdet.
        if (fp != null && brickPace != null && brickPace > 0) {
          p = { source: r.testSlug, resultId: r.id, day: r.performedAt.slice(0, 10), retentionPct: round1((fp / brickPace) * 100), fresh: fp, fatigued: brickPace, unit: 's_per_km', freshResultId: fresh!.id }
        }
        break
      }
    }
    if (p) out.push(p)
  }
  return out
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Typischer Fehler aus aufeinanderfolgenden Differenzen, in Prozentpunkten. */
export function typicalErrorPp(values: number[]): number | null {
  if (values.length < 3) return null
  const diffs = values.slice(1).map((v, i) => v - values[i])
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length
  const variance = diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / (diffs.length - 1)
  return Math.sqrt(variance) / Math.SQRT2
}

/**
 * Eine Quelle im Verlauf. Das Urteil verlangt, dass BEIDE jüngsten Werte
 * jenseits der Schwelle auf derselben Seite des früheren Medians liegen —
 * ein einzelner Ausreisser ist kein Trend.
 */
export function durabilitySeries(points: DurabilityPoint[], source: DurabilitySource): DurabilitySeries {
  const pts = points.filter((p) => p.source === source)
  const latestValue = pts.at(-1)?.retentionPct ?? null
  const latest = buildMetric(
    { key: `durability_${source}`, algorithm: DURABILITY_ALGORITHM, algorithmVersion: DURABILITY_VERSION, unit: '%', minSample: 1, targetSample: 6 },
    {
      value: latestValue,
      sampleSize: pts.length,
      period: { from: pts[0]?.day ?? '', to: pts.at(-1)?.day ?? '' },
      sourceIds: pts.map((p) => p.resultId),
    },
  )
  const baseline = pts.slice(0, -2).map((p) => p.retentionPct)
  const recent = pts.slice(-2).map((p) => p.retentionPct)
  const base = { source, points: pts, latest }
  if (baseline.length < DURABILITY_MIN_BASELINE || recent.length < 2) {
    return { ...base, baselineMedian: median(baseline), detectablePp: null, verdict: 'unknown' }
  }
  const te = typicalErrorPp(baseline) ?? 0
  const detectable = Math.max(DURABILITY_MIN_CHANGE_PP, te * DETECTION_FACTOR)
  const ref = median(baseline)!
  const deltas = recent.map((v) => v - ref)
  const verdict: DurabilityVerdict = deltas.every((d) => d > detectable)
    ? 'improved'
    : deltas.every((d) => d < -detectable)
      ? 'worsened'
      : 'within_noise'
  return { ...base, baselineMedian: ref, detectablePp: round1(detectable), verdict }
}

export function durabilityOverview(results: StoredResult[]): DurabilitySeries[] {
  const points = durabilityPoints(results)
  return DURABILITY_SOURCES.map((s) => durabilitySeries(points, s)).filter((s) => s.points.length > 0)
}

// --- Regeln -------------------------------------------------------------------

function durabilityRule(id: 'durability_improved' | 'durability_worsened', want: DurabilityVerdict): InsightRule {
  return {
    id,
    version: '1.0.0',
    category: 'durability',
    severity: want === 'worsened' ? 'notice' : 'info',
    cooldownDays: 28,
    requires: 'durability',
    evaluate: (ctx) => {
      const hits: RuleHit[] = []
      for (const series of durabilityOverview(ctx.results)) {
        if (series.verdict !== want) continue
        const recent = series.points.slice(-2)
        hits.push({
          subject: series.source,
          values: {
            latest: series.latest.value ?? 0,
            baseline: series.baselineMedian ?? 0,
            detectable: series.detectablePp ?? 0,
          },
          evidence: recent.map((p) => ({ kind: 'result' as const, id: p.resultId, key: series.source, value: p.retentionPct, day: p.day })),
          whyNow: want === 'worsened' ? 'two_lower_beyond_noise' : 'two_higher_beyond_noise',
          confidence: series.points.length >= 8 ? 0.8 : 0.6,
          link: { kind: 'route', target: '/belastung' },
        })
      }
      return hits
    },
  }
}

export const DURABILITY_RULES: InsightRule[] = [durabilityRule('durability_worsened', 'worsened'), durabilityRule('durability_improved', 'improved')]
