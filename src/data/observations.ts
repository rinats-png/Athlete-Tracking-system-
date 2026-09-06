/**
 * Beobachtungswerte — die zweite Art der Messung.
 *
 * DER GRUND, WARUM ES SIE GIBT: die Mastertabelle enthält Grössen, die keine
 * Leistung sind. Ein CK-Wert, eine Hauttemperatur, ein Y-Balance-Ergebnis
 * oder die fettfreie Masse sagen nichts darüber, wie gut jemand ist. Sie in
 * das Leistungsprofil zu stellen wäre falsch — und ihnen eine Stufe von
 * «Schwach» bis «Elite» zu geben wäre schlimmer.
 *
 * WAS EIN BEOBACHTUNGSWERT IST:
 *   — er wird erfasst und im Verlauf gezeigt,
 *   — er wird NIE gegen eine Norm bewertet,
 *   — er zahlt auf KEINE Profilachse und keinen Score ein,
 *   — er trägt, wo nötig, den Hinweis, wer oder was ihn erheben kann.
 *
 * Das ist ausdrücklich weniger, als die App mit einem Test tut. Es ist aber
 * genau so viel, wie die Quellenlage hergibt: für keine dieser Grössen nennt
 * die Tabelle eine belastbare Norm, und mehrere sind ohne Gerät oder
 * Fachperson gar nicht erhebbar.
 *
 * KEINE MEDIZINISCHE DEUTUNG (§82). Ein CK-Wert steht hier als Zahl mit
 * Datum. Was er bedeutet, sagt kein Sportprogramm — das sagt eine Ärztin.
 */

export type ObservationGroup =
  | 'recovery'
  | 'environment'
  | 'sensor'
  | 'body'
  | 'screening'

/** Wer oder was nötig ist, um den Wert überhaupt zu erheben. */
export type ObservationSource =
  /** Selbst einzuschätzen, ohne Gerät. */
  | 'self'
  /** Ein handelsübliches Messgerät genügt. */
  | 'device'
  /** Ein Speziallabor oder Fachgerät. */
  | 'lab'
  /** Ärztliche Leistung — Blutentnahme und Befundung. */
  | 'medical'

export interface ObservationDefinition {
  key: string
  group: ObservationGroup
  unit: string
  /** Erlaubter Bereich. Ausserhalb wird nicht gespeichert. */
  min: number
  max: number
  /** Nachkommastellen bei der Eingabe. */
  step: number
  source: ObservationSource
  /** Ob ein grösserer Wert für sich genommen «mehr» heisst — NICHT «besser». */
  direction: 'higher' | 'lower' | 'neutral'
}

/**
 * Die Beobachtungswerte aus der Mastertabelle.
 *
 * Keine Referenzwerte, keine Cutoffs, keine Stufen — die Tabelle nennt für
 * keinen von ihnen eine belastbare Norm, und einen erfundenen Grenzwert
 * einzutragen wäre der schwerste denkbare Verstoss gegen §81 an einer Stelle,
 * an der er direkt gesundheitliche Folgen haben könnte.
 */
export const OBSERVATIONS: ObservationDefinition[] = [
  // --- Erholung ------------------------------------------------------------
  {
    key: 'ck_u_l',
    group: 'recovery',
    unit: 'U/l',
    min: 10,
    max: 50000,
    step: 1,
    source: 'medical',
    direction: 'neutral',
  },
  {
    key: 'doms',
    group: 'recovery',
    unit: '1–10',
    min: 1,
    max: 10,
    step: 1,
    source: 'self',
    direction: 'lower',
  },
  {
    key: 'hrv_rmssd_ms',
    group: 'recovery',
    unit: 'ms',
    min: 1,
    max: 300,
    step: 1,
    source: 'device',
    direction: 'neutral',
  },
  // --- Umgebung ------------------------------------------------------------
  {
    key: 'wbgt_c',
    group: 'environment',
    unit: '°C',
    min: -10,
    max: 45,
    step: 0.1,
    source: 'device',
    direction: 'neutral',
  },
  // --- Sensorwerte ---------------------------------------------------------
  {
    key: 'mip_cm_h2o',
    group: 'sensor',
    unit: 'cmH₂O',
    min: 10,
    max: 250,
    step: 1,
    source: 'lab',
    direction: 'higher',
  },
  {
    key: 'smo2_percent',
    group: 'sensor',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    source: 'device',
    direction: 'neutral',
  },
  // --- Körper --------------------------------------------------------------
  {
    key: 'fat_mass_percent',
    group: 'body',
    unit: '%',
    min: 2,
    max: 60,
    step: 0.1,
    source: 'lab',
    direction: 'neutral',
  },
  {
    key: 'lean_mass_kg',
    group: 'body',
    unit: 'kg',
    min: 20,
    max: 120,
    step: 0.1,
    source: 'lab',
    direction: 'higher',
  },
  // --- Screening -----------------------------------------------------------
  {
    key: 'y_balance_composite',
    group: 'screening',
    unit: '%',
    min: 40,
    max: 130,
    step: 0.1,
    source: 'self',
    direction: 'higher',
  },
  {
    key: 'fms_total',
    group: 'screening',
    unit: 'Punkte',
    min: 0,
    max: 21,
    step: 1,
    source: 'self',
    direction: 'higher',
  },
]

export const OBSERVATION_BY_KEY = new Map(OBSERVATIONS.map((o) => [o.key, o]))

export function observationByKey(key: string): ObservationDefinition | undefined {
  return OBSERVATION_BY_KEY.get(key)
}
