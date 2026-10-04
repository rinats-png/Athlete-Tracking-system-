import { aggregateAttempts, attemptContextFor } from '@/domain/assessment'
import { getTest } from '@/data/testCatalog'
import type { StoredAthlete } from '@/lib/store/localStore'

/**
 * Der Kiosk-Modus (Produktdoktrin §16): ein Gerät an der Station, ein Athlet
 * nach dem anderen, bis zu drei Versuche, der beste gültige zählt.
 *
 * Diese Datei kennt keine Oberfläche. Sie macht aus den Eingaben eines
 * Athleten das, was `resultSchema` speichert: alle Versuche im Rohzustand,
 * ungültige markiert (nicht gelöscht), der Leistungswert aus dem besten
 * GÜLTIGEN Versuch. Nichts wird geschätzt: ohne gültigen Versuch gibt es
 * kein Ergebnis.
 */

export const MAX_ATTEMPTS = 3

/**
 * Ob ein Test im Kiosk erfasst werden kann: sein Leistungswert muss ein
 * einzelnes Eingabefeld sein. Bei abgeleiteten Kennzahlen (Last und
 * Wiederholungen zu einem 1RM) braucht es mehrere Felder je Versuch — dafür
 * bleibt der Gruppentest zuständig.
 */
export function kioskSupported(testSlug: string): boolean {
  const test = getTest(testSlug)
  if (!test) return false
  const field = test.fields.find((f) => f.key === test.primaryMetric)
  return field != null && test.fields.filter((f) => f.required).length <= 1
}

export interface AttemptInput {
  /** Der Messwert, oder null, solange nichts eingetragen ist. */
  value: number | null
  /** Ob der Versuch gewertet wird. Ungültig bleibt gespeichert, zählt aber nicht. */
  valid: boolean
}

export interface KioskResult {
  /** Alle eingetragenen Versuche, in der Reihenfolge der Eingabe (Rohzustand). */
  attempts: Record<string, number>[]
  /** Indizes in `attempts`, die ungültig sind. */
  invalidIndexes: number[]
  /** Der gewertete Wert (bester gültiger Versuch) als Feldwerte des Tests. */
  values: Record<string, number>
  /** Index des besten gültigen Versuchs in `attempts`. */
  bestIndex: number
}

/**
 * Das Ergebnis aus den Versuchen eines Athleten, oder null ohne gültigen Wert.
 * Leere Felder werden übersprungen, die Reihenfolge der gefüllten bleibt.
 */
export function kioskResult(testSlug: string, inputs: AttemptInput[]): KioskResult | null {
  const test = getTest(testSlug)
  const context = attemptContextFor(testSlug)
  if (!test || !context) return null
  const filled = inputs.filter((i) => i.value != null && Number.isFinite(i.value))
  const attempts = filled.map((i) => ({ [context.key]: i.value as number }))
  const invalidIndexes = filled.map((i, idx) => (i.valid ? -1 : idx)).filter((idx) => idx >= 0)
  const valid = attempts.filter((_, idx) => !invalidIndexes.includes(idx))
  const best = aggregateAttempts(valid, 'best', context)
  if (!best) return null
  const bestIndex = attempts.findIndex((a, idx) => !invalidIndexes.includes(idx) && a[context.key] === best[context.key])
  return { attempts, invalidIndexes, values: best, bestIndex }
}

/** Welcher Versuch (Index in der Eingabeliste) ist der beste gültige? Für die Markierung auf dem Bildschirm. */
export function bestInputIndex(testSlug: string, inputs: AttemptInput[]): number {
  const res = kioskResult(testSlug, inputs)
  if (!res) return -1
  // Zurück auf die Eingabeposition: gefüllte Felder zählen, leere nicht.
  let seen = -1
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i].value != null && Number.isFinite(inputs[i].value)) {
      seen++
      if (seen === res.bestIndex) return i
    }
  }
  return -1
}

/** Wer an diesem Tag diesen Test schon hat. */
export function doneOnDay(athletes: StoredAthlete[], testSlug: string, day: string): Set<string> {
  return new Set(athletes.filter((a) => a.results.some((r) => r.testSlug === testSlug && r.performedAt.slice(0, 10) === day)).map((a) => a.id))
}

/**
 * Der nächste Athlet in der Reihenfolge, der noch keinen Wert hat. Beginnt nach
 * dem aktuellen und läuft am Ende der Liste herum; null, wenn alle fertig sind.
 */
export function nextOpen(order: string[], done: Set<string>, currentId: string | null): string | null {
  if (order.length === 0) return null
  const start = currentId ? order.indexOf(currentId) : -1
  for (let step = 1; step <= order.length; step++) {
    const id = order[(start + step + order.length) % order.length]
    if (!done.has(id)) return id
  }
  return null
}
