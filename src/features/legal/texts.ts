import type { AppLocale } from '@/types/domain'

/**
 * Die Rechtstexte.
 *
 * SIE BESCHREIBEN, WAS DER CODE TUT — nicht, was üblich ist. Jeder Satz über
 * eine Datenverarbeitung hier hat eine Entsprechung im Code, und wenn sich
 * der Code ändert, ist dieser Text Teil der Änderung. Ein Mustertext aus dem
 * Netz wäre in zwei Wochen falsch, ohne dass es jemand merkt.
 *
 * WAS SIE NICHT SIND: eine Rechtsberatung. Sie sind nach bestem Wissen aus
 * dem tatsächlichen Verhalten der App geschrieben und gehören vor dem
 * öffentlichen Betrieb einmal anwaltlich geprüft — besonders die Abschnitte
 * zu Rechtsgrundlagen, Aufbewahrung und Drittlandübermittlung.
 *
 * Sie liegen in einem eigenen Baustein und nicht in den Sprachdateien: dort
 * lägen sie im Startpaket und würden von jedem Aufruf mitbezahlt, obwohl sie
 * selten gelesen werden.
 */

export interface LegalSection {
  heading: string
  /** Absätze. Leere Einträge werden nicht gerendert. */
  body: string[]
  /** Aufzählung unter den Absätzen. */
  list?: string[]
}

export interface LegalDocument {
  title: string
  intro: string
  updated: string
  sections: LegalSection[]
}

const STAND_DE = 'Stand: 6. September 2026'
const STAND_EN = 'Last updated: 6 September 2026'

// --- Datenschutz -------------------------------------------------------------

const privacyDe: LegalDocument = {
  title: 'Datenschutzerklärung',
  intro:
    'BASELINE ist so gebaut, dass möglichst wenig über dich anfällt. Diese Erklärung beschreibt, was tatsächlich passiert — nicht, was rechtlich gerade noch zulässig wäre.',
  updated: STAND_DE,
  sections: [
    {
      heading: 'Das Wichtigste zuerst',
      body: [
        'Messen und Auswerten passiert vollständig in deinem Browser. Solange du die Synchronisierung nicht einschaltest, verlässt kein Messwert dein Gerät.',
        'Ein Konto brauchst du, um die App zu benutzen. Dafür verarbeiten wir deine E-Mail-Adresse und dein Passwort — mehr nicht.',
        'Es gibt keine Werbung, kein Tracking, keine Analysedienste, keine Weitergabe an Dritte zu Werbezwecken und keine externen Schriften oder Skripte.',
      ],
    },
    {
      heading: 'Was auf deinem Gerät liegt',
      body: [
        'Deine Messwerte, dein Profil, Notizen, Trainingsschwerpunkte und Belegbilder speichert die App im lokalen Speicher deines Browsers (localStorage und IndexedDB). Diese Daten gehören dir und werden von uns nicht eingesehen.',
        'Löschst du die Browserdaten, sind sie weg. Deshalb erinnert die App an den Export — er ist deine einzige Sicherung, solange du die Synchronisierung nicht nutzt.',
      ],
    },
    {
      heading: 'Konto und Anmeldung',
      body: [
        'Für die Anmeldung verarbeiten wir deine E-Mail-Adresse, einen kryptografischen Hash deines Passworts sowie Zeitpunkt der Registrierung und der letzten Anmeldung. Dein Passwort im Klartext wird weder gespeichert noch an uns übertragen; es geht verschlüsselt an den Anmeldedienst und wird dort als Hash abgelegt.',
        'Zusätzlich speichern wir zu deinem Konto einen Anzeigenamen, deine Rolle (Athlet oder Trainer) und, falls gewählt, die Preisstufe.',
        'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO — die Bereitstellung der Anwendung, die du angefordert hast.',
      ],
    },
    {
      heading: 'Synchronisierung (freiwillig)',
      body: [
        'Die Synchronisierung ist ausgeschaltet, bis du sie im Profil einschaltest. Schaltest du sie ein, übertragen wir je Athlet den vollständigen Datensatz als verschlüsselte Verbindung an unseren Dienstleister: Messwerte, Profilangaben, Körperwerte, Notizen, Trainingsschwerpunkte und gegebenenfalls Belegbilder.',
        'Zweck ist ausschliesslich, dass diese Daten einen Geräteverlust überstehen und auf einem zweiten Gerät erscheinen. Sie werden nicht ausgewertet, nicht aggregiert und nicht mit Daten anderer Nutzer zusammengeführt.',
        'Der Zugriff ist auf dein Konto beschränkt; das setzen Zugriffsregeln in der Datenbank durch (Row Level Security), nicht nur die App.',
        'Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO — deine Einwilligung, die du jederzeit widerrufen kannst, indem du die Synchronisierung wieder ausschaltest.',
      ],
    },
    {
      heading: 'Wenn du Athleten betreust',
      body: [
        'Trägst du als Trainer Daten anderer Personen ein, bist du für diese Daten verantwortlich. Du brauchst dafür eine eigene Rechtsgrundlage — in der Regel die Einwilligung der betreffenden Person, bei Minderjährigen die der Erziehungsberechtigten.',
        'BASELINE speichert zu betreuten Athleten nur, was du einträgst. Es gibt für sie kein eigenes Konto, keine Einladung und keine E-Mail-Adresse.',
      ],
    },
    {
      heading: 'Empfänger',
      body: [
        'Wir setzen zwei Auftragsverarbeiter ein. Mit beiden bestehen Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO.',
      ],
    },
    {
      heading: 'Aufbewahrung',
      body: [
        'Daten auf deinem Gerät bleiben, bis du sie löschst.',
        'Kontodaten bleiben, bis du das Konto löschen lässt. Synchronisierte Datensätze werden mit dem Konto gelöscht.',
        'Serverseitige Zugriffsprotokolle unseres Hosters werden nach dessen Vorgaben kurzfristig gelöscht.',
      ],
    },
    {
      heading: 'Deine Rechte',
      body: [
        'Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Ausserdem kannst du dich bei einer Aufsichtsbehörde beschweren.',
        'Die Datenübertragbarkeit löst die App unmittelbar ein: der vollständige Export im Profil ist kostenlos, in jeder Stufe verfügbar und maschinenlesbar. Er steht nie hinter einer Bezahlschranke.',
        'Für Auskunft und Löschung genügt eine Nachricht an die im Impressum genannte Adresse.',
      ],
    },
    {
      heading: 'Was die App nicht tut',
      body: [
        'Keine Cookies zu Werbe- oder Analysezwecken. Die App setzt überhaupt keine Cookies; der Anmeldezustand liegt im lokalen Speicher.',
        'Keine Reichweitenmessung, kein Fingerprinting, keine Profilbildung, keine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO.',
        'Keine Übermittlung an Werbenetzwerke, keine eingebetteten Inhalte Dritter, keine externen Schriftarten.',
      ],
    },
    {
      heading: 'Keine medizinische Datenverarbeitung',
      body: [
        'BASELINE ist kein Medizinprodukt und erhebt keine Gesundheitsdaten zu diagnostischen Zwecken. Die erfassten Werte sind sportliche Leistungsdaten. Trägst du freiwillig Angaben ein, die Rückschlüsse auf deine Gesundheit zulassen, behandeln wir sie mit derselben Sorgfalt wie alle übrigen Daten — die App leitet daraus jedoch keine gesundheitlichen Aussagen ab.',
      ],
    },
  ],
}

const privacyEn: LegalDocument = {
  title: 'Privacy policy',
  intro:
    'BASELINE is built so that as little as possible about you is processed. This policy describes what actually happens — not what would still be legally permissible.',
  updated: STAND_EN,
  sections: [
    {
      heading: 'The essentials first',
      body: [
        'Measuring and analysis happen entirely in your browser. As long as you do not turn on sync, no measurement leaves your device.',
        'You need an account to use the app. For that we process your email address and your password — nothing else.',
        'There is no advertising, no tracking, no analytics, no sharing with third parties for advertising, and no external fonts or scripts.',
      ],
    },
    {
      heading: 'What stays on your device',
      body: [
        'Your measurements, profile, notes, training focuses and evidence photos are stored in your browser (localStorage and IndexedDB). This data is yours and is not read by us.',
        'If you clear your browser data, it is gone. That is why the app reminds you to export — it is your only backup as long as you do not use sync.',
      ],
    },
    {
      heading: 'Account and sign-in',
      body: [
        'For sign-in we process your email address, a cryptographic hash of your password, and the times of registration and last sign-in. Your plaintext password is neither stored nor transmitted to us; it is sent encrypted to the sign-in service and stored there as a hash.',
        'We also store a display name, your role (athlete or coach) and, if chosen, the pricing tier.',
        'The legal basis is Art. 6(1)(b) GDPR — providing the service you requested.',
      ],
    },
    {
      heading: 'Sync (optional)',
      body: [
        'Sync is off until you turn it on in your profile. If you do, we transmit the complete record per athlete over an encrypted connection to our processor: measurements, profile details, body values, notes, training focuses and any evidence photos.',
        'The sole purpose is that this data survives a lost device and appears on a second one. It is not analysed, not aggregated and not combined with other users’ data.',
        'Access is limited to your account, enforced by database access rules (row level security), not only by the app.',
        'The legal basis is Art. 6(1)(a) GDPR — your consent, which you can withdraw at any time by turning sync off again.',
      ],
    },
    {
      heading: 'If you coach athletes',
      body: [
        'If you enter other people’s data as a coach, you are the controller for that data. You need your own legal basis — usually the consent of the person concerned, or of a guardian for minors.',
        'BASELINE stores only what you enter about coached athletes. They have no account of their own, no invitation and no email address.',
      ],
    },
    { heading: 'Recipients', body: ['We use two processors. Data processing agreements under Art. 28 GDPR are in place with both.'] },
    {
      heading: 'Retention',
      body: [
        'Data on your device stays until you delete it.',
        'Account data stays until you have the account deleted. Synced records are deleted with the account.',
        'Server-side access logs of our host are deleted shortly, per their policy.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'You have the right to access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), data portability (Art. 20) and objection (Art. 21). You may also complain to a supervisory authority.',
        'The app fulfils portability directly: the complete export in your profile is free, available in every tier and machine-readable. It is never behind a paywall.',
        'For access and erasure a message to the address in the imprint is enough.',
      ],
    },
    {
      heading: 'What the app does not do',
      body: [
        'No cookies for advertising or analytics. The app sets no cookies at all; the sign-in state lives in local storage.',
        'No reach measurement, no fingerprinting, no profiling, no automated decision-making within the meaning of Art. 22 GDPR.',
        'No transmission to ad networks, no embedded third-party content, no external fonts.',
      ],
    },
    {
      heading: 'No medical data processing',
      body: [
        'BASELINE is not a medical device and does not collect health data for diagnostic purposes. The values recorded are sports performance data. If you voluntarily enter details that allow conclusions about your health, we treat them with the same care as all other data — but the app derives no health statements from them.',
      ],
    },
  ],
}

// --- Nutzungsbedingungen -----------------------------------------------------

const termsDe: LegalDocument = {
  title: 'Nutzungsbedingungen',
  intro: 'Was du von BASELINE erwarten kannst und was BASELINE von dir erwartet.',
  updated: STAND_DE,
  sections: [
    {
      heading: 'Was BASELINE ist',
      body: [
        'BASELINE ist ein Werkzeug zur sportlichen Leistungsdiagnostik. Es erfasst Messwerte, ordnet sie — soweit belegte Referenzwerte vorliegen — in Vergleichsgruppen ein und stellt ihre Entwicklung dar.',
      ],
    },
    {
      heading: 'Was BASELINE ausdrücklich nicht ist',
      body: [
        'Keine medizinische Diagnostik. BASELINE stellt keine Diagnosen, gibt keine Therapieempfehlungen und bewertet keine Krankheiten.',
        'Keine trainingsplanerische Beratung. Die App erzeugt keine Trainingspläne, Übungen oder Belastungsvorgaben.',
        'Bei Beschwerden, Schmerzen oder gesundheitlichen Fragen wende dich an eine Ärztin oder einen Arzt.',
      ],
    },
    {
      heading: 'Sporttreiben auf eigenes Risiko',
      body: [
        'Leistungstests sind körperlich fordernd. Du entscheidest selbst, ob du einen Test durchführst, und trägst dafür die Verantwortung. Kläre im Zweifel vorher ab, ob dein Gesundheitszustand die Belastung zulässt.',
      ],
    },
    {
      heading: 'Deine Daten',
      body: [
        'Deine Messwerte gehören dir. Der vollständige Export ist kostenlos und steht in jeder Stufe zur Verfügung — auch dann, wenn du nichts bezahlst.',
        'Du bist dafür verantwortlich, dass du Daten anderer Personen nur mit deren Einwilligung einträgst.',
      ],
    },
    {
      heading: 'Genauigkeit',
      body: [
        'Die Einordnung beruht auf publizierten Referenzstichproben. Wo keine belegte Referenz vorliegt, sagt die App das und ordnet nicht ein — sie erfindet keine Vergleichswerte.',
        'Die Referenzwerte stammen aus Stichproben, deren Zusammensetzung von dir abweichen kann. Eine Einordnung ist eine Näherung, kein Urteil.',
      ],
    },
    {
      heading: 'Verfügbarkeit und Bezahlung',
      body: [
        'Die App funktioniert offline auf deinem Gerät. Für die Synchronisierung braucht es eine Verbindung; eine ununterbrochene Verfügbarkeit des Dienstes wird nicht zugesichert.',
        'Zurzeit ist keine Zahlungsabwicklung eingerichtet. Preise sind als Auskunft angegeben und stellen kein Angebot dar.',
      ],
    },
    {
      heading: 'Haftung',
      body: [
        'Für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie bei Vorsatz und grober Fahrlässigkeit wird nach den gesetzlichen Vorschriften gehaftet. Im Übrigen ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt.',
      ],
    },
    {
      heading: 'Änderungen',
      body: [
        'Diese Bedingungen können sich ändern. Wesentliche Änderungen werden in der App angekündigt.',
      ],
    },
  ],
}

const termsEn: LegalDocument = {
  title: 'Terms of use',
  intro: 'What you can expect from BASELINE, and what BASELINE expects from you.',
  updated: STAND_EN,
  sections: [
    {
      heading: 'What BASELINE is',
      body: [
        'BASELINE is a tool for sports performance diagnostics. It records measurements, classifies them against comparison groups where documented reference values exist, and shows their development.',
      ],
    },
    {
      heading: 'What BASELINE explicitly is not',
      body: [
        'Not medical diagnostics. BASELINE makes no diagnoses, gives no therapy recommendations and assesses no illnesses.',
        'Not training advice. The app produces no training plans, exercises or load prescriptions.',
        'If you have complaints, pain or health questions, consult a doctor.',
      ],
    },
    {
      heading: 'Training at your own risk',
      body: [
        'Performance tests are physically demanding. You decide whether to perform a test and are responsible for that decision. When in doubt, check beforehand whether your health permits the load.',
      ],
    },
    {
      heading: 'Your data',
      body: [
        'Your measurements are yours. The complete export is free and available in every tier — including when you pay nothing.',
        'You are responsible for entering other people’s data only with their consent.',
      ],
    },
    {
      heading: 'Accuracy',
      body: [
        'Classification is based on published reference samples. Where no documented reference exists, the app says so and does not classify — it invents no comparison values.',
        'Reference values come from samples whose composition may differ from you. A classification is an approximation, not a verdict.',
      ],
    },
    {
      heading: 'Availability and payment',
      body: [
        'The app works offline on your device. Sync needs a connection; uninterrupted availability of the service is not guaranteed.',
        'No payment processing is set up at present. Prices are stated for information and do not constitute an offer.',
      ],
    },
    {
      heading: 'Liability',
      body: [
        'Liability for damage to life, body or health, and in cases of intent and gross negligence, follows statutory provisions. Otherwise liability is limited to foreseeable damage typical for this kind of contract.',
      ],
    },
    { heading: 'Changes', body: ['These terms may change. Material changes will be announced in the app.'] },
  ],
}

export function privacyDocument(locale: AppLocale): LegalDocument {
  // Nur Deutsch und Englisch — die übrigen Sprachen lesen Englisch (siehe locales.ts).
  return locale === 'de' ? privacyDe : privacyEn
}

export function termsDocument(locale: AppLocale): LegalDocument {
  return locale === 'de' ? termsDe : termsEn
}
