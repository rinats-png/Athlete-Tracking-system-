/**
 * Register aller berechneten Kennzahlen (§81).
 *
 * Zweck: jederzeit beantworten können, welche Zahl in dieser App auf einer
 * publizierten Formel beruht und welche auf einer Festlegung, die noch durch
 * eine belegte ersetzt werden muss.
 *
 * Ohne dieses Register verschwindet der Unterschied nach ein paar Monaten im
 * Code, und niemand weiss mehr, welche Werte man einem Kunden zeigen darf.
 * Es ist die Buchführung über die eigene Beleglage.
 */

export type FormulaSource = 'published' | 'provisional'

export interface FormulaEntry {
  /** Metrikschlüssel, wie er in `result.metrics` steht. */
  metricKey: string
  source: FormulaSource
  /** Kurzbeschreibung der Rechnung. */
  formula: string
  /**
   * Bei `published`: Autor und Jahr der Arbeit, aus der die Formel stammt.
   * Bei `provisional`: leer.
   */
  reference: string | null
  /** Warum so gerechnet wird, und was eine belegte Fassung ersetzen müsste. */
  note: string
}

export const FORMULA_REGISTRY: FormulaEntry[] = [
  // --- Publiziert ---------------------------------------------------------
  {
    metricKey: 'one_rm_kg',
    source: 'published',
    formula: 'Last × (1 + Wiederholungen / 30)',
    reference: 'Epley (1985)',
    note: 'Streuung wächst mit der Wiederholungszahl; ab etwa zehn Wiederholungen wird der Wert unzuverlässig und die App weist ihn als solchen aus.',
  },
  {
    metricKey: 'vo2max_ml_kg_min',
    source: 'published',
    formula: '(Distanz in m − 504,9) / 44,73',
    reference: 'Cooper (1968)',
    note: 'Gilt für den 12-Minuten-Lauf auf ebener, vermessener Strecke. Gelände und Wind verändern das Ergebnis erheblich.',
  },
  {
    metricKey: 'peak_power_w',
    source: 'published',
    formula: '60,7 × Sprunghöhe (cm) + 45,3 × Körpermasse (kg) − 2055',
    reference: 'Sayers et al. (1999)',
    note: 'Ausserhalb der Sprunghöhen, an denen die Gleichung aufgestellt wurde (15–90 cm), wird bewusst kein Wert geliefert.',
  },
  {
    metricKey: 'sjft_index',
    source: 'published',
    formula: '(HF direkt nach Belastung + HF nach 1 min Pause) / Gesamtzahl der Würfe',
    reference: 'Sterkowicz — Special Judo Fitness Test',
    note: 'Kleinerer Wert ist besser. Nur mit dem Standardprotokoll (15/30/30 s, zwei Partner) vergleichbar.',
  },
  {
    metricKey: 'ftp_watt',
    source: 'published',
    formula: '95 % der mittleren Leistung über 20 Minuten',
    reference: 'Allen & Coggan — Trainingsmethodik mit Leistungsmessung',
    note: 'Etablierte Schätzung der Schwellenleistung, kein Laborwert. Eine Rampen- oder Laktatdiagnostik ist genauer.',
  },

  // --- Vorläufig: von dieser App festgelegt, noch zu ersetzen -------------
  {
    metricKey: 'grip_score',
    source: 'provisional',
    formula: 'Mittel aus Griffkraft je Körpergewicht und Haltezeit, je auf 0–100 skaliert',
    reference: null,
    note: 'Zu ersetzen durch eine belegte Kombination aus Maximalkraft und Ausdauer der Griffmuskulatur, idealerweise mit sportartspezifischen Referenzwerten für Griffkampfsportarten.',
  },
  {
    metricKey: 'fight_endurance_score',
    source: 'provisional',
    formula: 'Mittel aus normiertem SJFT-Index und dem Abfall über wiederholte Aktionen',
    reference: null,
    note: 'Zu ersetzen durch eine validierte Kennzahl für kampfnahe Ermüdungsresistenz. Der SJFT-Index allein ist belegt, seine Verrechnung mit dem Wiederholungsabfall ist es nicht.',
  },
  {
    metricKey: 'run_economy_score',
    source: 'provisional',
    formula: 'Verhältnis der Wettkampfpace zur geschätzten Schwellenpace, auf 0–100 skaliert',
    reference: null,
    note: 'Echte Laufökonomie ist der Sauerstoffverbrauch bei submaximaler Geschwindigkeit und braucht eine Spiroergometrie. Diese Näherung ersetzt sie nicht und ist entsprechend gekennzeichnet.',
  },
  {
    metricKey: 'bike_threshold_score',
    source: 'provisional',
    formula: 'FTP je Körpergewicht, auf 0–100 skaliert',
    reference: null,
    note: 'W/kg an der Schwelle ist etabliert; die Skalierung auf 0–100 ist eine Festlegung dieser App und braucht ein belegtes Referenzkollektiv.',
  },
  {
    metricKey: 'swim_technique_score',
    source: 'provisional',
    formula: 'Aus Zuglänge und Geschwindigkeit gebildeter Wirkungsgrad, auf 0–100 skaliert',
    reference: null,
    note: 'Zu ersetzen durch einen belegten Schwimmwirkungsgrad. Zuglänge und Geschwindigkeit sind Rohwerte, ihre Verrechnung zu einem Technikwert ist hier gesetzt.',
  },
  {
    metricKey: 'fatigue_index_percent',
    source: 'provisional',
    formula: '(bester − schlechtester Wert) / bester Wert × 100',
    reference: null,
    note: 'Die Rechnung selbst ist in der Sprintliteratur üblich; was als auffälliger Abfall gilt, ist hier gesetzt und braucht Referenzwerte je Sportart.',
  },
]

export const FORMULA_BY_METRIC = new Map(FORMULA_REGISTRY.map((f) => [f.metricKey, f]))

/** Alle Kennzahlen, deren Formel noch durch eine belegte zu ersetzen ist. */
export function provisionalFormulas(): FormulaEntry[] {
  return FORMULA_REGISTRY.filter((f) => f.source === 'provisional')
}

export function formulaFor(metricKey: string): FormulaEntry | undefined {
  return FORMULA_BY_METRIC.get(metricKey)
}
