export * from './strength'
export * from './endurance'

/**
 * Spitzenleistung aus der Sprunghöhe nach Sayers.
 *
 * Sayers et al. (1999), Medicine & Science in Sports & Exercise 31(4):572–577,
 * «Cross-validation of three jump power equations». Die dort für den
 * Countermovement Jump ermittelte Gleichung:
 *
 *   Peak Power (W) = 60,7 × Sprunghöhe (cm) + 45,3 × Körpermasse (kg) − 2055
 *
 * Sie ist eine Schätzung aus Kraftmessplatten-Daten und ersetzt keine
 * Messung. Für den Squat Jump gilt sie mit grösserer Streuung; die App
 * benutzt sie dort ebenfalls, weil die Alternative wäre, gar keinen Wert
 * anzuzeigen — der Vorbehalt steht in der Oberfläche.
 *
 * Ausserhalb der Sprunghöhen, an denen die Gleichung aufgestellt wurde,
 * wird KEIN Wert geliefert. Bei 5 cm Sprunghöhe und 40 kg Masse rechnet sie
 * 60 W aus — eine Zahl, die formal positiv und inhaltlich Unsinn ist. Das
 * ist dieselbe Regel wie bei den Perzentilen: am Rand wird geklemmt, nicht
 * extrapoliert.
 */
export const SAYERS_VALID_HEIGHT_CM = { min: 15, max: 90 } as const
export function peakPowerSayers(
  jumpHeightCm: number | null | undefined,
  bodyMassKg: number | null | undefined,
): number | null {
  if (jumpHeightCm == null || bodyMassKg == null) return null
  if (!Number.isFinite(jumpHeightCm) || !Number.isFinite(bodyMassKg)) return null
  if (bodyMassKg <= 0) return null
  if (
    jumpHeightCm < SAYERS_VALID_HEIGHT_CM.min ||
    jumpHeightCm > SAYERS_VALID_HEIGHT_CM.max
  ) {
    return null
  }
  const watts = 60.7 * jumpHeightCm + 45.3 * bodyMassKg - 2055
  return watts > 0 ? watts : null
}

/** Durchschnittsgeschwindigkeit in m/s. */
export function averageVelocity(
  meters: number | null | undefined,
  seconds: number | null | undefined,
): number | null {
  if (meters == null || seconds == null || !Number.isFinite(meters) || !Number.isFinite(seconds)) {
    return null
  }
  return seconds > 0 ? meters / seconds : null
}

/** Pace in Sekunden je Kilometer. */
export function pacePerKm(
  seconds: number | null | undefined,
  meters: number | null | undefined,
): number | null {
  if (seconds == null || meters == null || !Number.isFinite(seconds) || !Number.isFinite(meters)) {
    return null
  }
  return meters > 0 ? (seconds / meters) * 1000 : null
}
