import { DETECTION_FACTOR } from '@/domain/change'
import { acuteChronic, completeness, dayLoad, rollingMean, toDay, weightTrend, window as diaryWindow } from '@/domain/diary'
import { bestE1rmInWorkout, blockCompare, exerciseSummary } from '@/domain/training'
import type { StoredDecision, StoredDiaryEntry, StoredResult, StoredWorkout } from '@/lib/store/localStore'

/**
 * Cockpit und Decision-Log — Schicht S3 aus docs/ausbau.md.
 *
 * ZWEI DINGE, UND SIE SIND STRENG GETRENNT:
 *
 *   1. SIGNALE. Die Regeln des Coach-Cockpits v4 («Schlaf unter Baseline»,
 *      «Adhärenz niedrig», «Plateau im Training»). Jede vergleicht sieben
 *      Tage mit achtundzwanzig, jede Schwelle ist ein Parameter, den ein
 *      Mensch setzt. Ein Signal ist ein HINWEIS ZUM HINSCHAUEN — v4 nennt es
 *      «Coach Review». Es ist keine Vorgabe, keine Farbe, keine Diagnose.
 *
 *   2. WIRKUNG. Eine Entscheidung nennt die Grösse, an der sie sich messen
 *      lassen will. Nach der Überprüfungsfrist vergleicht die App das Mittel
 *      DANACH mit dem Mittel DAVOR — gegen die eigene Streuung dieser Grösse
 *      bei diesem Menschen, mit demselben Faktor wie am Testergebnis
 *      (change.ts, 1,96 · √2). Das Ergebnis ist «ausserhalb der Schwankung»
 *      oder «innerhalb» — nie «hat gewirkt». Dass sich etwas verändert hat,
 *      während man etwas entschieden hat, ist eine Beobachtung, keine
 *      Ursache. Das Warum bleibt beim Menschen (§81).
 *
 * Es gibt keine Empfehlung in dieser Datei. Es gibt Zahlen und die Frage,
 * ob sie über dem Rauschen liegen.
 */

// --- Schwellen ---------------------------------------------------------------

export interface CockpitThresholds {
  /** Ø7 Schlaf unter Ø28 um mehr als … % */
  sleepDropPct: number
  /** Ø7 Energie unter Ø28 um mehr als … % */
  energyDropPct: number
  /** Ø7 Stress über Ø28 um mehr als … % */
  stressRisePct: number
  /** Gewichtstrend je Woche über … % des Körpergewichts, in beide Richtungen */
  weightChangePctWeek: number
  /** Ø7 Plan-Adhärenz unter … von 5 */
  adherenceBelow: number
  /** Vollständigkeit der letzten 14 Tage unter … % */
  minCompletenessPct: number
}

/** Die Vorgaben aus v4, Blatt Athleten-Profil — Startwerte, keine Wahrheiten. */
export const DEFAULT_THRESHOLDS: CockpitThresholds = {
  sleepDropPct: 15,
  energyDropPct: 15,
  stressRisePct: 25,
  weightChangePctWeek: 1,
  adherenceBelow: 4,
  minCompletenessPct: 70,
}

export type SignalKey =
  | 'sleep_below_baseline'
  | 'energy_below_baseline'
  | 'stress_above_baseline'
  | 'weight_change_fast'
  | 'adherence_low'
  | 'plateau'
  | 'data_thin'

export interface Signal {
  key: SignalKey
  /** Zahlen für den Satz — was, gegen was, um wie viel. */
  values: Record<string, number | string>
  /** Für ein Plateau: welche Übung. */
  exerciseKey?: string
}

const BASELINE_DAYS = 28
const RECENT_DAYS = 7
/** Ein Vergleich von sieben gegen achtundzwanzig Tage braucht in beiden Fenstern Substanz. */
const MIN_RECENT = 3
const MIN_BASELINE = 10

function drop(recent: { mean: number | null; n: number }, base: { mean: number | null; n: number }): number | null {
  if (recent.n < MIN_RECENT || base.n < MIN_BASELINE) return null
  if (recent.mean == null || base.mean == null || base.mean === 0) return null
  return ((recent.mean - base.mean) / base.mean) * 100
}

/**
 * Die Signale von heute. Reihenfolge nach Fenstern, nicht nach Gewicht — es
 * gibt keine Rangfolge, weil es keine Bewertung gibt.
 */
export function cockpitSignals(
  diary: StoredDiaryEntry[],
  workouts: StoredWorkout[],
  thresholds: CockpitThresholds,
  today = toDay(new Date()),
): Signal[] {
  const out: Signal[] = []
  const compare = (field: 'sleepHours' | 'energy' | 'stress') => {
    const recent = rollingMean(diary, field, today, RECENT_DAYS)
    const base = rollingMean(diary, field, today, BASELINE_DAYS)
    const d = drop(recent, base)
    return d == null ? null : { d, recent: recent.mean!, base: base.mean! }
  }

  const sleep = compare('sleepHours')
  if (sleep && sleep.d < -thresholds.sleepDropPct) {
    out.push({ key: 'sleep_below_baseline', values: { recent: sleep.recent, base: sleep.base, pct: Math.abs(sleep.d) } })
  }
  const energy = compare('energy')
  if (energy && energy.d < -thresholds.energyDropPct) {
    out.push({ key: 'energy_below_baseline', values: { recent: energy.recent, base: energy.base, pct: Math.abs(energy.d) } })
  }
  const stress = compare('stress')
  if (stress && stress.d > thresholds.stressRisePct) {
    out.push({ key: 'stress_above_baseline', values: { recent: stress.recent, base: stress.base, pct: stress.d } })
  }

  const trend = weightTrend(diary, today)
  const weight = rollingMean(diary, 'weightKg', today, RECENT_DAYS)
  if (trend != null && weight.mean) {
    const pct = (trend / weight.mean) * 100
    if (Math.abs(pct) > thresholds.weightChangePctWeek) {
      out.push({ key: 'weight_change_fast', values: { kg: trend, pct, limit: thresholds.weightChangePctWeek } })
    }
  }

  const adherence = rollingMean(diary, 'adherence', today, RECENT_DAYS)
  if (adherence.n >= MIN_RECENT && adherence.mean != null && adherence.mean < thresholds.adherenceBelow) {
    out.push({ key: 'adherence_low', values: { recent: adherence.mean, limit: thresholds.adherenceBelow } })
  }

  for (const ex of exerciseSummary(workouts)) {
    if (ex.exerciseKey === 'custom') continue
    const block = blockCompare(workouts, ex.exerciseKey, today)
    if (block.verdict === 'unchanged') {
      out.push({ key: 'plateau', exerciseKey: ex.exerciseKey, values: { current: block.current ?? 0, previous: block.previous ?? 0 } })
    }
  }

  const full = completeness(diary, today, 14) * 100
  const hasAny = diary.some((e) => diaryWindow([e], today, 28).some((w) => w.entry))
  if (hasAny && full < thresholds.minCompletenessPct) {
    out.push({ key: 'data_thin', values: { pct: full, limit: thresholds.minCompletenessPct } })
  }

  return out
}

/** Beschreibende Kennzahlen für den Kopf des Cockpits — Ø7 gegen Ø28. */
export function cockpitOverview(diary: StoredDiaryEntry[], today = toDay(new Date())) {
  const pair = (field: 'sleepHours' | 'energy' | 'weightKg') => ({
    recent: rollingMean(diary, field, today, RECENT_DAYS),
    base: rollingMean(diary, field, today, BASELINE_DAYS),
  })
  const load7 = diaryWindow(diary, today, RECENT_DAYS).reduce((s, w) => s + (w.entry ? dayLoad(w.entry) : 0), 0)
  const load28 = diaryWindow(diary, today, BASELINE_DAYS).reduce((s, w) => s + (w.entry ? dayLoad(w.entry) : 0), 0)
  return {
    sleep: pair('sleepHours'),
    energy: pair('energy'),
    weight: pair('weightKg'),
    load: { recent: load7, baseWeekly: load28 / 4 },
    ratio: acuteChronic(diary, today),
    completeness: completeness(diary, today, 14),
  }
}

// --- Wirkung -----------------------------------------------------------------

export type EffectVerdict = 'above_noise_up' | 'above_noise_down' | 'within_noise' | 'insufficient'

export interface EffectReport {
  verdict: EffectVerdict
  before: { mean: number; n: number } | null
  after: { mean: number; n: number } | null
  /** Änderung in Prozent des Mittels davor. */
  changePercent: number | null
  /** Die typische Schwankung dieser Grösse bei diesem Menschen, in Prozent. */
  typicalErrorPercent: number | null
}

/** Ab so vielen Werten DAVOR lässt sich eine Streuung schätzen; danach reichen zwei. */
export const EFFECT_MIN_BEFORE = 4
export const EFFECT_MIN_AFTER = 2
export const EFFECT_WINDOW_DAYS = 28

/**
 * Mittel danach gegen Mittel davor, gegen die Streuung davor.
 *
 * Die Streuung kommt aus den Differenzen aufeinanderfolgender Werte vor der
 * Entscheidung, geteilt durch √2 — derselbe Weg wie in change.ts. Sie wird
 * an EINEM Wert gemessen und gegen ein MITTEL gehalten: das ist bewusst
 * konservativ. Ein Mittel schwankt weniger als ein Einzelwert; wer es
 * gegen die Einzelwertstreuung hält, übersieht eher eine echte Veränderung,
 * als dass er eine erfindet. Das ist die richtige Richtung.
 */
export function effectReport(before: number[], after: number[]): EffectReport {
  if (before.length < EFFECT_MIN_BEFORE || after.length < EFFECT_MIN_AFTER) {
    return { verdict: 'insufficient', before: summarize(before), after: summarize(after), changePercent: null, typicalErrorPercent: null }
  }
  const b = summarize(before)!
  const a = summarize(after)!
  if (b.mean === 0) return { verdict: 'insufficient', before: b, after: a, changePercent: null, typicalErrorPercent: null }
  const diffs: number[] = []
  for (let i = 1; i < before.length; i++) diffs.push(((before[i] - before[i - 1]) / Math.abs(b.mean)) * 100)
  const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length
  const variance = diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / Math.max(1, diffs.length - 1)
  const typical = Math.sqrt(variance) / Math.SQRT2
  const change = ((a.mean - b.mean) / Math.abs(b.mean)) * 100
  const threshold = typical * DETECTION_FACTOR
  const verdict: EffectVerdict =
    !Number.isFinite(typical) || Math.abs(change) <= threshold ? 'within_noise' : change > 0 ? 'above_noise_up' : 'above_noise_down'
  return { verdict, before: b, after: a, changePercent: change, typicalErrorPercent: Math.round(typical * 100) / 100 }
}

function summarize(xs: number[]): { mean: number; n: number } | null {
  if (xs.length === 0) return null
  return { mean: xs.reduce((s, x) => s + x, 0) / xs.length, n: xs.length }
}

/** Die Zeitreihe einer Messgrösse, je Tag ein Wert, chronologisch. */
export function metricSeries(
  metric: StoredDecision['metric'],
  diary: StoredDiaryEntry[],
  workouts: StoredWorkout[],
  results: StoredResult[],
): { day: string; value: number }[] {
  if (!metric) return []
  if (metric.kind === 'diary') {
    const key = metric.key as 'weightKg' | 'sleepHours' | 'energy' | 'stress' | 'soreness' | 'adherence' | 'load'
    return [...diary]
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((e) => ({ day: e.day, value: key === 'load' ? dayLoad(e) : (e[key] ?? null) }))
      .filter((p): p is { day: string; value: number } => p.value != null && (key !== 'load' || p.value > 0))
  }
  if (metric.kind === 'exercise') {
    return [...workouts]
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((w) => ({ day: w.day, value: bestE1rmInWorkout(w, metric.key) }))
      .filter((p): p is { day: string; value: number } => p.value != null)
  }
  return results
    .filter((r) => r.testSlug === metric.key && r.score != null)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    .map((r) => ({ day: r.performedAt.slice(0, 10), value: r.score as number }))
}

/** Die Wirkung einer Entscheidung: Fenster davor gegen Fenster danach. */
export function decisionEffect(
  decision: StoredDecision,
  diary: StoredDiaryEntry[],
  workouts: StoredWorkout[],
  results: StoredResult[],
  today = toDay(new Date()),
): EffectReport | null {
  if (!decision.metric) return null
  const series = metricSeries(decision.metric, diary, workouts, results)
  const start = shiftDay(decision.decidedOn, -EFFECT_WINDOW_DAYS)
  const end = decision.reviewOn && decision.reviewOn < today ? decision.reviewOn : today
  const before = series.filter((p) => p.day >= start && p.day < decision.decidedOn).map((p) => p.value)
  const after = series.filter((p) => p.day >= decision.decidedOn && p.day <= end).map((p) => p.value)
  return effectReport(before, after)
}

function shiftDay(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000))
}

/** Offene Entscheidungen, deren Überprüfungsdatum verstrichen ist. */
export function overdueDecisions(decisions: StoredDecision[], today = toDay(new Date())): StoredDecision[] {
  return decisions.filter((d) => d.status === 'open' && d.reviewOn != null && d.reviewOn < today)
}
