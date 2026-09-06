/**
 * Methodenbelege aus ClinicalTrials.gov.
 *
 * WAS DAS IST UND WAS AUSDRÜCKLICH NICHT: eine Registereintragung belegt,
 * dass ein Verfahren in einer angemeldeten Studie als Messgrösse geführt
 * wird. Sie belegt KEINEN Normwert, keine Wirksamkeit und keine
 * Studienqualität — das Referenzhandbuch schreibt genau das an fast jede
 * Zeile: «Wert als Norm verfügbar? Nein — Register beschreibt Outcomes,
 * keine Normwerte.»
 *
 * Deshalb steht das hier in einer eigenen Datei, getrennt von
 * `references.ts`, und wird in der Oberfläche in einem eigenen Abschnitt
 * angezeigt. Ein NCT-Verweis neben einem Referenzwert würde als
 * wissenschaftliche Absicherung gelesen, die er nicht ist.
 *
 * Der Nutzen ist ein anderer und trotzdem echt: er zeigt, dass ein Verfahren
 * in registrierter Forschung so gemessen wird — und wo man nachlesen kann,
 * wie.
 */

export interface MethodEvidence {
  /** Tests, für die dieser Beleg gilt. */
  testSlugs: string[]
  /** Die Registernummer. */
  nct: string
  /** Titel der Studie, wie im Handbuch geführt. */
  study: { de: string; en: string }
  /** Welche Messgrössen dort registriert sind. */
  outcomes: { de: string; en: string }
  /** Was beim Vergleich zu beachten ist. */
  caveat: { de: string; en: string }
}

export const METHOD_EVIDENCE: MethodEvidence[] = [
  {
    testSlugs: ['sprint_10m', 'sprint_20m', 'sprint_30m', 'countermovement_jump', 'squat_jump'],
    nct: 'NCT04766411',
    study: {
      de: 'Sprint Recovery Kinetics — Erholungsverlauf nach Sprintbelastung',
      en: 'Sprint recovery kinetics — recovery course after sprint loading',
    },
    outcomes: {
      de: '10/20/30-m-Sprint, Sprunghöhe (SJ/CMJ), Bodenreaktionskraft, Spitzen- und Mittelleistung, Kraftanstiegsrate, EMG, Drehmoment, VO₂max, Körperfett und fettfreie Masse.',
      en: '10/20/30 m sprint, jump height (SJ/CMJ), ground reaction force, peak and mean power, rate of force development, EMG, torque, VO₂max, body fat and lean mass.',
    },
    caveat: {
      de: 'Das Register nennt keine Alters- oder Geschlechtsnorm für diese Sprintzeiten. Es belegt das Verfahren, nicht die Einordnung.',
      en: 'The registry names no age or sex norm for these sprint times. It documents the method, not the classification.',
    },
  },
  {
    testSlugs: ['special_judo_fitness_test', 'grip_strength', 'gi_grip_hang'],
    nct: 'NCT07095153',
    study: {
      de: 'Jugend-Judostudie — Reaktion, reaktive Agilität, Gleichgewicht',
      en: 'Youth judo study — reaction, reactive agility, balance',
    },
    outcomes: {
      de: 'Reaktionszeit, reaktive Agilität, Einbeinstand, Y-Balance, Hand-Auge- und Fuss-Auge-Koordination, Propriozeption und Judogi-Klimmzug bei 10- bis 18-Jährigen.',
      en: 'Reaction time, reactive agility, single-leg stance, Y-balance, hand-eye and foot-eye coordination, proprioception and judogi pull-up in 10- to 18-year-olds.',
    },
    caveat: {
      de: 'Für keine dieser Grössen ist ein numerischer Normbereich veröffentlicht. Bei Jugendlichen gehört ausserdem der Reifegrad neben das Lebensalter.',
      en: 'No numeric reference range is published for any of these. In adolescents, maturity belongs beside chronological age.',
    },
  },
  {
    testSlugs: ['special_wrestling_fitness_test'],
    nct: 'NCT07083258',
    study: {
      de: 'Elite-Ringerinnen 16–22 — Atemmuskulatur, Rumpf, Gleichgewicht',
      en: 'Elite female wrestlers 16–22 — respiratory muscles, trunk, balance',
    },
    outcomes: {
      de: 'MIP, MEP, FEV1, FVC, FEV1/FVC, Rumpf-Haltezeiten, isokinetisches Rumpfdrehmoment, Y-Balance und Flamingo-Balance.',
      en: 'MIP, MEP, FEV1, FVC, FEV1/FVC, trunk hold times, isokinetic trunk torque, Y-balance and flamingo balance.',
    },
    caveat: {
      de: 'Alle als Studienendpunkte registriert, ohne numerischen Referenzbereich. Isokinetik verlangt zusätzlich Winkel, Geschwindigkeit und Gerät im Datensatz.',
      en: 'All registered as study endpoints without a numeric reference range. Isokinetics additionally requires angle, speed and device in the record.',
    },
  },
  {
    testSlugs: ['ftp_20min', 'ramp_test_bike'],
    nct: 'NCT04075929',
    study: {
      de: 'Radsport — Schwellenleistung und Spitzenleistung als Endpunkte',
      en: 'Cycling — threshold power and peak power output as endpoints',
    },
    outcomes: {
      de: 'Functional Threshold Power und Peak Power Output, im Labor und im Feld.',
      en: 'Functional threshold power and peak power output, in the laboratory and in the field.',
    },
    caveat: {
      de: 'Keine numerischen Normwerte im Register. Die Wattquelle — Trainer, Powermeter, Ergometer — gehört zum Messwert.',
      en: 'No numeric norms in the registry. The power source — trainer, power meter, ergometer — is part of the measurement.',
    },
  },
  {
    testSlugs: ['beep_test_20m'],
    nct: 'NCT06549192',
    study: {
      de: 'Kinder 6–18 — Shuttle Run, Lungenfunktion und Herzratenvariabilität',
      en: 'Children 6–18 — shuttle run, lung function and heart rate variability',
    },
    outcomes: {
      de: '20-m-Shuttle-Run, FVC, FEV1, FEV1/FVC, FEF25/75, PEF, SDNN, RMSSD, pNN50, LF/HF, Blutdruck und Herzfrequenz.',
      en: '20 m shuttle run, FVC, FEV1, FEV1/FVC, FEF25/75, PEF, SDNN, RMSSD, pNN50, LF/HF, blood pressure and heart rate.',
    },
    caveat: {
      de: 'Keine sportartspezifischen Normwerte im Register. Alter in Jahren und Pubertätsstatus gehören dazu.',
      en: 'No sport-specific norms in the registry. Age in years and pubertal status belong with it.',
    },
  },
]

/** Die Belege zu einem Test. Leer, wenn keiner hinterlegt ist. */
export function evidenceForTest(testSlug: string): MethodEvidence[] {
  return METHOD_EVIDENCE.filter((entry) => entry.testSlugs.includes(testSlug))
}
