import { TRAINING_RULES, TRAINING_SOURCES } from '@/data/trainingRules'
import type { EvidenceRule, EvidenceSpecificity, Intent, Phase, SportFamily } from '@/domain/trainingTypes'

/**
 * Zugriff auf das Regelregister mit dem Prüf-Gate (Nachtrag 1, Punkt 4).
 *
 * Der Vorschauschalter ist ein Bau-Schalter (`VITE_TRAINING_PLAN=preview`).
 * Ohne ihn sieht ein Mensch nur geprüfte Regeln — heute also keine.
 */

export type PlanMode = 'off' | 'preview' | 'live'

/** Aus dem Bau-Schalter. Alles außer `preview` ist aus; `live` wird nur durch geprüfte Regeln wirksam. */
export function planMode(flag: string | undefined): PlanMode {
  if (flag === 'preview') return 'preview'
  if (flag === 'on') return 'live'
  return 'off'
}

export const isReviewed = (rule: EvidenceRule): boolean => rule.review.state === 'reviewed'

/** Darf die Regel in diesem Modus in einen Plan? */
export function ruleUsable(rule: EvidenceRule, mode: PlanMode): boolean {
  if (mode === 'off') return false
  if (rule.safety.forbiddenForAutoPrescription) return false
  if (rule.evidence.strength === 'INSUFFICIENT') return false
  return mode === 'preview' ? true : isReviewed(rule)
}

export interface RuleQuery {
  family: SportFamily
  phase?: Phase
  intent?: Intent
  mode: PlanMode
  trainingAgeYears?: number | null
}

export function eligibleRules(q: RuleQuery, rules: EvidenceRule[] = TRAINING_RULES): EvidenceRule[] {
  return rules.filter((r) => {
    if (!ruleUsable(r, q.mode)) return false
    if (!r.eligibleFamilies.includes(q.family)) return false
    if (q.phase && !r.eligiblePhases.includes(q.phase)) return false
    if (q.intent && r.intent !== q.intent) return false
    if (r.minimumTrainingAgeYears != null && (q.trainingAgeYears == null || q.trainingAgeYears < r.minimumTrainingAgeYears)) return false
    return true
  })
}

/**
 * Spezifität der Regel: erst die Disziplin, wenn die Studienlage sie nennt,
 * dann die Familie; fehlt beides, gilt EXTRAPOLATED, nie DIRECT.
 */
export const specificityFor = (rule: EvidenceRule, family: SportFamily, disciplineId?: string | null): EvidenceSpecificity =>
  (disciplineId ? rule.evidence.specificityByDiscipline?.[disciplineId] : undefined) ?? rule.evidence.specificity[family] ?? 'EXTRAPOLATED'

/** Strukturprüfung des Registers: wird in den Prüffällen aufgerufen. */
export function validateRegistry(rules: EvidenceRule[] = TRAINING_RULES): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const r of rules) {
    if (ids.has(r.id)) problems.push(`${r.id}: doppelte Kennung`)
    ids.add(r.id)
    if (r.evidence.sourceIds.length === 0) problems.push(`${r.id}: keine Quelle`)
    for (const s of r.evidence.sourceIds) if (!TRAINING_SOURCES[s]) problems.push(`${r.id}: Quelle ${s} fehlt im Register`)
    if (r.evidence.limitations.length === 0) problems.push(`${r.id}: keine Grenzen genannt`)
    if (r.eligibleFamilies.length === 0) problems.push(`${r.id}: keine Sportfamilie`)
    if (r.eligiblePhases.length === 0) problems.push(`${r.id}: keine Phase`)
    if (!r.retestMetric) problems.push(`${r.id}: keine Messung am Blockende`)
    if (r.review.state === 'reviewed' && (!r.review.reviewer || !r.review.reviewedOn)) problems.push(`${r.id}: Prüfung ohne Name oder Datum`)
    if (r.review.state === 'reviewed' && r.evidence.sourceIds.some((s) => !TRAINING_SOURCES[s]?.fullTextChecked)) problems.push(`${r.id}: geprüft, aber Quelle ohne Volltextprüfung`)
  }
  return problems
}
