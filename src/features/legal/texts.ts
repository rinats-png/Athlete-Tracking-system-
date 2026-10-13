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

// Datenschutz und Nutzungsbedingungen: Konto ist Pflicht, der Abgleich läuft
// automatisch (13.10.2026). Beide tragen denselben Stand.
const PRIVACY_STAND_DE = 'Stand: 13. Oktober 2026'
const PRIVACY_STAND_EN = 'Last updated: 13 October 2026'

// --- Datenschutz -------------------------------------------------------------

const privacyDe: LegalDocument = {
  title: 'Datenschutzerklärung',
  intro:
    'KYDON ist so gebaut, dass möglichst wenig über dich anfällt. Diese Erklärung beschreibt, was tatsächlich passiert — nicht, was rechtlich gerade noch zulässig wäre.',
  updated: PRIVACY_STAND_DE,
  sections: [
    {
      heading: 'Das Wichtigste zuerst',
      body: [
        'Gemessen und ausgewertet wird zuerst in deinem Browser, auch ohne Netz. Mit deinem Konto gleicht die App deine Daten automatisch mit unseren Servern in der EU ab — als Sicherung und damit sie auf deinen weiteren Geräten erscheinen. Den Abgleich kannst du im Profil ausschalten.',
        'Ein Konto brauchst du, um die App zu benutzen. Für die Anmeldung verarbeiten wir deine E-Mail-Adresse und dein Passwort; was beim Abgleich übertragen wird, steht im Abschnitt «Abgleich mit deinem Konto».',
        'Ein Trainer sieht nur, was du ihm freigibst, und du kannst jede Freigabe zurückziehen. Gesundheitsnahe Angaben — Schlaf, Stress, Herzfrequenz, Körperfett, Beschwerden — gleicht die App nur mit deiner ausdrücklichen Einwilligung ab; ohne sie bleiben sie auf dem Gerät. Die Gesundheitsschicht geht nie mit dem Abgleich, sondern nur Ende-zu-Ende-verschlüsselt mit deiner Einwilligung je Kategorie.',
        'Es gibt keine Werbung, keine Analysedienste Dritter, keine Weitergabe an Dritte zu Werbezwecken und keine externen Schriften oder Skripte. Der einzige externe Dienst, den die App aufruft, ist die Lebensmittelsuche bei Open Food Facts — und nur, wenn du sie antippst (siehe unten).',
        'Eine eigene Nutzungsstatistik gibt es — aber nur, wenn du ausdrücklich «Ja» sagst. Ohne dein Ja wird nichts gezählt und nichts gespeichert. Einzelheiten im Abschnitt «Nutzungsstatistik».',
      ],
    },
    {
      heading: 'Was auf deinem Gerät liegt',
      body: [
        'Deine Messwerte, dein Profil, Notizen, Trainingsschwerpunkte und Belegbilder speichert die App zuerst im lokalen Speicher deines Browsers (localStorage und IndexedDB). So funktioniert das Messen auch ohne Netz. Diese Daten gehören dir.',
        'Löschst du die Browserdaten, holt die App beim nächsten Anmelden zurück, was mit deinem Konto abgeglichen war. Hast du den Abgleich ausgeschaltet, ist der Export deine einzige Sicherung; deshalb erinnert die App daran.',
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
      heading: 'Abgleich mit deinem Konto (automatisch, abschaltbar)',
      body: [
        'Mit deinem Konto gleicht die App deine Daten von selbst ab: kurz nach dem Start, nach Änderungen und sobald wieder Netz da ist. Übertragen wird je Athlet der Datensatz über eine verschlüsselte Verbindung an unseren Auftragsverarbeiter Supabase (Rechenzentrum in Frankfurt am Main): Messwerte, Profilangaben, Körperwerte, Notizen, Trainingsschwerpunkte, Pläne und Belegbilder sowie als einzelne Einträge Tagebuch, Einheiten, Entscheidungen und Mahlzeiten.',
        'Nicht übertragen werden dein Passwort im Klartext, importierte Läufe und die Gesundheitsschicht (Laborwerte, Symptome, Zyklus, Medikation und Ähnliches); für sie gilt ein eigener, Ende-zu-Ende-verschlüsselter Weg mit Einwilligung je Kategorie. Die Demo mit Beispieldaten wird nie abgeglichen.',
        'Zweck ist, dass deine Daten einen Geräteverlust überstehen und auf deinen weiteren Geräten erscheinen; arbeitest du als Trainer in einem Team, ist es der gemeinsame Bestand des Teams. Die Daten werden nicht für andere Zwecke ausgewertet, nicht aggregiert und nicht mit Daten anderer Nutzer zusammengeführt.',
        'Der Zugriff ist auf dein Konto beschränkt — in einem Team auf die Trainer dieses Teams; das setzen Zugriffsregeln in der Datenbank durch (Row Level Security), nicht nur die App. Ein Trainer, mit dem du verbunden bist, sieht nur, was du ihm ausdrücklich freigibst (siehe «Pläne vom Trainer»).',
        'Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO — der Abgleich ist Teil des Dienstes, den du mit deinem Konto nutzt. Für gesundheitsnahe Angaben gilt zusätzlich deine ausdrückliche Einwilligung (siehe «Keine medizinische Datenverarbeitung»); ohne sie filtert die App diese Angaben heraus, bevor sie etwas überträgt.',
        'Du kannst den Abgleich im Profil jederzeit ausschalten; vorher zeigt die App, was dann nicht mehr geht. Ausgeschaltet überträgt die App nichts mehr. Die Kopie in deinem Konto bleibt auf dem letzten Stand, bis du den Abgleich wieder einschaltest, dein Konto löschst oder uns um Löschung bittest.',
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
      heading: 'Pläne vom Trainer (freiwillig, Testphase)',
      body: [
        'Ein mit dir verbundener Trainer kann dir einen Trainingsplan schicken. Dafür speichern wir den Plan auf unseren Servern (Supabase): Name, Wochen und Tage, die Absicht der Einheiten, Notizen sowie Namen, Sätze, Wiederholungen und Lasttexte eigener Übungen. Dosierungen und Belege kommen nicht aus dem Plan, sondern baut deine App aus dem Regelregister.',
        'Du entscheidest. Ein Plan wird erst zu deinem Block, wenn du ihn annimmst; ablehnen ist jederzeit möglich. Solange du nichts einschaltest, sieht der Trainer nichts von deinem Fortschritt. Du kannst drei Dinge getrennt freigeben: (1) dass du eine Einheit erledigt hast, (2) Dauer und Anstrengung (RPE) der Einheit, (3) Mittel und Höchstwert deines Pulses. (2) und (3) gibt es nur zusammen mit (1). Der Puls wird nur als Mittel- und Höchstwert der Einheit übertragen, nie als Verlauf.',
        'Rechtsgrundlage für (1) und (2) ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Der Puls ist ein Gesundheitsdatum; dafür ist deine ausdrückliche Einwilligung die Rechtsgrundlage (Art. 9 Abs. 2 lit. a DSGVO). Du kannst jede Freigabe jederzeit im Block ändern. Ausschalten wirkt sofort: freigegebene Werte werden gelöscht beziehungsweise für den Trainer unsichtbar, und beim Ausschalten von (1) werden alle Zeilen gelöscht.',
        'Der Trainer sieht den Fortschritt nur bei aktiver Verknüpfung mit dir und nur so weit, wie du ihn freigegeben hast; das setzen Zugriffsregeln in der Datenbank durch, nicht nur die App. Aufbewahrung: gemeldete Einheiten höchstens 180 Tage, abgelehnte oder zurückgezogene Pläne 30 Tage, danach löschen wir sie automatisch. Beim Löschen deines Kontos oder des Trainerkontos werden die zugehörigen Pläne und Meldungen entfernt.',
        'Minderjährige: Ein Trainer darf einem Athleten unter 18 Jahren erst dann einen Plan senden, wenn er bestätigt, dass die Einwilligung der Erziehungsberechtigten vorliegt (in der App bestätigt oder schriftlich eingeholt). KYDON kann diese Einwilligung nicht prüfen. Der Puls lässt sich für Athleten unter 18 Jahren nicht freigeben, soweit das Geburtsdatum bekannt ist.',
        'Diese Funktion ist in der Testphase. Der Plan ist ein Vorschlag aus hinterlegten Regeln und Vorlagen, die noch nicht von einer fachkundigen Person geprüft sind; KYDON ersetzt keine ärztliche oder trainerische Beratung.',
      ],
    },
    {
      heading: 'Empfänger',
      body: [
        'Wir setzen die unten genannten Auftragsverarbeiter ein. Mit jedem besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Anthropic erhält nur dann Daten, wenn du in die Formulierung durch ein Sprachmodell eingewilligt hast (siehe dort).',
      ],
    },
    {
      heading: 'Aufbewahrung',
      body: [
        'Daten auf deinem Gerät bleiben, bis du sie löschst.',
        'Kontodaten und abgeglichene Datensätze bleiben, bis du das Konto löschst; dann werden sie entfernt. Schaltest du nur den Abgleich aus, bleibt die Kopie auf dem letzten Stand bestehen.',
        'Ereignisse der Nutzungsstatistik: 90 Tage, danach automatisch gelöscht. Mit deinem Konto werden auch die ihm zugeordneten Ereignisse gelöscht.',
        'Push-Abonnements und das nächste Fälligkeitsdatum: bis du Push ausschaltest oder dein Konto löschst; nicht mehr erreichbare Geräte entfernen wir automatisch. Das Versandprotokoll (wer wann wem eine Nachricht geschickt hat, ohne Inhalt): 90 Tage.',
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
      heading: 'Nutzungsstatistik (nur mit Einwilligung)',
      body: [
        'Beim ersten Öffnen fragt die App, ob du bei der Verbesserung helfen möchtest. «Ja» und «Nein» sind gleich gross, und die App funktioniert in beiden Fällen vollständig. Deine Antwort kannst du im Profil unter «Daten» jederzeit ändern.',
        'Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Erst nach deinem Ja legt die App eine zufällige Sitzungskennung im Speicher deines Browsers an.',
        'Gezählt wird, welche Bildschirme du öffnest und wie lange du dort bleibst, welche Funktionen du benutzt (etwa dass ein Test gespeichert wurde — welcher Test, aber nie der Messwert), an welche Bezahlschranken du stösst, ob du ein Konto anlegst und ob du die App installierst. Bist du angemeldet, wird das Ereignis deinem Konto zugeordnet; die Kennung dafür prüft der Server selbst.',
        'Nie gezählt werden: Messwerte, Tagebuch- und Trainingsinhalte, Ernährungsangaben, E-Mail-Adresse, Name — und nichts aus der Gesundheitsschicht, auch nicht, dass du sie öffnest. Die IP-Adresse und die Browserkennung werden nicht gespeichert; die Tabelle hat dafür keine Spalte.',
        'Die Ereignisse liegen in unserer eigenen Datenbank bei Supabase (siehe «Empfänger») — es gibt keinen weiteren Empfänger. Einsehen kann sie nur der Betreiber. Nach 90 Tagen werden sie automatisch gelöscht.',
        'Widerruf: «Nein» im Profil. Die Sitzungskennung wird sofort gelöscht, und es wird nichts mehr gezählt. Bereits erfasste Ereignisse laufen nach 90 Tagen ab; auf Wunsch löschen wir sie früher.',
      ],
    },
    {
      heading: 'Texte von einem Sprachmodell (nur mit Einwilligung)',
      body: [
        'Mit der Stufe Pro kannst du Antworten und deinen Wochenbrief auf Tipp «Als Text formulieren» lassen. Vor dem ersten Mal fragt die App nach deiner Einwilligung; ohne sie wird nichts gesendet, und die Antworten erscheinen als feste Texte. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).',
        'Gesendet werden nur die Fakten der jeweiligen Antwort: feste Kennwörter und Zahlen (etwa Veränderung, Schwelle, Anzahl der Messungen, Belastung der Woche). Nicht gesendet werden Name, E-Mail-Adresse, Notizen, Tagebuch- und andere Freitexte, Daten der Gesundheitsschicht und Kennungen deines Kontos. Die Anfrage läuft über unsere Serverfunktion; der Anbieter sieht weder deine IP-Adresse noch dein Konto.',
        'Empfänger ist Anthropic (Sprachmodell Claude) als Auftragsverarbeiter. Die Verarbeitung kann in den Vereinigten Staaten stattfinden; die Übermittlung stützt sich auf Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO). Nach seinen Bedingungen für gewerbliche Kunden nutzt der Anbieter die Daten nicht zum Training seiner Modelle und speichert sie nur befristet zur Missbrauchserkennung.',
        'KYDON speichert weder die Fakten noch den Text. Gespeichert werden nur die Zahl deiner Aufrufe im Monat (für die Obergrenze von 30) und deine Einwilligung mit Zeitpunkt, Fassung des Textes, Bestätigung des Mindestalters und gegebenenfalls Widerruf (Nachweis nach Art. 7 Abs. 1 DSGVO). Beides löschen wir mit deinem Konto.',
        'Texte des Sprachmodells sind in der App als solche gekennzeichnet. Das Modell formuliert nur um: Es bewertet nichts, stellt keine Diagnose und trifft keine Trainingsentscheidung. Jede Zahl im Text prüft die App gegen die Fakten; besteht er nicht, siehst du die feste Antwort.',
        'Die Einwilligung setzt ein Mindestalter von 16 Jahren voraus (Art. 8 DSGVO). Im Trainermodus — also für Daten deiner Athleten — ist die Funktion nicht verfügbar.',
        'Widerruf: jederzeit im Profil unter «Daten», mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO). Ab dann wird nichts mehr gesendet; die Rechtmässigkeit der bis dahin erfolgten Verarbeitung bleibt unberührt.',
      ],
    },
    {
      heading: 'Push-Benachrichtigungen (nur wenn du sie einschaltest)',
      body: [
        'Unter «Erinnerungen» kannst du Push einschalten. Dein Browser fragt dann um Erlaubnis. Ohne dein Einschalten wird nichts gespeichert und nichts verschickt. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG).',
        'Gespeichert werden die Push-Adresse deines Geräts mit den zugehörigen Schlüsseln, deine Sprache und — für Erinnerungen an Nachmessungen — nur das Datum der nächsten Fälligkeit. Welcher Test fällig ist und Messwerte gehören nicht dazu.',
        'Nachrichten gibt es aus drei Anlässen: eine fällige Nachmessung, eine Mitteilung des Betreibers an alle mit eingeschaltetem Push, und eine Nachricht eines Trainers, mit dem du aktiv verbunden bist (höchstens drei pro Tag).',
        'Zugestellt wird über den Push-Dienst deines Browsers (bei Chrome Google, bei Safari Apple, bei Firefox Mozilla). Der Inhalt ist auf dem Weg dorthin Ende-zu-Ende verschlüsselt; der Dienst sieht Zeitpunkt und Grösse, nicht den Text.',
        'Ausschalten: unter «Erinnerungen» oder in den Browser-Einstellungen. Beim Ausschalten in der App löschen wir Adresse und Fälligkeitsdatum sofort.',
        'Hat ein Trainer dir einen Plan angeboten und hast du das Thema «Pläne von deinem Trainer» eingeschaltet, sendet die App eine allgemeine Push-Benachrichtigung, die lediglich auf das Vorliegen eines neuen Angebots hinweist, ohne sensible Inhalts- oder Absenderdaten (wie Namen oder Trainingsdetails) auf den Sperrbildschirm zu übertragen. Der Server erfährt dafür nur, dass ein Angebot vorliegt.',
      ],
    },
    {
      heading: 'Was die App nicht tut',
      body: [
        'Keine Cookies zu Werbe- oder Analysezwecken. Die App setzt überhaupt keine Cookies; der Anmeldezustand liegt im lokalen Speicher.',
        'Kein Fingerprinting, keine Profilbildung zu Werbezwecken, keine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO. Eine Nutzungsstatistik gibt es nur mit deiner Einwilligung (siehe «Nutzungsstatistik»).',
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
        'Einzelne Angaben können dennoch Gesundheitsdaten im Sinne von Art. 9 DSGVO sein oder werden: Schlaf, Energie, Stress und Muskelkater (Tagebuch, Testtermin); Herzfrequenzvariabilität, Ruhepuls und der Puls von Einheiten; Körperfett, Magermasse und Grundumsatz; Magen-Darm-Angaben, die Schmerzmarke einer Einheit und der CK-Wert. Solche Angaben trägst du freiwillig ein. In den Abgleich gehen sie nur mit deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO), die die App bei der Registrierung und im Profil unter «Daten» erfragt — freiwillig, nicht vorausgewählt, mit Bestätigung des Mindestalters von 16 Jahren. Ohne Einwilligung bleiben genau diese Angaben auf deinem Gerät; alles andere wird abgeglichen. Als Nachweis (Art. 7 Abs. 1 DSGVO) speichern wir Fassung, Zeitpunkt, Altersbestätigung und gegebenenfalls den Widerruf, nicht mehr. Trainer bestätigen auf demselben Weg, dass die Einwilligungen ihrer Athleten vorliegen.',
        'Widerruf: jederzeit im Profil unter «Daten», mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO). Ab dann hält die App diese Angaben zurück, und der nächste Abgleich entfernt sie vom Server, indem er Dokument und Tagebuchzeilen ohne sie neu schreibt. Auf deinem Gerät und im Export bleiben sie erhalten. Die Rechtmässigkeit der bis dahin erfolgten Verarbeitung bleibt unberührt.',
        'Laborwerte nimmt die App derzeit nicht entgegen. Die Erfassung der Kreatinkinase ist ausgesetzt, bis eine ausdrückliche Einwilligung je Datenkategorie eingeführt ist; bereits eingetragene Werte bleiben für dich sichtbar und im Export enthalten. Die Selbsteinschätzung vor einem Testtermin und die Hinweise im Cockpit sind Statistik über deine eigenen Trainingsdaten, keine Aussage über deinen Gesundheitszustand.',
      ],
    },
  ],
}

const privacyEn: LegalDocument = {
  title: 'Privacy policy',
  intro:
    'KYDON is built so that as little as possible about you is processed. This policy describes what actually happens — not what would still be legally permissible.',
  updated: PRIVACY_STAND_EN,
  sections: [
    {
      heading: 'The essentials first',
      body: [
        'Measuring and analysis happen in your browser first, even offline. With your account the app syncs your data automatically with our servers in the EU — as a backup and so it appears on your other devices. You can turn sync off in your profile.',
        'You need an account to use the app. For sign-in we process your email address and your password; what sync transmits is described under «Sync with your account».',
        'A coach sees only what you share, and you can withdraw any share. Health-related details — sleep, stress, heart rate, body fat, complaints — are synced only with your explicit consent; without it they stay on the device. The health layer never goes with sync; it travels only end-to-end encrypted, with your consent per category.',
        'There is no advertising, no third-party analytics, no sharing with third parties for advertising, and no external fonts or scripts. The only external service the app calls is the food search at Open Food Facts — and only when you tap it (see below).',
        'There is an in-house usage statistic — but only if you explicitly say yes. Without your yes nothing is counted and nothing is stored. Details under «Usage statistics».',
      ],
    },
    {
      heading: 'What lives on your device',
      body: [
        'Your measurements, profile, notes, training focuses and evidence photos are stored first in your browser (localStorage and IndexedDB). That is why measuring works offline. This data is yours.',
        'If you clear your browser data, the app restores at your next sign-in whatever was synced with your account. If you have turned sync off, the export is your only backup; that is why the app reminds you of it.',
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
      heading: 'Sync with your account (automatic, can be turned off)',
      body: [
        'With your account the app syncs your data on its own: shortly after start-up, after changes and as soon as the network is back. Per athlete the record is transmitted over an encrypted connection to our processor Supabase (data centre in Frankfurt am Main): measurements, profile details, body values, notes, training focuses, plans and evidence photos, plus diary, sessions, decisions and meals as individual entries.',
        'Not transmitted: your plaintext password, imported runs and the health layer (lab values, symptoms, cycle, medication and similar); these have their own end-to-end encrypted route with consent per category. The demo with sample data is never synced.',
        'The purpose is that your data survives a lost device and appears on your other devices; if you work as a coach in a team, it is the team’s shared records. The data is not analysed for other purposes, not aggregated and not combined with other users’ data.',
        'Access is limited to your account — in a team, to that team’s coaches; this is enforced by database access rules (row level security), not only by the app. A coach you are connected with sees only what you explicitly share (see «Plans from your coach»).',
        'The legal basis is Art. 6(1)(b) GDPR — sync is part of the service you use with your account. Health-related details additionally require your explicit consent (see «No medical data processing»); without it the app filters these details out before transmitting anything.',
        'You can turn sync off in your profile at any time; the app first shows what will stop working. Once off, the app transmits nothing. The copy in your account stays at its last state until you turn sync back on, delete your account or ask us to delete it.',
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
    {
      heading: 'Plans from your coach (optional, test phase)',
      body: [
        'A coach connected to you can send you a training plan. For this we store the plan on our servers (Supabase): name, weeks and days, the intent of the sessions, notes, and names, sets, reps and load texts of own exercises. Dosage and evidence do not come from the plan; your app builds them from the rule registry.',
        'You decide. A plan only becomes your block when you accept it; you can decline at any time. As long as you switch nothing on, the coach sees nothing of your progress. You can release three things separately: (1) that you completed a session, (2) duration and effort (RPE) of the session, (3) average and maximum of your heart rate. (2) and (3) only exist together with (1). Heart rate is transmitted only as the average and maximum of the session, never as a time series.',
        'The legal basis for (1) and (2) is your consent (Art. 6(1)(a) GDPR). Heart rate is health data; the legal basis for it is your explicit consent (Art. 9(2)(a) GDPR). You can change each release at any time in the block. Switching off takes effect immediately: released values are deleted or hidden from the coach, and switching off (1) deletes all rows.',
        'The coach sees progress only while the connection with you is active and only as far as you have released it; this is enforced by database access rules, not only by the app. Retention: reported sessions at most 180 days, declined or withdrawn plans 30 days, after which we delete them automatically. Deleting your account or the coach’s account removes the related plans and reports.',
        'Minors: a coach may only send a plan to an athlete under 18 once they confirm that the consent of the legal guardians is held (confirmed in the app or obtained in writing). KYDON cannot verify this consent. Heart rate cannot be shared for athletes under 18 where the date of birth is known.',
        'This feature is in its test phase. The plan is a suggestion from stored rules and templates that have not yet been reviewed by a qualified person; KYDON does not replace medical or coaching advice.',
      ],
    },
    { heading: 'Recipients', body: ['We use the processors listed below. A data processing agreement under Art. 28 GDPR is in place with each. Anthropic only receives data if you have consented to phrasing by a language model (see there).'] },
    {
      heading: 'Texts from a language model (only with consent)',
      body: [
        'On the Pro tier you can have answers and your weekly brief phrased on tap («Phrase as text»). Before the first time the app asks for your consent; without it nothing is sent and answers appear as fixed texts. The legal basis is your consent (Art. 6(1)(a) GDPR).',
        'Only the facts of the answer in question are sent: fixed keywords and numbers (such as change, threshold, number of measurements, weekly load). Not sent: name, email address, notes, diary and other free text, data from the health layer and identifiers of your account. The request runs through our server function; the provider sees neither your IP address nor your account.',
        'The recipient is Anthropic (language model Claude) as processor. Processing may take place in the United States; the transfer relies on standard contractual clauses (Art. 46(2)(c) GDPR). Under its terms for commercial customers the provider does not use the data to train its models and keeps it only for a limited time for abuse detection.',
        'KYDON stores neither the facts nor the text. It stores only the number of your calls per month (for the limit of 30) and your consent with time, version of the text, confirmation of minimum age and any withdrawal (proof under Art. 7(1) GDPR). Both are deleted with your account.',
        'Texts from the language model are labelled as such in the app. The model only rephrases: it evaluates nothing, makes no diagnosis and takes no training decision. The app checks every number in the text against the facts; if it fails, you see the fixed answer.',
        'Consent requires a minimum age of 16 (Art. 8 GDPR). In coach mode — that is, for your athletes’ data — the feature is not available.',
        'Withdrawal: at any time in your profile under «Data», with effect for the future (Art. 7(3) GDPR). From then on nothing is sent; the lawfulness of processing up to that point is unaffected.',
      ],
    },
    {
      heading: 'Retention',
      body: [
        'Data on your device stays until you delete it.',
        'Account data and synced records stay until you delete the account; then they are removed. If you only turn sync off, the copy remains at its last state.',
        'Usage statistics events: 90 days, then deleted automatically. Events linked to your account are deleted together with the account.',
        'Push subscriptions and the next due date: until you turn push off or delete your account; unreachable devices are removed automatically. The send log (who sent a message to whom and when, without content): 90 days.',
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
      heading: 'Push notifications (only if you turn them on)',
      body: [
        'You can turn on push under «Reminders». Your browser then asks for permission. Unless you turn it on, nothing is stored and nothing is sent. The legal basis is your consent (Art. 6(1)(a) GDPR, § 25(1) TDDDG).',
        'We store your device’s push address with its keys, your language and — for retest reminders — only the date of the next retest. Which test is due and measurements are not part of it.',
        'Messages come from three sources: a due retest, an announcement by the operator to everyone with push on, and a message from a coach you are actively linked with (at most three per day).',
        'Delivery runs through your browser’s push service (Google for Chrome, Apple for Safari, Mozilla for Firefox). The content is end-to-end encrypted on the way; the service sees time and size, not the text.',
        'Turning it off: under «Reminders» or in your browser settings. When you turn it off in the app, we delete the address and due date immediately.',
        'If a coach has offered you a plan and you have switched on the topic “Plans from your coach”, the app sends a general push notification that merely indicates that a new offer exists, without transmitting sensitive content or sender data (such as names or training details) to the lock screen. For this the server only learns that an offer exists.',
      ],
    },
    {
      heading: 'Usage statistics (only with consent)',
      body: [
        'When you first open the app it asks whether you want to help improve it. «Yes» and «No» are the same size, and the app works fully either way. You can change your answer at any time in your profile under «Data».',
        'The legal basis is your consent (Art. 6(1)(a) GDPR, § 25(1) TDDDG). Only after your yes does the app create a random session identifier in your browser storage.',
        'We count which screens you open and how long you stay, which features you use (for example that a test was saved — which test, but never the measured value), which paywalls you run into, whether you create an account and whether you install the app. If you are signed in, the event is linked to your account; the server determines that identifier itself.',
        'Never counted: measurements, diary and training content, nutrition entries, email address, name — and nothing from the health layer, not even that you open it. The IP address and browser identifier are not stored; the table has no column for them.',
        'The events live in our own database at Supabase (see «Recipients») — there is no other recipient. Only the operator can view them. They are deleted automatically after 90 days.',
        'Withdrawal: «No» in your profile. The session identifier is deleted immediately and nothing more is counted. Events already recorded expire after 90 days; on request we delete them sooner.',
      ],
    },
    {
      heading: 'What the app does not do',
      body: [
        'No cookies for advertising or analytics. The app sets no cookies at all; the sign-in state lives in local storage.',
        'No fingerprinting, no profiling for advertising, no automated decision-making within the meaning of Art. 22 GDPR. Usage statistics only with your consent (see «Usage statistics»).',
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
        'Some entries can nevertheless be, or become, health data within the meaning of Art. 9 GDPR: sleep, energy, stress and soreness (diary, test session); heart rate variability, resting heart rate and session heart rate; body fat, lean mass and resting metabolic rate; gut complaints, the pain flag of a session and the CK value. You enter such details voluntarily. They are synced only with your explicit consent (Art. 9(2)(a) GDPR), which the app asks for at registration and in your profile under «Data» — optional, not pre-ticked, with confirmation of the minimum age of 16. Without consent exactly these details stay on your device; everything else is synced. As proof (Art. 7(1) GDPR) we store the version, time, age confirmation and any withdrawal, nothing more. Coaches use the same step to confirm that their athletes’ consents are in place.',
        'Withdrawal: at any time in your profile under «Data», with effect for the future (Art. 7(3) GDPR). From then on the app holds these details back, and the next sync removes them from the server by rewriting the document and diary rows without them. They remain on your device and in your export. The lawfulness of processing up to that point is unaffected.',
        'The app currently does not accept laboratory values. Entry of creatine kinase is suspended until explicit consent per data category has been introduced; values already entered remain visible to you and included in your export. The pre-test self-assessment and the cockpit signals are statistics about your own training data, not statements about your health.',
      ],
    },
  ],
}

// --- Nutzungsbedingungen -----------------------------------------------------

const termsDe: LegalDocument = {
  title: 'Nutzungsbedingungen',
  intro: 'Was du von KYDON erwarten kannst und was KYDON von dir erwartet.',
  updated: PRIVACY_STAND_DE,
  sections: [
    {
      heading: 'Was KYDON ist',
      body: [
        'KYDON ist ein Werkzeug zur sportlichen Leistungsdiagnostik. Es erfasst Messwerte, ordnet sie — soweit belegte Referenzwerte vorliegen — in Vergleichsgruppen ein und stellt ihre Entwicklung dar. Daraus kann ein Trainingsplan entstehen, aber nur aus hinterlegten Regeln mit Quelle und Prüfstatus; jeder Block endet mit einer erneuten Messung.',
      ],
    },
    {
      heading: 'Konto und Abgleich',
      body: [
        'Für die Nutzung brauchst du ein Konto. Mit dem Konto gleicht die App deine Daten automatisch mit unseren Servern ab; das gehört zum Dienst. Du kannst den Abgleich im Profil ausschalten — dann gibt es keine Sicherung mehr, deine anderen Geräte und ein verbundener Trainer bekommen keine neuen Stände, und der Export ist deine einzige Kopie.',
        'Die Demo mit Beispieldaten bleibt auf dem Gerät und wird nie abgeglichen.',
      ],
    },
    {
      heading: 'Was KYDON ausdrücklich nicht ist',
      body: [
        'Keine medizinische Diagnostik. KYDON stellt keine Diagnosen, gibt keine Therapieempfehlungen und bewertet keine Krankheiten.',
        'Kein Ersatz für Trainer, Ärztin oder Arzt. Trainingspläne in KYDON sind Vorschläge aus hinterlegten Regeln; Regeln, die noch nicht fachlich geprüft sind, sind als solche gekennzeichnet. Ob ein Plan umgesetzt wird, entscheidest du oder dein Trainer.',
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
        'Messen funktioniert auch offline auf deinem Gerät. Für die Anmeldung und den Abgleich braucht es eine Verbindung; eine ununterbrochene Verfügbarkeit des Dienstes wird nicht zugesichert.',
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
        'Die kostenlose Version umfasst Messen, Verlauf, Messfehlerband, das eigene Profil, den vollständigen Export, Erinnerungen und den automatischen Abgleich mit deinem Konto — dauerhaft. Bezahlte Stufen schalten zusätzliche Merkmale frei; die Preisseite nennt sie. Eine Stufe hält Merkmale zurück, nie Daten: Was du eingetragen hast, bleibt in deinem Bestand und im Export, auch nach Ablauf.',
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
  updated: PRIVACY_STAND_EN,
  sections: [
    {
      heading: 'What KYDON is',
      body: [
        'KYDON is a tool for sports performance diagnostics. It records measurements, classifies them against comparison groups where documented reference values exist, and shows their development. A training plan can follow from that, but only from stored rules with source and review status; every block ends with a new measurement.',
      ],
    },
    {
      heading: 'Account and sync',
      body: [
        'You need an account to use the app. With the account the app syncs your data automatically with our servers; this is part of the service. You can turn sync off in your profile — then there is no backup, your other devices and a connected coach receive no new states, and the export is your only copy.',
        'The demo with sample data stays on the device and is never synced.',
      ],
    },
    {
      heading: 'What KYDON explicitly is not',
      body: [
        'Not medical diagnostics. KYDON makes no diagnoses, gives no therapy recommendations and assesses no illnesses.',
        'Not a substitute for a coach or a doctor. Training plans in KYDON are suggestions from stored rules; rules that have not yet been reviewed by an expert are labelled as such. You or your coach decide whether a plan is carried out.',
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
        'Measuring works offline on your device. Sign-in and sync need a connection; uninterrupted availability of the service is not guaranteed.',
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
        'The free version includes measuring, history, the error band, your own profile, the complete export, reminders and automatic sync with your account — permanently. Paid plans unlock additional features, listed on the pricing page. A plan holds back features, never data: whatever you have entered stays in your data and in your export, also after a plan ends.',
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
        'Der Auftragsverarbeiter (Betreiber von KYDON, siehe Impressum) verarbeitet personenbezogene Daten von Athleten im Auftrag des Verantwortlichen (Inhaber des Trainerkontos), soweit der Verantwortliche diese Daten mit seinem Konto in KYDON führt — der Abgleich mit dem Konto läuft dabei automatisch, solange der Verantwortliche ihn nicht ausschaltet — oder Athleten mit seinem Konto verknüpft.',
        'Dieser Vertrag gilt, solange das Trainerkonto besteht. Er endet mit der Löschung des Kontos; die Löschung der Daten regelt Abschnitt 9.',
      ],
    },
    {
      heading: '2. Art und Zweck der Verarbeitung, Datenkategorien, betroffene Personen',
      body: [
        'Zweck: Speicherung einer Zweitschrift der Daten (automatischer Abgleich mit dem Konto), Bereitstellung über mehrere Geräte und im Team, Verknüpfung von Athletenkonten mit dem Trainerkonto, Erzeugung von Reports im Auftrag des Verantwortlichen.',
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
        'Der Auftragsverarbeiter verarbeitet die Daten nur auf dokumentierte Weisung des Verantwortlichen. Weisungen sind die Funktionen von KYDON, die der Verantwortliche nutzt: Eintragen, Abgleichen (automatisch mit dem Konto, im Profil abschaltbar), Verknüpfen, Freigeben, Exportieren, Löschen. Weitergehende Weisungen erteilt der Verantwortliche in Textform an die im Impressum genannte Adresse.',
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
      heading: '12. Freigabebasierte Datenverarbeitung, Verantwortlichkeit und Athletenfreigaben',
      body: [
        'Umfang der Verantwortlichkeit des Auftraggebers (Trainers): Der Auftraggeber ist Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO ausschließlich für diejenigen personenbezogenen Daten von Athleten, die',
      ],
      list: [
        'a) durch den Auftraggeber selbst in die Plattform KYDON eingegeben oder importiert werden, oder',
        'b) vom jeweiligen Athleten über die Plattformfunktionen ausdrücklich und aktiv für das Profil bzw. das Dashboard des Auftraggebers freigegeben werden («Data Sharing»).',
      ],
    },
    {
      heading: 'Autonomie des Athletenkontos',
      body: [
        'Die Parteien stellen klar, dass Athleten über ein eigenständiges Nutzerverhältnis mit dem Auftragnehmer (KYDON) verfügen können. Daten, Analysen oder Historien, die der Athlet außerhalb einer aktiven Zuweisung bzw. Freigabe an den Auftraggeber führt, unterliegen nicht der Weisungsbefugnis des Auftraggebers und sind nicht Gegenstand dieses Vertrags.',
      ],
    },
    {
      heading: 'Rechtsgrundlage und besondere Datenkategorien (Art. 9 DSGVO)',
      body: [
        'Soweit über KYDON sportphysiologische Parameter, Leistungsdiagnostiken, Regenerationswerte, Biometrie oder sonstige Gesundheitsdaten im Sinne des Art. 9 Abs. 1 DSGVO verarbeitet werden, sichert der Auftraggeber zu, dass er vor der Einsichtnahme und Verarbeitung über eine wirksame Rechtsgrundlage verfügt (insbesondere eine ausdrückliche, informierte und freiwillige Einwilligung des Athleten gemäß Art. 9 Abs. 2 lit. a DSGVO in Verbindung mit Art. 7 DSGVO bzw. § 26 Abs. 3 BDSG, sofern anwendbar). Gesundheitsnahe Angaben (Schlaf, Stress, Herzfrequenz, Körperzusammensetzung, Beschwerden) gleicht die Anwendung nur ab, wenn der Auftraggeber in der Anwendung bestätigt hat, dass diese Einwilligungen vorliegen; ohne Bestätigung bleiben sie auf seinem Gerät.',
        'Der Auftraggeber stellt den Auftragnehmer im Innenverhältnis von allen Ansprüchen Dritter frei, die daraus resultieren, dass der Auftraggeber freigegebene Daten ohne ausreichende datenschutzrechtliche Legitimation verarbeitet hat.',
      ],
    },
    {
      heading: 'Minderjährige Athleten',
      body: [
        'Bevor der Auftraggeber einem minderjährigen Athleten einen Plan zuweist oder Freigaben eines minderjährigen Athleten einsieht, holt er die Einwilligung der Erziehungsberechtigten ein, entweder in der Anwendung oder schriftlich, und bewahrt sie auf. Die Anwendung verlangt vor dem Senden eines Plans seine ausdrückliche Bestätigung, dass der Athlet volljährig ist oder diese Einwilligung vorliegt; prüfen kann sie die Einwilligung nicht. Die Freigabe des Pulses ist für Athleten unter 18 Jahren technisch ausgeschlossen, soweit das Geburtsdatum bekannt ist.',
      ],
    },
    {
      heading: 'Widerruf der Freigabe durch den Athleten',
      body: [
        'Entzieht ein Athlet über die Plattform seine Freigabe gegenüber dem Auftraggeber, endet bezüglich der künftigen Erfassung und Synchronisation dieser Daten die Auftragsverarbeitung im Auftrag dieses Auftraggebers. Bis zum Widerruf rechtmäßig übermittelte und dem Auftraggeber zugewiesene Daten verbleiben in dessen Verantwortung, soweit keine gesetzlichen Löschpflichten entgegenstehen oder der Athlet ein Löschersuchen gegenüber dem Auftraggeber geltend macht.',
      ],
    },
    {
      heading: '13. Annahme, Fassung, Schluss',
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
        'The processor (operator of KYDON, see imprint) processes personal data of athletes on behalf of the controller (holder of the coach account) insofar as the controller keeps this data in KYDON with their account — sync with the account runs automatically unless the controller turns it off — or links athletes to their account.',
        'This agreement applies for as long as the coach account exists. It ends with the deletion of the account; deletion of data is governed by section 9.',
      ],
    },
    {
      heading: '2. Nature and purpose of processing, data categories, data subjects',
      body: [
        'Purpose: storing a second copy of the data (automatic sync with the account), making it available across devices and within a team, linking athlete accounts to the coach account, generating reports on behalf of the controller.',
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
        'The processor processes the data only on documented instructions from the controller. Instructions are the functions of KYDON the controller uses: entering, syncing (automatic with the account, can be turned off in the profile), linking, sharing, exporting, deleting. Further instructions are given in text form to the address in the imprint.',
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
      heading: '12. Release-based processing, responsibility and athlete releases',
      body: [
        'Scope of the client’s (coach’s) responsibility: the client is the controller within the meaning of Art. 4(7) GDPR exclusively for those personal data of athletes that',
      ],
      list: [
        'a) are entered or imported into the KYDON platform by the client themselves, or',
        'b) are expressly and actively released by the respective athlete through the platform functions for the client’s profile or dashboard (“data sharing”).',
      ],
    },
    {
      heading: 'Autonomy of the athlete account',
      body: [
        'The parties clarify that athletes may have an independent user relationship with the processor (KYDON). Data, analyses or histories that the athlete keeps outside an active assignment or release to the client are not subject to the client’s right to issue instructions and are not covered by this agreement.',
      ],
    },
    {
      heading: 'Legal basis and special categories of data (Art. 9 GDPR)',
      body: [
        'Where sport-physiological parameters, performance diagnostics, recovery values, biometrics or other health data within the meaning of Art. 9(1) GDPR are processed through KYDON, the client warrants that, before viewing and processing them, they have a valid legal basis (in particular the express, informed and voluntary consent of the athlete under Art. 9(2)(a) GDPR in conjunction with Art. 7 GDPR or, where applicable, section 26(3) BDSG). The application syncs health-related details (sleep, stress, heart rate, body composition, complaints) only once the client has confirmed in the application that these consents are in place; without that confirmation they stay on the client’s device.',
        'As between the parties, the client indemnifies the processor against all third-party claims arising from the client having processed released data without sufficient data protection legitimacy.',
      ],
    },
    {
      heading: 'Minor athletes',
      body: [
        'Before the client assigns a plan to a minor athlete or views the releases of a minor athlete, they obtain the consent of the legal guardians, either in the application or in writing, and keep it on file. Before sending a plan, the application requires the client’s express confirmation that the athlete is of legal age or that this consent is held; it cannot verify the consent. Sharing heart rate is technically excluded for athletes under 18 where the date of birth is known.',
      ],
    },
    {
      heading: 'Withdrawal of the release by the athlete',
      body: [
        'If an athlete withdraws their release towards the client through the platform, the processing on behalf of that client ends with regard to the future collection and synchronisation of this data. Data lawfully transmitted and assigned to the client until the withdrawal remains in the client’s responsibility, unless statutory deletion obligations stand in the way or the athlete asserts a request for erasure towards the client.',
      ],
    },
    {
      heading: '13. Acceptance, version, final provisions',
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
