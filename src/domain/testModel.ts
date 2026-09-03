import { getTest, type TestDefinition } from '@/data/testCatalog'
import { REFERENCES, type ReferenceEntry, type ReferenceQuality } from '@/data/references'
import { DISCIPLINES } from '@/data/sportProfiles'
import { attemptContextFor } from '@/domain/assessment'

/**
 * Der Test als ein Objekt (Konzept §30).
 *
 * Die Daten liegen in drei Schichten — Protokoll, Kennzahlen, Einordnung —
 * und die Referenzen in einer eigenen Tabelle. Das ist richtig für die
 * Pflege: eine neue Referenzstudie ändert eine Zeile, nicht einen Test.
 * Für die Anzeige ist es umständlich: die Testdetailseite will «Sportart,
 * Kategorie, Protokoll, Equipment, Einheit, Richtung, Referenzen, Evidenz,
 * Testmodus» an einer Stelle.
 *
 * Diese Sicht fügt das zusammen. Sie speichert nichts und erfindet nichts:
 * jedes Feld hier ist aus den Schichten abgeleitet, und wer die Herkunft
 * sucht, findet sie dort.
 */

export type TestMode = 'manual' | 'timer' | 'series' | 'external'

/**
 * Wie die App den Test begleitet (Konzept §13).
 *
 *   timer    — Countdown, Belastungszeit, Ende hörbar: alles mit fester Dauer.
 *   series   — Schritt für Schritt durch Versuche oder Stufen.
 *   external — der Wert kommt von einem Gerät oder aus dem Labor; die App
 *              speichert und deutet ihn.
 *   manual   — draussen durchführen, Ergebnis eintragen.
 */
export function testMode(test: TestDefinition): TestMode {
  if (test.setting === 'lab') return 'external'
  if (test.protocol.mode === 'countdown' || test.protocol.mode === 'amrap') return 'timer'
  if (test.protocol.mode === 'attempts' || test.protocol.mode === 'stages') return 'series'
  // Tests, deren Ergebnis ein Leistungsmesser oder Ergometer ausgibt.
  const devices = new Set(['power_meter', 'rowing_erg', 'ski_erg', 'bike_erg'])
  if (test.equipmentIds.some((group) => group.every((id) => devices.has(id)))) return 'external'
  return 'manual'
}

export interface TestSportLink {
  disciplineId: string
  name: { de: string; en: string }
  role: 'core' | 'optional'
}

export interface TestEvidence {
  /** Beste Datenqualität unter den Referenzen. Null ohne Referenz. */
  quality: ReferenceQuality | null
  /** Studien, die die Referenzen tragen — ohne Doppelnennung. */
  sources: { study: string; n: number | null }[]
}

export interface TestModel {
  slug: string
  test: TestDefinition
  sports: TestSportLink[]
  mode: TestMode
  unit: string
  references: ReferenceEntry[]
  evidence: TestEvidence
  /** Gibt es für diesen Test überhaupt eine Bevölkerungsreferenz? */
  hasPopulationReference: boolean
  /** Mehrere Versuche je Durchgang? */
  series: boolean
}

/** Referenzen, die zu diesem Test passen — auch die für «jeden Test mit dieser Kennzahl». */
export function referencesForTest(test: TestDefinition): ReferenceEntry[] {
  const metricKeys = new Set([
    test.primaryMetric,
    ...Object.values(test.dimensionMetrics),
    ...test.derivedMetrics,
  ])
  return REFERENCES.filter(
    (entry) =>
      entry.testSlug === test.slug || (entry.testSlug === '*' && metricKeys.has(entry.metricKey)),
  )
}

const QUALITY_ORDER: ReferenceQuality[] = ['A', 'B', 'C', 'D']

export function describeTest(slug: string): TestModel | null {
  const test = getTest(slug)
  if (!test) return null
  const references = referencesForTest(test)
  const quality =
    references.length === 0
      ? null
      : references.map((r) => r.quality).sort((a, b) => QUALITY_ORDER.indexOf(a) - QUALITY_ORDER.indexOf(b))[0]
  const sources: TestEvidence['sources'] = []
  for (const entry of references) {
    if (!sources.some((s) => s.study === entry.source.study)) sources.push(entry.source)
  }
  return {
    slug,
    test,
    sports: DISCIPLINES.flatMap((discipline) => {
      const link = discipline.tests.find((t) => t.slug === slug)
      return link ? [{ disciplineId: discipline.id, name: discipline.name, role: link.role }] : []
    }),
    mode: testMode(test),
    unit: test.primaryUnit,
    references,
    evidence: { quality, sources },
    hasPopulationReference: references.some((r) => r.cohort === 'population'),
    series: test.protocol.mode === 'attempts' && attemptContextFor(slug) != null,
  }
}
