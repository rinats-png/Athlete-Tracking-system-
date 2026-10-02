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
  {
    metricKey: 'load_spike',
    source: 'provisional',
    formula: 'Wochenlast (sRPE, 7 Tage) mehr als 30 % über der mittleren Wochenlast der vier Wochen davor',
    reference: null,
    note: 'Die Session-Last selbst ist publiziert (Foster 1998/2001). Die Schwelle von 30 % ist eine Festlegung dieser App für den Hinweis «Belastung ansehen», kein Grenzwert für Verletzungsrisiko — ein solcher ist nicht belegt.',
  },
  {
    metricKey: 'durability_retention_pct',
    source: 'provisional',
    formula: 'ermüdete / frische Leistung × 100 (Satz 4 / Satz 1, letzter / bester Sprint, Wurfrate C / A, frische 5-km-Pace / Brick-Pace)',
    reference: null,
    note: 'Der Quotient ist üblich; welche Veränderung erkennbar ist, kommt aus der eigenen Streuung (× 1,96·√2), mit einer gesetzten Untergrenze von 3 Prozentpunkten. Ersetzt werden muss die Untergrenze durch einen publizierten Messfehler je Test.',
  },
  {
    metricKey: 'fuel_carbs_g_per_kg',
    source: 'published',
    formula: 'Kohlenhydrate je Tag nach Belastungsstufe: 3–5 / 5–7 / 6–10 / 8–12 g je kg; Protein 1,6–2,2 g je kg',
    reference: 'Thomas, Erdman & Burke (2016), ACSM/AND/DC Joint Position Statement; Burke et al. (2011); Morton et al. (2018) für Protein',
    note: 'Spannen, keine Ziele. Wie die Stufe aus den Trainingsminuten entsteht, ist unter fuel_load_level als vorläufig geführt.',
  },
  {
    metricKey: 'fuel_sport_carbs_g_per_kg',
    source: 'provisional',
    formula: 'Kohlenhydrate je Tag nach Disziplin (Ausdauer): Lauf 5–10 km 5–8, Marathon/Ultra 6–10, Rad 5–12, Schwimmen 5–8, Triathlon kurz 5–10, lang 6–12, Rudern 5–8 g je kg',
    reference: null,
    note: 'Arbeitsbereiche der Master-Spezifikation Fuel Management v2.0, aus den Konsensuspapieren auf die Disziplin übertragen, nicht am Primärtext geprüft. Jede Regel trägt ihr Evidenzobjekt (src/data/fuelRules.ts); ohne Regel zeigt die App nichts.',
  },
  {
    metricKey: 'run_vdot',
    source: 'published',
    formula: 'VO2 = −4,60 + 0,182258·v + 0,000104·v² (v in m/min); Anteil = 0,8 + 0,1894393·e^(−0,012778·t) + 0,2989558·e^(−0,1932605·t); VDOT = VO2 / Anteil',
    reference: 'Daniels & Gilbert (1979), Oxygen Power; Daniels (2014), Daniels\' Running Formula',
    note: 'Aktueller VDOT: bester Lauf ab 3 km in den letzten 150 Tagen, mit Bewegungszeit. Trail ist ausgeschlossen. Der Wert gilt für das Niveau des Beleglaufs.',
  },
  {
    metricKey: 'run_race_riegel',
    source: 'published',
    formula: 't2 = t1 · (d2 / d1)^1,06',
    reference: 'Riegel (1981), Athletic Records and Human Endurance, American Scientist 69(3)',
    note: 'Aus dem längsten Rennen der zwölf Monate. Zusammen mit der VDOT-Zeit ergibt sich eine Spanne; eine Chance in Prozent gibt es nicht.',
  },
  {
    metricKey: 'run_form_banister',
    source: 'published',
    formula: 'Fitness: gleitendes Mittel über 42 Tage; Ermüdung: über 7 Tage; Form = Fitness − Ermüdung; Start: Mittel der ersten 28 Tage',
    reference: 'Banister et al. (1975), A systems model of training for athletic performance',
    note: 'Das Modell ist veröffentlicht, die Zeitkonstanten 42 und 7 Tage sind Konvention der Trainingspraxis. Die Wortgrenzen der Form (−25, −10, +5, +15) sind eine Festlegung dieser App.',
  },
  {
    metricKey: 'run_load',
    source: 'provisional',
    formula: 'Stunden · Pulsanteil² · 100 mit Pulsanteil = (Durchschnittspuls − Ruhepuls) / (Schwellenpuls − Ruhepuls); ohne Puls Stunden · Faktor² · 100 (Kraft 0,55, Rad 0,65, Wandern 0,6, Lauf 0,75, Trail 0,8, Übrige 0,6)',
    reference: null,
    note: 'Angelehnt an den TRIMP-Gedanken (Banister 1991); der quadrierte Pulsanteil und die Faktoren ohne Puls sind Festlegungen dieser App. Wie viele Einheiten so geschätzt wurden, steht dabei.',
  },
  {
    metricKey: 'run_threshold_hr',
    source: 'provisional',
    formula: 'Durchschnittspuls des stärksten Laufs (höchster VDOT) zwischen 9,5 und 21,5 km; unter 15 km mal 0,98; Zonen bei 85/90/95/100 % davon',
    reference: null,
    note: 'Ein Schätzwert aus einem Lauf, kein Laktatschwellentest. Zonen sind Anteile dieses Werts, keine individuelle Messung.',
  },
  {
    metricKey: 'run_pace_same_hr',
    source: 'provisional',
    formula: 'Median-Tempo je Monat der sauberen Läufe im 6-Schläge-Band mit den meisten Läufen; erstes gegen letztes Quartal der zwölf Monate',
    reference: null,
    note: 'Saubere Läufe: 6–25 km, höchstens 12 Höhenmeter je km, Tempo höchstens 25 % vom Median, kein Rennen, kein Qualitätsname. Die Grenzen sind Festlegungen dieser App; Wetter und Tagesform sind nicht herausgerechnet.',
  },
  {
    metricKey: 'run_intensity_rules',
    source: 'provisional',
    formula: 'Lockerer Lauf: Lauf 5–22 km, langsamer als das prognostizierte Marathontempo, Name ohne Qualitätswörter; harte Einheit: Name mit Intervall, Schwelle, Tempo oder ×; jede Einheit zählt komplett in der Zone ihres Durchschnittspulses',
    reference: null,
    note: 'Regeln dieser App auf Basis der Namen, keine Messung der Intensität innerhalb der Einheit. Intervalle mit Einlaufen und Pausen haben einen niedrigeren Durchschnittspuls als ihre schnellen Abschnitte.',
  },
  {
    metricKey: 'fuel_load_level',
    source: 'provisional',
    formula: 'Mittlere Trainingsminuten je erfasstem Tag der letzten 7 Tage: unter 45 leicht, unter 90 moderat, unter 240 hoch, darüber sehr hoch',
    reference: null,
    note: 'Die Quelle beschreibt die Stufen über Dauer und Intensität (etwa 1 h/Tag moderat, 1–3 h/Tag moderat bis hoch, über 4–5 h/Tag). Die Minutengrenzen ohne Intensität sind eine Übersetzung dieser App; eine Fassung mit Session-RPE müsste sie ersetzen.',
  },
  {
    metricKey: 'intra_carbs_g_per_h',
    source: 'published',
    formula: 'Kohlenhydrate in der Einheit / Stunden; Spanne 30–60 g/h für 75–150 min, 60–90 g/h darüber',
    reference: 'Thomas et al. (2016); Jeukendrup (2014)',
    note: 'Unter 45 min ist keine Zufuhr nötig, 45–75 min kleine Mengen oder Mundspülung. 90 g/h setzen Glukose-Fruktose-Gemische und Gewöhnung voraus.',
  },
  {
    metricKey: 'sweat_rate_l_per_h',
    source: 'published',
    formula: '(Körpermasse vorher − nachher + Trinkmenge) / Stunden',
    reference: 'Sawka et al. (2007), ACSM Position Stand: Exercise and Fluid Replacement',
    note: 'Urin und Atemwasser sind nicht abgezogen. Ein Masseverlust über 2 % gilt in der Quelle als Marke für eingeschränkte Ausdauerleistung.',
  },
  {
    metricKey: 'hrv_rmssd_ms',
    source: 'published',
    formula: 'Wurzel aus dem Mittel der quadrierten Differenzen benachbarter RR-Intervalle, nach 30 s Einschwingen, mindestens 60 s ausgewertet',
    reference: 'Task Force of the ESC and NASPE (1996); Plews et al. (2013); Esco & Flatt (2014)',
    note: 'Nur gegen die eigene Bandbreite gelesen. Messzeitpunkt, Körperlage und Gerät verschieben den Wert stark — deshalb immer gleich messen.',
  },
  {
    metricKey: 'hrv_artifact_rule',
    source: 'provisional',
    formula: 'RR ausserhalb 300–2000 ms oder mehr als 20 % Abweichung vom vorigen gültigen Intervall gilt als Artefakt; über 5 % Artefakte ist die Messung nicht auswertbar',
    reference: null,
    note: 'In der HRV-Praxis übliche Festlegungen, aber keine Norm. Zu ersetzen durch ein veröffentlichtes Korrekturverfahren (z. B. Lipponen & Tarvainen 2019), wenn die Messung über Kurzmessungen am Morgen hinausgeht.',
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
