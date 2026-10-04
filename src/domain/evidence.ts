import type { SportSpecificity } from '@/data/fuelRules'

/**
 * Evidence Confidence (Produktdoktrin §11, §12): wie gut die allgemeine
 * Grundlage einer Aussage ist. Sie bleibt getrennt von der Data Confidence
 * (wie belastbar DEINE Daten sind) und wird nie mit ihr verrechnet.
 *
 * Übertragung: die Studienlage liegt in derselben Sportart (direkt), in einer
 * verwandten (übertragen) oder bei Sportlern allgemein (extrapoliert).
 */
export type Transfer = 'direct' | 'related' | 'extrapolated'

export function transferOf(specificity: SportSpecificity): Transfer {
  if (specificity === 'same_sport') return 'direct'
  if (specificity === 'related_sport') return 'related'
  return 'extrapolated'
}
