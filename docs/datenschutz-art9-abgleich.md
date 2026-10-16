# Gesundheitsnahe Angaben im Abgleich (Art. 9 DSGVO)

Stand: 13.10.2026 · gehört zu «Konto Pflicht, Abgleich automatisch»

## Warum

Seit das Konto Pflicht ist und der Abgleich von selbst läuft, ist «Abgleich
einschalten» keine Einwilligung mehr. Für Leistungsdaten trägt der Vertrag
(Art. 6 Abs. 1 lit. b). Einige Angaben können aber Gesundheitsdaten sein; für
sie braucht es eine **ausdrückliche Einwilligung** (Art. 9 Abs. 2 lit. a).

## Welche Angaben

Die Liste steht an genau einer Stelle: `src/domain/sensitiveData.ts`.

| Bereich | Felder |
|---|---|
| Befinden | Tagebuch: Schlafdauer, Schlafqualität, Energie, Stress, Muskelkater; Testtermin: Readiness |
| Herz | Beobachtungen HRV und Ruhepuls; Ruhepuls in Profil und Körperwerten; Puls (Mittel, Max) erledigter Einheiten |
| Körper | Körperfett (Körperwerte, Beobachtungen DXA/BIA), Magermasse, Grundumsatz |
| Beschwerden | Magen-Darm-Angabe und Energiegefühl einer Einheit, Schmerzmarke, CK-Wert, DOMS |

Nicht dabei: die Gesundheitsschicht und die Peak Week — die gehen nie in den
Abgleich (`stripHealth`), mit oder ohne diese Einwilligung.

## Ablauf

1. **Registrierung:** eigener Block, freiwillig, nicht vorausgewählt, mit
   Altersbestätigung (16). Trainer bestätigen, dass die Einwilligungen ihrer
   Athleten vorliegen (`kind = 'coach'`). Ohne Haken entsteht das Konto
   trotzdem (keine Kopplung, Art. 7 Abs. 4).
2. Die Wahl liegt zuerst auf dem Gerät (`kydon.sensitive.consent.v1`,
   `pending`), weil es vor der E-Mail-Bestätigung keine Sitzung gibt. Sie
   gilt nur für die E-Mail, mit der sie getroffen wurde.
3. **Jeder Abgleich** (`resolveSensitiveConsent`) schickt eine offene Wahl
   zum Server und fragt dann `sensitive_consents`. Nur bei gültiger
   Einwilligung (aktuelle Fassung, nicht widerrufen) gehen die Felder mit;
   sonst filtert `athleteWithoutSensitive` sie aus Dokument und
   Tagebuchzeilen. Ist der Server nicht erreichbar oder die Tabelle fehlt:
   nein.
4. **Wechsel** (Einwilligung oder Widerruf): der nächste Abgleich schreibt
   alle Zeitreihen neu (`kydon.sync.sensitiveMode`); das Dokument wird ohnehin
   neu geschrieben, weil es sich unterscheidet. So verschwinden die Angaben
   nach einem Widerruf vom Server.
5. **Profil → Daten:** Stand, Einwilligen, Widerrufen; danach sofortiger
   Abgleich (sofern er nicht ausgeschaltet ist).

## Nachweis

Tabelle `sensitive_consents` (Migration `20261013100000`, RLS: nur eigene
Zeile, kein Löschen durch Clients, Kaskade mit dem Konto): Fassung, Rolle,
Zeitpunkt, Altersbestätigung, Widerruf. Neue Textfassung →
`SENSITIVE_CONSENT_VERSION` anheben; dann gilt die alte als nicht erteilt.

## Grenzen

- Freitexte (Notizen, «Einschränkungen») werden nicht gefiltert; was jemand
  dort schreibt, entscheidet er selbst.
- Zwei Geräte desselben Kontos mit unterschiedlichem Wissensstand gleichen
  sich beim nächsten Lauf an, weil der Server die Wahrheit ist.
- In einem Trainerteam entscheidet die Einwilligung des jeweils
  abgleichenden Trainers.
- Die Migration muss live eingespielt werden
  (`supabase/einspielen/offene_migrationen.sql`). Bis dahin gehen die Felder
  bei niemandem mit.
