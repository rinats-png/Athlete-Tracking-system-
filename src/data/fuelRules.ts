/**
 * Fuel-Regeln für Ausdauerdisziplinen (docs/fuel.md, Stufe 1).
 *
 * Herkunft: Master-Spezifikation «Fuel Management v2.0» (30. September 2026),
 * Abschnitte 0.2 und 2.14–2.21. Aus den 35 Sportprofilen der Vorlage sind hier
 * nur die Ausdauerdisziplinen übernommen, und nicht als Einzelprofile, sondern
 * als Regeln mit Gruppenzugehörigkeit. Kampfsport und Teamsport folgen in
 * Stufe 4.
 *
 * JEDE REGEL TRÄGT IHR EVIDENZOBJEKT. Ohne Quelle keine Regel (Hartregel 6).
 * Die Tagesspannen je Disziplin sind Arbeitsbereiche der Vorlage, aus den
 * Konsensuspapieren auf die Disziplin übertragen — die App führt sie deshalb im
 * Formelregister als vorläufig. Geprüft am Primärtext wurde hier nichts
 * (`verification: 'not_reverified'`); das ändert sich erst, wenn jemand die
 * Quelle gegengelesen hat.
 *
 * NICHT ENTHALTEN, mit Absicht: Energieverfügbarkeit, RED-S-Signale,
 * Gewichtsklassen-Logik, Zyklus, Mikronährstoff-Risiken. Siehe docs/fuel.md §4.
 */

export type EvidenceType = 'meta_analysis' | 'consensus' | 'rct' | 'observational' | 'mechanistic' | 'expert' | 'extrapolation'
export type EvidenceStrength = 'high' | 'moderate' | 'low' | 'emerging'
/** Wie nah die Studienlage an der Disziplin liegt. */
export type SportSpecificity = 'same_sport' | 'related_sport' | 'general_athlete'
export type Verification = 'primary_verified' | 'secondary_verified' | 'not_reverified'

export interface FuelEvidence {
  type: EvidenceType
  strength: EvidenceStrength
  specificity: SportSpecificity
  verification: Verification
  sourceIds: string[]
  /** SemVer der Regel. */
  ruleVersion: string
  /** Letzte fachliche Durchsicht, ISO-Datum. */
  reviewed: string
}

export interface FuelSource {
  id: string
  citation: string
  /** Öffentlicher Verweis (PubMed oder DOI), wenn die Vorlage einen nennt. */
  url: string | null
}

export const FUEL_SOURCES: Record<string, FuelSource> = {
  thomas2016: {
    id: 'thomas2016',
    citation: 'Thomas, Erdman & Burke (2016). ACSM/AND/DC Joint Position Statement: Nutrition and Athletic Performance. Med Sci Sports Exerc 48(3):543–568',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26891166/',
  },
  burke2011: {
    id: 'burke2011',
    citation: 'Burke et al. (2011). Carbohydrates for training and competition. J Sports Sci 29 Suppl 1:S17–S27',
    url: null,
  },
  jeukendrup2014: {
    id: 'jeukendrup2014',
    citation: 'Jeukendrup (2014). A step towards personalized sports nutrition: carbohydrate intake during exercise. Sports Med 44 Suppl 1:S25–S33',
    url: null,
  },
  morton2018: {
    id: 'morton2018',
    citation: 'Morton et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains. Br J Sports Med 52:376–384',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/',
  },
  sawka2007: {
    id: 'sawka2007',
    citation: 'Sawka et al. (2007). ACSM Position Stand: Exercise and Fluid Replacement. Med Sci Sports Exerc 39(2):377–390',
    url: null,
  },
  hewbutler2015: {
    id: 'hewbutler2015',
    citation: 'Hew-Butler et al. (2015). Statement of the Third International Exercise-Associated Hyponatremia Consensus Development Conference. Clin J Sport Med 25(4):303–320',
    url: 'https://doi.org/10.1097/JSM.0000000000000221',
  },
  guest2021: {
    id: 'guest2021',
    citation: 'Guest et al. (2021). International society of sports nutrition position stand: caffeine and exercise performance. J Int Soc Sports Nutr 18:1',
    url: 'https://doi.org/10.1186/s12970-020-00383-4',
  },
  kreider2017: {
    id: 'kreider2017',
    citation: 'Kreider et al. (2017). International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. J Int Soc Sports Nutr 14:18',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28615996/',
  },
  grgic2021: {
    id: 'grgic2021',
    citation: 'Grgic et al. (2021). International Society of Sports Nutrition position stand: sodium bicarbonate and exercise performance. J Int Soc Sports Nutr 18:61',
    url: 'https://doi.org/10.1186/s12970-021-00458-w',
  },
  trexler2015: {
    id: 'trexler2015',
    citation: 'Trexler et al. (2015). International Society of Sports Nutrition position stand: beta-alanine. J Int Soc Sports Nutr 12:30',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26175657/',
  },
  maughan2018: {
    id: 'maughan2018',
    citation: 'Maughan et al. (2018). IOC consensus statement: dietary supplements and the high-performance athlete. Br J Sports Med 52:439–455',
    url: 'https://pubmed.ncbi.nlm.nih.gov/29540367/',
  },
  costa2017: {
    id: 'costa2017',
    citation: 'Costa et al. (2017). Systematic review: exercise-induced gastrointestinal syndrome — implications for health and intestinal disease. Aliment Pharmacol Ther 46(3):246–265',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28177715/',
  },
}

export type FuelGroup = 'g3_endurance' | 'g4_multisport' | 'g_rowing'
/** Verpflegung während des Wettkampfs: grobe Einordnung, die Zahlen stehen in den Texten. */
export type IntraKind = 'none_in_race' | 'g30_60' | 'g30_90' | 'g60_90'
/** Aufladen vor dem Ereignis. `null` = die Vorlage macht dazu keine Aussage. */
export type CarbLoad = 'not_essential' | 'appropriate' | null

export interface FuelRule {
  id: string
  group: FuelGroup
  /** Disziplinen, auf die die Regel direkt zutrifft. */
  disciplineIds: string[]
  /** Verwandte Disziplinen: die Regel gilt dort nur übertragen. */
  relatedDisciplineIds: string[]
  /** g Kohlenhydrate je kg und Tag. */
  carbsPerKg: [number, number]
  intra: IntraKind
  carbLoad: CarbLoad
  evidence: FuelEvidence
}

const REVIEWED = '2026-09-30'
const ev = (strength: EvidenceStrength, sourceIds: string[], type: EvidenceType = 'consensus'): FuelEvidence => ({
  type,
  strength,
  specificity: 'general_athlete',
  verification: 'not_reverified',
  sourceIds,
  ruleVersion: '1.0.0',
  reviewed: REVIEWED,
})

export const FUEL_RULES: FuelRule[] = [
  {
    id: 'run_short',
    group: 'g3_endurance',
    disciplineIds: ['run_5k_discipline', 'run_10k_discipline'],
    relatedDisciplineIds: [],
    carbsPerKg: [5, 8],
    intra: 'none_in_race',
    carbLoad: 'not_essential',
    evidence: ev('high', ['thomas2016', 'burke2011']),
  },
  {
    id: 'run_long',
    group: 'g3_endurance',
    disciplineIds: ['marathon', 'ultramarathon'],
    relatedDisciplineIds: ['trail_running'],
    carbsPerKg: [6, 10],
    intra: 'g30_90',
    carbLoad: 'appropriate',
    evidence: ev('high', ['thomas2016', 'jeukendrup2014', 'hewbutler2015', 'costa2017']),
  },
  {
    id: 'cycling',
    group: 'g3_endurance',
    disciplineIds: ['road_race', 'time_trial'],
    relatedDisciplineIds: ['track_cycling', 'mtb', 'gravel'],
    carbsPerKg: [5, 12],
    intra: 'g30_90',
    carbLoad: null,
    evidence: ev('high', ['thomas2016', 'jeukendrup2014', 'costa2017']),
  },
  {
    id: 'swimming',
    group: 'g3_endurance',
    disciplineIds: ['freestyle', 'backstroke', 'breaststroke', 'butterfly'],
    relatedDisciplineIds: [],
    carbsPerKg: [5, 8],
    intra: 'none_in_race',
    carbLoad: null,
    evidence: ev('moderate', ['thomas2016', 'burke2011']),
  },
  {
    id: 'triathlon_short',
    group: 'g4_multisport',
    disciplineIds: ['triathlon_sprint', 'triathlon_olympic'],
    relatedDisciplineIds: [],
    carbsPerKg: [5, 10],
    intra: 'g30_60',
    carbLoad: null,
    evidence: ev('moderate', ['thomas2016', 'jeukendrup2014']),
  },
  {
    id: 'triathlon_long',
    group: 'g4_multisport',
    disciplineIds: ['triathlon_70_3', 'triathlon_ironman'],
    relatedDisciplineIds: [],
    carbsPerKg: [6, 12],
    intra: 'g60_90',
    carbLoad: 'appropriate',
    evidence: ev('high', ['thomas2016', 'jeukendrup2014', 'hewbutler2015', 'costa2017']),
  },
  {
    id: 'rowing',
    group: 'g_rowing',
    disciplineIds: ['rowing'],
    relatedDisciplineIds: [],
    carbsPerKg: [5, 8],
    intra: 'none_in_race',
    carbLoad: null,
    evidence: ev('moderate', ['thomas2016', 'burke2011']),
  },
]
