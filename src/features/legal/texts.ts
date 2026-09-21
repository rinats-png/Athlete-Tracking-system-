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

const STAND_DE = 'Stand: 21. September 2026'
const STAND_EN = 'Last updated: 21 September 2026'

// --- Datenschutz -------------------------------------------------------------

const privacyDe: LegalDocument = {
  title: 'Datenschutzerklärung',
  intro:
    'KYDON ist so gebaut, dass möglichst wenig über dich anfällt. Diese Erklärung beschreibt, was tatsächlich passiert — nicht, was rechtlich gerade noch zulässig wäre.',
  updated: STAND_DE,
  sections: [
    {
      heading: 'Das Wichtigste zuerst',
      body: [
        'Messen und Auswerten passiert vollständig in deinem Browser. Solange du die Synchronisierung nicht einschaltest, verlässt kein Messwert dein Gerät.',
        'Ein Konto brauchst du, um die App zu benutzen. Dafür verarbeiten wir deine E-Mail-Adresse und dein Passwort — mehr nicht.',
        'Es gibt keine Werbung, kein Tracking, keine Analysedienste, keine Weitergabe an Dritte zu Werbezwecken und keine externen Schriften oder Skripte. Der einzige externe Dienst, den die App aufruft, ist die Lebensmittelsuche bei Open Food Facts — und nur, wenn du sie antippst (siehe unten).',
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
        'KYDON verarbeitet diese Daten in deinem Auftrag. Dafür gilt der Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO, den du in deinem Trainerkonto annimmst; er ist unter /auftragsverarbeitung einsehbar.',
        'KYDON speichert zu betreuten Athleten nur, was du einträgst. Es gibt für sie kein eigenes Konto, keine Einladung und keine E-Mail-Adresse.',
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
      heading: 'Lebensmittelsuche (auf Tipp)',
      body: [
        'In der Ernährung kannst du Lebensmittel bei Open Food Facts suchen — einer offenen Datenbank des Vereins Open Food Facts (Frankreich). Das passiert nur, wenn du «Online suchen» antippst oder einen Barcode eingibst, nie beim Tippen und nie im Hintergrund. Dabei erhält Open Food Facts deinen Suchbegriff oder Barcode, deine IP-Adresse und die Kennung der App. Es werden keine Messwerte, kein Name und keine Mahlzeiten übertragen.',
        'Open Food Facts ist dafür eigener Verantwortlicher; seine Datenschutzhinweise findest du unter openfoodfacts.org. Rechtsgrundlage ist deine Einwilligung durch den Tipp (Art. 6 Abs. 1 lit. a DSGVO). Übernommene Nährwerte werden in deiner Mahlzeit gespeichert und tragen die Herkunft; die Daten stehen unter der Open Database License (ODbL).',
      ],
    },
    {
      heading: 'Zahlungen',
      body: [
        'Bezahlte Stufen werden über Stripe Payments Europe, Ltd. (Dublin, Irland) abgewickelt. Beim Kauf verlässt du die App und gibst Zahlungsdaten auf einer Seite von Stripe ein; KYDON sieht weder Kartennummer noch Kontodaten. Stripe erhält von uns deine E-Mail-Adresse und eine Kontokennung, damit die Zahlung deinem Konto zugeordnet werden kann.',
        'Wir speichern, welche Stufe freigeschaltet ist, seit wann, bis wann und die Kundennummer bei Stripe — nicht mehr. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag); für Rechnungsdaten gelten die gesetzlichen Aufbewahrungsfristen. Stripe ist eigener Verantwortlicher für die Zahlungsabwicklung; seine Datenschutzhinweise findest du unter stripe.com/privacy.',
      ],
    },
    {
      heading: 'Keine medizinische Datenverarbeitung',
      body: [
        'KYDON ist kein Medizinprodukt. Die App stellt keine Diagnosen, bewertet keine Krankheiten und leitet aus keinem Wert eine gesundheitliche Aussage ab. Die erfassten Werte sind sportliche Leistungsdaten und werden zu keinem medizinischen Zweck verarbeitet.',
        'Einzelne Angaben können dennoch Gesundheitsdaten im Sinne von Art. 9 DSGVO sein oder werden — etwa die Herzratenvariabilität, die Körperzusammensetzung oder ein Verlauf von Schlaf, Stress und Muskelkater über längere Zeit. Solche Angaben trägst du freiwillig ein; sie bleiben auf deinem Gerät und verlassen es nur, wenn du die Synchronisierung einschaltest. Diese Verarbeitung beruht auf deiner Einwilligung (Art. 6 Abs. 1 lit. a und Art. 9 Abs. 2 lit. a DSGVO), die du jederzeit widerrufst, indem du die Angaben löschst oder die Synchronisierung ausschaltest.',
        'Laborwerte nimmt die App derzeit nicht entgegen. Die Erfassung der Kreatinkinase ist ausgesetzt, bis eine ausdrückliche Einwilligung je Datenkategorie eingeführt ist; bereits eingetragene Werte bleiben für dich sichtbar und im Export enthalten. Die Selbsteinschätzung vor einem Testtermin und die Hinweise im Cockpit sind Statistik über deine eigenen Trainingsdaten, keine Aussage über deinen Gesundheitszustand.',
      ],
    },
  ],
}

const privacyEn: LegalDocument = {
  title: 'Privacy policy',
  intro:
    'KYDON is built so that as little as possible about you is processed. This policy describes what actually happens — not what would still be legally permissible.',
  updated: STAND_EN,
  sections: [
    {
      heading: 'The essentials first',
      body: [
        'Measuring and analysis happen entirely in your browser. As long as you do not turn on sync, no measurement leaves your device.',
        'You need an account to use the app. For that we process your email address and your password — nothing else.',
        'There is no advertising, no tracking, no analytics, no sharing with third parties for advertising, and no external fonts or scripts. The only external service the app calls is the food search at Open Food Facts — and only when you tap it (see below).',
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
        'KYDON processes this data on your behalf. The data processing agreement under Art. 28 GDPR, which you accept in your coach account, applies; it is available at /auftragsverarbeitung.',
        'KYDON stores only what you enter about coached athletes. They have no account of their own, no invitation and no email address.',
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
      heading: 'Food search (on tap)',
      body: [
        'In nutrition you can search foods at Open Food Facts — an open database run by the Open Food Facts association (France). This happens only when you tap “Search online” or enter a barcode, never while typing and never in the background. Open Food Facts then receives your search term or barcode, your IP address and the app identifier. No measurements, no name and no meals are transmitted.',
        'Open Food Facts is an independent controller for this; see openfoodfacts.org for its privacy notice. The legal basis is your consent by tapping (Art. 6(1)(a) GDPR). Adopted nutrition values are stored in your meal and carry their origin; the data is licensed under the Open Database License (ODbL).',
      ],
    },
    {
      heading: 'Payments',
      body: [
        'Paid plans are processed by Stripe Payments Europe, Ltd. (Dublin, Ireland). When you buy, you leave the app and enter payment details on a page served by Stripe; KYDON never sees card or account numbers. Stripe receives your e-mail address and an account identifier from us so the payment can be matched to your account.',
        'We store which plan is unlocked, since when, until when, and the Stripe customer number — nothing more. The legal basis is Art. 6(1)(b) GDPR (contract); invoice data is kept for the statutory retention period. Stripe is an independent controller for payment processing; see stripe.com/privacy.',
      ],
    },
    {
      heading: 'No medical data processing',
      body: [
        'KYDON is not a medical device. The app makes no diagnoses, assesses no illnesses and derives no health statement from any value. The values recorded are sports performance data and are not processed for any medical purpose.',
        'Some entries can nevertheless be, or become, health data within the meaning of Art. 9 GDPR — for example heart rate variability, body composition, or a long-term record of sleep, stress and soreness. You enter such details voluntarily; they stay on your device and only leave it if you switch on synchronisation. This processing is based on your consent (Art. 6(1)(a) and Art. 9(2)(a) GDPR), which you withdraw at any time by deleting the entries or switching synchronisation off.',
        'The app currently does not accept laboratory values. Entry of creatine kinase is suspended until explicit consent per data category has been introduced; values already entered remain visible to you and included in your export. The pre-test self-assessment and the cockpit signals are statistics about your own training data, not statements about your health.',
      ],
    },
  ],
}

// --- Nutzungsbedingungen -----------------------------------------------------

const termsDe: LegalDocument = {
  title: 'Nutzungsbedingungen',
  intro: 'Was du von KYDON erwarten kannst und was KYDON von dir erwartet.',
  updated: STAND_DE,
  sections: [
    {
      heading: 'Was KYDON ist',
      body: [
        'KYDON ist ein Werkzeug zur sportlichen Leistungsdiagnostik. Es erfasst Messwerte, ordnet sie — soweit belegte Referenzwerte vorliegen — in Vergleichsgruppen ein und stellt ihre Entwicklung dar.',
      ],
    },
    {
      heading: 'Was KYDON ausdrücklich nicht ist',
      body: [
        'Keine medizinische Diagnostik. KYDON stellt keine Diagnosen, gibt keine Therapieempfehlungen und bewertet keine Krankheiten.',
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
      heading: 'Bezahlte Stufen',
      body: [
        'Die kostenlose Version umfasst Messen, Verlauf, Messfehlerband, das eigene Profil, den vollständigen Export und Erinnerungen — dauerhaft. Bezahlte Stufen schalten zusätzliche Merkmale frei; die Preisseite nennt sie. Eine Stufe hält Merkmale zurück, nie Daten: Was du eingetragen hast, bleibt in deinem Bestand und im Export, auch nach Ablauf.',
        'Abos laufen ein Jahr oder einen Monat und verlängern sich um denselben Zeitraum, wenn sie nicht vor Ablauf gekündigt werden. Kündigen kannst du jederzeit im Kundenportal (Profil → Abo verwalten); die Stufe bleibt bis zum Ende des bezahlten Zeitraums. Der Termin-Pass ist ein Einmalkauf ohne Verlängerung.',
        'Verbraucher haben ein vierzehntägiges Widerrufsrecht. Verlangst du, dass die Stufe sofort freigeschaltet wird, und nutzt sie, schuldest du bei Widerruf den Wert der bis dahin erbrachten Leistung. Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer.',
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
  intro: 'What you can expect from KYDON, and what KYDON expects from you.',
  updated: STAND_EN,
  sections: [
    {
      heading: 'What KYDON is',
      body: [
        'KYDON is a tool for sports performance diagnostics. It records measurements, classifies them against comparison groups where documented reference values exist, and shows their development.',
      ],
    },
    {
      heading: 'What KYDON explicitly is not',
      body: [
        'Not medical diagnostics. KYDON makes no diagnoses, gives no therapy recommendations and assesses no illnesses.',
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
    {
      heading: 'Paid plans',
      body: [
        'The free version includes measuring, history, the error band, your own profile, the complete export and reminders — permanently. Paid plans unlock additional features, listed on the pricing page. A plan holds back features, never data: whatever you have entered stays in your data and in your export, also after a plan ends.',
        'Subscriptions run for one year or one month and renew for the same period unless cancelled before the end. You can cancel any time in the customer portal (Profile → Manage subscription); the plan remains until the end of the paid period. The Date pass is a one-off purchase without renewal.',
        'Consumers have a fourteen-day right of withdrawal. If you ask for the plan to be unlocked immediately and use it, you owe the value of the service provided up to the withdrawal. Prices include statutory VAT.',
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

// --- Auftragsverarbeitung (Art. 28 DSGVO) ------------------------------------
//
// WARUM ES DAS BRAUCHT: Ein Trainer, der Athleten in KYDON führt, ist
// Verantwortlicher für deren Daten; KYDON verarbeitet sie in seinem Auftrag
// (Anmeldung, Zweitschrift, Freigaben). Art. 28 Abs. 3 verlangt dafür einen
// Vertrag mit festem Mindestinhalt. Der Text folgt dem Aufbau der
// Standardvertragsklauseln der Kommission (Durchführungsbeschluss (EU)
// 2021/915) und beschreibt, was der Code tut — nicht, was üblich ist.
//
// DIE FASSUNG IST TEIL DES VERTRAGS: wer annimmt, nimmt eine Fassung an.
// Ändert sich der Text, ändert sich die Fassung, und der Trainer sieht, dass
// eine neue Annahme aussteht.

import { DPA_VERSION } from './dpaVersion'
export { DPA_VERSION }

const dpaDe: LegalDocument = {
  title: 'Vertrag zur Auftragsverarbeitung',
  intro:
    'Für Trainerkonten: Was KYDON mit den Daten deiner Athleten tut, wenn du sie in deinem Auftrag hier führst — nach Art. 28 DSGVO. Nimmst du den Vertrag in deinem Konto an, gilt er zwischen dir als Verantwortlichem und dem Betreiber als Auftragsverarbeiter.',
  updated: `Fassung ${DPA_VERSION}`,
  sections: [
    {
      heading: '1. Gegenstand und Dauer',
      body: [
        'Der Auftragsverarbeiter (Betreiber von KYDON, siehe Impressum) verarbeitet personenbezogene Daten von Athleten im Auftrag des Verantwortlichen (Inhaber des Trainerkontos), soweit der Verantwortliche diese Daten in KYDON einträgt und die Synchronisierung einschaltet oder Athleten mit seinem Konto verknüpft.',
        'Dieser Vertrag gilt, solange das Trainerkonto besteht. Er endet mit der Löschung des Kontos; die Löschung der Daten regelt Abschnitt 9.',
      ],
    },
    {
      heading: '2. Art und Zweck der Verarbeitung, Datenkategorien, betroffene Personen',
      body: [
        'Zweck: Speicherung einer Zweitschrift der Daten (Synchronisierung), Bereitstellung über mehrere Geräte, Verknüpfung von Athletenkonten mit dem Trainerkonto, Erzeugung von Reports im Auftrag des Verantwortlichen.',
        'Art der Verarbeitung: Speichern, Abrufen, Übermitteln an das Gerät des Verantwortlichen oder des Athleten, Löschen. Der Auftragsverarbeiter wertet die Daten nicht aus; jede Berechnung erfolgt auf dem Gerät des Nutzers.',
      ],
      list: [
        'Datenkategorien: Name oder Kürzel, Geburtsdatum, Geschlecht, Körpergrösse, Gewicht, Disziplin, sportliche Messwerte mit Datum und Bedingungen, Tagebuch- und Trainingsangaben (Schlaf, Energie, Stress, Muskelkater, Einheiten, Sätze), Mahlzeiten, Entscheidungen und Notizen des Verantwortlichen, Einwilligungsvermerke (Datum und Name der einwilligenden Person).',
        'Besondere Kategorien (Art. 9): Einzelne Angaben können Gesundheitsdaten sein oder werden (etwa Herzratenvariabilität, Körperzusammensetzung, langfristige Wellness-Verläufe). Laborwerte nimmt KYDON derzeit nicht entgegen. Der Verantwortliche stellt sicher, dass für solche Angaben eine ausdrückliche Einwilligung der betroffenen Person vorliegt.',
        'Betroffene Personen: Athleten des Verantwortlichen, einschliesslich Minderjähriger, sofern der Verantwortliche die Einwilligung der Erziehungsberechtigten eingeholt hat.',
      ],
    },
    {
      heading: '3. Weisungen',
      body: [
        'Der Auftragsverarbeiter verarbeitet die Daten nur auf dokumentierte Weisung des Verantwortlichen. Weisungen sind die Funktionen von KYDON, die der Verantwortliche auslöst: Eintragen, Synchronisieren, Verknüpfen, Freigeben, Exportieren, Löschen. Weitergehende Weisungen erteilt der Verantwortliche in Textform an die im Impressum genannte Adresse.',
        'Hält der Auftragsverarbeiter eine Weisung für rechtswidrig, teilt er dies dem Verantwortlichen unverzüglich mit.',
      ],
    },
    {
      heading: '4. Vertraulichkeit',
      body: [
        'Personen, die beim Auftragsverarbeiter Zugang zu den Daten haben, sind zur Vertraulichkeit verpflichtet. Der Zugang ist auf das Notwendige beschränkt: Der Dienstschlüssel der Datenbank läuft ausschliesslich in serverseitigen Funktionen (Kontolöschung, Zahlungsabgleich) und nie in der Anwendung.',
      ],
    },
    {
      heading: '5. Sicherheit der Verarbeitung (Art. 32 DSGVO)',
      body: [
        'Der Auftragsverarbeiter trifft die folgenden technischen und organisatorischen Massnahmen. Sie sind im Sicherheitsdokument des Projekts (docs/sicherheit.md) im Einzelnen beschrieben und werden mit jeder Änderung des Codes fortgeschrieben.',
      ],
      list: [
        'Zugriffsregeln auf Zeilenebene in der Datenbank: Jeder Nutzer sieht ausschliesslich eigene Daten und die der mit ihm verknüpften Athleten; die Regeln werden automatisiert geprüft.',
        'Transportverschlüsselung (TLS) für jede Verbindung; Verschlüsselung der Daten im Ruhezustand beim Unterauftragsverarbeiter.',
        'Passwörter als Hash beim Anmeldedienst; Anmeldebremse gegen Ausprobieren; keine Auskunft über bestehende Konten.',
        'Content-Security-Policy ohne externe Skripte, Schriften oder Analysedienste.',
        'Sicherheitsprotokoll für Berechtigungsänderungen und Löschungen mit Aufbewahrung von 365 Tagen.',
        'Löschkonzept mit festen Fristen; Kontolöschung räumt Fachdaten und Anmeldekonto in dieser Reihenfolge.',
        'Vollständiger Export der Daten jederzeit, damit der Verantwortliche seiner Rechenschaftspflicht nachkommen kann.',
      ],
    },
    {
      heading: '6. Unterauftragsverarbeiter',
      body: [
        'Der Verantwortliche erteilt eine allgemeine Genehmigung für die Einschaltung der unten aufgeführten Unterauftragsverarbeiter. Der Auftragsverarbeiter verpflichtet sie vertraglich auf dieselben Datenschutzpflichten, die in diesem Vertrag stehen.',
        'Beabsichtigt der Auftragsverarbeiter, einen Unterauftragsverarbeiter hinzuzufügen oder zu ersetzen, teilt er dies dem Verantwortlichen mindestens 30 Tage vorher in der Anwendung mit. Der Verantwortliche kann innerhalb dieser Frist widersprechen; bleibt eine Einigung aus, kann er den Vertrag kündigen und seine Daten exportieren und löschen.',
      ],
      list: [
        'Supabase, Inc. — Datenbank, Anmeldung, serverseitige Funktionen. Rechenzentrum Frankfurt am Main (AWS eu-central-1). Vertrag zur Auftragsverarbeitung mit Standardvertragsklauseln.',
        'Netlify, Inc. — Auslieferung der Anwendung. Verarbeitet technische Zugriffsdaten (IP-Adresse), keine Athletendaten.',
        'Stripe Payments Europe, Ltd. — Zahlungsabwicklung für das Trainerkonto. Verarbeitet keine Athletendaten.',
      ],
    },
    {
      heading: '7. Unterstützung bei Rechten der betroffenen Personen',
      body: [
        'Der Auftragsverarbeiter unterstützt den Verantwortlichen bei Auskunft, Berichtigung, Löschung, Einschränkung und Datenübertragbarkeit durch die Funktionen der Anwendung: Jeder Datensatz lässt sich vollständig exportieren, korrigieren und löschen. Wendet sich eine betroffene Person direkt an den Auftragsverarbeiter, leitet er das Anliegen unverzüglich an den Verantwortlichen weiter.',
      ],
    },
    {
      heading: '8. Unterstützung bei Sicherheit, Verletzungen und Folgenabschätzung',
      body: [
        'Der Auftragsverarbeiter meldet dem Verantwortlichen jede Verletzung des Schutzes personenbezogener Daten, die ihn betrifft, unverzüglich nach Kenntnis — mit Art der Verletzung, betroffenen Kategorien, wahrscheinlichen Folgen und ergriffenen Massnahmen, soweit bekannt. Die Frist des Verantwortlichen nach Art. 33 DSGVO beginnt mit dieser Meldung.',
        'Er unterstützt den Verantwortlichen bei einer Datenschutz-Folgenabschätzung und bei der Konsultation der Aufsichtsbehörde mit den Informationen, die nur ihm vorliegen.',
      ],
    },
    {
      heading: '9. Löschung und Rückgabe',
      body: [
        'Nach Ende des Vertrags löscht der Auftragsverarbeiter die Daten des Verantwortlichen, sofern keine gesetzliche Aufbewahrungspflicht besteht. Die Löschung erfolgt durch die Kontolöschung in der Anwendung: Sie entfernt Athletendaten, Zweitschriften, Zeitreihen und Verknüpfungen und danach das Anmeldekonto. Vorher kann der Verantwortliche alle Daten vollständig exportieren.',
        'Sicherungskopien des Unterauftragsverarbeiters werden nach dessen Zyklus überschrieben; bis dahin bleiben sie gesperrt.',
      ],
    },
    {
      heading: '10. Nachweise und Überprüfungen',
      body: [
        'Der Auftragsverarbeiter stellt dem Verantwortlichen die Informationen zur Verfügung, die zum Nachweis der Einhaltung dieses Vertrags nötig sind: das Sicherheitsdokument, die Zugriffsregeln (öffentlich im Quelltext), das Ergebnis der automatisierten Regelprüfung und die Zertifizierungen der Unterauftragsverarbeiter. Überprüfungen vor Ort sind nach Ankündigung und in angemessenem Umfang möglich, soweit die Informationen nicht auf anderem Weg beigebracht werden können.',
      ],
    },
    {
      heading: '11. Übermittlung in Drittländer',
      body: [
        'Die Daten werden in der Europäischen Union gespeichert (Frankfurt am Main). Soweit ein Unterauftragsverarbeiter seinen Sitz ausserhalb der EU hat, stützt sich die Übermittlung auf einen Angemessenheitsbeschluss (EU-US Data Privacy Framework) und ergänzend auf Standardvertragsklauseln.',
      ],
    },
    {
      heading: '12. Annahme, Fassung, Schluss',
      body: [
        'Der Vertrag wird angenommen, indem der Inhaber des Trainerkontos ihn in der Anwendung bestätigt. Datum und Fassung der Annahme werden im Konto gespeichert und sind dort einsehbar. Bei einer neuen Fassung ist eine erneute Annahme nötig; bis dahin gilt die zuletzt angenommene Fassung.',
        'Im Übrigen gelten die Nutzungsbedingungen. Dieser Vertrag geht ihnen vor, soweit er die Verarbeitung im Auftrag betrifft. Es gilt deutsches Recht.',
        'Dieser Text ist nach bestem Wissen aus dem tatsächlichen Verhalten der Anwendung geschrieben und vor dem öffentlichen Betrieb anwaltlich zu prüfen.',
      ],
    },
  ],
}

const dpaEn: LegalDocument = {
  title: 'Data processing agreement',
  intro:
    'For coach accounts: what KYDON does with your athletes’ data when you manage them here on your behalf — under Art. 28 GDPR. By accepting the agreement in your account, it applies between you as controller and the operator as processor.',
  updated: `Version ${DPA_VERSION}`,
  sections: [
    {
      heading: '1. Subject matter and duration',
      body: [
        'The processor (operator of KYDON, see imprint) processes personal data of athletes on behalf of the controller (holder of the coach account) insofar as the controller enters this data in KYDON and switches on synchronisation or links athletes to their account.',
        'This agreement applies for as long as the coach account exists. It ends with the deletion of the account; deletion of data is governed by section 9.',
      ],
    },
    {
      heading: '2. Nature and purpose of processing, data categories, data subjects',
      body: [
        'Purpose: storing a second copy of the data (synchronisation), making it available across devices, linking athlete accounts to the coach account, generating reports on behalf of the controller.',
        'Nature: storing, retrieving, transmitting to the device of the controller or the athlete, deleting. The processor does not evaluate the data; every calculation runs on the user’s device.',
      ],
      list: [
        'Data categories: name or initials, date of birth, sex, height, weight, discipline, sports measurements with date and conditions, diary and training entries (sleep, energy, stress, soreness, sessions, sets), meals, decisions and notes of the controller, consent records (date and name of the consenting person).',
        'Special categories (Art. 9): individual entries can be, or become, health data (e.g. heart rate variability, body composition, long-term wellness records). KYDON currently does not accept laboratory values. The controller ensures that explicit consent of the data subject exists for such entries.',
        'Data subjects: athletes of the controller, including minors where the controller has obtained the consent of the legal guardians.',
      ],
    },
    {
      heading: '3. Instructions',
      body: [
        'The processor processes the data only on documented instructions from the controller. Instructions are the functions of KYDON the controller triggers: entering, synchronising, linking, sharing, exporting, deleting. Further instructions are given in text form to the address in the imprint.',
        'If the processor considers an instruction unlawful, it informs the controller without delay.',
      ],
    },
    {
      heading: '4. Confidentiality',
      body: [
        'Persons with access to the data at the processor are bound to confidentiality. Access is limited to what is necessary: the database service key runs exclusively in server-side functions (account deletion, payment reconciliation) and never in the application.',
      ],
    },
    {
      heading: '5. Security of processing (Art. 32 GDPR)',
      body: [
        'The processor implements the following technical and organisational measures. They are described in detail in the project’s security document (docs/sicherheit.md) and updated with every change of the code.',
      ],
      list: [
        'Row-level access rules in the database: every user sees only their own data and that of athletes linked to them; the rules are checked automatically.',
        'Transport encryption (TLS) for every connection; encryption at rest at the sub-processor.',
        'Passwords hashed at the authentication service; sign-in throttling; no disclosure of existing accounts.',
        'Content Security Policy without external scripts, fonts or analytics.',
        'Security log for permission changes and deletions, retained for 365 days.',
        'Deletion concept with fixed periods; account deletion removes business data and then the sign-in account.',
        'Complete export of the data at any time, so the controller can meet its accountability obligation.',
      ],
    },
    {
      heading: '6. Sub-processors',
      body: [
        'The controller grants general authorisation for the engagement of the sub-processors listed below. The processor binds them contractually to the same data protection obligations set out in this agreement.',
        'If the processor intends to add or replace a sub-processor, it informs the controller in the application at least 30 days in advance. The controller may object within this period; failing agreement, the controller may terminate the agreement and export and delete their data.',
      ],
      list: [
        'Supabase, Inc. — database, authentication, server-side functions. Data centre Frankfurt am Main (AWS eu-central-1). Data processing agreement with standard contractual clauses.',
        'Netlify, Inc. — delivery of the application. Processes technical access data (IP address), no athlete data.',
        'Stripe Payments Europe, Ltd. — payment processing for the coach account. Processes no athlete data.',
      ],
    },
    {
      heading: '7. Assistance with data subject rights',
      body: [
        'The processor assists the controller with access, rectification, erasure, restriction and portability through the functions of the application: every record can be fully exported, corrected and deleted. If a data subject contacts the processor directly, the processor forwards the request to the controller without delay.',
      ],
    },
    {
      heading: '8. Assistance with security, breaches and impact assessments',
      body: [
        'The processor notifies the controller of any personal data breach affecting it without undue delay after becoming aware — with the nature of the breach, categories concerned, likely consequences and measures taken, as far as known. The controller’s deadline under Art. 33 GDPR starts with this notification.',
        'It assists the controller with a data protection impact assessment and with consulting the supervisory authority, providing the information only it holds.',
      ],
    },
    {
      heading: '9. Deletion and return',
      body: [
        'At the end of the agreement the processor deletes the controller’s data unless a statutory retention obligation applies. Deletion is performed by account deletion in the application: it removes athlete data, second copies, time series and links, and then the sign-in account. Beforehand the controller can export all data completely.',
        'Backups of the sub-processor are overwritten according to its cycle; until then they remain locked.',
      ],
    },
    {
      heading: '10. Evidence and audits',
      body: [
        'The processor makes available to the controller the information necessary to demonstrate compliance with this agreement: the security document, the access rules (public in the source code), the result of the automated rule check and the certifications of the sub-processors. On-site audits are possible after notice and to a reasonable extent, where the information cannot be provided otherwise.',
      ],
    },
    {
      heading: '11. Transfers to third countries',
      body: [
        'The data is stored in the European Union (Frankfurt am Main). Where a sub-processor is established outside the EU, the transfer relies on an adequacy decision (EU-US Data Privacy Framework) and, in addition, on standard contractual clauses.',
      ],
    },
    {
      heading: '12. Acceptance, version, final provisions',
      body: [
        'The agreement is accepted when the holder of the coach account confirms it in the application. Date and version of acceptance are stored in the account and visible there. A new version requires renewed acceptance; until then the last accepted version applies.',
        'Otherwise the terms of use apply. This agreement prevails insofar as it concerns processing on behalf. German law applies.',
        'This text is written to the best of our knowledge from the actual behaviour of the application and must be reviewed by a lawyer before public operation.',
      ],
    },
  ],
}

export function dpaDocument(locale: AppLocale): LegalDocument {
  return locale === 'de' ? dpaDe : dpaEn
}
