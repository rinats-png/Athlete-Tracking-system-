/**
 * Kraftmetriken.
 *
 * Alle Funktionen sind rein und arbeiten in metrischen Einheiten (kg, m, s).
 * Die Umrechnung in die Anzeigeeinheit des Nutzers passiert erst in der UI.
 */

export type OneRmFormula = 'epley' | 'brzycki' | 'lombardi'

/**
 * Schätzung des 1RM aus einem Mehrfachwiederholungssatz.
 *
 * Standard ist Epley — im Bereich 1–10 Wiederholungen gut belegt und
 * international am weitesten verbreitet. Die verwendete Formel wird beim
 * Ergebnis mitgespeichert (result_metrics.formula), damit Werte aus
 * verschiedenen Zeiten vergleichbar bleiben.
 *
 * Ab etwa 10 Wiederholungen laufen alle Formeln auseinander; die App weist
 * deshalb oberhalb von REPS_RELIABLE_LIMIT auf die sinkende Genauigkeit hin.
 */
export const REPS_RELIABLE_LIMIT = 10

export function estimateOneRepMax(
  loadKg: number,
  reps: number,
  formula: OneRmFormula = 'epley',
): number {
  if (loadKg <= 0 || reps <= 0) return 0
  if (reps === 1) return loadKg

  switch (formula) {
    case 'epley':
      // Epley (1985): 1RM = w · (1 + r/30)
      return loadKg * (1 + reps / 30)
    case 'brzycki':
      // Brzycki (1993): 1RM = w · 36 / (37 − r); ab r = 37 undefiniert.
      return reps < 37 ? (loadKg * 36) / (37 - reps) : loadKg * (1 + reps / 30)
    case 'lombardi':
      // Lombardi (1989): 1RM = w · r^0.10
      return loadKg * Math.pow(reps, 0.1)
  }
}

/** Relativkraft: 1RM je Kilogramm Körpergewicht. */
export function relativeStrength(oneRmKg: number, bodyWeightKg: number): number | null {
  if (!bodyWeightKg || bodyWeightKg <= 0) return null
  return oneRmKg / bodyWeightKg
}

/**
 * Sinclair-Koeffizient für olympisches Gewichtheben.
 *
 * Der Koeffizient normiert das Ergebnis eines Hebers auf das Niveau eines
 * Athleten im schwersten Gewichtsklassen-Referenzgewicht und macht damit
 * Leistungen über Gewichtsklassen hinweg vergleichbar.
 *
 *   coefficient = 10^(A · (log10(x / b))²)   für x < b
 *   coefficient = 1                          für x >= b
 *
 * A und b werden von der IWF für jeden Olympiazyklus neu bestimmt. Die hier
 * hinterlegten Werte gehören zum Zyklus 2021–2024 und müssen zu Beginn eines
 * neuen Zyklus aktualisiert werden — deshalb liegen sie als benannte
 * Konstante vor und nicht als Zahl im Rechenweg.
 */
export const SINCLAIR_COEFFICIENTS = {
  cycle: '2021-2024',
  male: { a: 0.722762521, b: 193.609 },
  female: { a: 0.787004341, b: 153.655 },
} as const

export function sinclairCoefficient(
  bodyWeightKg: number,
  sex: 'male' | 'female',
): number | null {
  if (!bodyWeightKg || bodyWeightKg <= 0) return null
  const { a, b } = SINCLAIR_COEFFICIENTS[sex]
  if (bodyWeightKg >= b) return 1
  const exponent = a * Math.pow(Math.log10(bodyWeightKg / b), 2)
  return Math.pow(10, exponent)
}

/** Sinclair-Punkte = gehobenes Gesamtgewicht × Koeffizient. */
export function sinclairPoints(
  totalKg: number,
  bodyWeightKg: number,
  sex: 'male' | 'female',
): number | null {
  const coefficient = sinclairCoefficient(bodyWeightKg, sex)
  return coefficient === null ? null : totalKg * coefficient
}
