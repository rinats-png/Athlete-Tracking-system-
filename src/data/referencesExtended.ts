import type { ReferenceBand, ReferenceEntry } from './referenceModel'

/**
 * Referenzwerte aus der erweiterten Quelltabelle.
 *
 * Sie ergänzt den Grundbestand um das, was dort fehlte: vollständige
 * Klassifikationstabellen statt zweier Eckwerte, Altersstufen statt einer
 * Spanne von 14 bis 120, und Kohorten für Sportarten, die bisher gar keine
 * hatten.
 *
 * DIE REGELN SIND DIESELBEN wie im Grundbestand, und sie sind hier eher
 * strenger angewandt:
 *
 *   — Was die Quelle nur qualitativ sagt, wird nicht beziffert.
 *   — Wo die Quelle ein anderes Protokoll misst als diese App, steht das am
 *     Eintrag (`protocolNote`) oder der Eintrag entfällt.
 *   — Wo eine Quelle nur die äusseren Stufen nennt, steht dazwischen
 *     «Mittlerer Bereich» und keine erfundene Zwischenstufe.
 *   — Wo die Zuordnung zwischen Quelltest und App-Test nicht gesichert ist,
 *     entfällt der Eintrag und steht mit Grund in `REFERENCE_GAPS`.
 *
 * EINE STELLE VERDIENT BESONDERE AUFMERKSAMKEIT: die SJFT-Tabellen sind
 * jetzt nach Altersklasse getrennt. Der bisherige Eintrag galt ab 14 Jahren
 * für alle; mit den Kadetten- und Juniorentabellen bekommt jede Altersklasse
 * ihre eigene, und der Meta-Analyse-Eintrag beginnt entsprechend erst bei
 * 21. Ein Sechzehnjähriger wurde vorher an einer Erwachsenentabelle
 * gemessen — das war nicht falsch berechnet, aber falsch verglichen.
 */

// --- Wiederkehrende Bausteine ------------------------------------------------

const SJFT_SOURCE = {
  study: 'Sterkowicz-Przybycień & Franchini 2018, J Exerc Rehabil (Kadetten/Junioren)',
  n: 252,
}

const LAB_NOTE = {
  de: 'Quelle misst im Labor (Spiroergometrie). Ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung und liegt systematisch daneben.',
  en: 'The source measures in a laboratory (spiroergometry). A field estimate such as Cooper or beep test is an approximation and deviates systematically.',
}

/** Fünf Stufen, wie sie die SJFT- und SWFT-Arbeiten benennen. */
const L = {
  excellent: { de: 'Excellent', en: 'Excellent' },
  good: { de: 'Good', en: 'Good' },
  regular: { de: 'Regular', en: 'Regular' },
  poor: { de: 'Poor', en: 'Poor' },
  veryPoor: { de: 'Very poor', en: 'Very poor' },
  middle: { de: 'Mittlerer Bereich', en: 'Middle range' },
}

/**
 * Eine Klassifikation, von der die Quelle nur die beiden äusseren Stufen
 * nennt. Was dazwischen liegt, benennt sie nicht — also steht dort auch
 * nichts anderes als «Mittlerer Bereich».
 */
function outerBands(best: number, worst: number, lowerIsBetter: boolean): ReferenceBand[] {
  return lowerIsBetter
    ? [
        { upTo: best, label: L.excellent },
        { upTo: worst, label: L.middle },
        { upTo: null, label: L.veryPoor },
      ]
    : [
        { upTo: worst, label: L.veryPoor },
        { upTo: best, label: L.middle },
        { upTo: null, label: L.excellent },
      ]
}

export const EXTENDED_REFERENCES: ReferenceEntry[] = [
  // ======================= JUDO — SJFT NACH ALTERSKLASSE ===================
  //
  // Dieselbe Kohorte wie die Meta-Analyse im Grundbestand (Brasilien,
  // Serbien, Spanien), aber mit vollständigen Fünf-Stufen-Tabellen je
  // Altersklasse und Geschlecht. Für die männlichen Junioren nennt die
  // Quelle alle fünf Stufen, für die drei anderen Gruppen nur die äusseren —
  // deshalb dort drei Bänder statt fünf.
  //
  // Altersgrenzen nach den Wettkampfklassen des Verbands: Kadetten U18,
  // Junioren U21.
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'sjft_index',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Judo — Kadetten (U18), publizierte Klassifikation',
      en: 'Judo — cadets (U18), published classification',
    },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 14,
    ageMax: 17,
    method: 'bands',
    bands: outerBands(11.15, 15.93, true),
    source: SJFT_SOURCE,
    quality: 'A',
  },
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'totalThrows',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Judo — Kadetten (U18), Würfe',
      en: 'Judo — cadets (U18), throws',
    },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 14,
    ageMax: 17,
    method: 'bands',
    bands: outerBands(29, 22, false),
    source: SJFT_SOURCE,
    quality: 'A',
  },
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'sjft_index',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Judo — Junioren (U21), publizierte Klassifikation',
      en: 'Judo — juniors (U21), published classification',
    },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 18,
    ageMax: 20,
    method: 'bands',
    // Die einzige Gruppe, für die die Quelle alle fünf Stufen beziffert.
    bands: [
      { upTo: 10.4, label: L.excellent },
      { upTo: 11.29, label: L.good },
      { upTo: 13.52, label: L.regular },
      { upTo: 14.18, label: L.poor },
      { upTo: null, label: L.veryPoor },
    ],
    source: SJFT_SOURCE,
    quality: 'A',
  },
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'totalThrows',
    cohort: 'athlete',
    cohortLabel: { de: 'Judo — Junioren (U21), Würfe', en: 'Judo — juniors (U21), throws' },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 18,
    ageMax: 20,
    method: 'bands',
    bands: [
      { upTo: 22, label: L.veryPoor },
      { upTo: 25, label: L.poor },
      { upTo: 29, label: L.regular },
      { upTo: 30, label: L.good },
      { upTo: null, label: L.excellent },
    ],
    source: SJFT_SOURCE,
    quality: 'A',
  },
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'sjft_index',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Judo — Kadettinnen (U18), publizierte Klassifikation',
      en: 'Judo — female cadets (U18), published classification',
    },
    disciplineIds: ['judo'],
    sex: 'female',
    ageMin: 14,
    ageMax: 17,
    method: 'bands',
    bands: outerBands(11.53, 18.01, true),
    source: SJFT_SOURCE,
    quality: 'A',
  },
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'totalThrows',
    cohort: 'athlete',
    cohortLabel: { de: 'Judo — Kadettinnen (U18), Würfe', en: 'Judo — female cadets (U18), throws' },
    disciplineIds: ['judo'],
    sex: 'female',
    ageMin: 14,
    ageMax: 17,
    method: 'bands',
    bands: outerBands(27, 20, false),
    source: SJFT_SOURCE,
    quality: 'A',
  },
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'sjft_index',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Judo — Juniorinnen (U21), publizierte Klassifikation',
      en: 'Judo — female juniors (U21), published classification',
    },
    disciplineIds: ['judo'],
    sex: 'female',
    ageMin: 18,
    ageMax: 20,
    method: 'bands',
    bands: outerBands(11.48, 17.46, true),
    source: SJFT_SOURCE,
    quality: 'A',
  },
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'totalThrows',
    cohort: 'athlete',
    cohortLabel: { de: 'Judo — Juniorinnen (U21), Würfe', en: 'Judo — female juniors (U21), throws' },
    disciplineIds: ['judo'],
    sex: 'female',
    ageMin: 18,
    ageMax: 20,
    method: 'bands',
    bands: outerBands(29, 21, false),
    source: SJFT_SOURCE,
    quality: 'A',
  },

  // ======================= RINGEN — SWFT-WURFZAHL ==========================
  //
  // Die Sieben-Stufen-Tabelle, die der Grundbestand vermisste. Übernommen
  // ist NUR die Wurfspalte: die Indexspalte derselben Tabelle ist mit
  // «SWPT-Index» überschrieben, und ob dieser Index nach derselben Formel
  // gebildet wird wie der Index dieser App (Summe beider Herzfrequenzen
  // geteilt durch die Wurfzahl), geht aus der Quelle nicht hervor. Ein
  // stiller Vergleich zweier Indizes wäre genau der Fehler, den die
  // Protokollhinweise sonst verhindern sollen — die Zeile steht deshalb in
  // REFERENCE_GAPS.
  {
    testSlug: 'special_wrestling_fitness_test',
    metricKey: 'totalThrows',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Ringen — publizierte SWFT-Klassifikation (7 Stufen)',
      en: 'Wrestling — published SWFT classification (7 levels)',
    },
    disciplineIds: ['wrestling'],
    sex: 'all',
    ageMin: 15,
    ageMax: 120,
    method: 'bands',
    bands: [
      { upTo: 19, label: { de: 'Bad', en: 'Bad' } },
      { upTo: 22, label: L.veryPoor },
      { upTo: 24, label: L.poor },
      { upTo: 29, label: { de: 'Good', en: 'Good' } },
      { upTo: 32, label: { de: 'Very good', en: 'Very good' } },
      { upTo: 34, label: L.excellent },
      { upTo: null, label: { de: 'Superior', en: 'Superior' } },
    ],
    source: { study: 'Sensitivity of Field Tests for Wrestlers Specific Fitness (PMC9465761)', n: null },
    quality: 'B',
  },

  // ======================= LAUFEN — COOPER-ORIGINALNORMEN ==================
  //
  // Die Tabelle, mit der der Test 1968 veröffentlicht wurde. Sie ist nach
  // Altersgruppen gestaffelt und gilt für Männer; für Frauen nennt die
  // vorliegende Quelle keine Werte, deshalb steht hier auch keine
  // Frauentabelle. Fünf Stufen, aufsteigend nach Distanz.
  ...([
    { ageMin: 20, ageMax: 29, poor: 1599, below: 2199, avg: 2399, above: 2800 },
    { ageMin: 30, ageMax: 39, poor: 1499, below: 1999, avg: 2299, above: 2700 },
    { ageMin: 40, ageMax: 49, poor: 1399, below: 1699, avg: 2099, above: 2500 },
    { ageMin: 50, ageMax: 120, poor: 1299, below: 1599, avg: 1999, above: 2400 },
  ].map(
    (row): ReferenceEntry => ({
      testSlug: 'cooper_12min',
      metricKey: 'distanceM',
      cohort: 'population',
      cohortLabel: {
        de: `Männer ${row.ageMin}–${row.ageMax === 120 ? '50+' : row.ageMax} Jahre, Cooper-Originalnormen`,
        en: `Men aged ${row.ageMin}–${row.ageMax === 120 ? '50+' : row.ageMax}, original Cooper norms`,
      },
      sex: 'male',
      ageMin: row.ageMin,
      ageMax: row.ageMax,
      method: 'bands',
      bands: [
        { upTo: row.poor, label: { de: 'Poor', en: 'Poor' } },
        { upTo: row.below, label: { de: 'Unterdurchschnittlich', en: 'Below average' } },
        { upTo: row.avg, label: { de: 'Durchschnittlich', en: 'Average' } },
        { upTo: row.above, label: { de: 'Überdurchschnittlich', en: 'Above average' } },
        { upTo: null, label: L.excellent },
      ],
      source: { study: 'Cooper 1968, JAMA — Originalnormen des 12-Minuten-Laufs', n: null },
      quality: 'A',
    }),
  ) as ReferenceEntry[]),

  // ======================= AEROBE KAPAZITÄT — PERZENTILE ===================
  //
  // Die ACSM-/Cooper-Institute-Tabellen, gebildet aus über 80 000
  // Laufbandtests. Sie sind die dritte belegte Bevölkerungsachse neben den
  // Kontrollgruppen und dem FRIEND-Register.
  //
  // Belegt sind bei den Männern P50, P75, P90 und P95, bei den Frauen P50
  // und P95. Genau diese Stützstellen stehen hier, mit ihrer eigenen Skala —
  // die fehlenden Ränder werden nicht erfunden, sondern geklemmt. Die
  // Auswertung interpoliert dazwischen linear.
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Männer 20–29 Jahre, ACSM-/Cooper-Institute-Perzentile',
      en: 'Men aged 20–29, ACSM / Cooper Institute percentiles',
    },
    sex: 'male',
    ageMin: 20,
    ageMax: 29,
    method: 'percentiles',
    values: [48.0, 55.2, 61.8, 66.3],
    percentileAnchors: [50, 75, 90, 95],
    source: { study: 'Cooper Institute / ACSM, Laufband-Referenztabellen', n: 80000 },
    quality: 'A',
    protocolNote: {
      de: 'Belegt sind P50 bis P95. Unterhalb und oberhalb dieser Spanne gibt dieser Eintrag kein Perzentil — dort antworten die anderen Referenzen. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Documented from P50 to P95. Below and above that span this entry yields no percentile — the other references answer there. Note also: the source measures on a laboratory treadmill, a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Frauen 20–29 Jahre, ACSM-/Cooper-Institute-Perzentile',
      en: 'Women aged 20–29, ACSM / Cooper Institute percentiles',
    },
    sex: 'female',
    ageMin: 20,
    ageMax: 29,
    method: 'percentiles',
    values: [37.6, 56.0],
    percentileAnchors: [50, 95],
    source: { study: 'Cooper Institute / ACSM, Laufband-Referenztabellen', n: 80000 },
    quality: 'A',
    protocolNote: {
      de: 'Belegt sind bei den Frauen nur P50 und P95. Zwischen beiden wird linear interpoliert; ausserhalb gibt dieser Eintrag kein Perzentil, dort antworten die anderen Referenzen. Die Einordnung ist damit gröber als bei den Männern.',
      en: 'For women only P50 and P95 are documented. Values in between are interpolated linearly; outside that span this entry yields no percentile and the other references answer instead. The rating is therefore coarser than for men.',
    },
  },

  // ======================= SPRINT 30 M =====================================
  {
    testSlug: 'sprint_30m',
    metricKey: 'durationSeconds',
    cohort: 'population',
    cohortLabel: {
      de: 'Jugendliche 16–19 Jahre, allgemeine Sprintnormen',
      en: 'Adolescents aged 16–19, general sprint norms',
    },
    sex: 'male',
    ageMin: 16,
    ageMax: 19,
    method: 'bands',
    bands: [
      { upTo: 4.0, label: L.excellent },
      { upTo: 4.6, label: L.middle },
      { upTo: null, label: { de: 'Poor', en: 'Poor' } },
    ],
    source: { study: 'Allgemeine 30-m-Sprintnormen (brianmac)', n: null },
    quality: 'C',
  },
  {
    testSlug: 'sprint_30m',
    metricKey: 'durationSeconds',
    cohort: 'population',
    cohortLabel: {
      de: 'Jugendliche 16–19 Jahre, allgemeine Sprintnormen',
      en: 'Adolescents aged 16–19, general sprint norms',
    },
    sex: 'female',
    ageMin: 16,
    ageMax: 19,
    method: 'bands',
    bands: [
      { upTo: 4.5, label: L.excellent },
      { upTo: 5.0, label: L.middle },
      { upTo: null, label: { de: 'Poor', en: 'Poor' } },
    ],
    source: { study: 'Allgemeine 30-m-Sprintnormen (brianmac)', n: null },
    quality: 'C',
  },
  // ======================= AEROBE KAPAZITÄT JE KAMPFSPORT ==================
  //
  // Eine Querschnittsachse aus derselben Arbeit: dieselbe Methode, dieselbe
  // Auswertung, vier Sportarten. Das macht die Werte untereinander
  // vergleichbar — und zeigt, dass «Kampfsport» keine gemeinsame
  // Ausdaueranforderung hat: zwischen Boxen und Judo liegen 17 ml/kg/min.
  ...([
    { id: 'boxing', de: 'Boxen', en: 'Boxing', mean: 64.6, sd: 7.2 },
    { id: 'wrestling', de: 'Ringen', en: 'Wrestling', mean: 54.6, sd: 2.0 },
  ].map(
    (row): ReferenceEntry => ({
      testSlug: '*',
      metricKey: 'vo2max_ml_kg_min',
      cohort: 'athlete',
      cohortLabel: {
        de: `${row.de} — Wettkampfathleten (Querschnittsvergleich)`,
        en: `${row.en} — competitive athletes (cross-sport comparison)`,
      },
      disciplineIds: [row.id],
      sex: 'male',
      ageMin: 16,
      ageMax: 45,
      method: 'mean_sd',
      mean: row.mean,
      sd: row.sd,
      source: { study: 'Kirk, Querschnittsvergleich VO2max im Kampfsport (UCLan)', n: null },
      quality: 'C',
      protocolNote: LAB_NOTE,
    }),
  ) as ReferenceEntry[]),
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Taekwondo — Eliteathleten',
      en: 'Taekwondo — elite athletes',
    },
    disciplineIds: ['taekwondo'],
    sex: 'male',
    ageMin: 16,
    ageMax: 45,
    method: 'mean_sd',
    mean: 57.09,
    sd: 3.89,
    source: { study: 'Wheeler et al. 2012, Elite-Taekwondo', n: null },
    quality: 'B',
    protocolNote: {
      de: 'Laborwert. Shuttle-Run-Tests unterschätzen die VO2max bei Elite-Taekwondo-Athleten laut der Quelle um rund 16 % — ein Beep-Test-Wert liegt hier systematisch zu niedrig.',
      en: 'Laboratory value. According to the source, shuttle-run tests underestimate VO2max in elite taekwondo athletes by roughly 16 % — a beep test value is systematically too low here.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'MMA — Wettkampfathleten', en: 'MMA — competitive athletes' },
    disciplineIds: ['mma'],
    sex: 'male',
    ageMin: 18,
    ageMax: 45,
    method: 'mean_sd',
    mean: 55.5,
    sd: 7.3,
    source: { study: 'Schick et al. 2010, MMA-Athleten', n: null },
    quality: 'B',
    protocolNote: {
      de: 'Die Studienlage zu MMA streut weit: dieselbe Quelltabelle nennt 60 (Alm & Yu), 55,5 (diese Arbeit), 51,3 und 48,1–53,4 für Weltmeisterkohorten. Der Bestand führt daneben eine ältere Elitekohorte mit 63,2 — sie steht als zweiter Vergleich daneben. Wer sich einordnet, sollte beide sehen. Zusätzlich gilt: Laborwert, ein Feldtestwert ist eine Schätzung.',
      en: 'The MMA literature is widely spread: the same source table lists 60 (Alm & Yu), 55.5 (this study), 51.3 and 48.1–53.4 for world-champion cohorts. The catalogue also carries an older elite cohort at 63.2, shown alongside as a second comparison. Anyone rating themselves should see both. Note also: laboratory value, a field estimate is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'Karate — Wettkampfathleten', en: 'Karate — competitive athletes' },
    disciplineIds: ['karate'],
    sex: 'male',
    ageMin: 16,
    ageMax: 40,
    method: 'mean_sd',
    mean: 53.0,
    sd: 6.6,
    source: { study: 'Chaabene et al., KSAT-Validierung (PMC4594135)', n: null },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
  // Pencak Silat: bewusst als Regionalkader benannt und NICHT als «Kader».
  // Dieselbe Quelltabelle nennt an anderer Stelle Kaderwerte von 49,6 und
  // 52,4 — die Streuung zwischen den Kaderstufen ist grösser als der
  // Unterschied zwischen Sportarten. Wer sich hier einordnet, muss wissen,
  // gegen welche Stufe.
  ...([
    { sex: 'male' as const, de: 'Männer', en: 'Men', mean: 33.2, sd: 3.3 },
    { sex: 'female' as const, de: 'Frauen', en: 'Women', mean: 30.2, sd: 2.4 },
  ].map(
    (row): ReferenceEntry => ({
      testSlug: '*',
      metricKey: 'vo2max_ml_kg_min',
      cohort: 'athlete',
      cohortLabel: {
        de: `Pencak Silat — Regionalkader, ${row.de}`,
        en: `Pencak silat — regional squad, ${row.en}`,
      },
      disciplineIds: ['pencak_silat'],
      sex: row.sex,
      ageMin: 15,
      ageMax: 40,
      method: 'mean_sd',
      mean: row.mean,
      sd: row.sd,
      source: { study: 'SMI-Kaderstudie Pencak Silat (UNJA Repository 2025)', n: null },
      quality: 'C',
      protocolNote: {
        de: 'Regionalkader, mit dem Beep-Test geschätzt. Nationalkaderwerte derselben Quelltabelle liegen rund 16 ml/kg/min höher — die Einordnung sagt also, wo jemand innerhalb des Regionalkaders steht, nicht innerhalb des Sports.',
        en: 'Regional squad, estimated with the beep test. National squad values in the same source table are around 16 ml/kg/min higher — this rating says where someone stands within the regional squad, not within the sport.',
      },
    }),
  ) as ReferenceEntry[]),

  // ======================= SPRUNGKRAFT MMA =================================
  {
    testSlug: 'countermovement_jump',
    metricKey: 'jumpHeightCm',
    cohort: 'athlete',
    cohortLabel: { de: 'MMA — Elitekohorte', en: 'MMA — elite cohort' },
    disciplineIds: ['mma'],
    sex: 'male',
    ageMin: 18,
    ageMax: 40,
    method: 'mean_sd',
    mean: 32.6,
    sd: 2.7,
    source: { study: 'Kirk, MMA-Elitekohorte (UCLan)', n: null },
    quality: 'C',
  },
  {
    testSlug: 'squat_jump',
    metricKey: 'jumpHeightCm',
    cohort: 'athlete',
    cohortLabel: { de: 'MMA — Elitekohorte', en: 'MMA — elite cohort' },
    disciplineIds: ['mma'],
    sex: 'male',
    ageMin: 18,
    ageMax: 40,
    method: 'mean_sd',
    mean: 29.8,
    sd: 4.5,
    source: { study: 'Kirk, MMA-Elitekohorte (UCLan)', n: null },
    quality: 'C',
  },

  // ======================= GRIFFKRAFT BJJ ==================================
  {
    testSlug: 'grip_strength',
    metricKey: 'gripKg',
    cohort: 'athlete',
    cohortLabel: {
      de: 'BJJ — erfahrene Männer, dominante Hand',
      en: 'BJJ — experienced men, dominant hand',
    },
    disciplineIds: ['bjj', 'ju_jutsu'],
    sex: 'male',
    ageMin: 18,
    ageMax: 45,
    method: 'mean_sd',
    mean: 53,
    sd: 7,
    source: { study: 'Griffkraft erfahrener BJJ-Athleten (Systematic Review, PMC5306420)', n: 15 },
    quality: 'B',
  },

  // ======================= RAD — LEISTUNG JE KILOGRAMM =====================
  //
  // Kein Studienwert, sondern der Praxisstandard, an dem sich der Radsport
  // seit Jahren einteilt: die Kategoriegrenzen der verbreiteten
  // Trainingsplattform, abgeleitet aus dem Coggan/Allen-Leistungsprofil.
  // Qualität D, und das steht auch so am Eintrag: die Tabelle selbst ist
  // nicht begutachtet. Sie ist trotzdem die Einordnung, die im Radsport
  // tatsächlich benutzt wird — deshalb steht sie hier statt gar nichts.
  {
    testSlug: 'ftp_20min',
    metricKey: 'ftp_watt_per_kg',
    cohort: 'population',
    cohortLabel: {
      de: 'Radsport — verbreitete Kategoriegrenzen (Praxisstandard)',
      en: 'Cycling — common category boundaries (practice standard)',
    },
    sex: 'all',
    ageMin: 16,
    ageMax: 120,
    method: 'bands',
    bands: [
      { upTo: 2.625, label: { de: 'Kategorie D', en: 'Category D' } },
      { upTo: 3.36, label: { de: 'Kategorie C', en: 'Category C' } },
      { upTo: 4.2, label: { de: 'Kategorie B', en: 'Category B' } },
      { upTo: null, label: { de: 'Kategorie A', en: 'Category A' } },
    ],
    source: { study: 'Coggan/Allen-Leistungsprofil, Kategoriegrenzen der Praxis', n: null },
    quality: 'D',
    protocolNote: {
      de: 'Praxisstandard ohne Begutachtung, und geschlechtsunabhängig notiert — die zugrunde liegende Profiltabelle führt für Frauen eigene Bänder rund 0,4 bis 0,5 W/kg darunter. Für Frauen ist die Einordnung deshalb zu streng.',
      en: 'A practice standard without peer review, noted without sex separation — the underlying profile table lists separate bands for women roughly 0.4 to 0.5 W/kg lower. The rating is therefore too strict for women.',
    },
  },
  // ======================= SCHWIMMEN — CSS-LEISTUNGSSTUFEN =================
  //
  // Die Stufentabelle zum Schwellentempo im Wasser. Kein Studienwert,
  // sondern eine im Schwimmsport verbreitete Einteilung — Datenqualität C,
  // und das steht am Eintrag. Sie beantwortet trotzdem die Frage, die ein
  // CSS-Wert allein nicht beantwortet: 1:38 pro 100 m ist eine Zahl, «obere
  // Mittelklasse» ist eine Einordnung.
  {
    testSlug: 'swim_css_test',
    metricKey: 'css_pace_s_100m',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Schwimmen — verbreitete Leistungsstufen',
      en: 'Swimming — common performance levels',
    },
    disciplineIds: [
      'freestyle',
      'backstroke',
      'breaststroke',
      'butterfly',
      'open_water',
      'triathlon',
      'triathlon_sprint',
      'triathlon_olympic',
      'triathlon_70_3',
      'triathlon_ironman',
    ],
    sex: 'all',
    ageMin: 14,
    ageMax: 120,
    method: 'bands',
    bands: [
      { upTo: 85, label: { de: 'Elite', en: 'Elite' } },
      { upTo: 100, label: { de: 'Fortgeschritten', en: 'Advanced' } },
      { upTo: 120, label: { de: 'Mittelstufe', en: 'Intermediate' } },
      { upTo: 150, label: { de: 'Aufbaustufe', en: 'Novice' } },
      { upTo: null, label: { de: 'Einsteiger', en: 'Beginner' } },
    ],
    source: { study: 'CSS-Stufentabelle, verbreitete Einteilung im Schwimmsport', n: null },
    quality: 'C',
    protocolNote: {
      de: 'Praxiseinteilung ohne Begutachtung, geschlechts- und altersunabhängig. Für Triathleten nennt dieselbe Quelle als Orientierung 1:40 bis 2:00 pro 100 m im Sprint- und Kurzdistanzfeld und 1:05 bis 1:15 im Profibereich.',
      en: 'A practice classification without peer review, independent of sex and age. For triathletes the same source gives 1:40 to 2:00 per 100 m as typical for sprint and olympic fields, and 1:05 to 1:15 for professionals.',
    },
  },

  // ======================= GRIFFAUSDAUER AM ANZUG ==========================
  //
  // Aus einem systematischen Überblick über neun Arbeiten. Er spannt von 28
  // bis 62 Sekunden — die Streuung zwischen den Kohorten ist grösser als
  // jeder Trainingseffekt, den ein Einzelner in einem Jahr erreicht. Genau
  // deshalb stehen hier ZWEI benannte Niveaus statt eines Mittelwerts über
  // alle: wer sich einordnet, soll sehen, gegen wen.
  {
    testSlug: 'gi_grip_hang',
    metricKey: 'durationSeconds',
    cohort: 'athlete',
    cohortLabel: { de: 'BJJ — hohes Niveau', en: 'BJJ — high level' },
    disciplineIds: ['bjj', 'ju_jutsu'],
    sex: 'male',
    ageMin: 16,
    ageMax: 45,
    method: 'mean_sd',
    mean: 54.4,
    sd: 13.4,
    source: { study: 'Diaz-Lara, Gi-Griffausdauer (Systematic Review PMC5306420)', n: 14 },
    quality: 'B',
  },
  {
    testSlug: 'gi_grip_hang',
    metricKey: 'durationSeconds',
    cohort: 'athlete',
    cohortLabel: { de: 'BJJ — Blau- bis Schwarzgurt', en: 'BJJ — blue to black belt' },
    disciplineIds: ['bjj', 'ju_jutsu'],
    sex: 'male',
    ageMin: 16,
    ageMax: 45,
    method: 'mean_sd',
    mean: 41,
    sd: 16,
    source: { study: 'Gi-Griffausdauer, Blau- bis Schwarzgurt (Systematic Review PMC5306420)', n: 15 },
    quality: 'B',
    protocolNote: {
      de: 'Der Überblick nennt für dieselbe Messung je nach Kohorte 28 bis 62 Sekunden. Zwei Werte aus verschiedenen Arbeiten zu vergleichen sagt deshalb wenig; der eigene Verlauf sagt mehr.',
      en: 'The review reports 28 to 62 seconds for the same measurement depending on cohort. Comparing two values from different studies therefore says little; your own trend says more.',
    },
  },
  {
    testSlug: 'gi_grip_hang',
    metricKey: 'durationSeconds',
    cohort: 'athlete',
    cohortLabel: { de: 'Judo — Nationalmannschaft', en: 'Judo — national team' },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 16,
    ageMax: 45,
    method: 'mean_sd',
    mean: 35,
    sd: 18,
    source: { study: 'Franchini et al. 2011, Arch Budo — Judogi-Griffausdauer', n: null },
    quality: 'B',
    protocolNote: {
      de: 'Dieselbe Arbeit misst bei einer Regionalligagruppe 39 ± 14 s — also mehr als beim Nationalteam. Der isometrische Griff trennt die Leistungsniveaus laut der Quelle NICHT; das leistet nur die dynamische Form. Diese Einordnung sagt deshalb, wo jemand im Feld liegt, nicht wie gut er ist.',
      en: 'The same study measures 39 ± 14 s in a regional league group — more than the national team. According to the source the isometric grip does NOT separate performance levels; only the dynamic variant does. This rating therefore says where someone sits in the field, not how good they are.',
    },
  },

  // ======================= US ARMY FITNESS TEST ============================
  //
  // Seit Juni 2025 der offizielle Standard, mit vollständigen Punktetabellen
  // nach Alter und Geschlecht. Vorliegend sind die Höchstwerte für 100
  // Punkte — daraus wird ein BEZUGSWERT und keine Stufe: die Tabellen selbst
  // liegen nicht vor, und eine Stufe zu bilden hiesse sie zu erfinden.
  //
  // «Wieviel Prozent des Höchstwerts» ist bei den Zeitdisziplinen anders zu
  // lesen als bei den Wiederholungen: dort ist weniger besser, ein Wert
  // über 100 % ist also langsamer als der Höchstwert. Der Hinweis steht am
  // Eintrag.
  ...([
    { slug: 'hand_release_push_up', metric: 'reps', anchor: 61, lower: false },
    { slug: 'sprint_drag_carry', metric: 'durationSeconds', anchor: 90, lower: true },
    { slug: 'run_2_mile', metric: 'durationSeconds', anchor: 805, lower: true },
    { slug: 'plank_hold', metric: 'durationSeconds', anchor: 215, lower: false },
  ].map(
    (row): ReferenceEntry => ({
      testSlug: row.slug,
      metricKey: row.metric,
      cohort: 'athlete',
      cohortLabel: {
        de: 'US Army Fitness Test — Höchstwert (100 Punkte)',
        en: 'US Army Fitness Test — maximum score (100 points)',
      },
      disciplineIds: ['military', 'special_forces', 'police', 'firefighter'],
      sex: 'all',
      ageMin: 17,
      ageMax: 60,
      method: 'anchor',
      anchor: row.anchor,
      source: { study: 'US Army Fitness Test, offizieller Standard ab Juni 2025', n: null },
      quality: 'A',
      protocolNote: row.lower
        ? {
            de: 'Der Höchstwert für 100 Punkte. Hier ist weniger besser: ein Anteil über 100 % bedeutet langsamer als der Höchstwert. Die vollständigen Punktetabellen sind nach Alter und Geschlecht gestaffelt und liegen hier nicht vor — deshalb ein Bezugswert und keine Stufe. Der Standard gilt für die US-Streitkräfte; andere Behörden setzen eigene Anforderungen.',
            en: 'The maximum-score standard. Lower is better here: a share above 100 % means slower than the maximum. The full scoring tables are graded by age and sex and are not available here — hence a reference value and no rating. The standard applies to the US armed forces; other agencies set their own requirements.',
          }
        : {
            de: 'Der Höchstwert für 100 Punkte. Die vollständigen Punktetabellen sind nach Alter und Geschlecht gestaffelt und liegen hier nicht vor — deshalb ein Bezugswert und keine Stufe. Der Standard gilt für die US-Streitkräfte; andere Behörden setzen eigene Anforderungen.',
            en: 'The maximum-score standard. The full scoring tables are graded by age and sex and are not available here — hence a reference value and no rating. The standard applies to the US armed forces; other agencies set their own requirements.',
          },
    }),
  ) as ReferenceEntry[]),
]
