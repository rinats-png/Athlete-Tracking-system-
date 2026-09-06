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

/**
 * Wörterbuchteile, die nur auf nachgeladenen Bildschirmen gebraucht werden.
 *
 * WARUM DAS GETEILT IST: das deutsche Wörterbuch ist die Ausweichsprache und
 * deshalb fest eingebunden — es liegt im Startpaket. Es war damit auch der
 * grösste einzelne Posten darin, obwohl gut ein Fünftel davon Texte sind,
 * die auf dem Startbildschirm niemand sieht: Durchführungsvorschriften,
 * Beobachtungswerte, Trainerbereich, Rechtstexte.
 *
 * Sie liegen jetzt in `*.extra.json` und kommen mit dem ersten
 * nachgeladenen Bildschirm. Fehlt der Teil noch, zeigt i18next den
 * Schlüssel — deshalb wartet der Bildschirmlader auf dieses Versprechen,
 * bevor er rendert.
 */
const extraLoaded = new Set<string>()

export async function loadExtra(lng: string = i18n.resolvedLanguage ?? 'de'): Promise<void> {
  const lang = lng === 'en' ? 'en' : 'de'
  if (extraLoaded.has(lang)) return
  try {
    const { default: extra } =
      lang === 'en' ? await import('./en.extra.json') : await import('./de.extra.json')
    i18n.addResourceBundle(lang, 'translation', extra, true, true)
    extraLoaded.add(lang)
  } catch {
    /* Ohne den Teil bleiben die Schlüssel stehen — lesbar, nur unschön. */
  }
}

/** Lädt ein Wörterbuch nach. Scheitert es, bleibt es bei der Ausweichsprache. */
export async function loadLocale(lng: string): Promise<void> {
  if (loaded.has(lng) || lng !== 'en') return
  try {
    const { default: en } = await import('./en.json')
    i18n.addResourceBundle('en', 'translation', en, true, true)
    loaded.add('en')
    // Der Zusatzteil derselben Sprache gehört dazu, sobald er gebraucht wird.
    if (extraLoaded.has('de')) await loadExtra('en')
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
  if (extraLoaded.size > 0) void loadExtra(lng)
})

/**
 * Steht, sobald die Startsprache verfügbar ist. `main.tsx` wartet darauf,
 * damit ein englischer Start nicht erst deutsch aufblitzt.
 */
export const i18nReady = loadLocale(i18n.resolvedLanguage ?? 'de')

export default i18n
