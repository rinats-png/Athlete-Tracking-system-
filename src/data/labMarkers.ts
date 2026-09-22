/**
 * Häufige Laborwerte — als Namen und Einheiten, MEHR NICHT.
 *
 * WAS HIER MIT ABSICHT FEHLT: Referenzbereiche. Sie gehören dem Labor, das
 * gemessen hat, unterscheiden sich zwischen Laboren, Methoden, Alter und
 * Geschlecht — und eine App, die eigene mitbringt oder einen Wert als
 * «auffällig» markiert, interpretiert. Das wäre nach MDCG 2019-11 der
 * Schritt vom Ordner zum Medizinprodukt (docs/rechtspruefung-art9-mdr.md §5).
 *
 * Der Katalog hilft beim Eintippen: er schlägt Namen und Einheit vor, damit
 * derselbe Wert über Jahre denselben Namen trägt und ein Verlauf entsteht.
 * Den Referenzbereich schreibt der Mensch aus seinem Befund ab.
 *
 * Ein freier Name ist immer erlaubt — kein Katalog kennt jeden Befund.
 */

export interface LabMarker {
  key: string
  /** Übliche Einheit, als Vorschlag. Der Befund entscheidet. */
  unit: string
  group: 'blood' | 'iron' | 'hormone' | 'vitamin' | 'metabolic' | 'muscle'
}

export const LAB_MARKERS: LabMarker[] = [
  // --- Blutbild -------------------------------------------------------------
  { key: 'hemoglobin', unit: 'g/dl', group: 'blood' },
  { key: 'hematocrit', unit: '%', group: 'blood' },
  { key: 'erythrocytes', unit: 'Mio/µl', group: 'blood' },
  { key: 'leukocytes', unit: '/nl', group: 'blood' },
  { key: 'thrombocytes', unit: '/nl', group: 'blood' },
  // --- Eisen ----------------------------------------------------------------
  { key: 'ferritin', unit: 'µg/l', group: 'iron' },
  { key: 'transferrinSaturation', unit: '%', group: 'iron' },
  { key: 'iron', unit: 'µg/dl', group: 'iron' },
  // --- Hormone --------------------------------------------------------------
  { key: 'tsh', unit: 'mU/l', group: 'hormone' },
  { key: 'ft3', unit: 'pg/ml', group: 'hormone' },
  { key: 'ft4', unit: 'ng/dl', group: 'hormone' },
  { key: 'testosteroneTotal', unit: 'ng/dl', group: 'hormone' },
  { key: 'cortisol', unit: 'µg/dl', group: 'hormone' },
  { key: 'estradiol', unit: 'pg/ml', group: 'hormone' },
  // --- Vitamine und Mineralien ---------------------------------------------
  { key: 'vitaminD', unit: 'ng/ml', group: 'vitamin' },
  { key: 'vitaminB12', unit: 'pg/ml', group: 'vitamin' },
  { key: 'folate', unit: 'ng/ml', group: 'vitamin' },
  { key: 'magnesium', unit: 'mmol/l', group: 'vitamin' },
  { key: 'zinc', unit: 'µg/dl', group: 'vitamin' },
  // --- Stoffwechsel ---------------------------------------------------------
  { key: 'glucoseFasting', unit: 'mg/dl', group: 'metabolic' },
  { key: 'hba1c', unit: '%', group: 'metabolic' },
  { key: 'cholesterolTotal', unit: 'mg/dl', group: 'metabolic' },
  { key: 'hdl', unit: 'mg/dl', group: 'metabolic' },
  { key: 'ldl', unit: 'mg/dl', group: 'metabolic' },
  { key: 'triglycerides', unit: 'mg/dl', group: 'metabolic' },
  { key: 'crp', unit: 'mg/l', group: 'metabolic' },
  // --- Muskel und Niere -----------------------------------------------------
  { key: 'creatineKinase', unit: 'U/l', group: 'muscle' },
  { key: 'creatinine', unit: 'mg/dl', group: 'muscle' },
  { key: 'urea', unit: 'mg/dl', group: 'muscle' },
  { key: 'alt', unit: 'U/l', group: 'muscle' },
  { key: 'ast', unit: 'U/l', group: 'muscle' },
]

export const LAB_GROUPS: LabMarker['group'][] = ['blood', 'iron', 'hormone', 'vitamin', 'metabolic', 'muscle']

export function labMarkerByKey(key: string): LabMarker | null {
  return LAB_MARKERS.find((m) => m.key === key) ?? null
}
