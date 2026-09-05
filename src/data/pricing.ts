/**
 * Was BASELINE kostet.
 *
 * Hier stehen nur die Zahlen und was darin enthalten ist. Es wird nichts
 * abgerechnet: es gibt keine Zahlungsabwicklung, keinen Anbieter und keinen
 * Vertrag. Solange das so ist, sagt der Bildschirm es auch — eine Preisliste,
 * die nach einem Kauf aussieht, ohne einen zu ermöglichen, wäre eine Täuschung.
 *
 * WARUM KONTINGENTE UND KEIN ATHLETEN-ABO
 *
 * Leistungsdiagnostik ist periodisch, nicht täglich: zwei bis vier Testrunden
 * im Jahr sind der normale Rhythmus. Ein Monats- oder Jahresabo für etwas, das
 * man viermal im Jahr benutzt, rechnet sich für den Nutzer nie — bei 29,90 €
 * je Report und 149,90 € im Jahr läge der Bruchpunkt bei sechs Reports, also
 * jenseits jeder realistischen Nutzung. Wer rechnen kann, abonniert dann nicht,
 * und wer nicht rechnet, fühlt sich hinterher betrogen.
 *
 * Deshalb: Reports als Kontingent, degressiv im Preis, ohne Verfall und ohne
 * Kündigung. Damit erledigt sich auch die Anrechnung eines zuerst gekauften
 * Einzelreports auf ein späteres Abo — es gibt kein Abo, der erste Report ist
 * einfach der erste aus dem Kontingent. Kein Guthaben, keine Frist, keine
 * Sonderregel, die man erklären müsste.
 *
 * DREI ZUSAGEN, DIE ÜBER ALLEM STEHEN UND NIE EINGESCHRÄNKT WERDEN
 *
 *   1. Der Export der eigenen Daten ist immer vollständig und kostenlos (§32).
 *      Daten gehören dem Nutzer, nicht dem Kontingent.
 *   2. Messen und Auswerten kostet nichts und läuft auf dem eigenen Gerät.
 *      Bezahlt wird für den Report, für Synchronisierung und für die Betreuung
 *      mehrerer Athleten — nicht für den Zugang zu den eigenen Werten.
 *
 *      Bis zur Entscheidung für den Pflicht-Login stand hier «funktioniert
 *      ohne Konto». Das stimmt nicht mehr, seit die App hinter einer
 *      Anmeldung liegt, und eine Zusage, die nicht mehr gilt, wird
 *      umgeschrieben statt stehen gelassen. Die Substanz bleibt: das Messen
 *      selbst ist kostenlos.
 *   3. Ein gekaufter Report verfällt nicht, und wer nur einen gekauft hat,
 *      behält seinen Bestand vollständig.
 */

// --- Report-Kontingente ------------------------------------------------------

export interface ReportBundle {
  id: 'single' | 'four' | 'ten'
  /** Enthaltene Reports. */
  reports: number
  /** Gesamtpreis in Euro. */
  priceEur: number
  name: { de: string; en: string }
}

export const REPORT_BUNDLES: ReportBundle[] = [
  { id: 'single', reports: 1, priceEur: 29.9, name: { de: 'Einzelreport', en: 'Single report' } },
  { id: 'four', reports: 4, priceEur: 89, name: { de: 'Vier Reports', en: 'Four reports' } },
  { id: 'ten', reports: 10, priceEur: 179, name: { de: 'Zehn Reports', en: 'Ten reports' } },
]

/** Preis je Report in einem Kontingent. Grundlage der Ersparnisangabe. */
export function pricePerReportEur(bundle: ReportBundle): number {
  return bundle.priceEur / bundle.reports
}

/**
 * Ersparnis gegenüber dem Einzelkauf, in Prozent. Null beim Einzelreport
 * selbst — er ist der Bezugspunkt und kann sich nicht mit sich vergleichen.
 */
export function savingPercent(bundle: ReportBundle): number {
  const single = REPORT_BUNDLES[0].priceEur
  if (bundle.reports === 1) return 0
  return Math.round((1 - pricePerReportEur(bundle) / single) * 100)
}

// --- Trainerstufen -----------------------------------------------------------

export interface CoachTier {
  id: 'coach_s' | 'coach_m' | 'coach_l'
  monthlyEur: number
  /** Enthaltene Athletenplätze. */
  athletes: number
  name: { de: string; en: string }
}

/**
 * Degressiv gestaffelt: der Preis je Platz sinkt sichtbar mit der Grösse.
 * Ein Platz kostet den Trainer weniger als der Selbstzahler für dieselbe
 * Menge Reports zahlen würde — das ist der Anreiz, Athleten in die Betreuung
 * zu nehmen, statt sie einzeln kaufen zu lassen.
 */
export const COACH_TIERS: CoachTier[] = [
  { id: 'coach_s', monthlyEur: 39, athletes: 8, name: { de: 'Coach S', en: 'Coach S' } },
  { id: 'coach_m', monthlyEur: 79, athletes: 20, name: { de: 'Coach M', en: 'Coach M' } },
  { id: 'coach_l', monthlyEur: 149, athletes: 50, name: { de: 'Coach L', en: 'Coach L' } },
]

/** Preis je Athletenplatz und Monat. */
export function perAthleteEur(tier: CoachTier): number {
  return tier.monthlyEur / tier.athletes
}

/**
 * Die kleinste Stufe, die diese Zahl Athleten trägt. `null` heisst: mehr, als
 * die Stufen abdecken — dann führt der Weg zur Anfrage, nicht zu einem
 * hochgerechneten Preis, den niemand zugesagt hat.
 */
export function coachTierFor(athletes: number): CoachTier | null {
  return COACH_TIERS.find((tier) => athletes <= tier.athletes) ?? null
}

/**
 * Athleten in einer Trainerliste brauchen KEIN eigenes Kontingent: ihre
 * Reports sind im Platz enthalten. Sonst zahlte dieselbe Person zweimal.
 */
export const COACH_INCLUDES_ATHLETE_REPORTS = true

// --- Vereine und Einrichtungen ----------------------------------------------

/**
 * Zwei Wege, beide auf Anfrage.
 *
 * Der Unterschied ist nicht die Grösse, sondern ob mit der Diagnostik Geld
 * verdient wird. Ein Landesstützpunkt mit 300 Athleten und ehrenamtlichen
 * Trainern ist etwas anderes als ein Studio mit 40 Kunden, das
 * Leistungsdiagnostik als Dienstleistung verkauft.
 *
 * DIE EINSTUFUNG NIMMT DIE APP NICHT VOR. Sie nennt die Merkmale, die
 * Anfragende selbst zuordnen; geprüft wird im Gespräch anhand von Unterlagen
 * (Vereinsregister, Freistellungsbescheid). Eine Software, die aufgrund
 * eingetippter Angaben entscheidet, wer gemeinnützig ist, würde eine
 * Rechtsfrage zu einer Formularfrage machen.
 */
export type InstitutionTrack = 'nonprofit' | 'commercial'

export interface InstitutionProfile {
  track: InstitutionTrack
  name: { de: string; en: string }
  /** Woran man erkennt, dass dieser Weg der richtige ist. */
  criteria: { de: string; en: string }[]
}

export const INSTITUTION_PROFILES: InstitutionProfile[] = [
  {
    track: 'nonprofit',
    name: { de: 'Verein und Verband', en: 'Club and federation' },
    criteria: [
      {
        de: 'Eingetragener Verein oder Verband, als gemeinnützig anerkannt.',
        en: 'Registered club or federation, recognised as non-profit.',
      },
      {
        de: 'Die Betreuung liegt überwiegend bei ehrenamtlichen oder nebenberuflichen Trainern.',
        en: 'Coaching is mostly done by volunteer or part-time coaches.',
      },
      {
        de: 'Die Diagnostik wird nicht als eigene Leistung verkauft — sie gehört zum Training.',
        en: 'Diagnostics is not sold as a service of its own — it belongs to training.',
      },
    ],
  },
  {
    track: 'commercial',
    name: { de: 'Gewerbliche Nutzung', en: 'Commercial use' },
    criteria: [
      {
        de: 'Studio, Leistungszentrum, Praxis oder Agentur mit hauptamtlichem Personal.',
        en: 'Studio, performance centre, practice or agency with full-time staff.',
      },
      {
        de: 'Leistungsdiagnostik wird Kunden gegen Entgelt angeboten.',
        en: 'Performance diagnostics is offered to clients for a fee.',
      },
      {
        de: 'Der Report geht mit eigenem Logo an zahlende Kunden.',
        en: 'The report goes to paying clients under your own branding.',
      },
    ],
  },
]

/**
 * Angaben, aus denen die Anfrage besteht. Bewusst wenige und bewusst keine
 * personenbezogenen über Athleten (§50): für ein Preisgespräch genügt, wer
 * fragt, wie viele Plätze gebraucht werden und welcher Weg gemeint ist.
 */
export interface EnquiryDraft {
  track: InstitutionTrack
  organisation: string
  athletes: number | null
  coaches: number | null
  note: string
}

export const ENQUIRY_EMAIL = 'preise@baseline.app'

/**
 * Aus den Angaben einen Text bauen, den der Anfragende selbst verschickt.
 *
 * Kein Versand aus der App heraus: es gibt keinen Server, an den sie senden
 * könnte, und ein Formular, das nur so tut, als ginge etwas raus, wäre die
 * schlimmere Lösung. Der Text wird kopiert oder in die eigene Mail eingefügt —
 * damit sieht der Absender vorher, was er über sich preisgibt.
 */
export function buildEnquiryText(draft: EnquiryDraft, locale: 'de' | 'en'): string {
  const profile = INSTITUTION_PROFILES.find((p) => p.track === draft.track)!
  const lines =
    locale === 'de'
      ? [
          'Preisanfrage BASELINE',
          '',
          `Art der Nutzung: ${profile.name.de}`,
          `Organisation: ${draft.organisation || '—'}`,
          `Athleten: ${draft.athletes ?? '—'}`,
          `Trainer: ${draft.coaches ?? '—'}`,
          '',
          draft.note || '',
        ]
      : [
          'BASELINE pricing enquiry',
          '',
          `Type of use: ${profile.name.en}`,
          `Organisation: ${draft.organisation || '—'}`,
          `Athletes: ${draft.athletes ?? '—'}`,
          `Coaches: ${draft.coaches ?? '—'}`,
          '',
          draft.note || '',
        ]
  return lines.join('\n').trim()
}
