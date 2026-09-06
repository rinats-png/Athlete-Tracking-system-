import { RATING_LEVELS, RATING_THRESHOLDS } from '@/domain/rating'
import type { RatingLevel } from '@/domain/rating'
import type { ReferenceComparison } from '@/data/references'
import type { ScoringDirection } from '@/types/domain'

/**
 * Der Wert, den die nächste Einordnungsstufe verlangt.
 *
 * DER GRUND, WARUM ES DAS GIBT: «Gut» sagt, wo jemand steht. Es sagt nicht,
 * wie weit es bis zur nächsten Stufe ist — und genau das ist die Frage, die
 * nach der Einordnung kommt.
 *
 * WAS DIESE RECHNUNG IST UND WAS NICHT: sie dreht die vorhandene Einordnung
 * um. Aus «dieser Wert ergibt Perzentil 62» wird «Perzentil 84 verlangt
 * diesen Wert». Es entsteht dabei keine neue Aussage über den Menschen und
 * kein Versprechen, dass dieser Wert erreichbar ist — nur die Umkehrung
 * derselben Referenz, mit denselben Annahmen und denselben Grenzen (§81).
 *
 * Umgekehrt werden ausdrücklich NUR `mean_sd` und `percentiles`. Bänder
 * lassen sich nicht umkehren: die Quelle nennt eine Klassengrenze, aber
 * keine Verteilung dazwischen. Ein Bezugswert und ein Median erst recht
 * nicht.
 */

export interface TargetValue {
  /** Die Stufe, auf die sich der Wert bezieht. */
  level: RatingLevel
  /** Der Wert in der Einheit der verglichenen Kennzahl. */
  value: number
  /** Abstand zum aktuellen Wert, in derselben Einheit. Immer positiv. */
  distance: number
}

/**
 * Umkehrung der Standardnormalverteilung.
 *
 * Näherung nach Beasley-Springer-Moro in der einfachen Form; die Genauigkeit
 * liegt bei rund 4·10⁻⁴ und damit weit unter dem, was eine Referenzgruppe
 * mit n = 300 überhaupt auflöst. Eine genauere Umkehrung würde eine
 * Genauigkeit vortäuschen, die die Quelle nicht hat.
 */
function inverseNormalCdf(p: number): number {
  const clamped = Math.min(0.9999, Math.max(0.0001, p))
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924]
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857]
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878]
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742]
  const low = 0.02425
  if (clamped < low) {
    const q = Math.sqrt(-2 * Math.log(clamped))
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  }
  if (clamped > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - clamped))
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  }
  const q = clamped - 0.5
  const r = q * q
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  )
}

/** Die Stufe über der gegebenen. Null bei der obersten. */
export function nextLevel(level: RatingLevel | null): RatingLevel | null {
  if (level == null) return null
  const index = RATING_LEVELS.indexOf(level)
  return index >= 0 && index < RATING_LEVELS.length - 1 ? RATING_LEVELS[index + 1] : null
}

/** Der Wert, den ein Perzentil in dieser Referenz verlangt. */
function valueForPercentile(
  comparison: ReferenceComparison,
  percentile: number,
  direction: ScoringDirection,
): number | null {
  const { entry } = comparison

  if (entry.method === 'mean_sd' && entry.mean != null && entry.sd) {
    const z = inverseNormalCdf(percentile / 100)
    // Zurückdrehen, wie `compareToReferences` es hingedreht hat: bei
    // «kleiner ist besser» liegt die bessere Leistung unter dem Mittel.
    const signed = direction === 'lower_is_better' ? -z : z
    return entry.mean + signed * entry.sd
  }

  if (entry.method === 'percentiles' && entry.values && entry.values.length > 1) {
    const anchors = entry.percentileAnchors ?? [10, 25, 50, 75, 90, 99]
    if (anchors.length !== entry.values.length) return null
    // Ausserhalb der belegten Stützstellen wird nicht extrapoliert: die
    // Quelle sagt dort nichts, und eine Fortschreibung wäre erfunden.
    if (percentile < anchors[0] || percentile > anchors[anchors.length - 1]) return null
    for (let i = 1; i < anchors.length; i++) {
      if (percentile <= anchors[i]) {
        const share = (percentile - anchors[i - 1]) / (anchors[i] - anchors[i - 1])
        return entry.values[i - 1] + share * (entry.values[i] - entry.values[i - 1])
      }
    }
  }

  return null
}

/**
 * Was die nächste Stufe verlangt.
 *
 * Null, wenn die Referenz sich nicht umkehren lässt, die oberste Stufe schon
 * erreicht ist, oder der eigene Wert die Schwelle bereits überschreitet.
 */
export function targetForNextLevel(
  comparison: ReferenceComparison | null,
  currentLevel: RatingLevel | null,
  ownValue: number | null,
  direction: ScoringDirection,
): TargetValue | null {
  if (!comparison || ownValue == null) return null
  const level = nextLevel(currentLevel)
  if (!level) return null

  const threshold = RATING_THRESHOLDS.find((t) => t.level === level)
  if (!threshold) return null

  const value = valueForPercentile(comparison, threshold.minPercentile, direction)
  if (value == null || !Number.isFinite(value)) return null

  const distance = direction === 'lower_is_better' ? ownValue - value : value - ownValue
  if (distance <= 0) return null

  return { level, value, distance }
}
