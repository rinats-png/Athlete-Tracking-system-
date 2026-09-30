import { FUEL_RULES, type FuelRule, type SportSpecificity } from '@/data/fuelRules'
import { PROTEIN_BAND } from '@/domain/fueling'

/**
 * Fuel-Regel einer Disziplin (docs/fuel.md, Stufe 1). Rein: keine Oberfläche,
 * kein Speicher.
 */

export interface FuelRuleMatch {
  rule: FuelRule
  /** Direkt für die Disziplin oder aus einer verwandten übertragen. */
  specificity: Extract<SportSpecificity, 'same_sport' | 'related_sport'>
}

/**
 * Die Regel zu einer Disziplin, oder null. Null heisst: für diese Disziplin
 * liegt keine Regel vor (Halbmarathon, Freiwasser, Kampfsport …). Es wird
 * nichts hergeleitet — eine erfundene Spanne wäre schlimmer als keine.
 */
export function fuelRuleFor(disciplineId: string | null): FuelRuleMatch | null {
  if (!disciplineId) return null
  for (const rule of FUEL_RULES) {
    if (rule.disciplineIds.includes(disciplineId)) return { rule, specificity: 'same_sport' }
    if (rule.relatedDisciplineIds.includes(disciplineId)) return { rule, specificity: 'related_sport' }
  }
  return null
}

export interface SportDailyNeed {
  carbsPerKg: [number, number]
  carbsG: [number, number]
  proteinG: [number, number]
}

/** Tagesspanne der Disziplin in Gramm. Null ohne Körpermasse. */
export function sportDailyNeed(rule: FuelRule, weightKg: number | null): SportDailyNeed | null {
  if (weightKg == null || weightKg <= 0) return null
  const g = (band: [number, number]): [number, number] => [Math.round(band[0] * weightKg), Math.round(band[1] * weightKg)]
  return { carbsPerKg: rule.carbsPerKg, carbsG: g(rule.carbsPerKg), proteinG: g(PROTEIN_BAND) }
}
