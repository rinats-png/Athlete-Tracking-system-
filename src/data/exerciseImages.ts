/**
 * Bild je Übung (docs/uebungsbilder.md): `public/testbilder/U_<key>.jpg`.
 *
 * Die Liste führt nur Übungen, zu denen die Datei WIRKLICH vorliegt. So gibt
 * es keine Anfrage ins Leere und kein kaputtes Bild: wer ohne Bild ist,
 * sieht die Übung wie bisher. Kommt eine Lieferung, kommen ihre Schlüssel
 * hierher; ein Prüffall hält Liste und Dateien im Gleichlauf.
 */
export const EXERCISE_IMAGE_KEYS: ReadonlySet<string> = new Set<string>([])

/** Adresse des Bildes, oder null ohne Bild. */
export function exerciseImageUrl(key: string): string | null {
  return EXERCISE_IMAGE_KEYS.has(key) ? `/testbilder/U_${key}.jpg` : null
}
