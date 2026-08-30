import type { TestDefinition, TestField } from '@/data/testCatalog'

/**
 * Validierung der Testeingaben — eine Stelle, nicht je Formular.
 *
 * Die Grenzen stehen am Testkatalog (`fields[].min/max`). Bisher blockierte
 * das Formular nur leere Pflichtfelder; ein Tippfehler wie 1650 kg statt
 * 165 kg wurde gespeichert und hätte den Verlauf, das Radar und jede
 * Bestleistung dauerhaft verfälscht — genau der Schaden, den Validierung
 * verhindern soll.
 *
 * Bewusst zwei Stufen:
 *   error   blockiert das Speichern (physikalisch unmöglich oder ausserhalb
 *           des Testprotokolls)
 *   warning weist hin, blockiert aber nicht (plausibel, aber ungewöhnlich)
 */

export type Severity = 'error' | 'warning'

export interface ValidationIssue {
  /** Feldschlüssel, oder '*' für den Datensatz als Ganzes. */
  field: string
  severity: Severity
  /** i18n-Schlüssel plus Werte — die Meldung wird in der UI übersetzt. */
  messageKey: string
  values?: Record<string, string | number>
}

/** Ab wie vielen Wiederholungen die 1RM-Schätzung merklich streut. */
export const REPS_RELIABLE_LIMIT = 10

export function validateTestInput(
  test: TestDefinition,
  values: Record<string, number | null | undefined>,
  context: { bodyWeightKg?: number | null; performedOn?: string } = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const field of test.fields) {
    const raw = values[field.key]
    const present = raw != null && Number.isFinite(raw)

    if (field.required && !present) {
      issues.push({ field: field.key, severity: 'error', messageKey: 'validation.required' })
      continue
    }
    if (!present) continue

    const value = raw as number
    issues.push(...checkRange(field, value))
  }

  // Testübergreifende Regeln.
  if (test.requiresBodyWeight && context.bodyWeightKg == null) {
    issues.push({ field: '*', severity: 'warning', messageKey: 'validation.noBodyWeight' })
  }

  const reps = values.reps
  if (reps != null && reps > REPS_RELIABLE_LIMIT) {
    issues.push({
      field: 'reps',
      severity: 'warning',
      messageKey: 'validation.repsUnreliable',
      values: { limit: REPS_RELIABLE_LIMIT },
    })
  }

  if (context.performedOn) {
    const day = context.performedOn.slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    if (day > today) {
      issues.push({ field: 'performedOn', severity: 'error', messageKey: 'validation.future' })
    }
  }

  return issues
}

function checkRange(field: TestField, value: number): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (field.type === 'integer' && !Number.isInteger(value)) {
    issues.push({ field: field.key, severity: 'error', messageKey: 'validation.integer' })
  }

  if (field.min != null && value < field.min) {
    issues.push({
      field: field.key,
      severity: 'error',
      messageKey: 'validation.min',
      values: { min: field.min, unit: field.unit ?? '' },
    })
  }

  if (field.max != null && value > field.max) {
    issues.push({
      field: field.key,
      severity: 'error',
      messageKey: 'validation.max',
      values: { max: field.max, unit: field.unit ?? '' },
    })
  }

  return issues
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}

export function issuesFor(issues: ValidationIssue[], field: string): ValidationIssue[] {
  return issues.filter((issue) => issue.field === field)
}
