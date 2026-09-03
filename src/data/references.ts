import type { ScoringDirection, Sex } from '@/types/domain'

/**
 * Referenzwerte aus publizierten Quellen.
 *
 * WAS SICH GEGENÜBER `norms.ts` ÄNDERT
 *
 * Die alte Belegung war eine einzige, namenlose «Population» mit
 * Perzentilstützstellen, die niemand belegt hatte. Die Quellen, die jetzt
 * vorliegen, sehen anders aus: fast alle liefern Mittelwert und
 * Standardabweichung einer klar benannten Gruppe — «Elite-MMA-Kämpfer,
 * n=?», «nicht-athletische Kontrollen», «Nationalkader Fechten». Damit ein
 * Vergleich etwas aussagt, muss die Gruppe mitgeliefert werden.
 *
 * Deshalb trägt jeder Eintrag hier:
 *   — die KOHORTE (Bevölkerung oder Athleten) und ihre Bezeichnung,
 *   — die METHODE, mit der aus dem Wert eine Einordnung wird,
 *   — die QUELLE mit Stichprobengrösse,
 *   — die DATENQUALITÄT A–D aus der Quellübersicht.
 *
 * VIER METHODEN, WEIL DIE QUELLEN VIER FORMEN HABEN
 *
 *   `mean_sd`      Mittelwert und Streuung. Daraus wird ein Perzentil über die
 *                  Normalverteilung gerechnet — eine ANNAHME, die in der
 *                  Oberfläche als solche steht. Zusätzlich wird der Abstand in
 *                  Standardabweichungen gezeigt, der ohne diese Annahme gilt.
 *   `percentiles`  Echte Stützstellen. Wird linear interpoliert, an den
 *                  Rändern geklemmt statt extrapoliert.
 *   `bands`        Publizierte Klassifikation (etwa der SJFT: «excellent» bis
 *                  «very poor»). Kein Perzentil — die Quelle gibt keines her.
 *   `anchor`       Ein einzelner belegter Bezugswert, etwa der Altersgipfel der
 *                  Griffkraft. Zeigt den Abstand dazu, mehr nicht.
 *   `median`       Der publizierte Median einer benannten Gruppe, ohne
 *                  Streuung. Daraus folgt genau eine Aussage: darüber oder
 *                  darunter, und um wie viel Prozent. KEINE Stufe — für
 *                  «Sehr gut» bräuchte es eine Verteilung, und die gibt die
 *                  Quelle nicht her. Das ist die häufigste Form, in der
 *                  grosse Register ihre Werte berichten.
 *
 * ATHLETENKOHORTEN SIND SPORTARTGEBUNDEN. Ein Wert aus einer
 * Elite-MMA-Stichprobe gilt für MMA und nicht für Rudern. Deshalb schränkt
 * `disciplineIds` ein, wo der Eintrag überhaupt angeboten wird.
 *
 * WAS HIER NICHT STEHT: alles, was die Quelle nur qualitativ sagt
 * («National > Liga signifikant», «Medaillisten besser»). Daraus lässt sich
 * kein Referenzwert bilden, und ein geschätzter wäre schlimmer als keiner.
 * Die betroffenen Zeilen stehen in `REFERENCE_GAPS` mit Grund.
 */

export type ReferenceCohort = 'population' | 'athlete'
export type ReferenceMethod = 'mean_sd' | 'percentiles' | 'bands' | 'anchor' | 'median'
/** A = Normtabelle/Metaanalyse · B = gute Vergleichsstudie · C/D = Einzelstudie oder indirekt. */
export type ReferenceQuality = 'A' | 'B' | 'C' | 'D'

export interface ReferenceSource {
  /** Kurzbezeichnung der Arbeit, wie sie im Bericht erscheint. */
  study: string
  /** Stichprobengrösse, soweit angegeben. */
  n: number | null
}

export interface ReferenceBand {
  /** Obergrenze dieses Bandes; null = nach oben offen. */
  upTo: number | null
  label: { de: string; en: string }
}

export interface ReferenceEntry {
  testSlug: string
  metricKey: string
  cohort: ReferenceCohort
  /** Wie die Gruppe dem Nutzer genannt wird — der wichtigste Teil des Eintrags. */
  cohortLabel: { de: string; en: string }
  /** Nur bei Athletenkohorten: für welche Disziplinen der Eintrag gilt. */
  disciplineIds?: string[]
  sex: Exclude<Sex, 'other'> | 'all'
  ageMin: number
  ageMax: number
  method: ReferenceMethod
  /** `mean_sd` */
  mean?: number
  sd?: number
  /**
   * `percentiles`: Werte zu 10/25/50/75/90/99, in der Richtung der Kennzahl
   * selbst notiert. Bei «kleiner ist besser» ist die Reihe also absteigend
   * (P10 = langsamste Zeit). Die Zuordnung Wert → Perzentil steckt damit
   * schon in den Stützstellen; sie wird nicht noch einmal gedreht.
   */
  values?: number[]
  /** `bands`: aufsteigend nach `upTo`. */
  bands?: ReferenceBand[]
  /** `anchor`: der Bezugswert selbst. */
  anchor?: number
  /** `median`: der publizierte Median der Gruppe. */
  median?: number
  source: ReferenceSource
  quality: ReferenceQuality
  /**
   * Abweichungen zwischen dem Protokoll der Quelle und dem der App. Steht in
   * der Oberfläche am Vergleich — ohne diesen Hinweis wäre ein Feldwert
   * stillschweigend mit einem Laborwert verglichen.
   */
  protocolNote?: { de: string; en: string }
}

const P_ANCHORS = [10, 25, 50, 75, 90, 99] as const

// --- Wiederkehrende Kohortenbezeichnungen -----------------------------------

const CONTROLS = {
  de: 'Nicht-athletische Erwachsene (Kontrollgruppe)',
  en: 'Non-athletic adults (control group)',
}
const ACTIVE = {
  de: 'Aktive gesunde Erwachsene, Ø 40 Jahre',
  en: 'Active healthy adults, mean age 40',
}
const LAB_NOTE = {
  de: 'Quelle misst im Labor (Spiroergometrie). Ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung und liegt systematisch daneben.',
  en: 'The source measures in a laboratory (spiroergometry). A field estimate such as Cooper or beep test is an approximation and deviates systematically.',
}

export const REFERENCES: ReferenceEntry[] = [
  // ======================= BEVÖLKERUNG =====================================
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: CONTROLS,
    sex: 'male',
    ageMin: 18,
    ageMax: 120,
    method: 'mean_sd',
    mean: 34.17,
    sd: 2.75,
    source: { study: 'VO2max Athletes vs Nonathletes (Kontrollgruppe)', n: null },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: CONTROLS,
    sex: 'female',
    ageMin: 18,
    ageMax: 120,
    method: 'mean_sd',
    mean: 24.15,
    sd: 5.35,
    source: { study: 'VO2max Athletes vs Nonathletes (Kontrollgruppe)', n: null },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: ACTIVE,
    sex: 'all',
    ageMin: 18,
    ageMax: 120,
    method: 'mean_sd',
    mean: 47.4,
    sd: 6.0,
    source: { study: 'VO2max-Schätzungsvergleich, aktive gesunde Erwachsene', n: 99 },
    quality: 'B',
  },
  // --- Aerobe Kapazität nach Alter und Geschlecht --------------------------
  //
  // Das FRIEND-Register ist die grösste Sammlung direkt gemessener
  // Spiroergometrie-Werte. Die Arbeit berichtet den Median je Dekade und
  // Geschlecht, aber keine Streuung — deshalb `median` und keine Stufe:
  // «über dem Median deiner Altersgruppe» ist genau das, was die Zahl
  // hergibt, und mehr zu behaupten hiesse, eine Verteilung zu erfinden.
  //
  // Belegt sind die Dekaden 20–29 und 70–79. Die vier dazwischen sind
  // zwischen diesen Eckwerten fortgeschrieben; der dabei entstehende Abfall
  // stimmt mit dem in der Arbeit genannten überein und ist an jedem Eintrag
  // vermerkt.
  //
  // Die Fahrrad-Werte derselben Registerreihe stehen NICHT hier: dort ergäbe
  // dieselbe Fortschreibung 14 % je Dekade, während die Arbeit rund 10 %
  // berichtet. Wo die eigene Rechnung der Quelle widerspricht, gilt die
  // Quelle — der Eintrag entfällt und steht in REFERENCE_GAPS.
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Männer 20–29 Jahre, FRIEND-Register (Laufband)',
      en: 'Men aged 20–29, FRIEND registry (treadmill)',
    },
    sex: 'male',
    ageMin: 20,
    ageMax: 29,
    method: 'median',
    median: 49.5,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Männer 30–39 Jahre, FRIEND-Register (Laufband)',
      en: 'Men aged 30–39, FRIEND registry (treadmill)',
    },
    sex: 'male',
    ageMin: 30,
    ageMax: 39,
    method: 'median',
    median: 45.0,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: {
      de: 'Median dieser Dekade zwischen den beiden publizierten Eckwerten (20–29 und 70–79) fortgeschrieben. Der so entstehende Abfall von 9,1 % je Dekade deckt sich mit dem in der Arbeit berichteten Wert von rund 9 %. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Median for this decade carried forward between the two published endpoints (20–29 and 70–79). The resulting decline of 9.1 % per decade matches the roughly 9 % reported in the paper. Note also: the source measures on a laboratory treadmill; a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Männer 40–49 Jahre, FRIEND-Register (Laufband)',
      en: 'Men aged 40–49, FRIEND registry (treadmill)',
    },
    sex: 'male',
    ageMin: 40,
    ageMax: 49,
    method: 'median',
    median: 40.9,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: {
      de: 'Median dieser Dekade zwischen den beiden publizierten Eckwerten (20–29 und 70–79) fortgeschrieben. Der so entstehende Abfall von 9,1 % je Dekade deckt sich mit dem in der Arbeit berichteten Wert von rund 9 %. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Median for this decade carried forward between the two published endpoints (20–29 and 70–79). The resulting decline of 9.1 % per decade matches the roughly 9 % reported in the paper. Note also: the source measures on a laboratory treadmill; a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Männer 50–59 Jahre, FRIEND-Register (Laufband)',
      en: 'Men aged 50–59, FRIEND registry (treadmill)',
    },
    sex: 'male',
    ageMin: 50,
    ageMax: 59,
    method: 'median',
    median: 37.2,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: {
      de: 'Median dieser Dekade zwischen den beiden publizierten Eckwerten (20–29 und 70–79) fortgeschrieben. Der so entstehende Abfall von 9,1 % je Dekade deckt sich mit dem in der Arbeit berichteten Wert von rund 9 %. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Median for this decade carried forward between the two published endpoints (20–29 and 70–79). The resulting decline of 9.1 % per decade matches the roughly 9 % reported in the paper. Note also: the source measures on a laboratory treadmill; a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Männer 60–69 Jahre, FRIEND-Register (Laufband)',
      en: 'Men aged 60–69, FRIEND registry (treadmill)',
    },
    sex: 'male',
    ageMin: 60,
    ageMax: 69,
    method: 'median',
    median: 33.9,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: {
      de: 'Median dieser Dekade zwischen den beiden publizierten Eckwerten (20–29 und 70–79) fortgeschrieben. Der so entstehende Abfall von 9,1 % je Dekade deckt sich mit dem in der Arbeit berichteten Wert von rund 9 %. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Median for this decade carried forward between the two published endpoints (20–29 and 70–79). The resulting decline of 9.1 % per decade matches the roughly 9 % reported in the paper. Note also: the source measures on a laboratory treadmill; a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Männer 70–79 Jahre, FRIEND-Register (Laufband)',
      en: 'Men aged 70–79, FRIEND registry (treadmill)',
    },
    sex: 'male',
    ageMin: 70,
    ageMax: 120,
    method: 'median',
    median: 30.8,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Frauen 20–29 Jahre, FRIEND-Register (Laufband)',
      en: 'Women aged 20–29, FRIEND registry (treadmill)',
    },
    sex: 'female',
    ageMin: 20,
    ageMax: 29,
    method: 'median',
    median: 40.6,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Frauen 30–39 Jahre, FRIEND-Register (Laufband)',
      en: 'Women aged 30–39, FRIEND registry (treadmill)',
    },
    sex: 'female',
    ageMin: 30,
    ageMax: 39,
    method: 'median',
    median: 36.8,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: {
      de: 'Median dieser Dekade zwischen den beiden publizierten Eckwerten (20–29 und 70–79) fortgeschrieben. Der so entstehende Abfall von 9,1 % je Dekade deckt sich mit dem in der Arbeit berichteten Wert von rund 9 %. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Median for this decade carried forward between the two published endpoints (20–29 and 70–79). The resulting decline of 9.1 % per decade matches the roughly 9 % reported in the paper. Note also: the source measures on a laboratory treadmill; a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Frauen 40–49 Jahre, FRIEND-Register (Laufband)',
      en: 'Women aged 40–49, FRIEND registry (treadmill)',
    },
    sex: 'female',
    ageMin: 40,
    ageMax: 49,
    method: 'median',
    median: 33.4,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: {
      de: 'Median dieser Dekade zwischen den beiden publizierten Eckwerten (20–29 und 70–79) fortgeschrieben. Der so entstehende Abfall von 9,1 % je Dekade deckt sich mit dem in der Arbeit berichteten Wert von rund 9 %. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Median for this decade carried forward between the two published endpoints (20–29 and 70–79). The resulting decline of 9.1 % per decade matches the roughly 9 % reported in the paper. Note also: the source measures on a laboratory treadmill; a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Frauen 50–59 Jahre, FRIEND-Register (Laufband)',
      en: 'Women aged 50–59, FRIEND registry (treadmill)',
    },
    sex: 'female',
    ageMin: 50,
    ageMax: 59,
    method: 'median',
    median: 30.4,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: {
      de: 'Median dieser Dekade zwischen den beiden publizierten Eckwerten (20–29 und 70–79) fortgeschrieben. Der so entstehende Abfall von 9,1 % je Dekade deckt sich mit dem in der Arbeit berichteten Wert von rund 9 %. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Median for this decade carried forward between the two published endpoints (20–29 and 70–79). The resulting decline of 9.1 % per decade matches the roughly 9 % reported in the paper. Note also: the source measures on a laboratory treadmill; a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Frauen 60–69 Jahre, FRIEND-Register (Laufband)',
      en: 'Women aged 60–69, FRIEND registry (treadmill)',
    },
    sex: 'female',
    ageMin: 60,
    ageMax: 69,
    method: 'median',
    median: 27.5,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: {
      de: 'Median dieser Dekade zwischen den beiden publizierten Eckwerten (20–29 und 70–79) fortgeschrieben. Der so entstehende Abfall von 9,1 % je Dekade deckt sich mit dem in der Arbeit berichteten Wert von rund 9 %. Zusätzlich gilt: die Quelle misst auf dem Laufband im Labor, ein Feldtestwert wie Cooper oder Beep-Test ist eine Schätzung.',
      en: 'Median for this decade carried forward between the two published endpoints (20–29 and 70–79). The resulting decline of 9.1 % per decade matches the roughly 9 % reported in the paper. Note also: the source measures on a laboratory treadmill; a field estimate such as Cooper or beep test is an approximation.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'population',
    cohortLabel: {
      de: 'Frauen 70–79 Jahre, FRIEND-Register (Laufband)',
      en: 'Women aged 70–79, FRIEND registry (treadmill)',
    },
    sex: 'female',
    ageMin: 70,
    ageMax: 120,
    method: 'median',
    median: 25.0,
    source: { study: 'Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband)', n: 44007 },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },

  // Griffkraft: die Quellen geben Altersgipfel, keine Streuung. Deshalb
  // Bezugswert statt Perzentil — der Abstand zum Gipfel ist die Aussage.
  {
    testSlug: 'grip_strength',
    metricKey: 'gripKg',
    cohort: 'population',
    cohortLabel: {
      de: 'Bevölkerungsgipfel Männer (29–39 J), britische Kohortendaten',
      en: 'Population peak, men aged 29–39, UK cohort data',
    },
    sex: 'male',
    ageMin: 25,
    ageMax: 49,
    method: 'anchor',
    anchor: 51,
    source: { study: 'Dodds et al. 2014, PLoS ONE, zwölf britische Bevölkerungsstudien', n: 49964 },
    quality: 'A',
  },
  {
    testSlug: 'grip_strength',
    metricKey: 'gripKg',
    cohort: 'population',
    cohortLabel: {
      de: 'Bevölkerungsgipfel Frauen (26–42 J), britische Kohortendaten',
      en: 'Population peak, women aged 26–42, UK cohort data',
    },
    sex: 'female',
    ageMin: 25,
    ageMax: 49,
    method: 'anchor',
    anchor: 31,
    source: { study: 'Dodds et al. 2014, PLoS ONE, zwölf britische Bevölkerungsstudien', n: 49964 },
    quality: 'A',
  },
  {
    testSlug: 'grip_strength',
    metricKey: 'gripKg',
    cohort: 'population',
    cohortLabel: {
      de: 'US-Referenz Männer 25–29 (dominante Hand)',
      en: 'US reference, men 25–29 (dominant hand)',
    },
    sex: 'male',
    ageMin: 18,
    ageMax: 24,
    method: 'anchor',
    anchor: 49.7,
    source: { study: 'NIH Toolbox US', n: 1232 },
    quality: 'A',
  },
  {
    testSlug: 'grip_strength',
    metricKey: 'gripKg',
    cohort: 'population',
    cohortLabel: {
      de: 'US-Referenz Frauen 75–79 (nicht-dominante Hand)',
      en: 'US reference, women 75–79 (non-dominant hand)',
    },
    sex: 'female',
    ageMin: 70,
    ageMax: 120,
    method: 'anchor',
    anchor: 18.7,
    source: { study: 'NIH Toolbox US', n: 1232 },
    quality: 'A',
  },

  // ======================= KAMPFSPORT ======================================
  {
    testSlug: 'special_judo_fitness_test',
    metricKey: 'sjft_index',
    cohort: 'athlete',
    cohortLabel: {
      de: 'Judo — publizierte SJFT-Klassifikation',
      en: 'Judo — published SJFT classification',
    },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 14,
    ageMax: 120,
    method: 'bands',
    // Kleinerer Index ist besser; die Quelle nennt die beiden äusseren
    // Stufen. Was dazwischen liegt, benennt sie nicht — deshalb steht dort
    // «mittlerer Bereich» und keine erfundene Zwischenstufe.
    bands: [
      { upTo: 11.73, label: { de: 'Excellent', en: 'Excellent' } },
      { upTo: 14.84, label: { de: 'Mittlerer Bereich', en: 'Middle range' } },
      { upTo: null, label: { de: 'Very poor', en: 'Very poor' } },
    ],
    source: { study: 'Meta-Analyse SJFT, 37 Studien', n: 724 },
    quality: 'A',
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'Judo — Reviewbandbreite', en: 'Judo — review range' },
    disciplineIds: ['judo'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'bands',
    bands: [
      { upTo: 44, label: { de: 'Unter der Reviewbandbreite', en: 'Below the review range' } },
      { upTo: 60, label: { de: 'Innerhalb der Reviewbandbreite', en: 'Within the review range' } },
      { upTo: null, label: { de: 'Oberes Bandende (Elite)', en: 'Upper end (elite)' } },
    ],
    source: { study: 'Review Physical/Physiological Characteristics Judo', n: null },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'BJJ — Reviewbandbreite', en: 'BJJ — review range' },
    disciplineIds: ['bjj'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'bands',
    bands: [
      { upTo: 42, label: { de: 'Unter der Reviewbandbreite', en: 'Below the review range' } },
      { upTo: 52, label: { de: 'Innerhalb der Reviewbandbreite', en: 'Within the review range' } },
      { upTo: null, label: { de: 'Oberes Bandende (Elite)', en: 'Upper end (elite)' } },
    ],
    source: { study: 'Systematic Review BJJ', n: null },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
  {
    testSlug: 'grip_hang_time',
    metricKey: 'durationSeconds',
    cohort: 'athlete',
    cohortLabel: {
      de: 'BJJ hochklassig — statischer Gi-Griff',
      en: 'High-level BJJ — static gi grip',
    },
    disciplineIds: ['bjj'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'mean_sd',
    mean: 54.4,
    sd: 13.4,
    source: { study: 'Review-Zitat aus Primärstudie, Gi Grip Endurance', n: null },
    quality: 'C',
    protocolNote: {
      de: 'Die Quelle hält am Judogi, dieser Test an der Reckstange. Der Vergleich ist deshalb nur grob — am Gi ist die Haltezeit üblicherweise kürzer.',
      en: 'The source holds a judogi, this test uses a bar. The comparison is therefore rough — grip times on a gi are usually shorter.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'MMA Elite', en: 'Elite MMA' },
    disciplineIds: ['mma'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'mean_sd',
    mean: 63.23,
    sd: 5.5,
    source: { study: 'Anthropometric/Physiological Profile Elite MMA', n: null },
    quality: 'C',
    protocolNote: LAB_NOTE,
  },
  {
    testSlug: 'pull_up_max_reps',
    metricKey: 'reps',
    cohort: 'athlete',
    cohortLabel: { de: 'MMA Elite', en: 'Elite MMA' },
    disciplineIds: ['mma'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'bands',
    // Die Quelle nennt den Mittelwert 11,2 und ein unteres Kohortenende bei
    // 8–9, aber keine Streuung. Ohne SD kein Perzentil.
    bands: [
      { upTo: 8, label: { de: 'Unter dem Kohortenbereich', en: 'Below the cohort range' } },
      { upTo: 11.2, label: { de: 'Im Kohortenbereich', en: 'Within the cohort range' } },
      { upTo: null, label: { de: 'Über dem Kohortenmittel', en: 'Above the cohort mean' } },
    ],
    source: { study: 'Anthropometric/Physiological Profile Elite MMA, Chin-up-Test', n: null },
    quality: 'C',
  },
  {
    testSlug: 'sprint_10m',
    metricKey: 'durationSeconds',
    cohort: 'athlete',
    cohortLabel: { de: 'Karate Elite (Kumite)', en: 'Elite karate (kumite)' },
    disciplineIds: ['karate'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'mean_sd',
    mean: 1.97,
    sd: 0.06,
    source: { study: 'Maximal Strength/Sprint/Jump Study, Photozellen', n: null },
    quality: 'C',
    protocolNote: {
      de: 'Quelle misst mit Lichtschranken. Handgestoppte Zeiten fallen typischerweise 0,2–0,3 s schneller aus und sind nicht direkt vergleichbar.',
      en: 'The source uses photocells. Hand-timed results are typically 0.2–0.3 s faster and not directly comparable.',
    },
  },
  {
    testSlug: 'grip_strength',
    metricKey: 'gripKg',
    cohort: 'athlete',
    cohortLabel: { de: 'Fechten, nationalteamnah (rechte Hand)', en: 'Fencing, near national team (right hand)' },
    disciplineIds: ['fencing'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'mean_sd',
    mean: 33.3,
    sd: 9.6,
    source: { study: 'Fitness Assessment of Fencers', n: null },
    quality: 'C',
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'Pencak Silat, regionale Kaderathleten', en: 'Pencak silat, regional squad athletes' },
    disciplineIds: ['pencak_silat'],
    sex: 'all',
    ageMin: 16,
    ageMax: 120,
    method: 'mean_sd',
    mean: 49.63,
    sd: 4.95,
    source: { study: 'Regionale Studien (u. a. Bumi Siliwangi)', n: null },
    quality: 'C',
  },

  // ======================= AUSDAUER ========================================
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'Distanzläuferinnen (Marathon)', en: 'Female distance runners (marathon)' },
    disciplineIds: ['marathon', 'half_marathon'],
    sex: 'female',
    ageMin: 16,
    ageMax: 120,
    method: 'mean_sd',
    mean: 56.5,
    sd: 6.2,
    source: { study: 'Marathon Performance in Female Distance Runners', n: 35 },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },

  // ======================= RADSPORT ========================================
  {
    testSlug: 'ramp_test_bike',
    metricKey: 'peakPowerW',
    cohort: 'athlete',
    cohortLabel: { de: 'Trainierte Radsportler (maximale Rampenleistung)', en: 'Trained cyclists (maximal aerobic power)' },
    disciplineIds: ['road_race', 'time_trial', 'track_cycling', 'mtb', 'gravel', 'triathlon_olympic', 'triathlon_70_3', 'triathlon_ironman'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'mean_sd',
    mean: 352,
    sd: 49,
    source: { study: 'Reliability/Validity FTP20', n: 22 },
    quality: 'B',
    protocolNote: {
      de: 'Die Quelle nennt die maximale Rampenleistung (MAP). Sie ist der Spitzenwert eines Stufentests und nicht die Schwellenleistung.',
      en: 'The source reports maximal aerobic power (MAP), the peak of a ramp test — not threshold power.',
    },
  },
  {
    testSlug: '*',
    metricKey: 'vo2max_ml_kg_min',
    cohort: 'athlete',
    cohortLabel: { de: 'Trainierte Radsportler', en: 'Trained cyclists' },
    disciplineIds: ['road_race', 'time_trial', 'track_cycling', 'mtb', 'gravel'],
    sex: 'male',
    ageMin: 16,
    ageMax: 120,
    method: 'mean_sd',
    mean: 59.4,
    sd: 5.6,
    source: { study: 'Reliability/Validity FTP20', n: 22 },
    quality: 'B',
    protocolNote: LAB_NOTE,
  },
]

/**
 * Zeilen der Quellübersicht, aus denen sich KEIN Referenzwert bilden liess.
 *
 * Sie stehen hier, damit die Lücke benannt ist statt zu verschwinden — und
 * damit man beim nächsten Quellenzuwachs sieht, wo etwas fehlt.
 */
export const REFERENCE_GAPS: { subject: string; reason: string }[] = [
  {
    subject: 'Counter Movement Jump — Bevölkerungsreferenz',
    reason:
      'Hildebrandt et al. 2015 (Knee Surg Sports Traumatol Arthrosc, doi:10.1007/s00167-015-3529-4) haben an 434 gesunden Personen aus Innsbruck Normwerte für den beidbeinigen CMJ nach Alter (10–14, 15–19, 20–29, 30–50) und Geschlecht erhoben und in fünf Stufen um den Mittelwert eingeteilt. Die Mittelwerte und Streuungen stehen nur in den Tabellen der Druckfassung, nicht im frei zugänglichen Volltext. Ohne diese Zahlen liesse sich eine Einordnung nur schätzen — deshalb bleibt der CMJ vorerst ohne Referenz und wird nur mit dir selbst verglichen.',
  },
  {
    subject: 'Sprint 20 m — Bevölkerungsreferenz',
    reason:
      'Zum linearen Sprint über 5, 10, 20 oder 30 m gibt es viele Kohortenbeschreibungen einzelner Mannschaften, aber keine Erhebung an einer benannten Allgemeinbevölkerung mit Mittelwert und Streuung nach Alter und Geschlecht. Kohortenwerte einer Mannschaft als Bevölkerungsnorm auszugeben, wäre eine Aussage über Menschen, die die Quelle nicht deckt. Der Sprint bleibt deshalb ohne Referenz.',
  },
  {
    subject: 'FRIEND-Register, Fahrradergometer (Kaminsky et al. 2016)',
    reason:
      'Belegt sind nur die Dekaden 20–29 und 70–79. Eine Fortschreibung dazwischen ergäbe 14 % Abfall je Dekade, die Arbeit berichtet rund 10 % — die eigene Rechnung widerspräche also der Quelle. Ausserdem bildet in dieser App kein Radtest die VO2max, sondern Leistung in Watt.',
  },
  {
    subject: 'Griffkraft: Perzentilkurven statt Altersgipfel',
    reason:
      'Dodds et al. veröffentlichen Zentilkurven über den gesamten Lebensverlauf, die Kurzfassung nennt aber nur die Gipfelmediane (51 kg Männer, 31 kg Frauen) und die Schwelle für schwachen Griff (2,5 SD unter dem Gipfelmittel). Ohne die tabellierten Zentile bleibt es beim Bezugswert.',
  },
  {
    subject: 'Wrestling SWFT / SWPT, Medaillisten vs. Nicht-Medaillisten',
    reason:
      'Die Quelle berichtet nur Signifikanzen («National > Liga», «Medaillisten besser»), keine Mittelwerte oder Streuungen. Ohne Zahlen kein Referenzwert.',
  },
  {
    subject: 'Boxen: Schlagkraft (Peak/Mean Force, RFD)',
    reason:
      'Werte sind protokollabhängig und nur als Reliabilitätsmasse angegeben. Ausserdem fehlt der App der Test — Schlagkraft braucht eine Kraftmessplatte.',
  },
  {
    subject: 'Taekwondo TAIKT, Fechten FET, HYROX-Segmentzeiten',
    reason:
      'Die Quellen beschreiben Unterschiede zwischen Leistungsgruppen, ohne die Gruppenwerte zu beziffern. Für den FET nennt sie eine ROC-Schwelle (≥14,3 min), aber die App führt diesen Test nicht.',
  },
  {
    subject: 'Fechten 5×5-m-Shuttle und Ausfallzeit',
    reason:
      'Bezifferte Werte liegen vor (Elite 12,43 ± 0,95 s), aber das Protokoll ist ein anderes als der 5-10-5-Shuttle dieser App. Ein Vergleich wäre eine stille Protokollverwechslung.',
  },
  {
    subject: 'Pencak Silat Agility 5,63 ± 0,28 s',
    reason:
      'Die Quelle nennt kein bestimmtes Protokoll («Standard Agility-/Shuttle-Protokoll»). Ohne bekanntes Protokoll ist die Zahl nicht zuordenbar.',
  },
  {
    subject: 'Marathon: VO2max nach Zielzeitband',
    reason:
      'Die Bänder sind beschrieben, die zugehörigen VO2max-Werte nicht beziffert.',
  },
  {
    subject: 'Tactical: Behördentests',
    reason:
      'Die Quelle hält ausdrücklich fest, dass es keinen einheitlichen Standardtest gibt und Anforderungen je Organisation festgelegt werden.',
  },
]

// --- Auswertung --------------------------------------------------------------

/** Normalverteilung, kumulativ. Abramowitz & Stegun 7.1.26. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2)
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z >= 0 ? 1 - p : p
}

export interface ReferenceComparison {
  entry: ReferenceEntry
  /** 0–100, nur bei `mean_sd` und `percentiles`. */
  percentile: number | null
  /**
   * Abstand zum Mittelwert in Standardabweichungen, VORZEICHENRICHTIG ZUR
   * LEISTUNG: positiv heisst besser als der Gruppenmittelwert, auch bei
   * Tests, bei denen ein kleinerer Wert besser ist.
   */
  sdFromMean: number | null
  /** Nur bei `bands`. */
  band: ReferenceBand | null
  /** Nur bei `anchor`: Anteil am Bezugswert in Prozent. */
  percentOfAnchor: number | null
  /**
   * Nur bei `median`: Abstand zum Median in Prozent, vorzeichenrichtig zur
   * Leistung. Positiv heisst besser als die Hälfte der Gruppe, auch bei
   * Tests, bei denen ein kleinerer Wert besser ist.
   */
  percentFromMedian: number | null
}

function matches(
  entry: ReferenceEntry,
  testSlug: string,
  metricKey: string,
  sex: Sex | null,
  age: number | null,
  disciplineId: string | null,
): boolean {
  if (entry.metricKey !== metricKey) return false
  if (entry.testSlug !== '*' && entry.testSlug !== testSlug) return false
  if (entry.sex !== 'all' && entry.sex !== sex) return false
  const effectiveAge = age ?? 30
  if (effectiveAge < entry.ageMin || effectiveAge > entry.ageMax) return false
  if (entry.disciplineIds && (disciplineId == null || !entry.disciplineIds.includes(disciplineId))) {
    return false
  }
  return true
}

/**
 * Alle passenden Vergleiche zu einem Messwert.
 *
 * Gibt bewusst eine Liste zurück: Bevölkerung und Athletenkohorte sind zwei
 * Antworten auf zwei verschiedene Fragen («Wo stehe ich im Alltag?» und «Wie
 * weit ist es bis zum Wettkampfniveau?»). Die Oberfläche zeigt beide.
 */
export function compareToReferences(
  testSlug: string,
  metricKey: string,
  value: number | null,
  direction: ScoringDirection,
  sex: Sex | null,
  age: number | null,
  disciplineId: string | null,
): ReferenceComparison[] {
  if (value == null || !Number.isFinite(value)) return []

  return REFERENCES.filter((entry) => matches(entry, testSlug, metricKey, sex, age, disciplineId)).map(
    (entry) => {
      let percentile: number | null = null
      let sdFromMean: number | null = null
      let band: ReferenceBand | null = null
      let percentOfAnchor: number | null = null
      let percentFromMedian: number | null = null

      if (entry.method === 'mean_sd' && entry.mean != null && entry.sd) {
        // Vorzeichen zur Leistung drehen: bei «kleiner ist besser» liegt ein
        // Wert UNTER dem Mittel über dem Mittel im Sinne der Leistung.
        const raw = (value - entry.mean) / entry.sd
        sdFromMean = direction === 'lower_is_better' ? -raw : raw
        percentile = Math.min(99.9, Math.max(0.1, normalCdf(sdFromMean) * 100))
      } else if (entry.method === 'percentiles' && entry.values) {
        percentile = interpolate(entry.values, value)
      } else if (entry.method === 'bands' && entry.bands) {
        band = entry.bands.find((b) => b.upTo == null || value <= b.upTo) ?? null
      } else if (entry.method === 'anchor' && entry.anchor) {
        percentOfAnchor = (value / entry.anchor) * 100
      } else if (entry.method === 'median' && entry.median) {
        const raw = ((value - entry.median) / entry.median) * 100
        percentFromMedian = direction === 'lower_is_better' ? -raw : raw
      }

      return { entry, percentile, sdFromMean, band, percentOfAnchor, percentFromMedian }
    },
  )
}

/** Lineare Interpolation zwischen Stützstellen, an den Rändern geklemmt. */
function interpolate(values: number[], value: number): number | null {
  const anchors = values.map((v, i) => ({ value: v, percentile: P_ANCHORS[i] as number }))
  const sorted = [...anchors].sort((a, b) => a.value - b.value)
  const lower = [...sorted].reverse().find((a) => a.value <= value)
  const upper = sorted.find((a) => a.value >= value)
  if (!lower && !upper) return null

  if (!lower) return upper!.percentile
  if (!upper) return lower.percentile
  if (upper.value === lower.value) return Math.max(lower.percentile, upper.percentile)
  const share = (value - lower.value) / (upper.value - lower.value)
  return lower.percentile + share * (upper.percentile - lower.percentile)
}
