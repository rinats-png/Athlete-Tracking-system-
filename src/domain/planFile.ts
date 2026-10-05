import { z } from 'zod'
import { TRAINING_RULES } from '@/data/trainingRules'
import { INTENTS, type Phase } from '@/domain/trainingTypes'
import { blocksFor, durationOf } from '@/domain/trainingPlan'
import { eligibleRules, specificityFor, type PlanMode } from '@/domain/trainingRules'
import { createOwnBlock, mondayOnOrAfter } from '@/domain/trainingBlock'
import type { StoredPlannedSession, StoredTrainingBlock } from '@/lib/store/localStore'

/**
 * Planaustausch als Datei (Trainingsbereich Etappe 8): Export und Import
 * eines Plans als JSON.
 *
 * Eine Datei ist FREMDER INHALT. Der Import vertraut ihr nur, was der Mensch
 * selbst gesetzt haben kann: Tag, Wochen, Absicht, Name, Notiz, Dauer, eigene
 * Übungen. Evidenz, Dosis und Prüfstatus stehen nie in der Datei als Wahrheit:
 *  - nennt eine Einheit eine Regel des Registers, die in diesem Modus zulässig
 *    ist, wird die Einheit AUS DEM REGISTER neu gebaut (Dosis, Evidenz);
 *  - jede andere Einheit wird zur eigenen Einheit, ohne Evidenzangabe.
 * Was nicht passt, wird gezählt und gemeldet, nie still verworfen.
 */
export const PLAN_FILE_FORMAT = 'kydon-plan'
export const PLAN_FILE_VERSION = 1
export const PLAN_FILE_MAX_BYTES = 200_000

const phaseSchema = z.enum(['GPP', 'BUILD', 'SPECIFIC', 'TAPER', 'TRANSITION'])
const fileSession = z.object({
  day: z.number().int().min(1).max(7),
  weekFrom: z.number().int().min(1).max(26).default(1),
  weekTo: z.number().int().min(1).max(26).nullable().default(null),
  intent: z.string().min(1).max(40),
  title: z.string().max(60).default(''),
  note: z.string().max(200).default(''),
  minutes: z.number().int().min(1).max(600).nullable().default(null),
  ruleId: z.string().max(60).nullable().default(null),
  exercises: z
    .array(z.object({ name: z.string().min(1).max(60), sets: z.number().int().min(1).max(20), reps: z.number().int().min(1).max(100).nullable().default(null), load: z.string().max(30).default('') }))
    .max(10)
    .default([]),
})
const fileSchema = z.object({
  format: z.literal(PLAN_FILE_FORMAT),
  version: z.literal(PLAN_FILE_VERSION),
  name: z.string().max(60).default(''),
  weeks: z.number().int().min(1).max(26),
  phase: phaseSchema.default('BUILD'),
  sessions: z.array(fileSession).max(60),
})

export function exportPlan(block: StoredTrainingBlock): string {
  const file = {
    format: PLAN_FILE_FORMAT,
    version: PLAN_FILE_VERSION,
    name: block.name,
    weeks: block.weeks,
    phase: block.phase,
    sessions: block.sessions
      .filter((s) => !s.removed)
      .map((s) => ({
        day: s.day,
        weekFrom: s.weekFrom,
        weekTo: s.weekTo,
        intent: s.primaryIntent,
        title: s.title,
        note: s.note,
        minutes: s.kind === 'own' ? s.plannedDurationMin : null,
        ruleId: s.kind === 'rule' ? s.ruleId : null,
        exercises: s.blocks.flatMap((b) => (b.type === 'exercise' ? [{ name: b.name, sets: b.sets, reps: b.reps, load: b.load }] : [])),
      })),
  }
  return JSON.stringify(file, null, 2)
}

export interface ImportReport {
  /** Einheiten, die aus dem Register neu gebaut wurden. */
  fromRules: number
  /** Einheiten, die als eigene Einheit angelegt wurden (darunter Regeln, die es nicht gibt oder nicht zulässig sind). */
  own: number
  /** Regeln der Datei, die das Register nicht kennt oder die in diesem Modus nicht zulässig sind. */
  unknownRules: number
  /** Einheiten, die an einem belegten Tag lagen oder falsche Wochen hatten. */
  skipped: number
}
export type ImportError = 'too_big' | 'not_json' | 'not_a_plan'
export type ImportResult = { ok: true; block: StoredTrainingBlock; report: ImportReport } | { ok: false; error: ImportError }

export interface ImportContext {
  newId: () => string
  now: string
  startDay: string
  disciplineId: string | null
  family: StoredTrainingBlock['family']
  trainingAgeYears: number | null
  mode: PlanMode
  /** Zuweisung des Trainers: Kennung des Blocks und feste Einheitenkennungen (`<kurz>-<Index>`), damit der Fortschritt zuordenbar bleibt. */
  assignmentId?: string
}

/** Feste Einheitenkennung einer zugewiesenen Einheit: Kurzform der Zuweisung und Index in der Nutzlast. */
export const assignedSessionId = (assignmentId: string, index: number): string => `${assignmentId.slice(0, 8)}-${index}`

export function importPlan(text: string, ctx: ImportContext): ImportResult {
  if (text.length > PLAN_FILE_MAX_BYTES) return { ok: false, error: 'too_big' }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'not_json' }
  }
  const parsed = fileSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'not_a_plan' }
  const f = parsed.data
  const block = createOwnBlock({ id: ctx.newId(), name: f.name || 'Import', family: ctx.family, disciplineId: ctx.disciplineId, phase: f.phase as Phase, weeks: f.weeks, startDay: ctx.startDay, now: ctx.now })
  block.startDay = mondayOnOrAfter(ctx.startDay)
  block.assignmentId = ctx.assignmentId ?? null
  const report: ImportReport = { fromRules: 0, own: 0, unknownRules: 0, skipped: 0 }
  const sessions: StoredPlannedSession[] = []
  const overlaps = (a: StoredPlannedSession, b: StoredPlannedSession) => a.weekFrom <= (b.weekTo ?? f.weeks) && b.weekFrom <= (a.weekTo ?? f.weeks)

  for (const [index, s] of f.sessions.entries()) {
    const weekTo = s.weekTo
    if (s.weekFrom > f.weeks || (weekTo != null && (weekTo < s.weekFrom || weekTo > f.weeks))) {
      report.skipped++
      continue
    }
    const known = s.ruleId ? TRAINING_RULES.find((r) => r.id === s.ruleId) : null
    const usable = known && ctx.family && eligibleRules({ family: ctx.family, intent: known.intent, mode: ctx.mode, trainingAgeYears: ctx.trainingAgeYears }, TRAINING_RULES).some((r) => r.id === known.id)
    if (s.ruleId && !usable) report.unknownRules++
    const intent = (INTENTS as readonly string[]).includes(s.intent) ? s.intent : null
    if (!usable && !intent) {
      report.skipped++
      continue
    }
    const base = { id: ctx.assignmentId ? assignedSessionId(ctx.assignmentId, index) : ctx.newId(), day: s.day, weekFrom: s.weekFrom, weekTo, coachModified: false, coachModificationReason: null, removed: false }
    let session: StoredPlannedSession
    if (usable && known) {
      const blocks = blocksFor(known)
      session = {
        ...base,
        kind: 'rule',
        title: '',
        note: s.note,
        ruleId: known.id,
        ruleVersion: known.version,
        primaryIntent: known.intent,
        evidenceStrength: known.evidence.strength,
        evidenceSpecificity: ctx.family ? specificityFor(known, ctx.family, ctx.disciplineId) : null,
        plannedDurationMin: durationOf(blocks),
        highIntensity: ['VO2MAX', 'REPEATED_SPRINT', 'REPEATED_HIGH_INTENSITY'].includes(known.intent),
        blocks: blocks as StoredPlannedSession['blocks'],
        retestMetric: known.retestMetric,
      }
    } else {
      session = {
        ...base,
        kind: 'own',
        title: s.title,
        note: s.note,
        ruleId: null,
        ruleVersion: null,
        primaryIntent: intent as string,
        evidenceStrength: null,
        evidenceSpecificity: null,
        plannedDurationMin: s.minutes,
        highIntensity: false,
        blocks: s.exercises.map((e) => ({ type: 'exercise' as const, exerciseKey: null, name: e.name, sets: e.sets, reps: e.reps, load: e.load })),
        retestMetric: '',
      }
    }
    if (sessions.some((x) => x.day === session.day && overlaps(x, session))) {
      report.skipped++
      continue
    }
    sessions.push(session)
    if (session.kind === 'rule') report.fromRules++
    else report.own++
  }
  block.sessions = sessions
  block.retestMetrics = [...new Set(sessions.map((x) => x.retestMetric).filter(Boolean))]
  return { ok: true, block, report }
}
