import type { AthleteData } from '@/lib/store/localStore'

/**
 * Körperzusammensetzung.
 *
 * Fettmasse und fettfreie Masse werden gerechnet, nicht gespeichert: sie sind
 * vollständig aus Gewicht und Körperfettanteil bestimmt. Ein zusätzlich
 * gespeicherter Wert könnte von seinen Bestandteilen abweichen — und dann
 * wüsste niemand, welcher stimmt.
 *
 * BMI wird bewusst mitgeliefert, aber nachrangig dargestellt: bei einem
 * muskulösen Athleten ist er als Einordnung wertlos, und die App soll ihn
 * nicht wichtiger aussehen lassen, als er ist.
 */

export interface BodyComposition {
  bodyWeightKg: number
  bodyFatPercent: number | null
  /** Fettmasse in kg. Null ohne Körperfettmessung. */
  fatMassKg: number | null
  /** Fettfreie Masse in kg. Null ohne Körperfettmessung. */
  fatFreeMassKg: number | null
  bmi: number | null
  measuredOn: string
}

export function bodyComposition(
  data: AthleteData,
  atIso?: string,
): BodyComposition | null {
  const entries = [...data.biometrics].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn))
  const day = atIso?.slice(0, 10)
  const entry = day
    ? (entries.find((e) => e.measuredOn <= day) ?? entries[entries.length - 1])
    : entries[0]

  if (!entry || entry.bodyWeightKg == null) return null

  const heightM = data.profile.heightCm != null ? data.profile.heightCm / 100 : null
  const fatMassKg =
    entry.bodyFatPercent != null
      ? Math.round(entry.bodyWeightKg * (entry.bodyFatPercent / 100) * 10) / 10
      : null

  return {
    bodyWeightKg: entry.bodyWeightKg,
    bodyFatPercent: entry.bodyFatPercent,
    fatMassKg,
    fatFreeMassKg: fatMassKg == null ? null : Math.round((entry.bodyWeightKg - fatMassKg) * 10) / 10,
    bmi:
      heightM && heightM > 0
        ? Math.round((entry.bodyWeightKg / (heightM * heightM)) * 10) / 10
        : null,
    measuredOn: entry.measuredOn,
  }
}

/**
 * Veränderung der Körperzusammensetzung zwischen zwei Zeitpunkten.
 *
 * Gebraucht für §25: eine Kraftsteigerung bei gleichzeitiger Gewichtszunahme
 * ist etwas anderes als dieselbe Steigerung bei gleichem Gewicht — und nur
 * mit beiden Zahlen nebeneinander lässt sich das lesen.
 */
export interface CompositionChange {
  from: BodyComposition
  to: BodyComposition
  weightDeltaKg: number
  fatFreeDeltaKg: number | null
  days: number
}

export function compositionChange(
  data: AthleteData,
  fromIso: string,
  toIso: string,
): CompositionChange | null {
  const from = bodyComposition(data, fromIso)
  const to = bodyComposition(data, toIso)
  if (!from || !to || from.measuredOn === to.measuredOn) return null

  return {
    from,
    to,
    weightDeltaKg: Math.round((to.bodyWeightKg - from.bodyWeightKg) * 10) / 10,
    fatFreeDeltaKg:
      from.fatFreeMassKg != null && to.fatFreeMassKg != null
        ? Math.round((to.fatFreeMassKg - from.fatFreeMassKg) * 10) / 10
        : null,
    days: Math.round(
      (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000,
    ),
  }
}
