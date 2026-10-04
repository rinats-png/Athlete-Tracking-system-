/**
 * Typen der Training Engine (docs/training-engine.md, Nachtrag 1 der Doktrin).
 *
 * Reine Typen und Konstanten, keine Logik. Eine Regel (`EvidenceRule`) ist
 * die einzige Stelle, an der eine Dosierung steht; Einheiten und Blöcke
 * verweisen auf sie.
 */

export type SportFamily = 'combat_grappling' | 'combat_striking' | 'hybrid'

export type Phase = 'GPP' | 'BUILD' | 'SPECIFIC' | 'TAPER' | 'TRANSITION'

/** Jede Einheit hat genau eine primäre Intention (Recherche, Kap. 43). */
export const INTENTS = [
  'AEROBIC_BASE',
  'THRESHOLD',
  'VO2MAX',
  'REPEATED_SPRINT',
  'REPEATED_HIGH_INTENSITY',
  'LONG_ENDURANCE',
  'RECOVERY_AEROBIC',
  'MAX_STRENGTH',
  'RELATIVE_STRENGTH',
  'HYPERTROPHY_SUPPORT',
  'STRENGTH_ENDURANCE',
  'ISOMETRIC_STRENGTH',
  'POWER',
  'PLYOMETRIC',
  'ACCELERATION',
  'MAX_SPEED',
  'AGILITY_COD',
  'HYROX_STATIONS',
  'COMPROMISED_RUNNING',
  'COMBAT_ROUNDS',
  'GRIP_ENDURANCE',
  'RACE_REHEARSAL',
  'FIGHT_SIMULATION',
  'TAPER_MAINTENANCE',
] as const
export type Intent = (typeof INTENTS)[number]

export type EvidenceStrength = 'HIGH' | 'MODERATE' | 'LOW' | 'EMERGING' | 'INSUFFICIENT'
export type EvidenceSpecificity = 'DIRECT' | 'RELATED' | 'GENERAL' | 'EXTRAPOLATED'
export type EvidenceType = 'meta_analysis' | 'systematic_review' | 'rct' | 'consensus' | 'observational' | 'mechanistic' | 'expert'

export type Range = [number, number]

/** Wie die Intensität angegeben wird. Genaue Pulsziele nur bei plausibler HFmax. */
export type IntensityTarget =
  | { type: 'hr_percent_max'; min: number; max: number }
  | { type: 'rpe'; min: number; max: number }
  | { type: 'percent_1rm'; min: number; max: number }
  | { type: 'max_effort' }

/** Prüfstatus: ohne Prüfung keine Anzeige außerhalb der Vorschau. */
export type ReviewState =
  | { state: 'unreviewed' }
  | { state: 'reviewed'; reviewer: string; reviewedOn: string; note: string }

export interface TrainingSource {
  id: string
  citation: string
  /** DOI oder PubMed, wenn die Recherche einen nennt. */
  url: string | null
  /** Die Recherche stützt sich auf Abstracts; erst nach Volltextprüfung ist die Angabe `true`. */
  fullTextChecked: boolean
}

export interface EvidenceRule {
  id: string
  version: string
  title: string
  intent: Intent
  /** Anpassungen, auf die die Regel zielt (Freitext-Schlüssel, nicht übersetzt). */
  targetAdaptation: string[]
  eligibleFamilies: SportFamily[]
  eligiblePhases: Phase[]
  minimumTrainingAgeYears?: number

  prescription: {
    frequencyPerWeek?: Range
    intensity?: IntensityTarget
    /** Anzahl Wiederholungen der Arbeitsphase. */
    repetitions?: Range
    sets?: Range
    distanceM?: Range
    /** Wiederholungen je Satz bei Kraft und Power; fehlt, wenn die Quelle keine nennt. */
    repsPerSet?: Range
    workSeconds?: Range
    recoverySeconds?: Range
    blockDurationWeeks?: Range
  }

  evidence: {
    strength: EvidenceStrength
    /** Spezifität je Sportfamilie. Fehlt ein Eintrag, gilt `EXTRAPOLATED`. */
    specificity: Partial<Record<SportFamily, EvidenceSpecificity>>
    evidenceTypes: EvidenceType[]
    sourceIds: string[]
    /** Was die Quelle nicht hergibt. Wird dem Nutzer gezeigt, nicht versteckt. */
    limitations: string[]
  }

  safety: {
    contraindicationTags: string[]
    requiresCoachApproval: boolean
    /** `true` = nie automatisch verordnen, nur beschreiben. */
    forbiddenForAutoPrescription: boolean
  }

  /** Verlangte Kontextprüfungen, bevor die Regel in einen Plan darf. */
  requiredContextChecks: ContextCheck[]
  /** Welche Messung den Block abschließt. */
  retestMetric: string
  review: ReviewState
}

export type ContextCheck = 'high_intensity_sessions_per_week' | 'fixed_sparring_sessions' | 'training_age' | 'plausible_hr_max'

// --- Einheit und Blöcke (Recherche, Kap. 46 und 47) ------------------------------------

export type SessionBlock =
  | { type: 'interval'; modality: 'run' | 'bike' | 'row' | 'ski' | 'mixed'; repetitions: number; workSeconds: number; recoverySeconds: number; intensity: IntensityTarget }
  /** Wiederholte Sprints über eine feste Strecke. Pause: Obergrenze der Studienlage. */
  | { type: 'sprint_repeats'; sets: number; repetitions: number; distanceM: number; maxRecoverySeconds: number }
  /** Die Übung wählt der Trainer (`exerciseKey: null`); die Regel legt nur Last und Sätze fest. */
  | { type: 'strength'; exerciseKey: string | null; sets: number | null; reps: number | null; maxRepsPerSet: number | null; loadTarget: IntensityTarget }
  | { type: 'jumps'; note: 'plyometric' }
  | { type: 'combat_rounds'; roundType: 'bag' | 'pads' | 'sparring' | 'grappling' | 'mixed'; rounds: number; roundSeconds: number; restSeconds: number; targetRpe: Range }

export interface TrainingSession {
  id: string
  phase: Phase
  primaryIntent: Intent
  ruleId: string
  ruleVersion: string
  /** Aus der Regel übernommen, nicht neu eingeschätzt. */
  evidenceStrength: EvidenceStrength
  evidenceSpecificity: EvidenceSpecificity
  /** Reine Arbeits- und Pausenzeit; `null`, wenn die Regel sie nicht festlegt. Ohne Aufwärmen. */
  plannedDurationMin: number | null
  blocks: SessionBlock[]
  /** Messung, auf die der Block hinarbeitet. */
  retestMetric: string
  coachModified: boolean
  coachModificationReason: string | null
}
