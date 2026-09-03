/**
 * Altersklasse aus dem Alter (Konzept §3, Schritt 2).
 *
 * Grobe Dekaden, keine Verbandsklassen: die Referenzwerte der App sind nach
 * Altersspannen der Quellen gegliedert, nicht nach Wettkampfklassen eines
 * bestimmten Verbands. Die Klasse hier ist eine Anzeige, keine Rechengrösse
 * — gerechnet wird immer mit dem Alter selbst.
 */
export type AgeClass = 'u20' | '20s' | '30s' | '40s' | '50s' | '60plus'

export function ageClass(age: number | null): AgeClass | null {
  if (age == null || !Number.isFinite(age)) return null
  if (age < 20) return 'u20'
  if (age < 30) return '20s'
  if (age < 40) return '30s'
  if (age < 50) return '40s'
  if (age < 60) return '50s'
  return '60plus'
}
