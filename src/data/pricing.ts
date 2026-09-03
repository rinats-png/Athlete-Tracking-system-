/**
 * Die Preisstufen.
 *
 * Hier stehen nur die Zahlen und was in einer Stufe enthalten ist. Es wird
 * nichts abgerechnet: es gibt keine Zahlungsabwicklung, keinen Anbieter und
 * keinen Vertrag. Solange das so ist, sagt der Bildschirm es auch — eine
 * Preisliste, die nach einem Kauf aussieht, ohne einen zu ermöglichen, wäre
 * eine Täuschung.
 *
 * Zwei Zusagen gelten über allen Stufen und dürfen nie eingeschränkt werden:
 *
 *   1. Der Export der eigenen Daten ist in jeder Stufe vollständig und
 *      kostenlos (§32). Daten gehören dem Nutzer, nicht dem Abo.
 *   2. Messen und Auswerten auf dem eigenen Gerät funktioniert ohne Konto.
 *      Bezahlt wird für Synchronisierung, Betreuung mehrerer Athleten und
 *      Berichte — nicht für den Zugang zu den eigenen Werten.
 */

export type PlanId = 'free' | 'solo' | 'coach' | 'club'

export interface Plan {
  id: PlanId
  /** Monatspreis in Euro. `null` bei der Vereinsstufe: sie wird vereinbart. */
  monthlyEur: number | null
  /** Enthaltene Athleten. `null` = unbegrenzt beziehungsweise vereinbart. */
  includedAthletes: number | null
  /** Preis je weiterem Athleten und Monat. */
  extraAthleteEur: number | null
  name: { de: string; en: string }
  /** Was diese Stufe leistet. Jede Zeile eine Zusage, keine Werbung. */
  features: { de: string; en: string }[]
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    monthlyEur: 0,
    includedAthletes: 1,
    extraAthleteEur: null,
    name: { de: 'Ohne Konto', en: 'No account' },
    features: [
      {
        de: 'Alle Tests, alle Referenzwerte, die vollständige Auswertung — auf diesem Gerät.',
        en: 'All tests, all reference values, the full analysis — on this device.',
      },
      {
        de: 'Export deiner Daten, jederzeit und vollständig.',
        en: 'Export of your data, any time and complete.',
      },
      {
        de: 'Keine Synchronisierung zwischen Geräten; geht das Gerät verloren, hilft nur der Export.',
        en: 'No sync between devices; if the device is lost, only the export helps.',
      },
    ],
  },
  {
    id: 'solo',
    monthlyEur: 9.9,
    includedAthletes: 1,
    extraAthleteEur: null,
    name: { de: 'Einzelnutzer', en: 'Individual' },
    features: [
      {
        de: 'Deine Werte auf allen Geräten, gesichert ausserhalb des Telefons.',
        en: 'Your values on every device, backed up beyond the phone.',
      },
      { de: 'Bericht als PDF zu jedem Termin.', en: 'PDF report for every session.' },
      { de: 'Verlauf ohne Begrenzung.', en: 'History without a limit.' },
    ],
  },
  {
    id: 'coach',
    monthlyEur: 99.9,
    includedAthletes: 10,
    extraAthleteEur: 4.99,
    name: { de: 'Trainer', en: 'Coach' },
    features: [
      {
        de: 'Bis zu 10 betreute Athleten, jeder weitere 4,99 € im Monat.',
        en: 'Up to 10 athletes, each further one 4.99 € per month.',
      },
      {
        de: 'Übersicht über alle Betreuten, Termine planen, Berichte je Athlet.',
        en: 'Overview of everyone you coach, plan sessions, reports per athlete.',
      },
      {
        de: 'Jeder Athlet behält seinen eigenen Export.',
        en: 'Every athlete keeps their own export.',
      },
    ],
  },
  {
    id: 'club',
    monthlyEur: null,
    includedAthletes: null,
    extraAthleteEur: null,
    name: { de: 'Verein', en: 'Club' },
    features: [
      {
        de: 'Mehrere Trainer, gemeinsame Athletenliste, Vereinsbericht.',
        en: 'Several coaches, a shared athlete list, a club report.',
      },
      {
        de: 'Preis nach Grösse des Vereins — im Gespräch vereinbart.',
        en: 'Price by club size — agreed in conversation.',
      },
    ],
  },
]

export const PLAN_BY_ID = new Map(PLANS.map((plan) => [plan.id, plan]))

/** Monatspreis der Trainerstufe für eine Anzahl Athleten. */
export function coachMonthlyEur(athletes: number): number {
  const plan = PLAN_BY_ID.get('coach')!
  const included = plan.includedAthletes ?? 0
  const extra = Math.max(0, athletes - included)
  return (plan.monthlyEur ?? 0) + extra * (plan.extraAthleteEur ?? 0)
}
