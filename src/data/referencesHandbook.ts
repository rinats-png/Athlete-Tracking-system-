import type { ReferenceEntry } from './referenceModel'

/**
 * Referenzwerte aus dem Referenzhandbuch des Auftraggebers.
 *
 * EIGENE DATEI, WEIL DIE QUELLE EINE EIGENE IST. Das Handbuch führt die
 * Ausgangstabelle mit einer ClinicalTrials.gov-Recherche zusammen. Es
 * unterscheidet dabei selbst sauber zwischen einem belegten Wert und einem
 * blossen Studienendpunkt — und schreibt an letztere ausdrücklich «keine
 * Norm». Diese Zeilen sind hier NICHT übernommen: sie stehen als
 * Methodenbeleg, nicht als Referenz.
 *
 * ÜBERNOMMEN IST NUR, WAS EINE ZAHL TRÄGT und deren Gruppe benannt ist.
 * Wo das Handbuch eine Bandbreite ohne Kohorte nennt («ca. 48–60 je
 * Kohorte»), bleibt die Zeile draussen: eine Spanne ohne Gruppe ordnet
 * niemanden ein.
 *
 * Das Handbuch selbst sagt in seiner Auswertung: «Wenn nur ein
 * ClinicalTrials.gov-Endpunkt existiert, sollte die App ‹Norm nicht
 * verfügbar› anzeigen statt einen erfundenen Score zu erzeugen.» Genau so
 * ist es umgesetzt.
 */

const HANDBOOK = 'Sportdiagnostik-Referenzhandbuch (Ausgangstabelle + ClinicalTrials.gov)'

export const HANDBOOK_REFERENCES: ReferenceEntry[] = [
  // --- Ringen: die Indexspalte der Sieben-Stufen-Tabelle -------------------
  // Sie fehlte bisher und stand mit Grund in REFERENCE_GAPS: die Wurfspalte
  // war übernommen, die Indexspalte nicht, weil die frühere Quelle die
  // Bildung des Index offenliess. Das Handbuch nennt beide Spalten derselben
  // Tabelle nebeneinander — damit ist die Zuordnung belegt.
  {
    testSlug: 'special_wrestling_fitness_test',
    metricKey: 'swft_index',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Ringen — publizierte SWFT-Klassifikation, Indexspalte (7 Stufen)',
      en: 'Wrestling — published SWFT classification, index column (7 levels)',
    },
    disciplineIds: ['wrestling'],
    sex: 'all',
    ageMin: 15,
    ageMax: 120,
    method: 'bands',
    // Kleiner ist besser: der Index setzt Herzfrequenzen ins Verhältnis zur
    // Wurfzahl. Die Bänder laufen deshalb von unten nach oben schlechter.
    bands: [
      { upTo: 9.6, label: { de: 'Superior', en: 'Superior' } },
      { upTo: 10.8, label: { de: 'Excellent', en: 'Excellent' } },
      { upTo: 12.0, label: { de: 'Very good', en: 'Very good' } },
      { upTo: 14.5, label: { de: 'Good', en: 'Good' } },
      { upTo: 15.8, label: { de: 'Poor', en: 'Poor' } },
      { upTo: 17.0, label: { de: 'Very poor', en: 'Very poor' } },
      { upTo: null, label: { de: 'Bad', en: 'Bad' } },
    ],
    source: { study: `SWFT/SWPT-Normtabelle · ${HANDBOOK}`, n: null },
    quality: 'B',
    protocolNote: {
      de: 'Gilt nur für dasselbe SWFT-Protokoll und denselben Index (Summe beider Herzfrequenzen geteilt durch die Wurfzahl).',
      en: 'Applies only to the same SWFT protocol and the same index (sum of both heart rates divided by throws).',
    },
  },

  // --- MMA: Elitekohorte ---------------------------------------------------
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'MMA Elite (Männer)', en: 'Elite MMA (men)' },
    disciplineIds: ['mma'],
    sex: 'male',
    ageMin: 18,
    ageMax: 40,
    method: 'mean_sd',
    mean: 63.23,
    sd: 5.5,
    source: { study: `MMA physiologische Profile · ${HANDBOOK}`, n: null },
    quality: 'B',
    protocolNote: {
      de: 'Spiroergometrie. Ein aus einem Feldtest geschätzter Wert liegt systematisch daneben.',
      en: 'Spiroergometry. A value estimated from a field test deviates systematically.',
    },
  },

  // --- Taekwondo: Elitekohorte --------------------------------------------
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'Taekwondo Elite (Männer, 18–35)', en: 'Elite taekwondo (men, 18–35)' },
    disciplineIds: ['taekwondo'],
    sex: 'male',
    ageMin: 18,
    ageMax: 35,
    method: 'mean_sd',
    mean: 57.09,
    sd: 3.89,
    source: { study: `Taekwondo physiological profile · ${HANDBOOK}`, n: null },
    quality: 'B',
    protocolNote: {
      de: 'Spiroergometrie. Ein aus einem Feldtest geschätzter Wert liegt systematisch daneben.',
      en: 'Spiroergometry. A value estimated from a field test deviates systematically.',
    },
  },

  // --- Pencak Silat: Kaderkohorte -----------------------------------------
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'Pencak Silat, Kaderathleten', en: 'Pencak silat, squad athletes' },
    disciplineIds: ['pencak_silat'],
    sex: 'all',
    ageMin: 16,
    ageMax: 40,
    method: 'mean_sd',
    mean: 49.63,
    sd: 4.95,
    source: { study: `Regionale Kaderstudien · ${HANDBOOK}`, n: null },
    quality: 'C',
    protocolNote: {
      de: 'Feld- und Laborschätzungen gemischt. Das Handbuch nennt keine universelle Norm für diese Disziplin.',
      en: 'Field and laboratory estimates mixed. The handbook names no universal norm for this discipline.',
    },
  },

  // --- Judo: Griffausdauer am Anzug ---------------------------------------
  // Zwei Kohorten derselben Arbeit, bewusst getrennt: der dynamische Test
  // unterschied die Leistungsklassen, der isometrische nicht. Beide zusammen
  // zu mitteln würde genau diesen Befund zudecken.
  {
    testSlug: 'gi_grip_hang',
    metricKey: 'durationSeconds',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Judo Nationalteam — isometrischer Anzuggriff',
      en: 'Judo national team — isometric gi grip',
    },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 18,
    ageMax: 40,
    method: 'mean_sd',
    mean: 35,
    sd: 18,
    source: { study: `Franchini et al., Arch Budo 2011 · ${HANDBOOK}`, n: null },
    quality: 'B',
    protocolNote: {
      de: 'Isometrisch. Der dynamische Test derselben Arbeit ist eine andere Kennzahl und nicht damit zu vermischen.',
      en: 'Isometric. The dynamic test from the same work is a different quantity and must not be mixed with it.',
    },
  },
  {
    testSlug: 'gi_grip_hang',
    metricKey: 'durationSeconds',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Judo Regionalliga — isometrischer Anzuggriff',
      en: 'Judo regional league — isometric gi grip',
    },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 18,
    ageMax: 40,
    method: 'mean_sd',
    mean: 39,
    sd: 14,
    source: { study: `Franchini et al., Arch Budo 2011 · ${HANDBOOK}`, n: null },
    quality: 'B',
    protocolNote: {
      de: 'Isometrisch. In dieser Arbeit lag die Regionalliga isometrisch NICHT unter dem Nationalteam — erst der dynamische Test trennte die Klassen.',
      en: 'Isometric. In this work the regional league was NOT below the national team isometrically — only the dynamic test separated the levels.',
    },
  },

]
