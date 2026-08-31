import type { TestDefinition } from './testCatalog'
import { fatigueIndexPercent, pacePer500m, rowingWatts } from '@/lib/metrics'

/**
 * Kennzahlen, die sich mehrere Tests teilen.
 *
 * Sie stehen hier statt als Kopie in jeder Definition: Ruderergometer über
 * 1000 m und 2000 m rechnen dieselbe Pace, nur über eine andere Distanz —
 * die kommt aus dem Protokoll des jeweiligen Tests. Zwei Kopien derselben
 * Rechnung liefen früher oder später auseinander.
 */

export const deriveRowing: NonNullable<TestDefinition['derive']> = (values, ctx, put, test) => {
  const seconds = values.durationSeconds
  const meters = test.protocol.targetDistanceM ?? 2000
  put('avg_pace_s_per_500m', pacePer500m(seconds, meters))
  const watts = rowingWatts(seconds, meters)
  put('avg_power_w', watts)
  if (watts != null && ctx.bodyWeightKg) put('watts_per_kg', watts / ctx.bodyWeightKg)
}

export const deriveStrikeSplit: NonNullable<TestDefinition['derive']> = (values, _ctx, put) => {
  // Abfall zwischen erster und zweiter halber Minute.
  const first = values.repsFirst30
  if (first != null && values.reps != null && first > 0) {
    const second = values.reps - first
    put('fatigue_index_percent', fatigueIndexPercent(first, Math.max(0, second)))
  }
}

export const deriveRepsFatigue: NonNullable<TestDefinition['derive']> = (
  values,
  _ctx,
  put,
  test,
) => {
  // Abfall zwischen den ersten 30 s und dem hochgerechneten Rest.
  const first = values.repsFirst30
  const seconds = test.protocol.durationSeconds
  if (first != null && first > 0 && values.reps != null && seconds != null && seconds > 30) {
    const rest = values.reps - first
    const restPer30 = rest / ((seconds - 30) / 30)
    put('fatigue_index_percent', fatigueIndexPercent(first, Math.max(0, restPer30)))
  }
  if (values.reps != null && seconds) put('reps_per_minute', values.reps / (seconds / 60))
}

export const deriveStrokeTimeTrial: NonNullable<TestDefinition['derive']> = (values, _ctx, put) => {
  if (values.strokeCount != null) put('strokes_per_100m', values.strokeCount)
}
