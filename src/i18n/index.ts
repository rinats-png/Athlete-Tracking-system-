import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import de from './de.json'
import { APP_LOCALES, LAZY_LOCALES, toAppLocale, type AppLocale } from './locales'
import { augmentContent, type ContentTable } from './contentRegistry'

/**
 * Acht Sprachen, eine Sprachwahl: die Oberfläche, die Inhalte der
 * Datenmodule und die Berichte laufen über dieselbe Kennung.
 *
 * Geladen wird nur, was gebraucht wird. Ein Wörterbuch samt Zusatzteil und
 * Inhaltstabelle sind rund 200 KB — sieben davon im Startpaket mitzuschicken
 * hiesse, sie jedem aufzuladen, der sie nie sieht. Deutsch ist fest
 * eingebunden, weil es die letzte Ausweichsprache ist: fehlt eine Zeile,
 * steht dort Englisch, und fehlt auch das, Deutsch — nie eine Leerstelle.
 *
 * DREI TEILE JE SPRACHE:
 *   <lang>.json          das Wörterbuch des Startbildschirms
 *   <lang>.extra.json    Texte nachgeladener Bildschirme (Vorschriften,
 *                        Trainerbereich, Rechtsseiten) — kommen mit dem
 *                        ersten nachgeladenen Bildschirm
 *   content/<lang>.json  die Inhalte der Datenmodule, englischer Text als
 *                        Schlüssel; werden in die Objekte eingetragen
 */

const MAIN: Record<Exclude<AppLocale, 'de'>, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('./en.json'),
  fr: () => import('./fr.json'),
  es: () => import('./es.json'),
  sv: () => import('./sv.json'),
  da: () => import('./da.json'),
  nb: () => import('./nb.json'),
  nl: () => import('./nl.json'),
}
const EXTRA: Record<AppLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  de: () => import('./de.extra.json'),
  en: () => import('./en.extra.json'),
  fr: () => import('./fr.extra.json'),
  es: () => import('./es.extra.json'),
  sv: () => import('./sv.extra.json'),
  da: () => import('./da.extra.json'),
  nb: () => import('./nb.extra.json'),
  nl: () => import('./nl.extra.json'),
}
const CONTENT: Record<Exclude<AppLocale, 'de' | 'en'>, () => Promise<{ default: ContentTable }>> = {
  fr: () => import('./content/fr.json'),
  es: () => import('./content/es.json'),
  sv: () => import('./content/sv.json'),
  da: () => import('./content/da.json'),
  nb: () => import('./content/nb.json'),
  nl: () => import('./content/nl.json'),
}

const loaded = new Set<AppLocale>(['de'])
const extraLoaded = new Set<AppLocale>()
const contentLoaded = new Set<AppLocale>(['de', 'en'])
const pending = new Map<string, Promise<void>>()

/**
 * Ein nachgeladener Teil kommt asynchron — die Bildschirme haben dann schon
 * gerendert. react-i18next rendert bei «languageChanged» neu; das Ereignis
 * wird deshalb noch einmal ausgelöst, sobald ein Teil der AKTUELLEN Sprache
 * eingetroffen ist. Der Lader selbst ist idempotent, die Schleife endet.
 */
function rerenderIfCurrent(lang: AppLocale): void {
  if (toAppLocale(i18n.language) === lang) i18n.emit('languageChanged', i18n.language)
}

/** Ein Ladevorgang je Schlüssel — zwei gleichzeitige Aufrufe teilen sich einen. */
function once(key: string, run: () => Promise<void>): Promise<void> {
  const running = pending.get(key)
  if (running) return running
  const p = run().finally(() => pending.delete(key))
  pending.set(key, p)
  return p
}

/**
 * Wörterbuchteile, die nur auf nachgeladenen Bildschirmen gebraucht werden.
 * Fehlt der Teil noch, zeigt i18next den Schlüssel — deshalb wartet der
 * Bildschirmlader auf dieses Versprechen, bevor er rendert.
 */
export async function loadExtra(lng: string = i18n.language ?? 'de'): Promise<void> {
  const lang = toAppLocale(lng)
  // Englisch ist die Ausweichsprache der übrigen — sein Zusatzteil gehört dazu.
  if (lang !== 'de' && lang !== 'en') await loadExtra('en')
  if (extraLoaded.has(lang)) return
  await once(`extra:${lang}`, async () => {
    try {
      const { default: extra } = await EXTRA[lang]()
      i18n.addResourceBundle(lang, 'translation', extra, true, true)
      extraLoaded.add(lang)
      rerenderIfCurrent(lang)
    } catch {
      /* Ohne den Teil bleiben die Schlüssel stehen — lesbar, nur unschön. */
    }
  })
}

/** Die Inhalte der Datenmodule in dieser Sprache — an Ort und Stelle ergänzt. */
export async function loadContent(lng: string): Promise<void> {
  const lang = toAppLocale(lng)
  if (contentLoaded.has(lang)) return
  await once(`content:${lang}`, async () => {
    try {
      const { default: table } = await CONTENT[lang as keyof typeof CONTENT]()
      await augmentContent(lang, table)
      contentLoaded.add(lang)
      rerenderIfCurrent(lang)
    } catch {
      /* Ohne die Tabelle bleiben die Inhalte englisch — pick() fällt zurück. */
    }
  })
}

/** Lädt ein Wörterbuch nach. Scheitert es, bleibt es bei der Ausweichsprache. */
export async function loadLocale(lng: string): Promise<void> {
  const lang = toAppLocale(lng)
  if (lang === 'de') return
  // Die Ausweichsprache der übrigen zuerst, damit keine Zeile leer bleibt.
  if (lang !== 'en' && !loaded.has('en')) await loadLocale('en')
  if (!loaded.has(lang)) {
    await once(`main:${lang}`, async () => {
      try {
        const { default: dict } = await MAIN[lang as keyof typeof MAIN]()
        i18n.addResourceBundle(lang, 'translation', dict, true, true)
        loaded.add(lang)
        // Beim Start kennt i18next die Sprache, hat aber noch keine Zeilen
        // dafür — `resolvedLanguage` steht dann auf der Ausweichsprache.
        // Nach dem Laden einmal neu auflösen, sonst bliebe die Oberfläche
        // deutsch, obwohl das Wörterbuch längst da ist.
        if (toAppLocale(i18n.language) === lang && i18n.resolvedLanguage !== lang) {
          await i18n.changeLanguage(lang)
        }
      } catch {
        /* Ohne die Datei bleibt die Ausweichsprache stehen — lesbar, nur nicht übersetzt. */
      }
    })
  }
  await Promise.all([
    loadContent(lang),
    // Der Zusatzteil derselben Sprache gehört dazu, sobald er gebraucht wird.
    extraLoaded.has('de') || extraLoaded.has('en') ? loadExtra(lang) : Promise.resolve(),
  ])
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { de: { translation: de } },
    // Erst Englisch, dann Deutsch: wer Schwedisch gewählt hat, liest eine
    // fehlende Zeile lieber englisch als deutsch.
    fallbackLng: { de: ['de'], en: ['de'], default: ['en', 'de'] },
    supportedLngs: [...APP_LOCALES],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'baseline.locale',
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string) => toAppLocale(lng),
    },
  })

// Beim Wechsel und beim Start, falls die erkannte Sprache nicht Deutsch ist.
i18n.on('languageChanged', (lng) => {
  void loadLocale(lng)
  if (typeof document !== 'undefined') document.documentElement.lang = toAppLocale(lng)
})

/**
 * Steht, sobald die Startsprache verfügbar ist. `main.tsx` wartet darauf,
 * damit ein englischer Start nicht erst deutsch aufblitzt.
 */
export const i18nReady = loadLocale(i18n.language ?? 'de')

export { LAZY_LOCALES }
export default i18n
