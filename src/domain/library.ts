import type {
  Autonomy,
  Complexity,
  LibraryExercise,
  MethodRule,
  PlanExerciseItem,
  PlanHead,
  PlanWeek,
  ProgramIndex,
  SessionTemplate,
} from '@/domain/libraryTypes'
import type { StoredPlannedSession, StoredTrainingBlock } from '@/lib/store/localStore'
import { SEED_TEST_TO_SLUG } from '@/data/library/testMap'

/**
 * Fachlogik der Trainingsbibliothek (Übungsdatenbank v1.1, Programm-Seed v4).
 *
 * Rein: keine Netz-, Speicher- oder React-Abhängigkeit. Die Daten kommen als
 * Argument (nachgeladen in data/library). Hier steht, was aus ihnen folgt:
 * Filter, Ersatzübungen, die Prüfung der Regelkette und wer welchen Plan
 * übernehmen darf.
 */

// ---------------------------------------------------------------------------
// Mengenangaben
// ---------------------------------------------------------------------------

export type AmountKind = 'reps' | 'distance_m' | 'seconds'
export interface Amount {
  kind: AmountKind
  min: number
  max: number
}

/**
 * «8–10» → Wiederholungen 8–10; «30 m» → Strecke; «2 min» / «30 s» → Zeit.
 * Der Seed trägt Strecke und Zeit teils im Wiederholungsfeld (v4: 12 Fälle);
 * die Einheit entscheidet, gegen welche Grenze geprüft wird.
 */
export function parseAmount(raw: string | number | null | undefined): Amount | null {
  if (raw == null) return null
  const s = String(raw).replace(',', '.').trim()
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(?:[–-]\s*(\d+(?:\.\d+)?))?\s*(.*)$/)
  if (!m) return null
  const a = Number(m[1])
  const b = m[2] != null ? Number(m[2]) : a
  const unit = m[3].toLowerCase()
  if (/^m\b/.test(unit)) return { kind: 'distance_m', min: a, max: b }
  if (/^min\b/.test(unit)) return { kind: 'seconds', min: a * 60, max: b * 60 }
  if (/^s\b/.test(unit)) return { kind: 'seconds', min: a, max: b }
  return { kind: 'reps', min: a, max: b }
}

// ---------------------------------------------------------------------------
// Regelkette
// ---------------------------------------------------------------------------

/** Unter welcher Methodenregel steht diese Position? Hauptübung → Regel der Einheit, Zusatz → Hypertrophie bzw. Rumpf. */
export function ruleIdForItem(item: PlanExerciseItem, template: SessionTemplate | undefined): string | null {
  if (!template) return null
  if (item.role === 'primary') return template.dose_bounds_rule_id
  return item.exercise_intent === 'TRUNK_STABILITY' ? 'MR_TS28' : 'MR_TS19'
}

const range = (b: MethodRule['dose_bounds'][string] | undefined): [number, number] | null =>
  Array.isArray(b) && typeof b[0] === 'number' && typeof b[1] === 'number' ? b : null

export interface DoseViolation {
  field: 'rpe' | 'sets' | 'reps' | 'distance_m' | 'seconds'
  value: number
  bounds: [number, number]
}

/** Position gegen die Dosisgrenzen ihrer Regel. Ohne passende Grenze ist nichts zu prüfen. */
export function checkDose(item: PlanExerciseItem, rule: MethodRule): DoseViolation[] {
  const out: DoseViolation[] = []
  const b = rule.dose_bounds
  const test = (field: DoseViolation['field'], lo: number, hi: number, bound: [number, number] | null) => {
    if (!bound) return
    if (lo < bound[0] || hi > bound[1]) out.push({ field, value: lo < bound[0] ? lo : hi, bounds: bound })
  }
  if (item.rpe != null) test('rpe', item.rpe, item.rpe, range(b.rpe))
  if (item.sets != null) test('sets', item.sets, item.sets, range(b.sets))
  const amount = parseAmount(item.reps)
  if (amount?.kind === 'reps') test('reps', amount.min, amount.max, range(b.reps))
  if (amount?.kind === 'distance_m') test('distance_m', amount.min, amount.max, range(b.distance_m))
  if (amount?.kind === 'seconds') test('seconds', amount.min, amount.max, range(b.holds_s) ?? range(b.work_s))
  return out
}

const AUTONOMY_RANK: Record<Autonomy, number> = { AUTO_WITH_RULES: 0, COACH_SENSITIVE: 1, COACH_TEMPLATE: 2, COACH_ONLY: 3 }

/** Strengste Autonomie-Decke der Methoden eines Plans. */
export function strictestAutonomy(plan: PlanHead, rules: MethodRule[]): Autonomy {
  let worst: Autonomy = 'AUTO_WITH_RULES'
  for (const id of plan.method_rule_ids) {
    const r = rules.find((x) => x.rule_id === id)
    if (r && AUTONOMY_RANK[r.autonomy_ceiling] > AUTONOMY_RANK[worst]) worst = r.autonomy_ceiling
  }
  return worst
}

export interface PlanAudit {
  positions: number
  /** Positionen in Arbeitswochen außerhalb der Grenzen ihrer Regel. */
  violations: { week: number; session: string; exerciseId: string; ruleId: string; violation: DoseViolation }[]
  unknownExercises: string[]
  intentMismatches: { exerciseId: string; intent: string }[]
  templateMismatches: { session: string; intent: string }[]
  /** Plan-Autonomie ist lockerer als die strengste seiner Methoden. */
  autonomyTooLoose: boolean
  /** Regeln des Plans ohne Studienquelle. */
  unsourcedRules: string[]
}

/**
 * Prüft einen Plan gegen seine Regelkette. Deload- und Taperwochen (`reduced`)
 * sind von den Dosisgrenzen der Arbeitswochen ausgenommen — so steht es im
 * Seed; ob das fachlich trägt, ist Teil des Reviews.
 */
export function auditPlan(plan: PlanHead, weeks: PlanWeek[], index: ProgramIndex, exercises: LibraryExercise[]): PlanAudit {
  const byId = new Set(exercises.map((e) => e.id))
  const intents = new Map(index.intents.map((i) => [i.intent_id, new Set(i.exercise_ids)]))
  const templates = new Map(index.sessionTemplates.map((t) => [t.session_template_id, t]))
  const rules = new Map(index.methodRules.map((r) => [r.rule_id, r]))
  const audit: PlanAudit = {
    positions: 0,
    violations: [],
    unknownExercises: [],
    intentMismatches: [],
    templateMismatches: [],
    autonomyTooLoose: AUTONOMY_RANK[plan.autonomy] < AUTONOMY_RANK[strictestAutonomy(plan, index.methodRules)],
    unsourcedRules: plan.method_rule_ids.filter((id) => !(rules.get(id)?.evidence_refs?.length)),
  }
  for (const w of weeks) {
    for (const s of w.sessions) {
      const t = templates.get(s.session_template_id)
      for (const item of s.items) {
        audit.positions++
        if (item.kind !== 'exercise') continue
        if (!byId.has(item.exercise_id)) audit.unknownExercises.push(item.exercise_id)
        if (!intents.get(item.exercise_intent)?.has(item.exercise_id)) audit.intentMismatches.push({ exerciseId: item.exercise_id, intent: item.exercise_intent })
        if (t && !t.exercise_intents.includes(item.exercise_intent)) audit.templateMismatches.push({ session: s.name, intent: item.exercise_intent })
        if (w.reduced) continue
        const ruleId = ruleIdForItem(item, t)
        const rule = ruleId ? rules.get(ruleId) : undefined
        if (!rule || !ruleId) continue
        for (const v of checkDose(item, rule)) audit.violations.push({ week: w.week, session: s.name, exerciseId: item.exercise_id, ruleId, violation: v })
      }
    }
  }
  return audit
}

/** Ein Plan gilt erst als geprüft, wenn ALLE seine Regeln fachlich geprüft sind (Regel 11). */
export function planReviewed(plan: PlanHead, rules: MethodRule[]): boolean {
  return plan.method_rule_ids.every((id) => rules.find((r) => r.rule_id === id)?.review_status === 'REVIEWED')
}

// ---------------------------------------------------------------------------
// Wer darf übernehmen?
// ---------------------------------------------------------------------------

export type AdoptGate = 'open' | 'confirm' | 'coach_only'

/**
 * Selbst übernehmen darf ein Athlet Pläne, deren Autonomie AUTO_WITH_RULES ist;
 * bei «Coach empfohlen» erst nach ausdrücklicher Bestätigung. Pläne mit
 * COACH_SENSITIVE/COACH_TEMPLATE/COACH_ONLY übernimmt nur ein Trainer
 * (Doktrin: keine Freischaltung technisch heikler Inhalte per Selbst-Schalter).
 */
export function adoptGate(plan: PlanHead, role: 'solo' | 'coach'): AdoptGate {
  if (role === 'coach') return 'open'
  if (plan.autonomy !== 'AUTO_WITH_RULES') return 'coach_only'
  return plan.coach_gate === 'SELF_GUIDED_WITH_CUES' ? 'open' : 'confirm'
}

// ---------------------------------------------------------------------------
// Übungen: Filter und Ersatz
// ---------------------------------------------------------------------------

export interface ExerciseFilter {
  query: string
  pattern: string | null
  equipment: string | null
  complexity: Complexity | null
  selfGuidedOnly: boolean
  category: string | null
}

export const EMPTY_FILTER: ExerciseFilter = { query: '', pattern: null, equipment: null, complexity: null, selfGuidedOnly: false, category: null }

export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')

export function filterExercises(list: LibraryExercise[], f: ExerciseFilter): LibraryExercise[] {
  const q = fold(f.query.trim())
  return list.filter(
    (e) =>
      (!q || fold(e.name).includes(q) || fold(e.id).includes(q)) &&
      (!f.pattern || e.patterns.includes(f.pattern)) &&
      (!f.equipment || e.equipment.includes(f.equipment)) &&
      (!f.complexity || e.complexity === f.complexity) &&
      (!f.selfGuidedOnly || e.coachGate === 'SELF_GUIDED_WITH_CUES') &&
      (!f.category || e.category === f.category),
  )
}

const COMPLEXITY_RANK: Record<Complexity, number> = { LOW: 0, MODERATE: 1, HIGH: 2 }

/**
 * Ersatzübungen nach der Kette der Übungsdatenbank (Kap. 19): erst gleiches
 * Bewegungsmuster, dann vorhandenes Gerät, dann nicht komplexer, dann ohne
 * zusätzliche Belastungshinweise. Ein Muskel allein macht keinen Ersatz.
 * `available` = vorhandene Geräte; leer = ohne Gerätefilter.
 */
export function substitutes(target: LibraryExercise, list: LibraryExercise[], available: string[] = [], limit = 5): LibraryExercise[] {
  const shared = (e: LibraryExercise) => e.patterns.filter((p) => target.patterns.includes(p)).length
  return list
    .filter((e) => e.id !== target.id && shared(e) > 0)
    .filter((e) => available.length === 0 || e.equipment.every((q) => q === 'eq_bodyweight' || available.includes(q)))
    .map((e) => ({
      e,
      score:
        shared(e) * 10 -
        Math.max(0, COMPLEXITY_RANK[e.complexity] - COMPLEXITY_RANK[target.complexity]) * 4 -
        e.caution.filter((c) => !target.caution.includes(c)).length,
    }))
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map((x) => x.e)
}

/**
 * Ersatz im Training: zuerst die Ersatzübungen, die der Plan selbst nennt
 * (`substitutions` des Programm-Seeds), dann die Kette oben. Übungen, die nur
 * mit Trainer gehen, kommen nur, wenn die ersetzte es auch tut — ein Tausch
 * im Training darf nicht anspruchsvoller werden als der Plan.
 */
export function substituteOptions(target: LibraryExercise, list: LibraryExercise[], planSubs: Record<string, string[]> = {}, available: string[] = []): { exercise: LibraryExercise; fromPlan: boolean }[] {
  const allowed = (e: LibraryExercise) => e.coachGate !== 'COACH_REQUIRED' || target.coachGate === 'COACH_REQUIRED'
  const fromPlan = (planSubs[target.id] ?? []).map((id) => list.find((e) => e.id === id)).filter((e): e is LibraryExercise => e != null && allowed(e))
  const chain = substitutes(target, list, available, 8).filter((e) => allowed(e) && !fromPlan.some((p) => p.id === e.id))
  return [...fromPlan.map((exercise) => ({ exercise, fromPlan: true })), ...chain.slice(0, 5).map((exercise) => ({ exercise, fromPlan: false }))]
}

/**
 * Parametervertrag → Eingabefelder eines Satzes im Player. Höchstens drei
 * Felder, damit die Zeile auf ein Telefon passt; was die Übung nicht kennt,
 * fragt der Player nicht ab.
 */
export type SetField = 'weightKg' | 'reps' | 'rir' | 'rpe' | 'durationS' | 'distanceM'
export function setFieldsFor(parameters: string[]): SetField[] {
  const has = (...k: string[]) => k.some((x) => parameters.includes(x))
  const out: SetField[] = []
  if (has('load_kg', 'load_optional', 'added_load_optional', 'pct_1rm_optional')) out.push('weightKg')
  if (has('reps', 'reps_or_time', 'reps_or_contacts', 'work_s_or_reps', 'duration_s_or_reps', 'rounds')) out.push('reps')
  if (has('duration_s', 'time_s', 'effort_duration_s') || (out.length === 0 && has('duration_s_or_reps', 'reps_or_time'))) out.push('durationS')
  if (has('distance_m', 'distance_m_optional') && out.length < 2) out.push('distanceM')
  if (out.length < 3) out.push(has('rir', 'rir_optional') ? 'rir' : 'rpe')
  if (out.length === 1) out.unshift('reps')
  return out.slice(0, 3)
}

/** Erste Zahl einer Wiederholungsangabe («6–8» → 6, «30 s» → 30); `null` ohne Zahl. */
export function firstNumber(text: string | null | undefined): number | null {
  const m = text?.match(/\d+/)
  return m ? Number(m[0]) : null
}

/** Varianten-Graph: Regression/Progression stehen als Namen; aufgelöst, wo der Name eindeutig zu einer Übung passt. */
export function resolveByName(name: string, list: LibraryExercise[]): LibraryExercise | null {
  const n = fold(name)
  const head = (s: string) => fold(s.split('(')[0].trim())
  return list.find((e) => fold(e.name) === n) ?? list.find((e) => head(e.name) === head(name)) ?? null
}

// ---------------------------------------------------------------------------
// Übernehmen: Bibliotheksplan → Trainingsblock
// ---------------------------------------------------------------------------

const DAY: Record<string, number> = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6, So: 7 }
/** Einheitenvorlage → Intention (Schlüssel `plan.intent.*`, gleiche Wörter wie in Hub, Kalender und Player). */
export const INTENT_OF_TEMPLATE: Record<string, string> = {
  SES_AEROBIC_BASE: 'AEROBIC_BASE',
  'SES_GPP*': 'GPP',
  'SES_HYPERTROPHY*': 'HYPERTROPHY_SUPPORT',
  SES_MAINTENANCE: 'TAPER_MAINTENANCE',
  SES_MAX_STRENGTH: 'MAX_STRENGTH',
  SES_METCON: 'METCON',
  SES_MOBILITY: 'MOBILITY',
  SES_POWER: 'POWER',
  SES_PRIMING: 'PRIMING',
  SES_STATION_SPECIFIC: 'HYROX_STATIONS',
  'SES_STRENGTH_VOLUME*': 'STRENGTH_VOLUME',
  SES_THRESHOLD: 'THRESHOLD',
  SES_VO2: 'VO2MAX',
  SES_RSA: 'REPEATED_HIGH_INTENSITY',
}

const HIGH_INTENSITY_TEMPLATES = new Set(['SES_VO2', 'SES_RSA', 'SES_POWER', 'SES_MAX_STRENGTH', 'SES_METCON'])

/** Sitzungskennung im Block: Plan, Woche, Position — stabil über Planversionen. */
export const librarySessionId = (planId: string, week: number, index: number) => `${planId}:w${week}:${index}`

const PHASE_OF_CATEGORY: Record<string, StoredTrainingBlock['phase']> = {
  FOUNDATION: 'GPP',
  METHOD_DEVELOPMENT: 'BUILD',
  SPORT_SPECIFIC: 'SPECIFIC',
  COMPETITION_OR_READINESS: 'SPECIFIC',
  MAINTENANCE: 'TRANSITION',
}

const FAMILY_OF_GOAL: Record<string, StoredTrainingBlock['family']> = {
  COMBAT_SPORT_GRAPPLING: 'combat_grappling',
  COMBAT_SPORT_STRIKING: 'combat_striking',
  HYROX: 'hybrid',
}

/**
 * Macht aus einem Bibliotheksplan einen Block: jede Einheit jeder Woche wird
 * eine Einheit mit `weekFrom = weekTo = Woche`; die Dosis ist Momentaufnahme
 * des Seeds (spätere Seed-Versionen schreiben laufende Blöcke nicht um).
 */
export function materializePlan(
  plan: PlanHead,
  weeks: PlanWeek[],
  index: ProgramIndex,
  exercises: LibraryExercise[],
  ctx: { id: string; startDay: string; now: string; disciplineId: string | null },
): StoredTrainingBlock {
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  const templates = new Map(index.sessionTemplates.map((t) => [t.session_template_id, t]))
  const rules = new Map(index.methodRules.map((r) => [r.rule_id, r]))
  const sessions: StoredPlannedSession[] = []
  for (const w of weeks) {
    w.sessions.forEach((s, i) => {
      const tpl = templates.get(s.session_template_id)
      const rule = tpl ? rules.get(tpl.dose_bounds_rule_id) : undefined
      const durations = s.items.flatMap((it) => (it.kind === 'conditioning' && it.duration_min != null ? [it.duration_min] : []))
      sessions.push({
        id: librarySessionId(plan.plan_id, w.week, i),
        day: DAY[s.day] ?? 1,
        weekFrom: w.week,
        weekTo: w.week,
        kind: 'library',
        title: s.name.slice(0, 60),
        note: w.reduced ? 'reduced' : '',
        ruleId: tpl?.dose_bounds_rule_id ?? null,
        ruleVersion: plan.version,
        primaryIntent: INTENT_OF_TEMPLATE[s.session_template_id] ?? 'GPP',
        evidenceStrength: null,
        evidenceSpecificity: rule?.evidence_default ?? null,
        plannedDurationMin: durations.length ? Math.min(600, Math.round(durations.reduce((a, b) => a + b, 0))) : null,
        highIntensity: HIGH_INTENSITY_TEMPLATES.has(s.session_template_id) && !w.reduced,
        blocks: s.items.slice(0, 12).map((it) =>
          it.kind === 'exercise'
            ? {
                type: 'library_exercise' as const,
                exerciseId: it.exercise_id,
                name: (names.get(it.exercise_id) ?? it.exercise_id).slice(0, 120),
                sets: it.sets,
                reps: it.reps != null ? String(it.reps).slice(0, 40) : null,
                rpe: it.rpe,
                restS: it.rest_s,
                intensity: it.intensity ? String(it.intensity).slice(0, 40) : null,
                intent: it.exercise_intent,
                role: it.role,
                ruleId: ruleIdForItem(it, tpl),
                note: (it.notes ?? '').slice(0, 200),
              }
            : {
                type: 'library_conditioning' as const,
                modality: it.modality.slice(0, 40),
                description: it.description.slice(0, 200),
                durationMin: it.duration_min,
                distance: it.distance,
                zone: it.zone ? it.zone.slice(0, 80) : null,
                note: (it.notes ?? '').slice(0, 200),
              },
        ),
        retestMetric: '',
        coachModified: false,
        coachModificationReason: null,
        removed: false,
      })
    })
  }
  return {
    moves: [],
    id: ctx.id,
    family: FAMILY_OF_GOAL[plan.goal] ?? null,
    name: plan.title.slice(0, 60),
    disciplineId: ctx.disciplineId,
    phase: PHASE_OF_CATEGORY[plan.category] ?? 'BUILD',
    startDay: ctx.startDay,
    weeks: plan.weeks,
    retestMetrics: plan.retest.test_ids.map((t) => SEED_TEST_TO_SLUG[t]).filter((x): x is string => !!x).slice(0, 8),
    templateId: null,
    eventDay: null,
    assignmentId: null,
    sessions,
    completions: [],
    status: 'active',
    libraryPlanId: plan.plan_id,
    libraryVersion: plan.version,
    planVersion: 1,
    adjustments: [],
    createdAt: ctx.now,
    updatedAt: ctx.now,
  }
}

/** Nächster Montag ab `today` (heute, wenn heute Montag ist) — Bibliothekspläne beginnen mit Woche 1 am Montag. */
export function nextMonday(today: string): string {
  const d = new Date(`${today}T00:00:00Z`)
  const add = (8 - (d.getUTCDay() || 7)) % 7
  return new Date(d.getTime() + add * 86_400_000).toISOString().slice(0, 10)
}
