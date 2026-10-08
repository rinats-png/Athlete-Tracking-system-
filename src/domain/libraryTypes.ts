/**
 * Typen der Trainingsbibliothek (Übungsdatenbank v1.1, Programm-Seed v4).
 * Die Daten selbst liegen in `data/library/` und werden nachgeladen;
 * hier steht nur ihre Form (§16: Kataloge in data, Fachlogik in domain).
 */

export type Complexity = 'LOW' | 'MODERATE' | 'HIGH'
export type CoachGate = 'SELF_GUIDED_WITH_CUES' | 'COACH_RECOMMENDED' | 'COACH_REQUIRED'
export type Specificity = 'DIRECT' | 'RELATED' | 'GENERAL' | 'EXTRAPOLATED'
export type Autonomy = 'AUTO_WITH_RULES' | 'COACH_SENSITIVE' | 'COACH_TEMPLATE' | 'COACH_ONLY'

export interface SourceLink {
  label: string
  url: string
}

export interface LibraryExercise {
  id: string
  name: string
  category: string
  section: string
  steps: string[]
  cues: string
  errors: string
  muscles: string
  abilities: string
  /** Sportarten-Zeile der Recherche: menschenlesbare Annotation, KEINE geprüfte Zuordnung. */
  sportsNote: string
  transfer: string
  sources: SourceLink[]
  patterns: string[]
  equipment: string[]
  complexity: Complexity
  coachGate: CoachGate
  loadTypes: string[]
  parameters: string[]
  caution: string[]
  regressions: string[]
  progressions: string[]
  transferDefault: Specificity
}

export interface EvidenceRef {
  doi: string
  cite: string
  fulltext_checked: boolean
}

export interface MethodRule {
  rule_id: string
  method_id: string
  name: string
  type: string
  autonomy_ceiling: Autonomy
  /** Je Parameter [min, max] oder ein beschreibender Text. */
  dose_bounds: Record<string, [number, number] | string>
  frequency_per_week: [number, number] | string
  duration_weeks: [number, number] | string
  quality_cutoff: string
  evidence_default: Specificity
  source: string
  review_status: 'DRAFT_UNREVIEWED' | 'REVIEWED'
  notes: string
  evidence_refs?: EvidenceRef[]
}

export interface SessionTemplate {
  session_template_id: string
  method_id: string
  dose_bounds_rule_id: string
  exercise_intents: string[]
  quality_cutoff_rule: string
}

export interface IntentDef {
  intent_id: string
  definition: string
  exercise_ids: string[]
}

export interface LibraryTest {
  test_id: string
  name: string
  protocol: string
  metric: string
  measurement_error_note: string
  applies_to: string[]
}

export interface PlanHead {
  plan_id: string
  version: string
  goal: string
  title: string
  level: string
  weeks: number
  sessions_per_week: number
  coach_gate: CoachGate
  methods: string[]
  evidence: Record<string, Specificity>
  blocks: { name: string; weeks: number[]; focus: string }[]
  progression_rules: string[]
  substitutions: Record<string, string[]>
  retest: { test_ids: string[]; timing: string; decision_rule: string; note: string }
  equipment_required: string[]
  prerequisites: string
  category: string
  phase_applicability?: string
  autonomy: Autonomy
  autonomy_reason?: string
  conflict_guards: string[]
  fuel_note: string
  method_rule_ids: string[]
  session_template_ids: string[]
  sessionCount: number
  reducedWeeks: number[]
}

export interface PlanExerciseItem {
  kind: 'exercise'
  exercise_id: string
  sets: number | null
  reps: string | null
  intensity: string | null
  rpe: number | null
  rest_s: number | null
  notes: string
  exercise_intent: string
  role: 'primary' | 'accessory'
}

export interface PlanConditioningItem {
  kind: 'conditioning'
  modality: string
  description: string
  duration_min: number | null
  distance: string | null
  zone: string | null
  notes: string
}

export type PlanItem = PlanExerciseItem | PlanConditioningItem

export interface PlanSession {
  day: string
  name: string
  session_template_id: string
  items: PlanItem[]
}

export interface PlanWeek {
  week: number
  reduced: boolean
  sessions: PlanSession[]
}

export interface ProgramIndex {
  version: string
  methodRules: MethodRule[]
  sessionTemplates: SessionTemplate[]
  intents: IntentDef[]
  conflictRules: { rule_id: string; check: string; description: string }[]
  progressionRules: { rule_id: string; plan_id: string; rules: string[] }[]
  retestRules: { rule_id: string; plan_id: string; protocol?: string }[]
  fuelRules: { rule_id: string; plan_id: string }[]
  sportIdMap: { gesamtmaster_id?: string; kydon_target?: string; status: string; note?: string }[]
  sportDecisions: { sport: string; decision: string; route: string }[]
  tests: LibraryTest[]
  plans: PlanHead[]
}
