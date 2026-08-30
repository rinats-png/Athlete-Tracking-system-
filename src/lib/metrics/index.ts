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

/**
 * Index des Special Judo Fitness Test nach Sterkowicz.
 *
 *   Index = (HF direkt nach Belastung + HF nach 1 min Pause) / Gesamtwürfe
 *
 * Kleinerer Wert ist besser. Nur mit dem Standardprotokoll (15/30/30 s,
 * zwei Partner) vergleichbar; ein abgewandeltes Protokoll ergibt eine Zahl,
 * die mit publizierten Referenzwerten nichts zu tun hat.
 */
export function sjftIndex(
  throwsTotal: number | null | undefined,
  hrEnd: number | null | undefined,
  hrAfter1min: number | null | undefined,
): number | null {
  if (throwsTotal == null || hrEnd == null || hrAfter1min == null) return null
  if (!Number.isFinite(throwsTotal) || !Number.isFinite(hrEnd) || !Number.isFinite(hrAfter1min)) {
    return null
  }
  return throwsTotal > 0 ? (hrEnd + hrAfter1min) / throwsTotal : null
}

/**
 * Ermüdungsindex in Prozent: (bester − schlechtester) / bester × 100.
 *
 * Die Rechnung ist in der Sprintliteratur üblich. Was als auffälliger Abfall
 * gilt, ist damit noch nicht gesagt — siehe Formelregister, Eintrag
 * `fatigue_index_percent`.
 */
export function fatigueIndexPercent(
  best: number | null | undefined,
  worst: number | null | undefined,
): number | null {
  if (best == null || worst == null || !Number.isFinite(best) || !Number.isFinite(worst)) return null
  if (best <= 0 || worst < 0 || worst > best) return null
  return ((best - worst) / best) * 100
}

/** Lineare Skalierung auf 0–100 mit Klemmung an den Rändern. */
function scaleTo100(value: number, low: number, high: number): number {
  if (high <= low) return 0
  const ratio = (value - low) / (high - low)
  return Math.min(100, Math.max(0, ratio * 100))
}

/**
 * FTP-Bereich, über den `bike_threshold_score` auf 0–100 gestreckt wird.
 *
 * VORLÄUFIG (§81): die Spanne 1,5–6,0 W/kg deckt Freizeit bis Elite ab, ist
 * aber eine Festlegung dieser App und kein Referenzkollektiv. Siehe
 * Formelregister.
 */
export const BIKE_THRESHOLD_SCALE_W_PER_KG = { low: 1.5, high: 6 } as const

export function bikeThresholdScore(
  ftpWatt: number | null | undefined,
  bodyWeightKg: number | null | undefined,
): number | null {
  if (ftpWatt == null || bodyWeightKg == null || !bodyWeightKg) return null
  if (!Number.isFinite(ftpWatt) || !Number.isFinite(bodyWeightKg)) return null
  return scaleTo100(
    ftpWatt / bodyWeightKg,
    BIKE_THRESHOLD_SCALE_W_PER_KG.low,
    BIKE_THRESHOLD_SCALE_W_PER_KG.high,
  )
}

/**
 * Schwimm-Technikwert aus Zuglänge und Geschwindigkeit.
 *
 * VORLÄUFIG (§81): Produkt aus Zuglänge (m) und Schwellengeschwindigkeit
 * (m/s), gestreckt über 0,8–3,2. Beide Rohwerte sind messbar, ihre
 * Verrechnung zu einem Technikwert ist hier gesetzt und durch einen belegten
 * Schwimmwirkungsgrad zu ersetzen. Siehe Formelregister.
 */
export const SWIM_TECHNIQUE_SCALE = { low: 0.8, high: 3.2 } as const

export function swimTechniqueScore(
  strokeLengthM: number | null | undefined,
  thresholdPaceS100: number | null | undefined,
): number | null {
  if (strokeLengthM == null || thresholdPaceS100 == null) return null
  if (!Number.isFinite(strokeLengthM) || !Number.isFinite(thresholdPaceS100)) return null
  if (strokeLengthM <= 0 || thresholdPaceS100 <= 0) return null
  const speedMs = 100 / thresholdPaceS100
  return scaleTo100(strokeLengthM * speedMs, SWIM_TECHNIQUE_SCALE.low, SWIM_TECHNIQUE_SCALE.high)
}

/**
 * Funktionelle Schwellenleistung aus dem 20-Minuten-Test.
 *
 *   FTP = 0,95 × mittlere Leistung über 20 min
 *
 * Etablierte Schätzung (Allen & Coggan), kein Laborwert: eine Rampen- oder
 * Laktatdiagnostik ist genauer, und der Faktor gilt nur für das
 * Standardprotokoll mit vorangehendem Öffnungsintervall.
 */
export const FTP_FACTOR_20MIN = 0.95

export function functionalThresholdPower(avgPowerW: number | null | undefined): number | null {
  if (avgPowerW == null || !Number.isFinite(avgPowerW) || avgPowerW <= 0) return null
  return avgPowerW * FTP_FACTOR_20MIN
}
