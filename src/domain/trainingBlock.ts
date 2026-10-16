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

/** Felder, die erst mit Schema 41/42 kamen (Bibliothekspläne, Versionen, verschobene Termine); für Blöcke anderer Herkunft leer. */
export const BLOCK_V41_DEFAULTS: Pick<StoredTrainingBlock, 'libraryPlanId' | 'libraryVersion' | 'planVersion' | 'adjustments' | 'moves'> = { libraryPlanId: null, libraryVersion: null, planVersion: 1, adjustments: [], moves: [] }

export const blockEndDay = (b: Pick<StoredTrainingBlock, 'startDay' | 'weeks'>): string => dayStr(dayNum(b.startDay) + b.weeks * 7 - 1)

export function adoptBlock(plan: BlockPlan, ctx: { id: string; family: SportFamily; disciplineId: string | null; phase: Phase; startDay: string; now: string }): StoredTrainingBlock {
  return {
    ...BLOCK_V41_DEFAULTS,
    id: ctx.id,
    family: ctx.family,
    name: '',
    disciplineId: ctx.disciplineId,
    phase: ctx.phase,
    startDay: mondayOnOrAfter(ctx.startDay),
    weeks: plan.weeks,
    retestMetrics: plan.retest.metrics,
    templateId: null,
    eventDay: null,
    assignmentId: null,
    sessions: plan.sessions.map((s) => ({
      id: s.id,
      day: s.day,
      weekFrom: 1,
      weekTo: null,
      kind: 'rule',
      title: '',
      note: '',
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
      // Die Serie bekommt einen neuen Wochentag: einzeln verschobene Termine dieser Einheit hängen am alten und fallen weg.
      moves: (block.moves ?? []).filter((m) => m.sessionId !== sessionId),
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

/** Erledigt? Ein Termin heißt nach seinem geplanten Tag; wer verschoben trainiert hat, trägt ihn in `planDay`. */
const isDone = (block: StoredTrainingBlock, sessionId: string, planned: string): StoredPlanCompletion | undefined =>
  block.completions.find((c) => c.sessionId === sessionId && (c.planDay ?? c.day) === planned)

/* ---------- Termine: Einheiten mit echtem Datum (Kalender) ---------- */

/**
 * Ein Termin: eine Einheit in einer Blockwoche. `planned` ist der Tag aus dem
 * Plan, `date` der Tag, an dem sie jetzt liegt (nach einem Verschieben).
 */
export interface Occurrence {
  session: StoredPlannedSession
  week: number
  planned: string
  date: string
  moved: boolean
  done: boolean
}

/** Alle Termine des Blocks, nach Datum sortiert (gestrichene fehlen). */
export function occurrences(block: StoredTrainingBlock): Occurrence[] {
  const moves = block.moves ?? []
  const out: Occurrence[] = []
  for (let week = 1; week <= block.weeks; week++) {
    for (const session of block.sessions) {
      if (session.removed || !sessionInWeek(session, week, block.weeks)) continue
      const planned = sessionDate(block, week, session.day)
      const move = moves.find((m) => m.sessionId === session.id && m.from === planned)
      out.push({ session, week, planned, date: move?.to ?? planned, moved: move != null, done: isDone(block, session.id, planned) != null })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.session.day - b.session.day)
}

/** Termine an einem Kalendertag. */
export const occurrencesOn = (block: StoredTrainingBlock, date: string): Occurrence[] => occurrences(block).filter((o) => o.date === date)

/** Offene Termine an einem Tag (aktiver Block). */
export function openOccurrencesOn(block: StoredTrainingBlock, today: string): Occurrence[] {
  if (block.status !== 'active') return []
  return occurrencesOn(block, today).filter((o) => !o.done)
}

/** Offene Einheiten an einem Kalendertag — nach ihrem jetzigen Termin, auch wenn er verschoben wurde. */
export function openSessionsOn(block: StoredTrainingBlock, today: string): StoredPlannedSession[] {
  return openOccurrencesOn(block, today).map((o) => o.session)
}

/** Verpasste Termine: vor heute, nicht erledigt. Sie lassen sich nachholen (verschieben), nie stillschweigend. */
export function missedOccurrences(block: StoredTrainingBlock, today: string): Occurrence[] {
  if (block.status !== 'active') return []
  return occurrences(block).filter((o) => !o.done && o.date < today)
}

/**
 * Offene Termine zum Durchführen: heute, verpasste (jüngste zuerst) und die
 * kommenden bis `horizonDays` voraus. Jede lässt sich heute erledigen; der
 * Abschluss zählt für ihren Plantermin (`planDay`), nicht für heute.
 */
export function openToDo(block: StoredTrainingBlock, today: string, horizonDays = 14): { today: Occurrence[]; missed: Occurrence[]; upcoming: Occurrence[] } {
  if (block.status !== 'active') return { today: [], missed: [], upcoming: [] }
  const limit = addDays(today, horizonDays)
  const open = occurrences(block).filter((o) => !o.done)
  return {
    today: open.filter((o) => o.date === today),
    missed: open.filter((o) => o.date < today).reverse(),
    upcoming: open.filter((o) => o.date > today && o.date <= limit),
  }
}

/** Einen offenen Termin finden (für den Player: «diese Einheit jetzt»). */
export function findOpenOccurrence(block: StoredTrainingBlock, sessionId: string, planned: string): Occurrence | null {
  if (block.status !== 'active') return null
  return occurrences(block).find((o) => o.session.id === sessionId && o.planned === planned && !o.done) ?? null
}

/** Wie weit ein Termin nach Blockende noch liegen darf: zwei Wochen zum Nachholen. */
export const MOVE_GRACE_DAYS = 14

export type MoveError = 'unknown_occurrence' | 'done' | 'past' | 'out_of_range' | 'two_key' | 'nothing_changed'
export type MoveWarning = 'key_adjacent' | 'event_close' | 'crowded' | 'outside_block'

/**
 * Hinweise zu einem Zieltag, bevor jemand verschiebt — sie sperren nicht, sie
 * sagen, worauf zu achten ist: zwei harte Tage hintereinander, zu nah am
 * Wettkampf, ein voller Tag, ein Tag außerhalb des Blocks.
 */
export function moveWarnings(block: StoredTrainingBlock, sessionId: string, planned: string, to: string): MoveWarning[] {
  const all = occurrences(block)
  const self = all.find((o) => o.session.id === sessionId && o.planned === planned)
  if (!self) return []
  const others = all.filter((o) => o !== self)
  const out: MoveWarning[] = []
  const near = (d: string, n: number) => Math.abs(dayNum(d) - dayNum(to)) <= n
  if (self.session.highIntensity && others.some((o) => o.session.highIntensity && o.date !== to && near(o.date, 1))) out.push('key_adjacent')
  if (block.eventDay && dayNum(to) <= dayNum(block.eventDay) && near(block.eventDay, self.session.highIntensity ? 2 : 0)) out.push('event_close')
  if (others.filter((o) => o.date === to).length >= 2) out.push('crowded')
  if (to < block.startDay || to > blockEndDay(block)) out.push('outside_block')
  return out
}

/**
 * Einen einzelnen Termin verschieben (Kalender). Frei: jeder Tag von heute bis
 * zwei Wochen nach Blockende. Gesperrt sind nur Erledigtes, die Vergangenheit
 * und zwei Schlüsseleinheiten an einem Tag (Planungsregel 1). Zurück auf den
 * geplanten Tag löscht die Verschiebung.
 */
export function moveOccurrence(block: StoredTrainingBlock, sessionId: string, planned: string, to: string, today: string, now: string): { ok: true; block: StoredTrainingBlock } | { ok: false; error: MoveError } {
  const all = occurrences(block)
  const self = all.find((o) => o.session.id === sessionId && o.planned === planned)
  if (!self) return { ok: false, error: 'unknown_occurrence' }
  if (self.done) return { ok: false, error: 'done' }
  if (to === self.date) return { ok: false, error: 'nothing_changed' }
  if (to < today) return { ok: false, error: 'past' }
  if (dayNum(to) > dayNum(blockEndDay(block)) + MOVE_GRACE_DAYS) return { ok: false, error: 'out_of_range' }
  if (self.session.highIntensity && all.some((o) => o !== self && o.date === to && o.session.highIntensity)) return { ok: false, error: 'two_key' }
  const rest = (block.moves ?? []).filter((m) => !(m.sessionId === sessionId && m.from === planned))
  const moves = to === planned ? rest : [...rest, { sessionId, from: planned, to, at: now }]
  return { ok: true, block: { ...block, moves: moves.slice(-400), updatedAt: now } }
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

export interface CalendarCell {
  /** 1 = Montag … 7 = Sonntag. */
  weekday: number
  date: string
  sessions: { session: StoredPlannedSession; done: boolean }[]
}

/** Eine Blockwoche als sieben Tage mit ihren Einheiten (gestrichene fehlen, Wochenspanne beachtet, Verschiebungen eingerechnet). */
export function calendarWeek(block: StoredTrainingBlock, week: number): CalendarCell[] {
  return calendarDays(block, sessionDate(block, week, 1), 7).map((c) => ({ weekday: c.weekday, date: c.date, sessions: c.items.map((o) => ({ session: o.session, done: o.done })) }))
}

export interface CalendarDay {
  weekday: number
  date: string
  items: Occurrence[]
}

/** `count` Kalendertage ab `from`, je mit ihren Terminen — unabhängig von Blockwochen. */
export function calendarDays(block: StoredTrainingBlock, from: string, count: number): CalendarDay[] {
  const all = occurrences(block)
  return Array.from({ length: count }, (_, i) => {
    const date = dayStr(dayNum(from) + i)
    return { weekday: weekdayOf(date), date, items: all.filter((o) => o.date === date) }
  })
}

/** Montag der Woche, in der `day` liegt. */
export const mondayOf = (day: string): string => dayStr(dayNum(day) - (weekdayOf(day) - 1))
/** Tag plus/minus `n` Tage. */
export const addDays = (day: string, n: number): string => dayStr(dayNum(day) + n)

/* ---------- Eigener Plan (Trainingsbereich Etappe 4) ---------- */

export interface OwnBlockInput {
  id: string
  name: string
  family: SportFamily | null
  disciplineId: string | null
  phase: Phase
  weeks: number
  startDay: string
  now: string
}

/** Leerer eigener Plan: Name, Länge, Phase und Start sind die Entscheidung des Menschen; keine Regel, keine Evidenzangabe. */
export function createOwnBlock(i: OwnBlockInput): StoredTrainingBlock {
  return {
    ...BLOCK_V41_DEFAULTS,
    adjustments: [],
    id: i.id,
    name: i.name.trim().slice(0, 60),
    family: i.family,
    disciplineId: i.disciplineId,
    phase: i.phase,
    startDay: mondayOnOrAfter(i.startDay),
    weeks: Math.min(26, Math.max(1, Math.round(i.weeks))),
    retestMetrics: [],
    templateId: null,
    eventDay: null,
    assignmentId: null,
    sessions: [],
    completions: [],
    status: 'active',
    createdAt: i.now,
    updatedAt: i.now,
  }
}

export interface OwnSessionInput {
  id: string
  day: number
  intent: string
  title: string
  note: string
  minutes: number | null
  weekFrom: number
  weekTo: number | null
  highIntensity: boolean
}
export type EditResult = { ok: true; block: StoredTrainingBlock } | { ok: false; error: 'bad_weeks' | 'day_taken' | 'unknown_session' | 'no_intent' }

const overlaps = (a: Pick<StoredPlannedSession, 'weekFrom' | 'weekTo'>, b: Pick<StoredPlannedSession, 'weekFrom' | 'weekTo'>, weeks: number) => a.weekFrom <= (b.weekTo ?? weeks) && b.weekFrom <= (a.weekTo ?? weeks)

/** Eigene Einheit hinzufügen. Zwei Einheiten am selben Tag in denselben Wochen nimmt die App nicht an. */
export function addOwnSession(block: StoredTrainingBlock, i: OwnSessionInput, now: string): EditResult {
  if (!i.intent) return { ok: false, error: 'no_intent' }
  const weekTo = i.weekTo ?? null
  if (i.weekFrom < 1 || i.weekFrom > block.weeks || (weekTo != null && (weekTo < i.weekFrom || weekTo > block.weeks))) return { ok: false, error: 'bad_weeks' }
  const s: StoredPlannedSession = {
    id: i.id,
    day: i.day,
    weekFrom: i.weekFrom,
    weekTo,
    kind: 'own',
    title: i.title.trim().slice(0, 60),
    note: i.note.trim().slice(0, 200),
    ruleId: null,
    ruleVersion: null,
    primaryIntent: i.intent,
    evidenceStrength: null,
    evidenceSpecificity: null,
    plannedDurationMin: i.minutes != null && i.minutes >= 1 ? Math.min(600, Math.round(i.minutes)) : null,
    highIntensity: i.highIntensity,
    blocks: [],
    retestMetric: '',
    coachModified: false,
    coachModificationReason: null,
    removed: false,
  }
  if (block.sessions.some((x) => !x.removed && x.day === s.day && overlaps(x, s, block.weeks))) return { ok: false, error: 'day_taken' }
  return { ok: true, block: { ...block, sessions: [...block.sessions, s], updatedAt: now } }
}

/** Einheit auf einen anderen Tag kopieren (gleiche Wochen); die Kopie ist eine eigene Einheit. */
export function duplicateSession(block: StoredTrainingBlock, sessionId: string, day: number, newId: string, now: string): EditResult {
  const src = block.sessions.find((s) => s.id === sessionId && !s.removed)
  if (!src) return { ok: false, error: 'unknown_session' }
  const copy: StoredPlannedSession = { ...src, id: newId, day, coachModified: false, coachModificationReason: null }
  if (block.sessions.some((x) => !x.removed && x.day === day && overlaps(x, copy, block.weeks))) return { ok: false, error: 'day_taken' }
  return { ok: true, block: { ...block, sessions: [...block.sessions, copy], updatedAt: now } }
}

/** Eigene Einheit löschen. Nur `own`: Einheiten aus Regeln oder Vorlagen werden gestrichen (Override mit Grund). */
export function deleteOwnSession(block: StoredTrainingBlock, sessionId: string, now: string): EditResult {
  const s = block.sessions.find((x) => x.id === sessionId)
  if (!s || s.kind !== 'own') return { ok: false, error: 'unknown_session' }
  return { ok: true, block: { ...block, sessions: block.sessions.filter((x) => x.id !== sessionId), updatedAt: now } }
}

/**
 * Woche kopieren: alle Einheiten, die in `from` gelten, gelten auch in `to`.
 * Eine Einheit mit Wochenspanne wird dafür auf eine eigene Kopie für `to`
 * gesetzt; belegte Tage in `to` werden übersprungen und gemeldet.
 */
export function copyWeek(block: StoredTrainingBlock, from: number, to: number, newId: () => string, now: string): { block: StoredTrainingBlock; copied: number; skipped: number } {
  let copied = 0
  let skipped = 0
  let sessions = block.sessions
  for (const s of block.sessions.filter((x) => !x.removed && sessionInWeek(x, from, block.weeks))) {
    if (sessionInWeek(s, to, block.weeks)) continue
    const copy: StoredPlannedSession = { ...s, id: newId(), weekFrom: to, weekTo: to, coachModified: false, coachModificationReason: null }
    if (sessions.some((x) => !x.removed && x.day === copy.day && overlaps(x, copy, block.weeks))) {
      skipped++
      continue
    }
    sessions = [...sessions, copy]
    copied++
  }
  return { block: copied > 0 ? { ...block, sessions, updatedAt: now } : block, copied, skipped }
}

export interface ExerciseInput {
  exerciseKey: string | null
  name: string
  sets: number
  reps: number | null
  load: string
}
export type ExerciseResult = { ok: true; block: StoredTrainingBlock } | { ok: false; error: 'unknown_session' | 'no_name' | 'too_many' | 'bad_sets' }

/** Übung zu einer EIGENEN Einheit. Einheiten aus Regeln behalten ihre Dosis; dort wählt der Trainer die Übung nicht über diesen Weg. */
export function addExercise(block: StoredTrainingBlock, sessionId: string, e: ExerciseInput, now: string): ExerciseResult {
  const s = block.sessions.find((x) => x.id === sessionId)
  if (!s || s.kind !== 'own') return { ok: false, error: 'unknown_session' }
  const name = e.name.trim().slice(0, 60)
  if (!name) return { ok: false, error: 'no_name' }
  if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 20 || (e.reps != null && (!Number.isInteger(e.reps) || e.reps < 1 || e.reps > 100))) return { ok: false, error: 'bad_sets' }
  if (s.blocks.length >= 10) return { ok: false, error: 'too_many' }
  const part = { type: 'exercise' as const, exerciseKey: e.exerciseKey, name, sets: e.sets, reps: e.reps, load: e.load.trim().slice(0, 30) }
  return { ok: true, block: { ...block, updatedAt: now, sessions: block.sessions.map((x) => (x.id === sessionId ? { ...x, blocks: [...x.blocks, part] } : x)) } }
}

export function removeExercise(block: StoredTrainingBlock, sessionId: string, index: number, now: string): ExerciseResult {
  const s = block.sessions.find((x) => x.id === sessionId)
  if (!s || s.kind !== 'own' || !s.blocks[index] || s.blocks[index].type !== 'exercise') return { ok: false, error: 'unknown_session' }
  return { ok: true, block: { ...block, updatedAt: now, sessions: block.sessions.map((x) => (x.id === sessionId ? { ...x, blocks: x.blocks.filter((_, i) => i !== index) } : x)) } }
}
