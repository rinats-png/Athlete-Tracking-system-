import { getTest } from '@/data/testCatalog'
import { changeReport, DETECTION_FACTOR, typicalErrorPercent } from '@/domain/change'
import { overdueDecisions } from '@/domain/cockpit'
import { assessQuality } from '@/domain/dataQuality'
import { completeness, toDay } from '@/domain/diary'
import { recommendations, type Recommendation } from '@/domain/insights'
import { loadSpike, loadSummary } from '@/domain/load'
import { DURABILITY_RULES } from '@/domain/durability'
import { RACE_SIM_RULES } from '@/domain/raceSim'
import { FUELING_RULES } from '@/domain/fueling'
import { confidenceLabel, type ConfidenceLabel } from '@/domain/metricContract'
import { daysOutside, readinessContext } from '@/domain/readinessContext'
import { blockCompare, exerciseSummary } from '@/domain/training'
import type {
  StoredAssessment,
  StoredDecision,
  StoredDiaryEntry,
  StoredInsightState,
  StoredMeal,
  StoredNutrition,
  StoredObservation,
  StoredResult,
  StoredWorkout,
} from '@/lib/store/localStore'
import type { RadarAxis } from '@/types/domain'

/**
 * Insight Engine (Master-Spezifikation G).
 *
 * DETERMINISTISCHE REGELN, NICHTS SONST. Jede Regel hat eine Kennung, eine
 * Fassung, eine Kategorie, eine Schwere und eine Sperrfrist. Sie liest die
 * Daten und liefert entweder nichts oder einen oder mehrere Treffer — mit den
 * Belegen, auf denen er steht, und dem Grund, warum er JETZT erscheint. Es
 * gibt kein Sprachmodell, keine Gewichtung aus dem Nichts, keine Aussage ohne
 * Regel (Produktentscheidung 26.09.2026: ohne KI).
 *
 * DIE GRENZEN AUS insights.ts GELTEN HIER GENAUSO: keine Medizin, keine
 * erfundene Wissenschaft, kein Trainingsplan. Eine Regel sagt «schau hin»
 * oder «prüf nach» — nie «tu das».
 *
 * DER HINWEIS WIRD NICHT GESPEICHERT, nur was der Mensch damit getan hat
 * (`insightState`): bestätigt, verworfen, Sperrfrist. Der Hinweis selbst
 * entsteht bei jedem Öffnen neu aus den Daten. So kann ein Hinweis nicht
 * «hängen bleiben», wenn die Daten ihn nicht mehr tragen.
 *
 * KEINE DUBLETTEN. Der Schlüssel eines Hinweises ist Regel plus Gegenstand
 * (`stale_test:run_5k`). Derselbe Befund zweimal ergibt einen Hinweis, dessen
 * `lastSeenAt` wandert — nicht zwei.
 */

export type InsightCategory =
  | 'performance'
  | 'adaptation'
  | 'load'
  | 'recovery'
  | 'durability'
  | 'nutrition'
  | 'data_quality'
  | 'decision'

export type InsightSeverity = 'info' | 'notice' | 'warning' | 'review'

export interface EvidenceRef {
  kind: 'result' | 'diary' | 'workout' | 'observation' | 'decision' | 'meal' | 'metric' | 'axis'
  /** Kennung des Eintrags, sofern es einen gibt. */
  id?: string
  /** Metrik- oder Feldschlüssel (i18n-fähig). */
  key?: string
  value?: number
  day?: string
}

export interface InsightLink {
  kind: 'test' | 'decision' | 'route'
  target: string
}

export interface RuleHit {
  /** Gegenstand, falls die Regel mehrfach greifen kann (Test, Achse, Übung). */
  subject?: string
  /** Werte für den Satz. */
  values: Record<string, string | number>
  evidence: EvidenceRef[]
  /** i18n-Schlüssel unter `hints.why.*`: warum dieser Hinweis gerade jetzt erscheint. */
  whyNow: string
  /** 0–1: wie gut die Datenlage den Hinweis trägt. */
  confidence: number
  link?: InsightLink
  suggestedTestSlugs?: string[]
}

export interface InsightContext {
  today: string
  axes: RadarAxis[]
  results: StoredResult[]
  assessments: StoredAssessment[]
  profile: { sex: string | null; birthDate: string | null }
  diary: StoredDiaryEntry[]
  workouts: StoredWorkout[]
  decisions: StoredDecision[]
  observations: StoredObservation[]
  meals: StoredMeal[]
  nutrition: StoredNutrition
  /** Ob eine bezahlte Funktion freigeschaltet ist — Regeln über gesperrte Bereiche schweigen. */
  can: (feature: string) => boolean
}

export interface InsightRule {
  id: string
  version: string
  category: InsightCategory
  severity: InsightSeverity
  /** Nach Verwerfen oder Bestätigen: so viele Tage Ruhe. */
  cooldownDays: number
  /** Funktion, ohne die die Regel nicht läuft (z. B. 'decisionLog'). */
  requires?: string
  evaluate(ctx: InsightContext): RuleHit[]
}

export interface Insight extends RuleHit {
  key: string
  ruleId: string
  ruleVersion: string
  category: InsightCategory
  severity: InsightSeverity
  subject: string
  confidenceLabel: ConfidenceLabel | null
  generatedAt: string
  /** Bis wann der Hinweis ohne neue Daten gilt — danach wird er neu bewertet. */
  expiresAt: string
  state: 'new' | 'seen' | 'acknowledged'
}

const SEVERITY_RANK: Record<InsightSeverity, number> = { review: 0, warning: 1, notice: 2, info: 3 }

function shift(day: string, delta: number): string {
  return toDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000))
}

// --- Regeln aus der Datenlage (übernommen aus insights.ts) -------------------
//
// Die Logik bleibt in insights.ts (`recommendations`). Hier wird sie nur in
// die Form einer Regel gebracht — eine Aufgabe, ein Ort.

function fromRecommendation(kind: Recommendation['kind'], subjectOf: (r: Recommendation) => string, whyNow: string) {
  return (ctx: InsightContext): RuleHit[] =>
    recommendations(ctx.axes, ctx.results, ctx.profile, new Date(`${ctx.today}T12:00:00Z`))
      .filter((r) => r.kind === kind)
      .map((r) => ({
        subject: subjectOf(r),
        values: { ...r.values, dimension: r.dimension ?? '' },
        evidence: r.suggestedTestSlugs.map((slug) => ({ kind: 'metric' as const, key: slug })),
        whyNow,
        confidence: r.evidence === 'strong' ? 0.9 : r.evidence === 'moderate' ? 0.6 : 0.3,
        suggestedTestSlugs: r.suggestedTestSlugs,
        link: r.suggestedTestSlugs[0] ? { kind: 'test' as const, target: r.suggestedTestSlugs[0] } : undefined,
      }))
}

const addProfileData: InsightRule = {
  id: 'add_profile_data',
  version: '1.0.0',
  category: 'data_quality',
  severity: 'info',
  cooldownDays: 30,
  evaluate: (ctx) =>
    fromRecommendation('add_profile_data', () => 'profile', 'profile_incomplete')(ctx).map((h) => ({
      ...h,
      link: { kind: 'route', target: '/profil' },
    })),
}

const measureMissingAxis: InsightRule = {
  id: 'measure_missing_axis',
  version: '1.0.0',
  category: 'data_quality',
  severity: 'info',
  cooldownDays: 30,
  evaluate: fromRecommendation('measure_missing_axis', (r) => r.dimension ?? 'axis', 'axis_unmeasured'),
}

const staleTest: InsightRule = {
  id: 'stale_test',
  version: '1.0.0',
  category: 'data_quality',
  severity: 'notice',
  cooldownDays: 30,
  evaluate: fromRecommendation('retest_stale', (r) => r.suggestedTestSlugs[0] ?? 'test', 'test_old'),
}

const deepenAxis: InsightRule = {
  id: 'deepen_axis',
  version: '1.0.0',
  category: 'data_quality',
  severity: 'info',
  cooldownDays: 30,
  evaluate: fromRecommendation('deepen_axis', (r) => r.dimension ?? 'axis', 'single_measurement'),
}

const benchmarkGap: InsightRule = {
  id: 'benchmark_gap',
  version: '1.0.0',
  category: 'performance',
  severity: 'notice',
  cooldownDays: 21,
  evaluate: (ctx) =>
    fromRecommendation('address_limiter', (r) => r.dimension ?? 'axis', 'axis_below_rest')(ctx).map((h) => ({
      ...h,
      link: { kind: 'route', target: '/analyse' },
    })),
}

// --- Messqualität -------------------------------------------------------------

const measurementQualityLow: InsightRule = {
  id: 'measurement_quality_low',
  version: '1.0.0',
  category: 'data_quality',
  severity: 'notice',
  cooldownDays: 14,
  evaluate: (ctx) => {
    // Nur jüngere Messungen: ein fragwürdiger Wert von vor zwei Jahren ist
    // kein Anlass, heute hinzuschauen.
    const since = shift(ctx.today, -60)
    const recent = ctx.results.filter((r) => r.score != null && r.performedAt.slice(0, 10) >= since)
    const flagged = recent.filter((r) => assessQuality(r).status !== 'valid')
    if (flagged.length === 0) return []
    return [
      {
        subject: 'recent',
        values: { count: flagged.length, total: recent.length },
        evidence: flagged.slice(0, 5).map((r) => ({ kind: 'result', id: r.id, key: r.testSlug, day: r.performedAt.slice(0, 10) })),
        whyNow: 'quality_flags_recent',
        confidence: 0.9,
        link: { kind: 'route', target: '/verlauf/werte' },
      },
    ]
  },
}

// --- Leistung ---------------------------------------------------------------------

function seriesOf(results: StoredResult[], slug: string): StoredResult[] {
  return results
    .filter((r) => r.testSlug === slug && r.score != null)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
}

/**
 * Neue Bestleistung — nur, wenn die Messung als gültig gilt (Datenqualität)
 * und jung ist. Eine Bestleistung aus einem fragwürdigen Versuch zu feiern,
 * wäre genau die Scheingenauigkeit, die KYDON vermeiden will.
 */
const performancePr: InsightRule = {
  id: 'performance_pr',
  version: '1.0.0',
  category: 'performance',
  severity: 'info',
  cooldownDays: 14,
  evaluate: (ctx) => {
    const hits: RuleHit[] = []
    const since = shift(ctx.today, -14)
    for (const slug of new Set(ctx.results.map((r) => r.testSlug))) {
      const test = getTest(slug)
      const series = seriesOf(ctx.results, slug)
      if (!test || series.length < 2) continue
      const latest = series[series.length - 1]
      if (latest.performedAt.slice(0, 10) < since || assessQuality(latest).status !== 'valid') continue
      const earlier = series.slice(0, -1).map((r) => r.score as number)
      const lowerIsBetter = test.direction === 'lower_is_better'
      const best = lowerIsBetter ? Math.min(...earlier) : Math.max(...earlier)
      const isPr = lowerIsBetter ? (latest.score as number) < best : (latest.score as number) > best
      if (!isPr) continue
      const change = changeReport(ctx.results, latest)
      hits.push({
        subject: slug,
        values: { previousBest: best, value: latest.score as number, verdict: change.verdict },
        evidence: [{ kind: 'result', id: latest.id, key: slug, value: latest.score as number, day: latest.performedAt.slice(0, 10) }],
        whyNow: change.verdict === 'better' ? 'pr_beyond_noise' : 'pr_within_noise',
        confidence: change.verdict === 'better' ? 0.9 : 0.4,
        link: { kind: 'test', target: slug },
      })
    }
    return hits
  },
}

/**
 * Leistungsrückgang über MEHRERE gültige Messungen — nie aus einer einzelnen.
 *
 * Bezug ist der Median der früheren gültigen Messungen (mindestens vier;
 * aus ihnen stammt auch die Messschwankung).
 * Ein Hinweis entsteht nur, wenn BEIDE jüngsten Messungen weiter darunter
 * liegen, als die eigene Messschwankung erklären kann (typischer Fehler ×
 * 1,96·√2, wie in change.ts). Eine einzelne schwache Messung oder ein
 * Rückgang von einem halben Prozent löst nichts aus.
 */
const performanceRegression: InsightRule = {
  id: 'performance_regression',
  version: '1.1.0',
  category: 'performance',
  severity: 'notice',
  cooldownDays: 21,
  evaluate: (ctx) => {
    const hits: RuleHit[] = []
    for (const slug of new Set(ctx.results.map((r) => r.testSlug))) {
      const test = getTest(slug)
      const series = seriesOf(ctx.results, slug).filter((r) => assessQuality(r).status === 'valid')
      if (!test || series.length < 6) continue
      const recent = series.slice(-2)
      // Die Schwankung aus der Zeit DAVOR: ein echter Rückgang soll seine
      // eigene Schwelle nicht anheben.
      const typical = typicalErrorPercent(series.slice(0, -2), slug)
      if (typical == null) continue
      const detectable = typical * DETECTION_FACTOR
      const baseline = series.slice(0, -2).map((r) => r.score as number)
      const ref = baseline.slice().sort((a, b) => a - b)[Math.floor(baseline.length / 2)]
      if (!ref) continue
      const worseBy = (r: StoredResult) => {
        const raw = (((r.score as number) - ref) / Math.abs(ref)) * 100
        return test.direction === 'lower_is_better' ? raw : -raw
      }
      const drops = recent.map(worseBy)
      if (!drops.every((d) => d > detectable)) continue
      hits.push({
        subject: slug,
        values: { change: -Math.round(Math.max(...drops) * 10) / 10, detectable: Math.round(detectable * 10) / 10 },
        evidence: recent.map((r) => ({ kind: 'result' as const, id: r.id, key: slug, value: r.score as number, day: r.performedAt.slice(0, 10) })),
        whyNow: 'two_declines_beyond_noise',
        confidence: series.length >= 7 ? 0.8 : 0.6,
        link: { kind: 'test', target: slug },
      })
    }
    return hits
  },
}

// --- Belastung und Erholung --------------------------------------------------------

const loadSpikeReview: InsightRule = {
  id: 'load_spike_review',
  version: '1.0.0',
  category: 'load',
  severity: 'review',
  cooldownDays: 7,
  requires: 'loadMonitoring',
  evaluate: (ctx) => {
    const summary = loadSummary(ctx.diary, ctx.today)
    const spike = loadSpike(summary)
    if (!spike.spike) return []
    const week = summary.weeks[summary.weeks.length - 1]
    return [
      {
        subject: week.end,
        values: { load: week.load, typical: summary.typicalWeek ?? 0, pct: spike.pct ?? 0 },
        evidence: [{ kind: 'metric', key: 'load_7d', value: week.load, day: ctx.today }],
        whyNow: 'week_above_own_level',
        confidence: Math.min(1, week.daysWithEntry / 7),
        link: { kind: 'route', target: '/belastung' },
      },
    ]
  },
}

/**
 * Hohe Last UND gleichzeitig mehrere Erholungsmarker ausserhalb der eigenen
 * Bandbreite. Ausdrücklich ein Anlass für ein Gespräch («Review»), keine
 * Diagnose von Übertraining — die Spezifikation schliesst diese Aussage aus.
 */
const loadPlusRecovery: InsightRule = {
  id: 'load_plus_recovery',
  version: '1.0.0',
  category: 'load',
  severity: 'review',
  cooldownDays: 7,
  requires: 'loadMonitoring',
  evaluate: (ctx) => {
    const spike = loadSpike(loadSummary(ctx.diary, ctx.today))
    if (!spike.spike) return []
    const context = readinessContext(ctx.diary, ctx.observations, ctx.today)
    if (context.markers < 2) return []
    return [
      {
        subject: ctx.today.slice(0, 7),
        values: { pct: spike.pct ?? 0, markers: context.markers },
        evidence: context.components.filter((c) => c.marker).map((c) => ({ kind: 'metric' as const, key: c.key, value: c.current ?? undefined, day: c.currentDay ?? undefined })),
        whyNow: 'load_and_markers',
        confidence: Math.min(1, context.assessed / 5),
        link: { kind: 'route', target: '/tagebuch' },
      },
    ]
  },
}

function deviationRule(id: string, key: 'sleepHours' | 'hrv' | 'restingHr', whyNow: string): InsightRule {
  return {
    id,
    version: '1.0.0',
    category: 'recovery',
    severity: 'notice',
    cooldownDays: 7,
    evaluate: (ctx) => {
      // Mehrere Tage, nie ein Einzelwert: mindestens drei der letzten vier
      // Tage mit Wert ausserhalb der eigenen Bandbreite.
      const d = daysOutside(ctx.diary, ctx.observations, key, ctx.today, 4)
      if (d.withValue < 3 || d.outside < 3) return []
      return [
        {
          subject: ctx.today.slice(0, 7),
          values: { days: d.outside, of: d.withValue },
          evidence: [{ kind: 'metric', key, day: ctx.today }],
          whyNow,
          confidence: d.outside / 4,
          link: { kind: 'route', target: '/tagebuch' },
        },
      ]
    },
  }
}

const sleepDeviation = deviationRule('sleep_deviation', 'sleepHours', 'several_days_below')
const hrvDeviation = deviationRule('hrv_deviation', 'hrv', 'several_days_below')
const rhrDeviation = deviationRule('rhr_deviation', 'restingHr', 'several_days_above')

const dataIncomplete: InsightRule = {
  id: 'data_incomplete',
  version: '1.0.0',
  category: 'data_quality',
  severity: 'info',
  cooldownDays: 14,
  evaluate: (ctx) => {
    if (ctx.diary.length === 0) return []
    const oldest = ctx.diary.reduce((m, e) => (e.day < m ? e.day : m), ctx.diary[0].day)
    // Erst ab 14 Tagen Tagebuch: wer gestern angefangen hat, hat eine junge
    // Datenlage, keine dünne.
    if (oldest > shift(ctx.today, -13)) return []
    const pct = Math.round(completeness(ctx.diary, ctx.today, 14) * 100)
    if (pct >= 50) return []
    return [
      {
        subject: 'diary',
        values: { pct },
        evidence: [{ kind: 'metric', key: 'diary_completeness', value: pct, day: ctx.today }],
        whyNow: 'diary_sparse',
        confidence: 1,
        link: { kind: 'route', target: '/tagebuch' },
      },
    ]
  },
}

// --- Training und Entscheidungen -----------------------------------------------------

const strengthPlateau: InsightRule = {
  id: 'strength_plateau',
  version: '1.0.0',
  category: 'adaptation',
  severity: 'info',
  cooldownDays: 21,
  requires: 'trainingLog',
  evaluate: (ctx) =>
    exerciseSummary(ctx.workouts)
      .filter((ex) => ex.exerciseKey !== 'custom')
      .flatMap((ex) => {
        const block = blockCompare(ctx.workouts, ex.exerciseKey, ctx.today)
        if (block.verdict !== 'unchanged') return []
        return [
          {
            subject: ex.exerciseKey,
            values: { exercise: ex.exerciseKey, current: Math.round(block.current ?? 0), previous: Math.round(block.previous ?? 0) },
            evidence: [{ kind: 'metric' as const, key: `e1rm:${ex.exerciseKey}`, value: block.current ?? undefined }],
            whyNow: 'e1rm_flat_two_blocks',
            confidence: 0.6,
            link: { kind: 'route' as const, target: '/training' },
          },
        ]
      }),
}

const decisionReviewDue: InsightRule = {
  id: 'decision_review_due',
  version: '1.0.0',
  category: 'decision',
  severity: 'review',
  cooldownDays: 3,
  requires: 'decisionLog',
  evaluate: (ctx) =>
    overdueDecisions(ctx.decisions, ctx.today).map((d) => ({
      subject: d.id,
      values: { reviewOn: d.reviewOn ?? '', decision: d.decision.slice(0, 80) },
      evidence: [{ kind: 'decision', id: d.id, day: d.reviewOn ?? undefined }],
      whyNow: 'review_date_passed',
      confidence: 1,
      link: { kind: 'decision', target: d.id },
    })),
}

/**
 * Das Register. Neue Regeln hinten anhängen; eine geänderte Regel bekommt
 * eine neue `version` — so bleibt nachvollziehbar, welche Fassung einen
 * Hinweis erzeugt hat.
 */
export const INSIGHT_RULES: InsightRule[] = [
  addProfileData,
  measureMissingAxis,
  staleTest,
  deepenAxis,
  measurementQualityLow,
  benchmarkGap,
  performancePr,
  performanceRegression,
  loadSpikeReview,
  loadPlusRecovery,
  sleepDeviation,
  hrvDeviation,
  rhrDeviation,
  dataIncomplete,
  strengthPlateau,
  decisionReviewDue,
  ...DURABILITY_RULES,
  ...RACE_SIM_RULES,
  ...FUELING_RULES,
]

/** Weitere Regeln aus Fachmodulen (Durability, HYROX, Ernährung) melden sich hier an. */
export function registerRules(rules: InsightRule[]): void {
  for (const rule of rules) {
    if (!INSIGHT_RULES.some((r) => r.id === rule.id)) INSIGHT_RULES.push(rule)
  }
}

export interface InsightRun {
  /** Offene Hinweise, wichtigste zuerst. */
  active: Insight[]
  /** Bestätigte Hinweise, deren Befund noch besteht. */
  acknowledged: Insight[]
  /** Wie viele Hinweise wegen Verwerfen in der Sperrfrist ruhen. */
  suppressed: number
}

/**
 * Alle Regeln laufen lassen und mit dem gespeicherten Zustand abgleichen.
 *
 * Eine Regel, die wirft, fällt still aus — ein Fehler in einer Regel darf
 * die übrigen Hinweise nicht mitnehmen. (In den Prüffällen fällt er auf.)
 */
export function runInsights(ctx: InsightContext, state: StoredInsightState[], rules: InsightRule[] = INSIGHT_RULES): InsightRun {
  const byKey = new Map(state.map((s) => [s.key, s]))
  const now = `${ctx.today}T12:00:00.000Z`
  const active: Insight[] = []
  const acknowledged: Insight[] = []
  let suppressed = 0
  const seen = new Set<string>()

  for (const rule of rules) {
    if (rule.requires && !ctx.can(rule.requires)) continue
    let hits: RuleHit[] = []
    try {
      hits = rule.evaluate(ctx)
    } catch {
      hits = []
    }
    for (const hit of hits) {
      const subject = hit.subject ?? 'all'
      const key = `${rule.id}:${subject}`
      if (seen.has(key)) continue
      seen.add(key)
      const saved = byKey.get(key)
      const inCooldown = saved?.cooldownUntil != null && saved.cooldownUntil >= ctx.today
      if (saved?.dismissedAt && inCooldown) {
        suppressed++
        continue
      }
      const insight: Insight = {
        ...hit,
        key,
        ruleId: rule.id,
        ruleVersion: rule.version,
        category: rule.category,
        severity: rule.severity,
        subject,
        confidenceLabel: confidenceLabel(hit.confidence),
        generatedAt: now,
        expiresAt: shift(ctx.today, rule.cooldownDays),
        state: saved?.acknowledgedAt && inCooldown ? 'acknowledged' : saved ? 'seen' : 'new',
      }
      if (insight.state === 'acknowledged') acknowledged.push(insight)
      else active.push(insight)
    }
  }

  active.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (b.confidence ?? 0) - (a.confidence ?? 0) ||
      a.key.localeCompare(b.key),
  )
  return { active, acknowledged, suppressed }
}

export type InsightAction = 'seen' | 'acknowledge' | 'dismiss'

/**
 * Den Zustand nach einer Handlung fortschreiben.
 *
 * - `seen`: der Hinweis wurde angezeigt; nur `lastSeenAt` wandert.
 * - `acknowledge`: bestätigt («gesehen, kümmere mich»), ruht die Sperrfrist
 *   der Regel lang in der Liste «erledigt».
 * - `dismiss`: verworfen, erscheint während der Sperrfrist gar nicht.
 *
 * Nach Ablauf der Sperrfrist erscheint ein Hinweis wieder — aber nur, wenn
 * die Daten ihn dann noch tragen.
 */
export function applyInsightAction(
  state: StoredInsightState[],
  insight: Pick<Insight, 'key' | 'ruleId' | 'ruleVersion'>,
  action: InsightAction,
  cooldownDays: number,
  now: Date = new Date(),
): StoredInsightState[] {
  const iso = now.toISOString()
  const today = toDay(now)
  const existing = state.find((s) => s.key === insight.key)
  const base: StoredInsightState = existing ?? {
    key: insight.key,
    ruleId: insight.ruleId,
    ruleVersion: insight.ruleVersion,
    firstSeenAt: iso,
    lastSeenAt: iso,
    acknowledgedAt: null,
    dismissedAt: null,
    cooldownUntil: null,
  }
  const next: StoredInsightState = { ...base, ruleVersion: insight.ruleVersion, lastSeenAt: iso }
  if (action === 'acknowledge') {
    next.acknowledgedAt = iso
    next.dismissedAt = null
    next.cooldownUntil = shift(today, cooldownDays)
  } else if (action === 'dismiss') {
    next.dismissedAt = iso
    next.cooldownUntil = shift(today, cooldownDays)
  }
  const rest = state.filter((s) => s.key !== insight.key)
  // Obergrenze des Schemas: die ältesten Einträge ohne laufende Sperrfrist gehen zuerst.
  const merged = [next, ...rest]
  if (merged.length <= 500) return merged
  return merged
    .sort((a, b) => (b.cooldownUntil ?? '').localeCompare(a.cooldownUntil ?? '') || b.lastSeenAt.localeCompare(a.lastSeenAt))
    .slice(0, 500)
}

export function ruleById(id: string): InsightRule | undefined {
  return INSIGHT_RULES.find((r) => r.id === id)
}
