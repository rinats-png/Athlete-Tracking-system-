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
export type ReferenceMethod = 'mean_sd' | 'percentiles' | 'bands' | 'anchor'
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
    source: { study: '12 British Studies, Handgrip über den Lebensverlauf', n: 60803 },
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
    source: { study: '12 British Studies, Handgrip über den Lebensverlauf', n: 60803 },
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
      }

      return { entry, percentile, sdFromMean, band, percentOfAnchor }
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
