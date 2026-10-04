import type { Fact } from '@/domain/askKydon'

/**
 * Der Zahlenwächter (Produktdoktrin §28): ein Text, der aus Fakten entstanden
 * ist, darf keine Zahl enthalten, die nicht in den Fakten steht.
 *
 * Er ist für den Tag gebaut, an dem ein Sprachmodell Antworten umformuliert:
 * das Modell erzeugt keine Ergebnisse, es formuliert sie. Besteht ein Text
 * den Wächter nicht, gilt die Vorlage ohne Modell. Heute prüft er die
 * Vorlagen selbst — und hält die Regel fest, bevor es einen Anbieter gibt.
 */

/** Alle Zahlen eines Textes. Dezimalkomma und -punkt, Tausendertrenner, Vorzeichen werden ignoriert. */
export function numbersIn(text: string): number[] {
  const found = text.match(/\d+(?:[.,]\d+)?/g) ?? []
  return found.map((s) => Number(s.replace(',', '.'))).filter((n) => Number.isFinite(n))
}

const close = (a: number, b: number): boolean => Math.abs(a - b) <= 0.051 + Math.abs(b) * 0.0005

/** Zahlen, die ein Text enthalten darf: die der Fakten, gerundet auf null und eine Stelle. */
export function allowedNumbers(facts: Fact[]): number[] {
  const out: number[] = []
  const collect = (v: string | number) => {
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v, Math.round(v), Math.round(v * 10) / 10, Math.abs(v))
    // Datumsangaben und Kennungen: ihre Ziffern zählen als erlaubt.
    if (typeof v === 'string') out.push(...numbersIn(v))
  }
  for (const f of facts) for (const v of Object.values(f.params)) collect(v)
  return out
}

/** Zahlen im Text, die in den Fakten nicht vorkommen. Leer = bestanden. */
export function unknownNumbers(text: string, facts: Fact[], extraAllowed: number[] = []): number[] {
  const allowed = [...allowedNumbers(facts), ...extraAllowed]
  return numbersIn(text).filter((n) => !allowed.some((a) => close(n, a)))
}

export const passesGuard = (text: string, facts: Fact[], extraAllowed: number[] = []): boolean => unknownNumbers(text, facts, extraAllowed).length === 0
