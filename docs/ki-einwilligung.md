# Einwilligung in die Formulierung durch ein Sprachmodell

**Fassung:** `2026-10-11` (`AI_CONSENT_VERSION` in
`supabase/functions/_shared/phrase.ts`)
**Stand:** 11. Oktober 2026

> **Wichtig:** Dieser Text wurde nach bestem Stand der DSGVO und der
> KI-Verordnung (Verordnung (EU) 2024/1689) entworfen. Er ersetzt keine
> anwaltliche Prüfung. Die Punkte im Abschnitt «Vor dem Live-Gang prüfen»
> müssen mit dem Vertrag des Anbieters und einer Rechtsberatung abgeglichen
> werden, bevor `phrase` live ausgerollt wird.

## 1 Was die Funktion tut

Auf Tipp «Als Text formulieren» schickt KYDON die **Fakten** einer Antwort an
ein Sprachmodell (Anthropic, Claude). Gemeint sind die Antworten aus «Fragen
an KYDON» und der Wochenbrief. Das Modell formuliert daraus Fließtext.

Fakten sind feste Kennwörter und Zahlen, etwa:
- Veränderung +3,2 %, Schwelle 2,8 %;
- 4 Messungen;
- Belastung der Woche 1 840 bei einem Schnitt von 1 620;
- an 5 Tagen ein Check-in.

Der Zahlenwächter prüft jede Zahl im Text. Besteht der Text die Prüfung
nicht, erscheint die feste Antwort.

**Nicht gesendet werden:**
- Name und E-Mail-Adresse;
- Notizen, Tagebuch und andere Freitexte;
- Daten der Gesundheitsschicht (Art. 9 DSGVO);
- Kontokennung und IP-Adresse, weil der Aufruf von der Serverfunktion
  kommt.

## 2 Einwilligungstext (in der App, Deutsch)

Er steht so in `src/i18n/de.extra.json` unter `aiConsent`, dazu gibt es die
Fassungen in sieben weiteren Sprachen.

> **Einwilligung: Texte von einem Sprachmodell formulieren lassen**
>
> - **Was gesendet wird:** nur die Fakten dieser Antwort – feste Kennwörter
>   und Zahlen, etwa „Veränderung +3,2 %, Schwelle 2,8 %“. Das Sprachmodell
>   formuliert daraus einen Text. KYDON prüft jede Zahl darin und zeigt
>   sonst die feste Antwort.
> - **Was nicht gesendet wird:** dein Name, deine E-Mail-Adresse, Notizen,
>   Tagebuch- und andere Freitexte, Daten der Gesundheitsschicht und
>   Kennungen deines Kontos.
> - **Empfänger:** Anthropic (Sprachmodell Claude) als Auftragsverarbeiter.
>   Die Verarbeitung kann in den USA stattfinden; die Übermittlung stützt
>   sich auf Standardvertragsklauseln. Der Anbieter nutzt die Daten nicht
>   zum Training seiner Modelle. KYDON speichert weder Fakten noch Text –
>   nur, wie oft du die Funktion im Monat genutzt hast, und diese
>   Einwilligung.
> - Texte des Sprachmodells sind als solche gekennzeichnet. Das Modell
>   formuliert nur um: Es bewertet nichts, stellt keine Diagnose und trifft
>   keine Trainingsentscheidung.
> - **Freiwillig:** Ohne Einwilligung funktioniert KYDON vollständig – die
>   Antworten erscheinen dann als feste Texte. Rechtsgrundlage ist deine
>   Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
>
> Du kannst die Einwilligung jederzeit im Profil unter „Daten“ widerrufen,
> mit Wirkung für die Zukunft. *Mehr in der Datenschutzerklärung*
>
> ☐ Ich bin mindestens 16 Jahre alt.
>
> [ Einwilligen und formulieren ]   [ Nicht jetzt ]

Die ausführliche Fassung steht in der Datenschutzerklärung im Abschnitt
«Texte von einem Sprachmodell (nur mit Einwilligung)», auf Deutsch und
Englisch.

## 3 Wie die Anforderungen erfüllt sind

| Anforderung | Norm | Umsetzung |
|---|---|---|
| freiwillig | Art. 4 Nr. 11, Art. 7 Abs. 4 DSGVO | App voll nutzbar ohne; «Nicht jetzt» gleich gross; keine Kopplung an Stufe oder Funktionen |
| informiert | Art. 4 Nr. 11, Art. 13 DSGVO | fünf Punkte direkt in der Frage (was, was nicht, wer, wo, Zweck); Link zur Erklärung |
| unmissverständlich, aktiv | Art. 4 Nr. 11 DSGVO | Tipp auf «Einwilligen», nichts vorausgewählt |
| vor der Verarbeitung | Art. 6 Abs. 1 lit. a DSGVO | Client sendet ohne Einwilligung nichts; **Server prüft zusätzlich** (`ai_consents`) |
| nachweisbar | Art. 7 Abs. 1 DSGVO | Tabelle `ai_consents`: Fassung, Zeitpunkt, Altersbestätigung, Widerruf (RLS: nur eigene Zeile) |
| widerrufbar, so leicht wie erteilt | Art. 7 Abs. 3 DSGVO | ein Knopf im Profil; auf dem Gerät sofort wirksam; Server wird nachgetragen, wenn offline |
| Mindestalter | Art. 8 DSGVO (Deutschland: 16) | Selbstbestätigung «mindestens 16»; Server verlangt `age_confirmed` |
| neue Fassung → neu fragen | Art. 7 DSGVO | `AI_CONSENT_VERSION`; der Server lehnt eine ältere Fassung ab |
| Drittlandübermittlung | Art. 44 ff., Art. 46 Abs. 2 lit. c DSGVO | Standardvertragsklauseln im AV-Vertrag des Anbieters (siehe Prüfpunkte) |
| Auftragsverarbeitung | Art. 28 DSGVO | Anthropic in `PROCESSORS` und in der Erklärung |
| Datensparsamkeit | Art. 5 Abs. 1 lit. c, Art. 25 DSGVO | nur Kennwörter und Zahlen; `sanitizeFacts` doppelt (Client und Server); nichts gespeichert |
| Kennzeichnung KI-Text | Art. 50 KI-VO (gilt seit 2.8.2026) | «Von einem Sprachmodell formuliert» unter jedem Modelltext |
| keine Entscheidung durch KI | Doktrin §28–31; Art. 22 DSGVO | Modell formuliert nur; Urteile kommen aus `change.ts` und der Fachlogik |

**Gesundheitsdaten:** Es gehen keine Daten der Gesundheitsschicht hinaus.
Leistungs- und Trainingszahlen sind nach herrschender Auffassung keine
Gesundheitsdaten im Sinn von Art. 9 DSGVO. Gelangen künftig etwa
Ruhepuls oder HRV in die Fakten, reicht Art. 6 nicht mehr: Dann braucht es
eine **ausdrückliche** Einwilligung nach Art. 9 Abs. 2 lit. a, und die
Fassung muss steigen.

**TDDDG § 25:** Der Merker auf dem Gerät (`kydon.ai.consent.v1`) speichert
nur den Stand der Einwilligung für eine Funktion, die die Person selbst
anfordert. Er gilt als unbedingt erforderlich und braucht keine eigene
Einwilligung.

## 4 Trainer und Athletendaten: bewusst gesperrt

Im Trainermodus und für Nachrichtenentwürfe über Athleten (`draft`) ist die
Funktion **aus**.

- Der Grund: Dort verarbeitet KYDON Daten, für die der Trainer
  Verantwortlicher ist. Anthropic wäre dann **Unterauftragsverarbeiter**.
- Der AV-Vertrag (Abschnitt 6) verlangt dafür **30 Tage Vorankündigung in
  der App** mit Widerspruchsrecht.
- Die Sperre gilt auf drei Ebenen:
  - im Client (`PhraseButton`, Trainermodus);
  - in der Liste der erlaubten Arten (`PHRASE_KINDS_ENABLED`);
  - auf dem Server (`kind_disabled`).

**Weg zur Freischaltung:**
1. Nachtrag zum AV-Vertrag, Abschnitt 6, Liste der Unterauftragsverarbeiter:
   > Anthropic — Formulierung von Nachrichtenentwürfen und Zusammenfassungen
   > durch ein Sprachmodell, nur wenn der Verantwortliche die Funktion
   > nutzt. Übermittelt werden Kennwörter und Zahlen ohne Namen; Ort:
   > Vereinigte Staaten, Standardvertragsklauseln; kein Training mit den
   > Daten.
2. `DPA_VERSION` erhöhen. Der Trainerbereich zeigt dann die neue Fassung zur
   Annahme an.
3. Hinweis in der App mit Datum, **30 Tage vor** dem Einschalten.
4. Nach Ablauf `draft` in `PHRASE_KINDS_ENABLED` aufnehmen. Die Sperre im
   Trainermodus bleibt bestehen, bis der Trainer die neue Fassung
   angenommen hat.

## 5 Vor dem Live-Gang prüfen

Das ist eine Rechtsfrage und keine Code-Frage. Diese Angaben stehen im Text
und müssen mit dem tatsächlichen Vertrag übereinstimmen:

- [ ] **Vertragspartner und AV-Vertrag:** Ist der kommerzielle Vertrag mit
      Anthropic abgeschlossen, einschließlich Auftragsverarbeitung (DPA)?
      Welche Gesellschaft ist Vertragspartner?
- [ ] **Übermittlungsgrundlage:**
  - Standardvertragsklauseln im DPA des Anbieters, oder eine
    Zertifizierung nach dem EU-US Data Privacy Framework.
  - Den Text danach anpassen. Er nennt bisher Standardvertragsklauseln.
- [ ] **Kein Training:** Die Zusage «nutzt die Daten nicht zum Training»
      muss in den aktuellen kommerziellen Bedingungen stehen.
- [ ] **Speicherdauer beim Anbieter:** Die Erklärung sagt «befristet zur
      Missbrauchserkennung». Die konkrete Frist nur nennen, wenn sie
      vertraglich feststeht.
- [ ] **Region:**
  - `ANTHROPIC_BASE_URL` in der Umgebung der Funktion.
  - Läuft die Verarbeitung nachweislich in der EU, kann der Text das
    sagen. Bis dahin bleibt «kann in den USA stattfinden».
- [ ] **Verzeichnis der Verarbeitungstätigkeiten** (Art. 30): Eintrag
      «Formulierung durch Sprachmodell».
- [ ] **Datenschutz-Folgenabschätzung** (Art. 35): Die Schwellwertprüfung
      dokumentieren. Bei pseudonymen Leistungszahlen, Einwilligung und ohne
      Profiling ist eine volle Folgenabschätzung voraussichtlich nicht
      nötig; das Ergebnis trotzdem festhalten.
- [ ] **Impressum und Betreiberangaben** vollständig (`data/operator.ts`).
- [ ] **KI-Kompetenz** (Art. 4 KI-VO, gilt seit 2.2.2025): Wer die Funktion
      betreut, kennt ihre Grenzen. Kurz dokumentieren.

## 6 Technik in Kürze

- **Migration** `20261011120000_ai_consents.sql`: Tabelle mit RLS (lesen,
  anlegen, ändern nur die eigene Zeile, kein Löschen durch den Client).
  Beim Löschen des Kontos verschwindet sie mit (`on delete cascade`).
- **Edge Function `phrase`:** prüft der Reihe nach Stufe, erlaubte Art,
  Einwilligung (Fassung, kein Widerruf, Altersbestätigung) und Kontingent.
  Erst danach geht eine Anfrage an den Anbieter.
- **Client:**
  - `lib/aiConsent.ts`: Stand, Einwilligen, Widerrufen, Widerruf
    nachtragen;
  - `features/shared/AiConsent.tsx`: Frage und Einstellung im Profil;
  - `components/PhraseButton.tsx`: fragt vor dem ersten Aufruf.
- **Reihenfolge beim Ausrollen:**
  1. Migration einspielen;
  2. `phrase` ausrollen;
  3. erst danach den Schalter `VITE_AI_PHRASE` nutzen.

  Heute steht der Schalter schon auf `on`. Weil `phrase` live fehlt, fällt
  jeder Aufruf auf die feste Vorlage zurück; gesendet wird nichts.
