import type { TestDefinition } from '@/data/testCatalog'
import type { Sex } from '@/types/domain'
import {
  estimateOneRepMax,
  relativeStrength,
  sinclairPoints,
  vo2maxFromBeepTest,
  vo2maxFromCooper,
  pacePer500m,
  rowingWatts,
} from './index'

export interface DeriveContext {
  bodyWeightKg: number | null
  ageYears: number | null
  sex: Sex | null
}

/**
 * Rechnet aus den Rohwerten eines Tests die abgeleiteten Metriken.
 *
 * Entspricht dem, was serverseitig in `result_metrics` landet. Fehlende
 * Voraussetzungen (kein Körpergewicht, kein Alter) führen nicht zu einem
 * Fehler, sondern dazu, dass die betroffene Metrik schlicht fehlt — der Rest
 * bleibt nutzbar.
 */
export function deriveMetrics(
  test: TestDefinition,
  values: Record<string, number>,
  ctx: DeriveContext,
): Record<string, number> {
  const out: Record<string, number> = {}
  const put = (key: string, value: number | null | undefined) => {
    if (value != null && Number.isFinite(value)) out[key] = Math.round(value * 1000) / 1000
  }

  // Rohwerte, die selbst als Metrik dienen, unverändert übernehmen.
  for (const [key, value] of Object.entries(values)) {
    if (Number.isFinite(value)) put(key, value)
  }

  switch (test.slug) {
    case 'cooper_12min':
      put('vo2max_ml_kg_min', vo2maxFromCooper(values.distanceM))
      break

    case 'beep_test_20m':
      put('vo2max_ml_kg_min', vo2maxFromBeepTest(values.level, ctx.ageYears ?? 30))
      break

    case 'row_2000m': {
      const seconds = values.durationSeconds
      put('avg_pace_s_per_500m', pacePer500m(seconds, 2000))
      const watts = rowingWatts(seconds, 2000)
      put('avg_power_w', watts)
      if (watts != null && ctx.bodyWeightKg) put('watts_per_kg', watts / ctx.bodyWeightKg)
      break
    }

    case 'cindy_20min_amrap': {
      // Eine Runde Cindy sind 5 + 10 + 15 = 30 Wiederholungen.
      const total = (values.rounds ?? 0) * 30 + (values.partialReps ?? 0)
      put('total_reps', total)
      put('reps_per_minute', total / 20)
      break
    }

    case 'assault_bike_10min_cal':
      put('calories_per_minute', values.calories / 10)
      break

    default:
      break
  }

  // Kraftmetriken gelten für jeden Test mit Last und Wiederholungen.
  if (values.loadKg != null && values.reps != null) {
    const oneRm = estimateOneRepMax(values.loadKg, values.reps, 'epley')
    put('one_rm_kg', oneRm)
    if (ctx.bodyWeightKg) put('relative_strength_bw', relativeStrength(oneRm, ctx.bodyWeightKg))
    if (ctx.bodyWeightKg && (ctx.sex === 'male' || ctx.sex === 'female')) {
      put('sinclair_points', sinclairPoints(oneRm, ctx.bodyWeightKg, ctx.sex))
    }
  } else if (values.loadKg != null && ctx.bodyWeightKg) {
    // Bear Complex: Last ohne Wiederholungszahl, aber relativ bewertbar.
    put('relative_strength_bw', relativeStrength(values.loadKg, ctx.bodyWeightKg))
  }

  return out
}

/** Der Wert, der in Listen als Ergebnis des Tests erscheint. */
export function primaryValue(
  test: TestDefinition,
  values: Record<string, number>,
  metrics: Record<string, number>,
): number | null {
  const candidate = metrics[test.primaryMetric] ?? values[test.primaryMetric]
  return candidate != null && Number.isFinite(candidate) ? candidate : null
}
