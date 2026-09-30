import type { FuelEvidence } from '@/data/fuelRules'

/**
 * Hitze, Kälte und Reise (docs/fuel.md, Stufe 3).
 *
 * WAS DAS IST: qualitative Hinweise, keine Rechenfaktoren. Die Vorlage nennt
 * für Thermik und Reise Variablen und Stichworte («Hydration und Koffein
 * kontextualisieren», «Mahlzeitentiming und praktischer Zugang»), aber keine
 * Zahlen — also ändert sich am Plan keine Spanne. Was hier steht, ändert nur,
 * worauf die Karte hinweist. Für die Höhe nennt die Vorlage nur die Variable
 * `altitude_m` und keine Regel; deshalb gibt es dazu nichts.
 *
 * Hinweise ohne Konsensuspapier tragen ehrlich `expert` / `low`.
 */

export type ContextKey = 'hot' | 'cold' | 'trip' | 'zones'

export interface FuelNote {
  id: string
  applies: ContextKey
  evidence: FuelEvidence
}

const ev = (type: FuelEvidence['type'], strength: FuelEvidence['strength'], sourceIds: string[]): FuelEvidence => ({
  type,
  strength,
  specificity: 'general_athlete',
  verification: 'not_reverified',
  sourceIds,
  ruleVersion: '1.0.0',
  reviewed: '2026-09-30',
})

export const FUEL_NOTES: FuelNote[] = [
  { id: 'hot_sweat', applies: 'hot', evidence: ev('consensus', 'moderate', ['sawka2007']) },
  { id: 'hot_fluid', applies: 'hot', evidence: ev('consensus', 'high', ['hewbutler2015', 'sawka2007']) },
  { id: 'hot_caffeine', applies: 'hot', evidence: ev('expert', 'low', ['guest2021']) },
  { id: 'cold_thirst', applies: 'cold', evidence: ev('expert', 'low', ['sawka2007']) },
  { id: 'trip_access', applies: 'trip', evidence: ev('expert', 'low', []) },
  { id: 'trip_arrival', applies: 'trip', evidence: ev('expert', 'low', []) },
  { id: 'zones_timing', applies: 'zones', evidence: ev('expert', 'low', []) },
]
