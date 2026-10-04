import { changeReport, type ChangeReport } from '@/domain/change'
import type { BlockPlan } from '@/domain/trainingPlan'
import type { SportFamily, Phase } from '@/domain/trainingTypes'
import type { StoredPlanCompletion, StoredPlannedSession, StoredResult, StoredTrainingBlock } from '@/lib/store/localStore'

/**
 * Trainingsblock: Übernahme eines Plans, Coach Override, Wochenprüfung und
 * Block-Bericht (docs/training-engine.md, Nachtrag 1 der Doktrin).
 *
 * Reine Funktionen. Der Bericht urteilt nur gegen den Messfehler (`change.ts`);
 * ein nicht gemessener Retest steht als offen da, nie als Misserfolg.
 */

const DAY = 86_400_000
const dayNum = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY
const dayStr = (n: number) => new Date(n * DAY).toISOString().slice(0, 10)
/** 1 = Montag … 7 = Sonntag. */
export const weekdayOf = (day: string): number => ((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7) + 1

/** Der Block beginnt immer an einem Montag: der Wochentag einer Einheit bleibt so eindeutig. */
export const mondayOnOrAfter = (day: string): string => {
  const wd = weekdayOf(day)
  return wd === 1 ? day : dayStr(dayNum(day) + (8 - wd))
}

export const blockEndDay = (b: Pick<StoredTrainingBlock, 'startDay' | 'weeks'>): string => dayStr(dayNum(b.startDay) + b.weeks * 7 - 1)

export function adoptBlock(plan: BlockPlan, ctx: { id: string; family: SportFamily; disciplineId: string | null; phase: Phase; startDay: string; now: string }): StoredTrainingBlock {
  return {
    id: ctx.id,
    family: ctx.family,
    disciplineId: ctx.disciplineId,
    phase: ctx.phase,
    startDay: mondayOnOrAfter(ctx.startDay),
    weeks: plan.weeks,
    retestMetrics: plan.retest.metrics,
    templateId: null,
    eventDay: null,
    sessions: plan.sessions.map((s) => ({
      id: s.id,
      day: s.day,
      weekFrom: 1,
      weekTo: null,
      kind: 'rule',
      ruleId: s.ruleId,
      ruleVersion: s.ruleVersion,
      primaryIntent: s.primaryIntent,
      evidenceStrength: s.evidenceStrength,
      evidenceSpecificity: s.evidenceSpecificity,
      plannedDurationMin: s.plannedDurationMin,
      highIntensity: s.highIntensity,
      blocks: s.blocks as StoredPlannedSession['blocks'],
      retestMetric: s.retestMetric,
      coachModified: false,
      coachModificationReason: null,
      removed: false,
    })),
    completions: [],
    status: 'active',
    createdAt: ctx.now,
    updatedAt: ctx.now,
  }
}

/** Gilt die Einheit in dieser Blockwoche? Vorlagen mit Phasen schalten Einheiten wochenweise zu. */
export const sessionInWeek = (s: Pick<StoredPlannedSession, 'weekFrom' | 'weekTo'>, week: number, blockWeeks: number): boolean => week >= s.weekFrom && week <= (s.weekTo ?? blockWeeks)

/** Wie viele Einheiten (ohne gestrichene) der Block insgesamt vorsieht. */
export const plannedTotal = (block: Pick<StoredTrainingBlock, 'sessions' | 'weeks'>): number =>
  Array.from({ length: block.weeks }, (_, i) => block.sessions.filter((s) => !s.removed && sessionInWeek(s, i + 1, block.weeks)).length).reduce((a, b) => a + b, 0)

export type OverrideResult = { ok: true; block: StoredTrainingBlock } | { ok: false; error: 'reason_required' | 'unknown_session' | 'day_taken' | 'nothing_changed' }

/**
 * Coach Override: Tag ändern oder Einheit streichen. Jede Änderung braucht
 * einen Grund; ohne Grund wird sie abgewiesen. Zwei Schlüsseleinheiten an
 * einem Tag nimmt die App nicht an (Planungsregel 1).
 */
export function overrideSession(block: StoredTrainingBlock, sessionId: string, change: { day?: number; removed?: boolean }, reason: string, now: string): OverrideResult {
  const session = block.sessions.find((s) => s.id === sessionId)
  if (!session) return { ok: false, error: 'unknown_session' }
  const why = reason.trim()
  if (why.length === 0) return { ok: false, error: 'reason_required' }
  const day = change.day ?? session.day
  const removed = change.removed ?? session.removed
  if (day === session.day && removed === session.removed) return { ok: false, error: 'nothing_changed' }
  const overlap = (a: StoredPlannedSession, b: StoredPlannedSession) => a.weekFrom <= (b.weekTo ?? block.weeks) && b.weekFrom <= (a.weekTo ?? block.weeks)
  if (!removed && block.sessions.some((s) => s.id !== sessionId && !s.removed && s.day === day && overlap(s, session))) return { ok: false, error: 'day_taken' }
  return {
    ok: true,
    block: {
      ...block,
      updatedAt: now,
      sessions: block.sessions.map((s) => (s.id === sessionId ? { ...s, day, removed, coachModified: true, coachModificationReason: why.slice(0, 200) } : s)),
    },
  }
}

/** Welche Woche des Blocks ist heute? `before`/`after` außerhalb. */
export function blockWeek(block: Pick<StoredTrainingBlock, 'startDay' | 'weeks'>, today: string): number | 'before' | 'after' {
  const offset = dayNum(today) - dayNum(block.startDay)
  if (offset < 0) return 'before'
  const w = Math.floor(offset / 7) + 1
  return w > block.weeks ? 'after' : w
}

const sessionDate = (block: Pick<StoredTrainingBlock, 'startDay'>, week: number, weekday: number): string => dayStr(dayNum(block.startDay) + (week - 1) * 7 + (weekday - 1))

const isDone = (block: StoredTrainingBlock, sessionId: string, date: string): StoredPlanCompletion | undefined => block.completions.find((c) => c.sessionId === sessionId && c.day === date)

/** Offene Einheiten an einem Kalendertag, im Zeitraum des Blocks. */
export function openSessionsOn(block: StoredTrainingBlock, today: string): StoredPlannedSession[] {
  if (block.status !== 'active') return []
  const w = blockWeek(block, today)
  if (typeof w !== 'number') return []
  const wd = weekdayOf(today)
  return block.sessions.filter((s) => !s.removed && s.day === wd && sessionInWeek(s, w, block.weeks) && !isDone(block, s.id, today))
}

export interface WeekCheck {
  week: number
  planned: number
  done: number
}

/** Wochenprüfung: geplante gegen erledigte Einheiten, nur Zählung. */
export function weekChecks(block: StoredTrainingBlock, today: string): WeekCheck[] {
  const current = blockWeek(block, today)
  const upTo = current === 'before' ? 0 : current === 'after' ? block.weeks : current
  const active = block.sessions.filter((s) => !s.removed)
  return Array.from({ length: upTo }, (_, i) => {
    const week = i + 1
    const inWeek = active.filter((s) => sessionInWeek(s, week, block.weeks))
    const done = inWeek.filter((s) => isDone(block, s.id, sessionDate(block, week, s.day))).length
    return { week, planned: inWeek.length, done }
  })
}

export interface MetricReport {
  metric: string
  status: 'open' | 'measured'
  report: ChangeReport | null
}
export interface BlockReport {
  planned: number
  done: number
  metrics: MetricReport[]
  /** Der Block ist zu Ende oder abgeschlossen: erst dann wird eine Messung als fehlend gezählt. */
  finished: boolean
}

/**
 * Block-Bericht: wie viele Einheiten liefen, und was zeigt die Messung am
 * Blockende. Gemessen gilt eine Messung des Tests im Zeitraum der letzten
 * Blockwoche bis zwei Wochen danach; verglichen wird mit der Messung davor
 * gegen den typischen Messfehler (`changeReport`).
 */
export function blockReport(block: StoredTrainingBlock, results: StoredResult[], today: string): BlockReport {
  const done = block.completions.length
  const planned = plannedTotal(block)
  const from = dayNum(block.startDay) + (block.weeks - 1) * 7
  const to = dayNum(block.startDay) + block.weeks * 7 + 14
  const finished = block.status === 'closed' || blockWeek(block, today) === 'after'
  const metrics = block.retestMetrics.map<MetricReport>((metric) => {
    const final = results
      .filter((r) => r.testSlug === metric && r.score != null && dayNum(r.performedAt.slice(0, 10)) >= from && dayNum(r.performedAt.slice(0, 10)) <= to)
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0]
    return final ? { metric, status: 'measured', report: changeReport(results, final) } : { metric, status: 'open', report: null }
  })
  return { planned, done, metrics, finished }
}

/** Der Block, der gezeigt wird: der aktive, sonst der zuletzt geänderte abgeschlossene. */
export function shownBlock(blocks: StoredTrainingBlock[]): StoredTrainingBlock | null {
  return blocks.find((b) => b.status === 'active') ?? [...blocks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
}

/** Reihenfolge der Phasen für den nächsten Block. Der Taper hängt an einem Wettkampftermin und wird nicht vorgeschlagen. */
const NEXT_PHASE: Record<Phase, Phase> = { GPP: 'BUILD', BUILD: 'SPECIFIC', SPECIFIC: 'SPECIFIC', TAPER: 'TRANSITION', TRANSITION: 'GPP' }

export interface NextBlockSuggestion {
  phase: Phase
  /** Messungen, die den Block nicht belegt verändert haben oder noch fehlen: bleiben als offene Lücke. */
  unproven: string[]
  missing: string[]
}

/**
 * ADAPT: was für den nächsten Block bleibt. Die Lücken selbst kommen beim
 * Planen aus den neuen Messungen (`requirementGap`); hier steht nur, welche
 * Retests nichts belegt haben oder fehlen, und die nächste Phase als Vorschlag.
 */
export function nextBlockSuggestion(block: StoredTrainingBlock, report: BlockReport): NextBlockSuggestion {
  return {
    phase: NEXT_PHASE[block.phase],
    unproven: report.metrics.filter((m) => m.status === 'measured' && m.report && m.report.verdict !== 'better').map((m) => m.metric),
    missing: report.metrics.filter((m) => m.status === 'open').map((m) => m.metric),
  }
}
