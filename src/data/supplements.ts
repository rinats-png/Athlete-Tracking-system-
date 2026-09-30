import type { EvidenceStrength, EvidenceType } from '@/data/fuelRules'

/**
 * Nahrungsergänzung: Informationsseite (docs/fuel.md, Entscheidung 4 und §5).
 *
 * KEINE Empfehlung, KEINE Dosierung, KEINE Marken, KEINE Rangliste. Je
 * Substanz: was das Positionspapier belegt, wo es endet, und der Verweis auf
 * die Quelle. Die Stärkeangaben sind unsere Einordnung der Positionspapiere
 * und nicht am Primärtext gegengelesen (`not_reverified`). Anti-Doping und
 * Fremdprüfung stehen als Pflichthinweis über der Liste.
 */

export interface Supplement {
  id: 'caffeine' | 'creatine' | 'bicarbonate' | 'beta_alanine'
  type: EvidenceType
  strength: EvidenceStrength
  sourceIds: string[]
}

export const SUPPLEMENTS: Supplement[] = [
  { id: 'caffeine', type: 'consensus', strength: 'high', sourceIds: ['guest2021', 'maughan2018'] },
  { id: 'creatine', type: 'consensus', strength: 'high', sourceIds: ['kreider2017', 'maughan2018'] },
  { id: 'bicarbonate', type: 'consensus', strength: 'moderate', sourceIds: ['grgic2021', 'maughan2018'] },
  { id: 'beta_alanine', type: 'consensus', strength: 'moderate', sourceIds: ['trexler2015', 'maughan2018'] },
]

/** Verweise zu Anti-Doping. Öffentliche Stellen, keine Produkte. */
export const ANTI_DOPING_LINKS: { id: 'wada' | 'nada'; url: string }[] = [
  { id: 'wada', url: 'https://www.wada-ama.org/en/prohibited-list' },
  { id: 'nada', url: 'https://www.nada.de/' },
]
