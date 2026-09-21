/**
 * Woher ein Lebensmittel im Kern stammt — mit Lizenz und Namensnennung.
 *
 * WARUM DAS EIN EIGENES REGISTER IST: Ein Nährwert ohne benannte Herkunft
 * ist ein halber Wert. Bei den Referenzwerten der Tests steht die Quelle
 * seit jeher am Eintrag; bei Lebensmitteln stand bisher nur «Kern». Mit
 * einem zweiten Bestand (USDA, siehe docs/lebensmitteldaten.md) reicht das
 * nicht mehr: Die Suche muss sagen können, ob ein Wert aus einer
 * analysierten Nährwerttabelle kommt oder aus der geprüften Sammlung des
 * Coaching-Systems.
 *
 * EINE QUELLE JE EINTRAG, NIE GEMISCHT. Makros aus der einen und
 * Mikronährstoffe aus der anderen Tabelle ergäben einen Eintrag, dessen
 * Zahlen aus zwei Laboren stammen und nicht zusammenpassen.
 *
 * Das Impressum nennt jede Quelle, die im Bestand tatsächlich vorkommt —
 * nicht jede, die dieses Register kennt.
 */

export type FoodSourceId = 'v4' | 'usda' | 'bls'

export interface FoodSource {
  id: FoodSourceId
  /** Kurzname am Eintrag in der Suche. Bewusst knapp. */
  short: string
  name: string
  /** Was die Lizenz erlaubt — in einem Satz, ohne Juristendeutsch. */
  licence: string
  url: string
  /** Wie gut die Werte sind, ehrlich. Erscheint als Hinweis, nicht als Note. */
  quality: string
}

export const FOOD_SOURCES: Record<FoodSourceId, FoodSource> = {
  v4: {
    id: 'v4',
    short: 'Kern',
    name: 'Kydon-Lebensmittelkern',
    licence: 'Eigener Bestand, aus dem Coaching-System übernommen.',
    url: '',
    quality: 'Makros für alle Einträge geprüft; Mikronährstoffe nur dort, wo sie hinterlegt waren.',
  },
  usda: {
    id: 'usda',
    short: 'USDA',
    name: 'USDA FoodData Central',
    licence: 'Gemeinfrei (Werk einer US-Bundesbehörde); Namensnennung erbeten.',
    url: 'https://fdc.nal.usda.gov',
    quality:
      'Analysierte Werte mit Datenstand je Eintrag. Auf den US-Markt bezogen — bei Rohware unerheblich, bei verarbeiteten Lebensmitteln nicht.',
  },
  bls: {
    id: 'bls',
    short: 'BLS',
    name: 'Bundeslebensmittelschlüssel (Max Rubner-Institut)',
    licence: 'Kostenpflichtige Nutzungslizenz des MRI. Derzeit NICHT lizenziert — kein Eintrag stammt von dort.',
    url: 'https://www.blsdb.de',
    quality: 'Deutsche Referenztabelle, auf den deutschen Markt bezogen.',
  },
}

export function foodSource(id: FoodSourceId): FoodSource {
  return FOOD_SOURCES[id]
}
