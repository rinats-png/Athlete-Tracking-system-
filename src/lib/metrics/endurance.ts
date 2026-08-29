/**
 * Ausdauermetriken.
 *
 * Die Schätzformeln sind Feldtest-Formeln: sie ersetzen keine Spiroergometrie,
 * sind aber für die Verlaufsbeobachtung eines Athleten gut geeignet, weil der
 * systematische Fehler über die Zeit konstant bleibt.
 */

/**
 * VO2max aus dem Cooper-Test (12 min).
 * Cooper (1968): VO2max = (d − 504.9) / 44.73, d in Metern.
 */
export function vo2maxFromCooper(distanceMeters: number): number | null {
  if (distanceMeters <= 0) return null
  return (distanceMeters - 504.9) / 44.73
}

/** Laufgeschwindigkeit der erreichten Stufe im 20-m-Shuttle-Run, in km/h. */
export function beepTestSpeedKmh(level: number): number {
  return 8 + 0.5 * (level - 1)
}

/**
 * VO2max aus dem 20-m-Shuttle-Run.
 * Léger et al. (1988), altersabhängige Variante:
 *   VO2max = 31.025 + 3.238·v − 3.248·a + 0.1536·v·a
 * mit v = Endgeschwindigkeit in km/h und a = Alter in Jahren.
 */
export function vo2maxFromBeepTest(level: number, ageYears: number): number | null {
  if (level < 1 || ageYears <= 0) return null
  const v = beepTestSpeedKmh(level)
  return 31.025 + 3.238 * v - 3.248 * ageYears + 0.1536 * v * ageYears
}

/** Pace in Sekunden je 500 m — die übliche Anzeige auf dem Ruderergometer. */
export function pacePer500m(durationSeconds: number, distanceMeters: number): number | null {
  if (durationSeconds <= 0 || distanceMeters <= 0) return null
  return durationSeconds / (distanceMeters / 500)
}

/** Pace in Sekunden je Kilometer. */
export function pacePerKm(durationSeconds: number, distanceMeters: number): number | null {
  if (durationSeconds <= 0 || distanceMeters <= 0) return null
  return durationSeconds / (distanceMeters / 1000)
}

/**
 * Mittlere Leistung am Ruderergometer.
 * Concept2: P = 2.80 / pace³, mit pace in Sekunden je Meter.
 */
export function rowingWatts(durationSeconds: number, distanceMeters: number): number | null {
  if (durationSeconds <= 0 || distanceMeters <= 0) return null
  const secondsPerMeter = durationSeconds / distanceMeters
  return 2.8 / Math.pow(secondsPerMeter, 3)
}

export interface LactateStage {
  powerWatts?: number | null
  speedKmh?: number | null
  heartRate?: number | null
  lactateMmolL?: number | null
}

/**
 * Leistung an einer festen Laktatschwelle (Standard 4 mmol/l, "anaerobe
 * Schwelle" nach Mader). Zwischen den beiden Stufen, die die Schwelle
 * einschliessen, wird linear interpoliert.
 *
 * Bewusst das einfache Schwellenmodell: Verfahren wie Dmax oder die
 * individuelle anaerobe Schwelle brauchen mehr Stufen und eine Kurvenanpassung
 * und kommen erst, wenn genügend echte Testdaten vorliegen.
 */
export function powerAtLactateThreshold(
  stages: LactateStage[],
  thresholdMmolL = 4,
  key: 'powerWatts' | 'speedKmh' | 'heartRate' = 'powerWatts',
): number | null {
  const usable = stages
    .filter((s) => s.lactateMmolL != null && s[key] != null)
    .sort((a, b) => (a.lactateMmolL as number) - (b.lactateMmolL as number))

  if (usable.length < 2) return null

  const below = [...usable].reverse().find((s) => (s.lactateMmolL as number) <= thresholdMmolL)
  const above = usable.find((s) => (s.lactateMmolL as number) >= thresholdMmolL)

  if (!below || !above) return null
  if (below === above) return below[key] as number

  const lactateSpan = (above.lactateMmolL as number) - (below.lactateMmolL as number)
  if (lactateSpan === 0) return below[key] as number

  const ratio = (thresholdMmolL - (below.lactateMmolL as number)) / lactateSpan
  return (below[key] as number) + ratio * ((above[key] as number) - (below[key] as number))
}

/**
 * Trainingszonen aus der Schwellenherzfrequenz — die Ableitung, die im
 * Trainer-Report als Handlungsempfehlung ausgegeben wird.
 * Fünf-Zonen-Modell relativ zur anaeroben Schwellen-HF.
 */
export const TRAINING_ZONES = [
  { key: 'recovery', lower: 0.0, upper: 0.81 },
  { key: 'endurance', lower: 0.81, upper: 0.89 },
  { key: 'tempo', lower: 0.89, upper: 0.96 },
  { key: 'threshold', lower: 0.96, upper: 1.02 },
  { key: 'vo2max', lower: 1.02, upper: 1.2 },
] as const

export function trainingZonesFromThresholdHr(thresholdHr: number) {
  return TRAINING_ZONES.map((zone) => ({
    key: zone.key,
    lowerBpm: Math.round(thresholdHr * zone.lower),
    upperBpm: Math.round(thresholdHr * zone.upper),
  }))
}
