import type { AppLocale } from './locales'

/**
 * Ein Text in mehreren Sprachen.
 *
 * Deutsch und Englisch stehen im Code; die übrigen Sprachen werden beim
 * Laden ergänzt (`contentRegistry.ts`) und sind deshalb optional. Ein
 * `{ de, en }`-Literal erfüllt den Typ unverändert.
 */
export type Localized = { de: string; en: string } & Partial<Record<AppLocale, string>>

/**
 * Der Text in der gewünschten Sprache — oder, wenn sie fehlt, auf Englisch.
 *
 * Warum Englisch und nicht Deutsch als Ausweichsprache der Inhalte: wer
 * Schwedisch oder Spanisch gewählt hat, liest eher Englisch als Deutsch.
 * Die Oberfläche fällt aus demselben Grund erst auf Englisch und dann auf
 * Deutsch zurück.
 */
export function pick(text: Localized, locale: AppLocale): string
export function pick(text: Localized | null | undefined, locale: AppLocale): string | undefined
export function pick(text: Localized | null | undefined, locale: AppLocale): string | undefined {
  if (!text) return undefined
  const table = text as Record<string, string | undefined>
  return table[locale] ?? text.en ?? text.de
}
