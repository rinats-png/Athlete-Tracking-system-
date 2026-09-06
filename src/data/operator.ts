/**
 * Wer diese App betreibt.
 *
 * WARUM DIESE DATEI LEER AUSGELIEFERT WIRD
 *
 * Ein Impressum mit erfundenen Angaben wäre schlimmer als keines: es sähe
 * vollständig aus und wäre falsch. Diese Felder stehen deshalb leer, und die
 * Rechtsseiten sagen an jeder leeren Stelle deutlich, dass sie fehlt — sowohl
 * dem Betreiber, der sie ausfüllen muss, als auch dem Nutzer, der weiss, dass
 * er es mit einem unfertigen Angebot zu tun hat.
 *
 * VOR DEM ÖFFENTLICHEN BETRIEB IN DEUTSCHLAND, ÖSTERREICH ODER DER SCHWEIZ
 * müssen mindestens Name, Anschrift und eine E-Mail-Adresse hier stehen
 * (§ 5 DDG in Deutschland, § 5 ECG in Österreich). Ohne sie ist der Betrieb
 * abmahnfähig. Die Prüfung `tests/legal.spec.ts` hält fest, dass die Seiten
 * das Fehlen benennen — sie kann es nicht ersetzen.
 */

export interface Operator {
  /** Name oder Firma des Betreibers. */
  name: string
  /** Strasse und Hausnummer. */
  street: string
  /** Postleitzahl und Ort. */
  city: string
  country: string
  email: string
  /** Freiwillig, aber für Rückfragen üblich. */
  phone: string
  /** Vertretungsberechtigte Person bei einer Gesellschaft. */
  represented: string
  /** Registergericht und Nummer, sofern eingetragen. */
  register: string
  /** Umsatzsteuer-Identifikationsnummer, sofern vorhanden. */
  vatId: string
  /** Verantwortliche Stelle im Sinne der DSGVO, falls abweichend. */
  dataContact: string
}

export const OPERATOR: Operator = {
  name: '',
  street: '',
  city: '',
  country: '',
  email: '',
  phone: '',
  represented: '',
  register: '',
  vatId: '',
  dataContact: '',
}

/** Pflichtangaben, ohne die das Impressum unvollständig ist. */
export const REQUIRED_OPERATOR_FIELDS = ['name', 'street', 'city', 'email'] as const

export function missingOperatorFields(operator: Operator = OPERATOR): string[] {
  return REQUIRED_OPERATOR_FIELDS.filter((field) => operator[field].trim() === '')
}

export function operatorIsComplete(operator: Operator = OPERATOR): boolean {
  return missingOperatorFields(operator).length === 0
}

/**
 * Die Dienste, an die Daten gehen. Sie stehen hier und nicht im Fliesstext
 * der Datenschutzerklärung: eine Liste, die man ändern muss, wenn sich etwas
 * ändert, ist besser als ein Satz, den man dabei übersieht.
 */
export interface Processor {
  name: string
  purpose: { de: string; en: string }
  location: { de: string; en: string }
  privacyUrl: string
}

export const PROCESSORS: Processor[] = [
  {
    name: 'Supabase',
    purpose: {
      de: 'Anmeldung und, sofern eingeschaltet, die Zweitschrift deiner Messwerte.',
      en: 'Sign-in and, if enabled, the second copy of your measurements.',
    },
    location: { de: 'Rechenzentrum Frankfurt am Main (eu-central-1)', en: 'Frankfurt data centre (eu-central-1)' },
    privacyUrl: 'https://supabase.com/privacy',
  },
  {
    name: 'Netlify',
    purpose: {
      de: 'Auslieferung der Anwendung. Dabei fallen technische Zugriffsdaten an, darunter die IP-Adresse.',
      en: 'Delivery of the application. Technical access data including the IP address is processed.',
    },
    location: { de: 'Vereinigte Staaten, mit Standardvertragsklauseln', en: 'United States, under standard contractual clauses' },
    privacyUrl: 'https://www.netlify.com/privacy/',
  },
]
