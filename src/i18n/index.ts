import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import de from './de.json'

/**
 * Zweisprachig von Beginn an: die App-Oberfläche, die Testprotokolle
 * (Übersetzungstabelle in der Datenbank) und später die PDF-Reports laufen
 * über dieselbe Sprachwahl.
 *
 * Geladen wird nur die Sprache, die gebraucht wird. Beide Wörterbücher
 * zusammen sind rund 130 KB — die zweite Sprache im Startpaket mitzuschicken
 * hiesse, sie jedem aufzuladen, der sie nie sieht. Deutsch ist fest
 * eingebunden, weil es zugleich die Ausweichsprache ist: fehlt eine englische
 * Zeile, steht dort die deutsche und keine Leerstelle.
 */

const loaded = new Set(['de'])

/** Lädt ein Wörterbuch nach. Scheitert es, bleibt es bei der Ausweichsprache. */
export async function loadLocale(lng: string): Promise<void> {
  if (loaded.has(lng) || lng !== 'en') return
  try {
    const { default: en } = await import('./en.json')
    i18n.addResourceBundle('en', 'translation', en, true, true)
    loaded.add('en')
  } catch {
    /* Ohne die Datei bleibt Deutsch stehen — lesbar, nur nicht übersetzt. */
  }
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { de: { translation: de } },
    fallbackLng: 'de',
    supportedLngs: ['de', 'en'],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'baseline.locale',
      caches: ['localStorage'],
    },
  })

// Beim Wechsel und beim Start, falls die erkannte Sprache Englisch ist.
i18n.on('languageChanged', (lng) => {
  void loadLocale(lng)
})

/**
 * Steht, sobald die Startsprache verfügbar ist. `main.tsx` wartet darauf,
 * damit ein englischer Start nicht erst deutsch aufblitzt.
 */
export const i18nReady = loadLocale(i18n.resolvedLanguage ?? 'de')

export default i18n
