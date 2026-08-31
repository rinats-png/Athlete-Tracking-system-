import type { TestDefinition } from '@/data/testCatalog'
import type { DeriveContext } from '@/data/testDerive'
import {
  estimateOneRepMax,
  relativeStrength,
  sinclairPoints,
  peakPowerSayers,
  averageVelocity,
  pacePerKm,
} from './index'

export type { DeriveContext }

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

  // Was diesen Test ausmacht, rechnet der Test selbst. Die Funktion steht in
  // seiner Definition, neben den Feldern, aus denen ihre Kennzahlen
  // entstehen — früher stand sie hier in einem Schalter mit 34 Zweigen,
  // und wer ihn beim Hinzufügen eines Tests vergass, bekam einen Test ohne
  // Kennzahl, ohne dass irgendetwas fehlschlug.
  test.derive?.(values, ctx, put, test)

  // Sprint: Geschwindigkeit über die im Protokoll hinterlegte Distanz.
  if (test.category === 'speed' && test.protocol.targetDistanceM != null) {
    put('avg_velocity_m_s', averageVelocity(test.protocol.targetDistanceM, values.durationSeconds))
  }

  // Laufstrecken mit fester Distanz: Pace je Kilometer.
  if (
    test.derivedMetrics.includes('avg_pace_s_per_km') &&
    test.protocol.targetDistanceM != null
  ) {
    put('avg_pace_s_per_km', pacePerKm(values.durationSeconds, test.protocol.targetDistanceM))
  }

  // Leistung je Körpergewicht, wo eine Leistung gemessen wurde.
  if (test.derivedMetrics.includes('watts_per_kg') && ctx.bodyWeightKg && out.watts_per_kg == null) {
    const watts = values.avgPowerW ?? values.peakPowerW
    if (watts != null) put('watts_per_kg', watts / ctx.bodyWeightKg)
  }

  // Zusatzlast je Körpergewicht bei getragenen Aufgaben (Farmers Carry,
  // Schlitten, Marsch): 60 kg sind für 60 kg Körpergewicht etwas anderes
  // als für 100 kg.
  if (test.derivedMetrics.includes('load_relative') && ctx.bodyWeightKg && values.loadKg != null) {
    put('load_relative', values.loadKg / ctx.bodyWeightKg)
  }

  // Sprungtests: geschätzte Spitzenleistung nach Sayers.
  if (values.jumpHeightCm != null && ctx.bodyWeightKg != null) {
    const watts = peakPowerSayers(values.jumpHeightCm, ctx.bodyWeightKg)
    put('peak_power_w', watts)
    if (watts != null) put('peak_power_w_per_kg', watts / ctx.bodyWeightKg)
  }


  // Kraftmetriken gelten für jeden Test mit Last und Wiederholungen.
  if (values.loadKg != null && values.reps != null) {
    const oneRm = estimateOneRepMax(values.loadKg, values.reps, 'epley')
    put('one_rm_kg', oneRm)
    if (ctx.bodyWeightKg) put('relative_strength_bw', relativeStrength(oneRm, ctx.bodyWeightKg))
    if (ctx.bodyWeightKg && (ctx.sex === 'male' || ctx.sex === 'female')) {
      put('sinclair_points', sinclairPoints(oneRm, ctx.bodyWeightKg, ctx.sex))
    }
  } else if (
    values.loadKg != null &&
    ctx.bodyWeightKg &&
    test.derivedMetrics.includes('relative_strength_bw')
  ) {
    // Bear Complex: Last ohne Wiederholungszahl, aber relativ bewertbar.
    // Getragene Aufgaben (Farmers Carry, Schlitten) haben ebenfalls eine
    // Last ohne Wiederholungen — dort ist sie aber keine Kraftfähigkeit,
    // sondern eine Vorgabe. Deshalb nur, wo der Katalog es ausweist.
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
