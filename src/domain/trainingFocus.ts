import { changeReport, type ChangeReport } from '@/domain/change'
import { testsForDimension } from '@/domain/insights'
import type { StoredResult } from '@/lib/store/localStore'
import type { ValidatedFocus } from '@/lib/store/schema'

/**
 * Trainingsschwerpunkte — die Regeln.
 *
 * Ein Schwerpunkt ist ein Befund aus der Diagnostik plus die Anweisung des
 * Trainers dazu. Diese Datei hält fest, was dabei erlaubt ist; sie erzeugt
 * ausdrücklich keinen Inhalt. Es gibt hier keine Übungsvorschläge, keine
 * Trainingsempfehlungen und keine Textbausteine — der Satz kommt vom Trainer
 * (§81: die App behauptet nichts, was sie nicht belegen kann).
 */

/**
 * Höchstens drei offene Schwerpunkte je Athlet.
 *
 * Eine Liste mit zwölf Prioritäten hat keine. Drei sind ausserdem die Menge,
 * die im Bericht vollständig auf die zweite Seite passt — was dort nicht
 * abgebildet werden kann, würde in der App eine Wichtigkeit vortäuschen, die
 * beim Ausdruck verschwindet.
 */
export const MAX_ACTIVE_FOCUSES = 3

/**
 * Obergrenze über alles, offen und abgeschlossen. Abgeschlossene bleiben
 * erhalten, weil sie zum Verlauf gehören — aber ein Bestand darf nicht
 * unbegrenzt mitwachsen (§50).
 */
export const FOCUS_HARD_LIMIT = 60

/** Länge des Trainersatzes. Kurz genug, dass er im Bericht ganz steht. */
export const FOCUS_NOTE_MAX = 280

export const FOCUS_PRIORITIES = [1, 2, 3] as const
export type FocusPriority = (typeof FOCUS_PRIORITIES)[number]

/** Offene Schwerpunkte, dringendste zuerst; bei gleicher Stufe die ältesten. */
export function activeFocuses(focuses: ValidatedFocus[]): ValidatedFocus[] {
  return focuses
    .filter((focus) => focus.closedAt == null)
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))
}

export function closedFocuses(focuses: ValidatedFocus[]): ValidatedFocus[] {
  return focuses
    .filter((focus) => focus.closedAt != null)
    .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''))
}

/** Ist noch Platz für einen weiteren offenen Schwerpunkt? */
export function canAddFocus(focuses: ValidatedFocus[]): boolean {
  return activeFocuses(focuses).length < MAX_ACTIVE_FOCUSES && focuses.length < FOCUS_HARD_LIMIT
}

/** Ein Schwerpunkt auf derselben Achse ist schon offen. */
export function hasOpenFocusFor(focuses: ValidatedFocus[], axisId: string): boolean {
  return activeFocuses(focuses).some((focus) => focus.axisId === axisId)
}

/**
 * Steht die Nachmessung an? Vergleicht auf den Tag, nicht auf die Sekunde —
 * eine Nachmessung ist ein Termin, kein Zeitpunkt.
 */
export function reviewDue(focus: ValidatedFocus, today: string): boolean {
  return focus.closedAt == null && focus.reviewAt != null && focus.reviewAt <= today.slice(0, 10)
}

export interface FocusOutcome {
  /**
   * Die jüngste Messung nach Anlage des Schwerpunkts, in einem Test dieser
   * Fähigkeit. Null heisst: seither wurde nichts Passendes gemessen.
   */
  result: StoredResult | null
  /**
   * Die Veränderung dieser Messung gegenüber der vorigen, mit dem typischen
   * Fehler des Athleten. Null, solange es keine Messung gibt.
   */
  change: ChangeReport | null
}

/**
 * Hat der Schwerpunkt gewirkt?
 *
 * Die Antwort kommt aus der Messung, nicht aus einem Häkchen. Gesucht wird die
 * jüngste Messung NACH Anlage des Schwerpunkts in einem Test, der diese
 * Fähigkeit trägt; bewertet wird sie mit derselben Rechnung wie überall sonst,
 * also mit dem typischen Fehler dieses Athleten in diesem Test.
 *
 * Bei einer Achse ohne allgemeine Fähigkeit — den sportartspezifischen
 * Kennzahlachsen — gibt es keine Testliste, und dann steht hier ehrlich
 * nichts. Eine hilfsweise Zuordnung würde eine andere Fähigkeit messen und
 * das Ergebnis diesem Schwerpunkt zuschreiben.
 */
export function focusOutcome(focus: ValidatedFocus, results: StoredResult[]): FocusOutcome {
  if (!focus.dimension) return { result: null, change: null }
  const slugs = new Set(testsForDimension(focus.dimension))
  const after = results
    .filter((r) => slugs.has(r.testSlug) && r.score != null && r.performedAt > focus.createdAt)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  const latest = after.at(-1) ?? null
  return { result: latest, change: latest ? changeReport(results, latest) : null }
}
