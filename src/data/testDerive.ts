import type { Sex } from '@/types/domain'

/**
 * Die Kennzahlschicht eines Tests.
 *
 * DER FEHLER, DEN DAS BEHEBT
 *
 * Die Kennzahlen aller Tests standen bis hierher in einem einzigen Schalter
 * mit 34 Zweigen, weit weg von der Testdefinition. Wer den SWFT hinzufügte,
 * schrieb die Definition in die eine Datei und den Rechenzweig in die andere.
 * Vergass er den zweiten Schritt, speicherte die App den Test ohne seine
 * Kennzahl — und niemand merkte es, weil die Eingabe funktionierte.
 *
 * Jetzt bringt jede Testdefinition ihre eigene `derive`-Funktion mit: die
 * Kennzahl steht neben den Feldern, aus denen sie entsteht. Ein Bautest
 * (`tests/derive.spec.ts`) verlangt, dass jede in `derivedMetrics` genannte
 * Kennzahl von diesem Test auch tatsächlich gebildet wird.
 */

export interface DeriveContext {
  bodyWeightKg: number | null
  ageYears: number | null
  sex: Sex | null
}

/**
 * Nimmt eine Kennzahl auf. Null, undefined und NaN werden verworfen, statt
 * als Zahl zu erscheinen — eine fehlende Voraussetzung darf keine Null
 * ergeben.
 */
export type PutMetric = (key: string, value: number | null | undefined) => void
