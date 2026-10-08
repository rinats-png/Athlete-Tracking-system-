import { TRAINING_RULES } from '@/data/trainingRules'
import { eligibleRules, specificityFor, type PlanMode } from '@/domain/trainingRules'
import type { RequirementRow } from '@/domain/requirementGap'
import type { Intent, Phase, SessionBlock, SportFamily, TrainingSession, EvidenceRule } from '@/domain/trainingTypes'
import type { PerformanceDimension } from '@/types/domain'

/**
 * Der Planbauer (docs/training-engine.md, Nachtrag 1 der Doktrin).
 *
 * DETERMINISTISCH: dieselbe Eingabe ergibt denselben Plan. Jede Dosierung
 * kommt aus einer Regel des Registers; der Bauer verteilt sie auf Tage, er
 * erfindet keine Zahl. Was die Regel nicht festlegt (Übung, Sprungform,
 * Frequenz einer Power-Einheit), bleibt offen und wird als offen ausgewiesen.
 *
 * PLANUNGSREGELN DER APP — Produktentscheidungen, keine Literaturwerte, und
 * deshalb Teil der fachlichen Prüfung (docs/training-engine.md):
 *   1. Höchstens eine Schlüsseleinheit je Tag, nie am Tag harter Runden.
 *   2. Eine Einheit mit hoher Intensität nicht am Tag vor oder nach harten Runden.
 *   3. Gesamtbudget hoher Intensität je Woche: harte Runden zählen mit.
 *   4. Wo die Regel keine Frequenz nennt, gilt eine Einheit je Woche.
 *   5. Blocklänge: Eingabe, Vorgabe sechs Wochen; sie endet mit einer Messung.
 *   6. Hybrid: Schlüsseleinheiten möglichst nicht an aufeinanderfolgenden Tagen
 *      (Concurrent-Training-Literatur, Abstand zwischen den Reizen bevorzugt);
 *      geht es nicht anders, werden auch benachbarte Tage genutzt.
 */

/** Wie viele harte Einheiten je Woche insgesamt (harte Runden plus Intervall- und Sprinteinheiten). */
export const HIGH_INTENSITY_BUDGET = 3
export const DEFAULT_FREQUENCY = 1
export const DEFAULT_BLOCK_WEEKS = 6

export type FixedKind = 'skill' | 'hard_rounds' | 'recovery'
export interface FixedSession {
  /** 1 = Montag … 7 = Sonntag. */
  day: number
  kind: FixedKind
}

export interface PlanInput {
  family: SportFamily
  /** Disziplin, wenn bekannt: macht die Spezifität genauer als die Familie. */
  disciplineId?: string | null
  phase: Phase
  trainingAgeYears: number | null
  /** Tage, an denen eine zusätzliche Einheit möglich ist (1 bis 7). */
  availableDays: number[]
  fixedSessions: FixedSession[]
  /** Höchstdauer einer Einheit in Minuten; `null` = unbegrenzt. */
  maxSessionMinutes: number | null
  /** Anforderungslücke der Disziplin, größter Hebel zuerst (`requirementGap().ranked`). */
  gaps: RequirementRow[]
  /** Ist eine glaubwürdige maximale Herzfrequenz bekannt? Ohne sie keine Pulsziele. */
  hrMaxPlausible: boolean
  mode: PlanMode
  blockWeeks?: number
}

export type SkipReason =
  | 'data_thin' // zu wenige Messungen: erst erneut messen
  | 'no_rule' // für diese Lücke gibt es keine geprüfte, passende Regel
  | 'hr_max_unknown'
  | 'no_slot'
  | 'too_long'
  | 'budget'
  | 'not_open'

export interface SkippedGap {
  dimension: PerformanceDimension
  reason: SkipReason
  ruleId: string | null
}

export interface PlannedSession extends TrainingSession {
  day: number
  priority: 'key'
  highIntensity: boolean
  dimension: PerformanceDimension
}

export type PlanNoteKey = 'concurrent' | 'no_station_dose' | 'combat_scope'
export interface PlanNote {
  key: PlanNoteKey
  sourceIds: string[]
}

export interface BlockPlan {
  weeks: number
  sessions: PlannedSession[]
  skipped: SkippedGap[]
  /** Hinweise zur Studienlage, die für diesen Plan gelten. */
  notes: PlanNote[]
  /** Am Blockende gemessen wird, was die verwendeten Regeln als Messung nennen. */
  retest: { week: number; metrics: string[] }
  /** Schlüsselreize insgesamt je Woche, gemessen am Budget. */
  highIntensityUsed: number
}

/** Welche Intentionen eine offene Fähigkeit bedienen. Reihenfolge = Vorrang. */
export const INTENTS_FOR_DIMENSION: Record<PerformanceDimension, Intent[]> = {
  endurance: ['VO2MAX', 'REPEATED_SPRINT'],
  max_strength: ['MAX_STRENGTH'],
  relative_strength: ['MAX_STRENGTH'],
  strength_endurance: [],
  power: ['POWER', 'PLYOMETRIC'],
  agility: [],
}

const HIGH_INTENSITY: Intent[] = ['VO2MAX', 'REPEATED_SPRINT', 'REPEATED_HIGH_INTENSITY']
const isHigh = (i: Intent) => HIGH_INTENSITY.includes(i)

/** Messungen, ab denen eine Lücke als Grundlage taugt: eine Einzelmessung ist ein Punkt, kein Befund. */
export const MIN_MEASUREMENTS = 2

export function blocksFor(rule: EvidenceRule): SessionBlock[] {
  const p = rule.prescription
  if (rule.intent === 'VO2MAX' && p.repetitions && p.workSeconds && p.recoverySeconds && p.intensity?.type === 'hr_percent_max') {
    return [{ type: 'interval', modality: 'mixed', repetitions: p.repetitions[0], workSeconds: p.workSeconds[0], recoverySeconds: p.recoverySeconds[0], intensity: p.intensity }]
  }
  if (rule.intent === 'REPEATED_SPRINT' && p.sets && p.repetitions && p.distanceM && p.recoverySeconds) {
    return [{ type: 'sprint_repeats', sets: p.sets[0], repetitions: p.repetitions[0], distanceM: p.distanceM[0], maxRecoverySeconds: p.recoverySeconds[1] }]
  }
  if ((rule.intent === 'MAX_STRENGTH' || rule.intent === 'POWER') && p.intensity && p.intensity.type !== 'max_effort') {
    return [{ type: 'strength', exerciseKey: null, sets: p.sets ? p.sets[0] : null, reps: null, maxRepsPerSet: p.repsPerSet ? p.repsPerSet[1] : null, loadTarget: p.intensity }]
  }
  if (rule.intent === 'PLYOMETRIC') return [{ type: 'jumps', note: 'plyometric' }]
  return []
}

/** Reine Arbeits- und Pausenzeit, wo die Regel sie festlegt. */
export function durationOf(blocks: SessionBlock[]): number | null {
  let total = 0
  for (const b of blocks) {
    if (b.type === 'interval') total += (b.repetitions * (b.workSeconds + b.recoverySeconds) - b.recoverySeconds) / 60
    else return null
  }
  return blocks.length > 0 ? Math.round(total) : null
}

const needsHr = (r: EvidenceRule) => r.prescription.intensity?.type === 'hr_percent_max'
const adjacent = (a: number, b: number) => Math.abs(a - b) === 1 || (a === 1 && b === 7) || (a === 7 && b === 1)

export function planBlock(input: PlanInput): BlockPlan {
  const weeks = input.blockWeeks ?? DEFAULT_BLOCK_WEEKS
  const hardDays = input.fixedSessions.filter((f) => f.kind === 'hard_rounds').map((f) => f.day)
  let budget = HIGH_INTENSITY_BUDGET - hardDays.length
  const taken = new Set<number>(hardDays)
  const sessions: PlannedSession[] = []
  const skipped: SkippedGap[] = []
  const used = new Set<string>()

  const open = input.gaps.filter((g) => g.dimension != null)
  for (const gap of open) {
    const dimension = gap.dimension as PerformanceDimension
    if (!gap.open) {
      skipped.push({ dimension, reason: 'not_open', ruleId: null })
      continue
    }
    if (gap.measurements < MIN_MEASUREMENTS) {
      skipped.push({ dimension, reason: 'data_thin', ruleId: null })
      continue
    }
    // Erste passende Regel in der Reihenfolge der Intentionen; ungenutzte Regeln nur einmal je Block.
    const candidates: EvidenceRule[] = []
    for (const intent of INTENTS_FOR_DIMENSION[dimension]) {
      candidates.push(...eligibleRules({ family: input.family, phase: input.phase, intent, mode: input.mode, trainingAgeYears: input.trainingAgeYears }, TRAINING_RULES).filter((r) => !used.has(r.id)))
    }
    if (candidates.length === 0) {
      skipped.push({ dimension, reason: 'no_rule', ruleId: null })
      continue
    }
    let placed = false
    let lastReason: SkipReason = 'no_slot'
    let lastRule: string | null = null
    for (const rule of candidates) {
      lastRule = rule.id
      if (needsHr(rule) && !input.hrMaxPlausible) {
        lastReason = 'hr_max_unknown'
        continue
      }
      const high = isHigh(rule.intent)
      const blocks = blocksFor(rule)
      const minutes = durationOf(blocks)
      if (input.maxSessionMinutes != null && minutes != null && minutes > input.maxSessionMinutes) {
        lastReason = 'too_long'
        continue
      }
      const frequency = rule.prescription.frequencyPerWeek?.[0] ?? DEFAULT_FREQUENCY
      if (high && budget < frequency) {
        lastReason = 'budget'
        continue
      }
      const free = [...input.availableDays].sort((a, b) => a - b).filter((d) => !taken.has(d) && !(high && hardDays.some((h) => adjacent(d, h))))
      const chosen: number[] = []
      const keyDays = sessions.map((x) => x.day)
      const pick = (avoidAdjacent: boolean) => {
        for (const d of free) {
          if (chosen.length >= frequency) break
          if (chosen.includes(d)) continue
          if (avoidAdjacent && [...keyDays, ...chosen].some((k) => adjacent(d, k))) continue
          chosen.push(d)
        }
      }
      if (input.family === 'hybrid') pick(true)
      pick(false)
      if (chosen.length < frequency) {
        lastReason = 'no_slot'
        continue
      }
      const days = chosen.sort((a, b) => a - b)
      for (const d of days) taken.add(d)
      for (const day of days) {
        sessions.push({
          id: `${rule.id}-d${day}`,
          day,
          priority: 'key',
          highIntensity: high,
          dimension,
          phase: input.phase,
          primaryIntent: rule.intent,
          ruleId: rule.id,
          ruleVersion: rule.version,
          evidenceStrength: rule.evidence.strength,
          evidenceSpecificity: specificityFor(rule, input.family, input.disciplineId),
          plannedDurationMin: minutes,
          blocks,
          retestMetric: rule.retestMetric,
          coachModified: false,
          coachModificationReason: null,
        })
      }
      if (high) budget -= days.length
      used.add(rule.id)
      placed = true
      break
    }
    if (!placed) skipped.push({ dimension, reason: lastReason, ruleId: lastRule })
  }

  sessions.sort((a, b) => a.day - b.day)
  const notes: PlanNote[] = []
  if (input.family === 'combat_grappling' || input.family === 'combat_striking') notes.push({ key: 'combat_scope', sourceIds: [] })
  if (input.family === 'hybrid') {
    const strengthDays = sessions.some((x) => x.primaryIntent === 'MAX_STRENGTH' || x.primaryIntent === 'POWER')
    const enduranceHigh = sessions.some((x) => x.highIntensity)
    if (strengthDays && enduranceHigh) notes.push({ key: 'concurrent', sourceIds: ['concurrent_2024', 'concurrent_umbrella_2026'] })
    if (skipped.some((x) => x.dimension === 'strength_endurance' && x.reason === 'no_rule')) notes.push({ key: 'no_station_dose', sourceIds: ['hyrox_demand_2025', 'hift_scoping_2025'] })
  }
  const metrics = [...new Set(sessions.map((s) => s.retestMetric))]
  return {
    weeks,
    sessions,
    skipped,
    notes,
    retest: { week: weeks, metrics },
    highIntensityUsed: HIGH_INTENSITY_BUDGET - budget,
  }
}

/** Sportfamilie einer Disziplin. Piloten: Grappling, Hybrid und Striking. */
export function familyOfDiscipline(disciplineId: string | null | undefined): SportFamily | null {
  if (disciplineId === 'judo' || disciplineId === 'wrestling' || disciplineId === 'bjj') return 'combat_grappling'
  if (disciplineId === 'hyrox' || disciplineId === 'hybrid') return 'hybrid'
  if (disciplineId === 'boxing' || disciplineId === 'kickboxing' || disciplineId === 'muay_thai') return 'combat_striking'
  return null
}
