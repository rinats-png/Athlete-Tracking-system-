import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import de from './de.json'
import en from './en.json'

/**
 * Zweisprachig von Beginn an: die App-Oberfläche, die Testprotokolle
 * (Übersetzungstabelle in der Datenbank) und später die PDF-Reports laufen
 * über dieselbe Sprachwahl.
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { de: { translation: de }, en: { translation: en } },
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

export default i18n
