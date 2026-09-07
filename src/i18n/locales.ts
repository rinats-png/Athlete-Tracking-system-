/**
 * Die Sprachen der App — an einer Stelle.
 *
 * Zwei Schichten sprechen dieselbe Kennung:
 *
 *   OBERFLÄCHE  über i18next, ein Wörterbuch je Sprache (`<lang>.json` und
 *               `<lang>.extra.json`), nachgeladen, wenn die Sprache gewählt
 *               wird.
 *   INHALTE     die `{ de, en }`-Objekte in den Datenmodulen — Testnamen,
 *               Anleitungen, Disziplinen, Achsen. Für die weiteren Sprachen
 *               werden sie beim Laden der Sprache ergänzt
 *               (`contentRegistry.ts`) und über `pick()` gelesen.
 *
 * Deutsch ist die Ausweichsprache der Oberfläche, Englisch die der Inhalte:
 * fehlt in einer Sprache eine Zeile, steht dort keine Leerstelle, sondern
 * der englische Text — sichtbar, nicht still.
 *
 * Die Rechtstexte gibt es nur auf Deutsch und Englisch. Ein Impressum in
 * sechs weiteren Sprachen ohne juristische Prüfung wäre kein Impressum,
 * sondern ein Risiko; die Rechtsseiten sagen das in den übrigen Sprachen.
 */
export const APP_LOCALES = ['de', 'en', 'fr', 'es', 'sv', 'da', 'nb', 'nl'] as const
export type AppLocale = (typeof APP_LOCALES)[number]

/** Die Sprachen, die im Auslieferungsstand gebündelt sind (Deutsch fest, Rest nachgeladen). */
export const LAZY_LOCALES: readonly AppLocale[] = ['en', 'fr', 'es', 'sv', 'da', 'nb', 'nl']

/** Eigenname der Sprache — steht im Umschalter, bewusst NICHT übersetzt. */
export const LOCALE_NAMES: Record<AppLocale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  sv: 'Svenska',
  da: 'Dansk',
  nb: 'Norsk',
  nl: 'Nederlands',
}

/** Sprachen, in denen die Rechtstexte vorliegen. */
export const LEGAL_LOCALES: readonly AppLocale[] = ['de', 'en']

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (APP_LOCALES as readonly string[]).includes(value)
}

/**
 * Aus einer Browser- oder Speicherkennung die Sprache der App.
 *
 * «de-CH» wird Deutsch, «nn» und «no» werden Bokmål — eine Nutzerin mit
 * Nynorsk-Browser soll Norwegisch sehen und nicht Deutsch, nur weil die
 * Kennung nicht wörtlich passt.
 */
export function toAppLocale(tag: string | null | undefined, fallback: AppLocale = 'de'): AppLocale {
  if (!tag) return fallback
  const base = tag.toLowerCase().split(/[-_]/)[0]
  if (base === 'no' || base === 'nn') return 'nb'
  return isAppLocale(base) ? base : fallback
}
