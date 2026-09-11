/**
 * Umzug der Speicherschlüssel von «baseline.» nach «kydon.».
 *
 * Die App hiess bis September 2026 Baseline, und dieser Name steckte in
 * jedem Schlüssel des lokalen Speichers. Ein Umbenennen ohne diesen Umzug
 * hiesse: Wer die App schon benutzt, öffnet sie nach dem Update und findet
 * einen leeren Bestand vor. Seine Messreihe läge noch da — unter dem alten
 * Schlüssel, für die neue App unsichtbar. Das ist der Datenverlust, den §89
 * verbietet, nur diesmal selbst verursacht.
 *
 * WARUM DIESES MODUL KEINE IMPORTE HAT UND ALS ERSTES IN `main.tsx` STEHT:
 * Die Sprachwahl liest ihren Schlüssel, sobald `i18n/index.ts` ausgewertet
 * wird — das passiert beim Import, nicht erst beim Rendern. Ein Umzug, der
 * danach läuft, käme für die Sprache zu spät. ES-Module werden in der
 * Reihenfolge ihrer Importe ausgewertet, und ein Modul ohne eigene Importe
 * ist damit fertig, bevor das nächste beginnt. Der Umzug läuft also als
 * Nebenwirkung des Imports, und die Position in `main.tsx` ist Teil der
 * Korrektheit, nicht Stil.
 *
 * REGELN DES UMZUGS:
 *   1. Ein neuer Schlüssel, der schon existiert, wird nie überschrieben —
 *      dann war die neue App bereits in Gebrauch, und ihr Stand ist der
 *      jüngere.
 *   2. Der alte Schlüssel wird nach dem Kopieren entfernt. Ein Bestand, der
 *      unter zwei Namen liegt, ist ein Bestand, der beim nächsten Umzug
 *      doppelt verwirrt.
 *   3. Ohne Speicherzugriff passiert nichts, und das ist kein Fehler.
 *
 * Die Zweitschrift in IndexedDB zieht `backup.ts` um — sie ist asynchron und
 * wird ohnehin nur gelesen, wenn der localStorage leer zurückkommt.
 */

export const LEGACY_PREFIX = 'baseline.'
export const STORAGE_PREFIX = 'kydon.'

/** Zieht alle alten Schlüssel um und nennt, welche es waren. Idempotent. */
export function migrateLegacyStorage(): string[] {
  const moved: string[] = []
  try {
    const legacy: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(LEGACY_PREFIX)) legacy.push(key)
    }
    for (const oldKey of legacy) {
      const newKey = STORAGE_PREFIX + oldKey.slice(LEGACY_PREFIX.length)
      const value = localStorage.getItem(oldKey)
      if (value != null && localStorage.getItem(newKey) == null) {
        localStorage.setItem(newKey, value)
        moved.push(newKey)
      }
      localStorage.removeItem(oldKey)
    }
  } catch {
    /* Kein Speicher — nichts umzuziehen. */
  }
  return moved
}

migrateLegacyStorage()
