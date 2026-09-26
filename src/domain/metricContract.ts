/**
 * Der Vertrag einer abgeleiteten Kennzahl (Master-Spezifikation D1).
 *
 * WARUM ES IHN GIBT. Eine Zahl, die die App errechnet, ist nur so viel wert
 * wie die Angaben, die an ihr hängen: aus wie vielen Werten, nach welcher
 * Rechnung in welcher Fassung, wie belastbar, und was fehlt. Ohne diese
 * Angaben sieht «11,8 % Leistungsabfall aus zwei Messungen» genauso aus wie
 * derselbe Wert aus zwölf — und genau das ist Scheingenauigkeit.
 *
 * WAS ER VERLANGT. Jede Kennzahl, die nach diesem Vertrag gebaut wird, sagt:
 *
 *   - welcher Algorithmus in welcher Fassung sie erzeugt hat,
 *   - auf wie vielen Werten sie steht (`sampleSize`),
 *   - wie gut die Datenlage ist (`quality`) und wie sicher die Aussage
 *     (`confidence`, 0–1, mit Beschriftung),
 *   - welche Einschränkungen gelten (`warnings`, i18n-Schlüssel).
 *
 * UNTER DER MINDESTMENGE GIBT ES KEINEN WERT. `value` ist dann `null` und
 * `warnings` enthält `insufficient_data` — die Oberfläche zeigt, was fehlt,
 * statt eine Zahl aus zu wenig Daten (§89: leer ist nicht null).
 *
 * Diese Datei rechnet nichts Fachliches. Sie ist die Form, in die die
 * Fachmodule (durability, load, readinessContext, energy …) ihre Ergebnisse
 * giessen, damit die Oberfläche sie einheitlich beschriften kann.
 */

export type DataQuality = 'low' | 'medium' | 'high'
export type ConfidenceLabel = 'LOW' | 'MEDIUM' | 'HIGH'

/** Bekannte Einschränkungen — jede ist ein i18n-Schlüssel unter `metric.warning.*`. */
export type MetricWarning =
  | 'insufficient_data'
  | 'missing_input'
  | 'estimate'
  | 'provisional_formula'
  | 'incompatible_protocol'
  | 'low_completeness'
  | 'stale'
  | 'self_report'
  | 'within_noise'

export interface DerivedMetric<T = number> {
  key: string
  value: T | null
  unit?: string
  period: { from: string; to: string }
  /** Kennungen der Einträge, aus denen die Zahl entstand (Ergebnisse, Tage, Einheiten). */
  sourceIds: string[]
  algorithm: string
  algorithmVersion: string
  sampleSize: number
  quality: DataQuality
  /** 0–1. Null, wenn sich nichts sagen lässt. */
  confidence: number | null
  confidenceLabel: ConfidenceLabel | null
  warnings: MetricWarning[]
  computedAt: string
}

/**
 * Stufen der Konfidenz. Die Grenzen sind eine Festlegung dieser App und
 * gelten für alle Kennzahlen gleich — damit «mittel» überall dasselbe heisst.
 */
export function confidenceLabel(confidence: number | null): ConfidenceLabel | null {
  if (confidence == null || !Number.isFinite(confidence)) return null
  if (confidence >= 0.7) return 'HIGH'
  if (confidence >= 0.4) return 'MEDIUM'
  return 'LOW'
}

/**
 * Datenqualität aus der Stichprobe gegen Mindest- und Zielmenge.
 *
 * Unter der Mindestmenge ist die Qualität «low» (und es gibt keinen Wert),
 * ab der Zielmenge «high», dazwischen «medium».
 */
export function qualityFromSample(n: number, min: number, target: number): DataQuality {
  if (n < min) return 'low'
  if (n >= target) return 'high'
  return 'medium'
}

/**
 * Konfidenz aus Stichprobe und Vollständigkeit.
 *
 * Bewusst einfach und offen: der Anteil an der Zielmenge (gedeckelt bei 1),
 * multipliziert mit der Vollständigkeit des Zeitfensters. Das ist keine
 * statistische Sicherheit im Sinne eines Konfidenzintervalls, sondern ein
 * Mass dafür, wie viel der benötigten Datenlage vorhanden ist — und so heisst
 * es in der Oberfläche auch.
 */
export function confidenceFromSample(n: number, target: number, completeness = 1): number {
  if (target <= 0) return 0
  const share = Math.min(1, n / target)
  const c = Math.max(0, Math.min(1, completeness))
  return Math.round(share * c * 1000) / 1000
}

export interface MetricSpec {
  key: string
  algorithm: string
  algorithmVersion: string
  unit?: string
  /** Unter dieser Stichprobe gibt es keinen Wert. */
  minSample: number
  /** Ab dieser Stichprobe gilt die Datenlage als gut. */
  targetSample: number
  /** Die Formel ist eine Festlegung dieser App, keine publizierte. */
  provisional?: boolean
  /** Der Wert ist eine Schätzung (TDEE, e1RM …), keine Messung. */
  estimate?: boolean
}

/**
 * Eine Kennzahl nach Vertrag bauen.
 *
 * Unter `spec.minSample` wird der Wert verworfen und `insufficient_data`
 * gesetzt — unabhängig davon, was der Aufrufer ausgerechnet hat. So kann
 * kein Fachmodul aus Versehen eine Zahl aus zu wenig Daten durchreichen.
 */
export function buildMetric<T = number>(
  spec: MetricSpec,
  input: {
    value: T | null
    sampleSize: number
    period: { from: string; to: string }
    sourceIds?: string[]
    completeness?: number
    warnings?: MetricWarning[]
    now?: Date
  },
): DerivedMetric<T> {
  const warnings = new Set<MetricWarning>(input.warnings ?? [])
  const enough = input.sampleSize >= spec.minSample
  if (!enough) warnings.add('insufficient_data')
  if (spec.provisional) warnings.add('provisional_formula')
  if (spec.estimate) warnings.add('estimate')
  if (input.completeness != null && input.completeness < 0.7) warnings.add('low_completeness')

  const value = enough ? input.value : null
  if (value == null && enough) warnings.add('missing_input')

  const confidence = value == null ? null : confidenceFromSample(input.sampleSize, spec.targetSample, input.completeness ?? 1)

  return {
    key: spec.key,
    value,
    unit: spec.unit,
    period: input.period,
    sourceIds: input.sourceIds ?? [],
    algorithm: spec.algorithm,
    algorithmVersion: spec.algorithmVersion,
    sampleSize: input.sampleSize,
    quality: qualityFromSample(input.sampleSize, spec.minSample, spec.targetSample),
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    warnings: [...warnings],
    computedAt: (input.now ?? new Date()).toISOString(),
  }
}

/**
 * Fassung der Ableitungen, die beim Speichern eines Ergebnisses gelaufen
 * sind (`result.metrics`). Sie wird am Ergebnis festgehalten, damit sich eine
 * Zahl später reproduzieren lässt, auch wenn eine Formel geändert wurde.
 *
 * ERHÖHEN, wenn sich eine Ableitung in `src/lib/metrics` oder in einem
 * `derive` des Testkatalogs so ändert, dass derselbe Rohwert eine andere
 * Kennzahl ergibt. Neue Kennzahlen ohne Änderung bestehender erhöhen nicht.
 */
export const DERIVE_VERSION = '2026.09.1'
