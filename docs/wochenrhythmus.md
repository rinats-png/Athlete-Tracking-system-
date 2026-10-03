# Wochenrhythmus: warum man jede Woche reinschaut, und wo KI hilft

**Stand:** 3. Oktober 2026 · **Status:** Plan, nichts davon gebaut. Es ist ein Vorschlag zur Entscheidung, keine Zusage. Preise, Rechtstexte und die Wahl eines KI-Anbieters ändere ich nur nach Freigabe (CLAUDE.md, §21).

Alle Zahlen zu Kosten und Nutzerverhalten sind Schätzungen oder Annahmen, keine Messwerte. Sie sind als solche markiert und gehören mit echten Nutzern geprüft.

## 1. Der Grundgedanke

Tests macht man vier- bis sechsmal im Jahr. Das reicht nicht als Gewohnheit. Eine Wochengewohnheit entsteht, wenn vier Dinge zusammenkommen:

1. **Die Daten kommen von allein.** Import und später Anbindung, dazu ein täglicher Aufwand von höchstens 20 Sekunden.
2. **Die App liefert eine Aussage.** Nicht «hier sind 14 Diagramme», sondern «das ist diese Woche neu, das ist zu tun».
3. **Ein fester Zeitpunkt.** Die App meldet sich, zum Beispiel Montagmorgen.
4. **Eine zweite Person wartet auf das Ergebnis.** Der Trainer schaut Montag in die Liste, also füllt der Athlet sie Sonntag aus. Das ist der stärkste der vier Punkte.

Zahlen soll der Trainer, weil das Cockpit ihm Zeit spart. Der Athlet ist im Trainerplan dabei und verbreitet das Produkt. Hobbyathleten zahlen nur für Pro.

## 2. Was es schon gibt

Das meiste Material liegt schon da. Es fehlt der **Wochenablauf**, der es zusammenführt.

| Baustein | Stand im Code |
|---|---|
| Coach-Cockpit, Signale, Decision-Log | da (`domain/cockpit.ts`, `features/coach/CoachSignals.tsx`) |
| Verfügbarkeit und Neulinge als Trainer-Signale | da (`domain/availability.ts`) |
| Selbsteinschätzung vor einem Termin | da, aber nur vor Testterminen (`domain/readiness.ts`) |
| Nachmess-Erinnerungen, nächster Test | da (`domain/reminders.ts`, `nextTest.ts`) |
| Saison- und Wettkampfrahmen mit drei Kontrollpunkten | da (`domain/seasonPlan.ts`) |
| Testtag, Gruppentest, Gruppenbericht, Heatmap | da |
| Push-Themen (Nachmessung, Termine, Aktivität an Trainer) | da (`docs/push.md`) |
| Trainingslast, Tagebuch, Fortschritt gegen Messfehler | da (`domain/load.ts`, `diary.ts`, `change.ts`) |
| Läufe-Auswertung, Rennprognose, Wetter (verborgen) | da (Läufe Stufen 1 bis 4) |
| Fuel (Pro) | da |
| Einladung und Verbindung Trainer–Athlet | da (`JoinTeamScreen`, `coach_athlete_links`) |

**Was fehlt:** ein täglicher Anlass, ein Wochenbrief, ein Wochenblick für den Trainer, eine laufende Datenquelle und die KI-Schicht.

## 3. Die Bausteine, nach Wirkung sortiert

### A. Für Athleten

| # | Baustein | Was es tut | Neu oder Ausbau |
|---|---|---|---|
| A1 | **Montagsbrief** | Eine Seite: Form, der eine Befund, Wochenumfang gegen Ziel, nächster Schritt, Link zum Check. Ohne Netz aus lokalen Daten gebaut, per Push angekündigt. | Neu (setzt `runFinding`, `load`, `reminders` zusammen) |
| A2 | **20-Sekunden-Check am Morgen** | Schlaf, Gefühl, Ruhepuls, HRV (wenn vorhanden). Zeigt, wo der Tag zur **eigenen** Normalspanne liegt, mit dem Messfehler als Grenze. Keine Ampel, **keine Trainingsfreigabe** (§82). | Ausbau von `readiness.ts`; braucht Migration (Schema +1) |
| A3 | **Zielplan** | Ziel mit Countdown, Taper-Projektion (existiert in `runMetrics`), **Wochenplan gegen Ist**: Der Plan kommt vom Athleten oder Trainer, KYDON vergleicht nur und schreibt keinen Trainingsplan vor (§81). | Ausbau (`seasonPlan`, `runMetrics`) |
| A4 | **Testrhythmus mit Fortschrittsmoment** | «Dein Mini-Test (10 Minuten) ist fällig». Danach: «Echt besser, nicht nur Rauschen» nur, wenn die Änderung über dem Messfehler liegt (`change.ts`). Das kann kein Konkurrent glaubwürdig. | Ausbau (`nextTest`, `change`) |
| A5 | **Laufende Daten** | Erst Datei-Import (da), dann direkte Strava-Anbindung. Ohne sie bleibt alles Handarbeit. | Neu (Edge Function mit Secrets in Vault; Rechtstext nach Freigabe) |
| A6 | **Fuel-Wochenplan** für den langen Lauf | Im Brief als Zeile, Pro-Teil. | Ausbau (`fuelPlan`) |

### B. Für Trainer

| # | Baustein | Was es tut | Neu oder Ausbau |
|---|---|---|---|
| B1 | **Montags-Cockpit «Diese Woche»** | Eine Liste: Wer braucht Aufmerksamkeit? Je Zeile ein Grund (Belastungssprung, Check fehlt, Wert auffällig gegenüber eigener Spanne, Retest überfällig), mit Link. Der Kern, für den der Trainer zahlt. | Neu als Ansicht, Signale existieren |
| B2 | **Wochenbericht** an Athlet, Eltern oder Verband | Automatisch erzeugt, der Trainer prüft und sendet. | Ausbau (`GroupReportScreen`, Bericht) |
| B3 | **Check-in-Quote** | Wer hat diese Woche geantwortet? Das ist der Haken, der Athleten zum täglichen Öffnen bringt. | Neu (hängt an A2) |
| B4 | **Testtag-Planer mit Teamvergleich** | Vorbereiten, erfassen, Auswertung. | Da; nur Feinschliff |
| B5 | **Nachricht an Athlet** | Ein Satz zurück aus dem Cockpit. Schließt die Schleife. | Teils da (Push Trainer-Nachricht) |
| B6 | **Rückkehr nach Pause oder Verletzung** | Belastung schrittweise steuern. **Nicht ohne Rechtsprüfung** (Nähe zu Medizinprodukt, `docs/rechtspruefung-art9-mdr.md`). | Zurückgestellt, anhalten und fragen |

### C. Die Schleife (der eigentliche Trick)

Athlet macht den Check → Trainer sieht das Cockpit → Trainer schreibt zurück → Athlet öffnet die App wieder. Ohne die Rückmeldung des Trainers zerfällt die Gewohnheit nach zwei bis drei Wochen (Annahme).

## 4. Wo KI hilft und wo nicht

### Grundsatz (verbindlich)

**Zahlen und Urteile kommen aus `src/domain`, nie vom Sprachmodell.** Die KI formuliert und sortiert, sie rechnet nicht und entscheidet nicht. Das hält Regel 6 (keine erfundenen Normen), Regel 7 (besser/schlechter nur gegen den Messfehler) und Regel 9 (Fachlogik nur im Domainteil) ein und macht jede Aussage prüfbar.

Technisch heißt das:

- Das Modell bekommt nur **fertige Fakten** als JSON (zum Beispiel `kind: easy_too_hard`, Zahlen, Zeitraum), ohne Namen und ohne Rohdaten.
- Seine Ausgabe wird **geprüft**: Jede Zahl im Text muss in den Fakten vorkommen, sonst gilt die **Vorlage ohne KI** als Ergebnis.
- **Ohne Netz oder bei Fehler** erscheint immer die Vorlage. Messen und Auswerten hängen nie an der KI (Regel 3).
- Aufruf nur über eine **Edge Function** (Schlüssel im Vault, nie im Client, Regel 1). Das Recht darauf wird **serverseitig** nach Plan geprüft (Regel 5), mit Monatsgrenze je Konto.

### Einsatzorte, nach Nutzen und Risiko

| # | Wo | Was die KI tut | Risiko | Wann |
|---|---|---|---|---|
| K1 | **Montagsbrief** (A1) | Schreibt die Fakten in zwei, drei gut lesbare Sätze in der Sprache des Nutzers. Ton: sachlich, keine Heilsversprechen. | niedrig (Fakten kommen vorgefertigt, Prüfung der Zahlen) | Phase 3 |
| K2 | **Trainer-Cockpit** (B1) | Fasst die Signale der Woche in einen Absatz zusammen und **entwirft** Antworten an Athleten. Der Trainer bearbeitet und sendet, nie automatisch. | niedrig bis mittel (Entwurf, Mensch entscheidet) | Phase 3 |
| K3 | **Wochenbericht** (B2) | Entwirft den Fließtext aus den Berichtsdaten für Eltern oder Verband. | mittel (Text geht nach außen, der Trainer prüft) | Phase 3 |
| K4 | **Fragen an die eigenen Daten** | «Wie hat sich mein Tempo bei gleichem Puls entwickelt?» Das Modell wählt aus einem **festen Katalog** vorhandener Auswertungen (Tool-Aufruf), die Antwort wird aus den Domain-Ergebnissen gebaut. Kein freies Rechnen. | mittel | Phase 4 |
| K5 | **Import-Helfer** | Schlägt für unbekannte Spalten einer Datei eine Zuordnung vor, der Nutzer bestätigt. Erweitert `activityImport`. | niedrig (nur Zuordnung, Bestätigung nötig) | Phase 2 |
| K6 | **Tippfehler-Prüfung** | Erkennt unplausible Eingaben. **Erst als Regeln**, KI nur wo Regeln nicht reichen. | niedrig | laufend |
| K7 | **Sprachnotiz ins Tagebuch** | Diktat wird zum strukturierten Eintrag. Spracherkennung im Browser sendet Audio an Dritte, deshalb nur mit eigener Einwilligung oder gar nicht. | hoch (Datenschutz) | später, offen |
| K8 | **Essensfoto in Fuel** | Schätzt Mahlzeit aus dem Bild. Ungenau, haftungsnah. | hoch | später, offen |

**Wo KI bewusst nicht hinkommt:** Bewertung von Messwerten, Schwellen, «besser oder schlechter», Trainingsfreigabe, Prognosezeiten, Rückkehr nach Verletzung, alles mit Normwerten.

### Datenschutz und Recht (hier muss ich bei dir nachfragen)

- Auch Pulswerte und Schlaf sind Gesundheitsdaten (Art. 9 DSGVO). Ohne **eigene Einwilligung je Kategorie** und einen **Auftragsverarbeitungsvertrag** mit dem Anbieter geht nichts davon an ein Modell. Das gilt für alle KI-Punkte außer K5 und K6 ohne Modell.
- Mein Vorschlag: **nur Fakten ohne Namen und Rohdaten**, Region EU, kein Training mit unseren Daten, kein Speichern der Inhalte beim Anbieter, Protokoll nur mit Zähler.
- Was auf einer Datenschutz-Seite stehen müsste, schreibe ich als **Entwurf** in `docs/`, nicht live. Anbieterauswahl und Vertrag sind deine Entscheidung.
- Minderjährige: KI-Texte über Minderjährige nur mit der Einwilligung der Eltern, im Zweifel gar nicht.

### Kosten (Schätzung, nicht gemessen)

Ein Brief oder Cockpit-Absatz ist klein (rund 1.000 Token hinein, 200 heraus). Mit einem kleinen Modell liegt das im Bereich **Bruchteile eines Cents pro Brief**. Bei 1.000 aktiven Konten mit je 4 Briefen im Monat sind das voraussichtlich **einstellige bis niedrige zweistellige Euro im Monat**. Teurer wird K4 (Fragen mit mehreren Schritten) und alles mit Bildern. Deshalb eine **Monatsgrenze je Konto** und keine freie Nutzung. Genaue Preise des Anbieters sind vor der Entscheidung zu prüfen, ich kenne sie nicht verlässlich.

## 5. Was dafür bezahlt wird

Das Preismodell bleibt, wie es ist. Vorschlag zur Zuordnung, **ohne Preisänderung** (die liegt bei dir):

| Wer | Plan | Enthält aus diesem Plan |
|---|---|---|
| Athlet, Frei | – | Montagsbrief ohne KI (Vorlage), 20-Sekunden-Check, Testrhythmus |
| Athlet, Plus | 49 € | zusätzlich Zielplan, Tagebuch-Verlauf |
| Athlet, Pro | 99 € | zusätzlich Läufe, Fuel-Zeile im Brief, **KI-Formulierung des Briefs**, Fragen an die Daten |
| Trainer | Coach-Stufen | Montags-Cockpit, Check-in-Quote, Wochenbericht, **KI-Entwürfe**; Athleten der Stufe sind mit dabei |

Die **Schranken dafür setzt der Server** (`entitlements`, Regel 5), und es wird nie mitten am Testtag gesperrt (Regel 8).

## 6. Reihenfolge

| Phase | Inhalt | Dauer (Schätzung) | Prüfung der Wirkung |
|---|---|---|---|
| **0** | Montagsbrief (A1) ohne KI und Cockpit «Diese Woche» (B1) aus vorhandenen Signalen; neues Push-Thema `weekly` | 2 bis 3 Wochen | Öffnen am Montag |
| **1** | 20-Sekunden-Check (A2) mit Migration, Check-in-Quote (B3), Rückmeldung (B5) | 3 bis 4 Wochen | Anteil Athleten mit ≥ 4 Checks pro Woche |
| **2** | Strava-Anbindung (A5), Import-Helfer (K5), Zielplan gegen Ist (A3) | 4 bis 6 Wochen | Anteil mit laufendem Datenstrom |
| **3** | KI-Schicht v1 (K1, K2, K3) mit Prüfung der Zahlen und Vorlage als Rückfall | 3 bis 4 Wochen | Lesezeit und «nützlich»-Rückmeldung |
| **4** | Fragen an die Daten (K4), Fortschrittsmoment (A4) | 3 bis 4 Wochen | Nutzung pro Konto |
| **Später** | Rückkehr nach Verletzung (B6, nur nach Rechtsprüfung), K7, K8 | offen | – |

**Frühe Probe:** Nach Phase 0 und 1 geben **fünf Trainer** es mit ihren Athleten **acht Wochen** in die Hand. Ohne sie sollten Phase 2 bis 4 nicht anlaufen.

### Woran wir nach acht Wochen merken, ob es trägt (Zielwerte sind Annahmen)

- Trainer öffnet das Cockpit in mindestens 6 von 8 Wochen.
- Mehr als die Hälfte der eingeladenen Athleten macht den Check an mindestens 4 Tagen pro Woche.
- Mindestens 3 von 5 Trainern würden den Plan weiterzahlen (direkt fragen, nicht raten).
- Der Zeitgewinn des Trainers (selbst berichtet) liegt über einer Stunde pro Woche.

Erfüllt es das nicht, **ändern wir den Zuschnitt, bevor mehr gebaut wird**.

## 7. Risiken

- **Wellness-Abfragen und Monitoring gibt es schon** von etablierten Anbietern. Unser Vorsprung ist die redliche Auswertung gegen den Messfehler, die Offline-Fähigkeit und ein Preis für kleine Vereine. Ob das reicht, ist offen.
- **Trainer haben wenig Geduld.** Das Cockpit muss in Woche eins Zeit sparen, sonst bleibt es ungenutzt.
- **Der Check ist subjektiv.** Er darf nie wie eine Freigabe wirken (§82). Die Sprache dort entscheidet über das rechtliche Risiko.
- **Die KI kann plausibel Falsches schreiben.** Deshalb die Zahlenprüfung und die Vorlage als Rückfall; trotzdem nie als Quelle eines Urteils.
- **Zu viel gleichzeitig.** Die bisherige Breite (Läufe, Fuel, Push, Wetter, KI) ist selbst ein Risiko. Dieser Plan ist deshalb als **ein Keil** gebaut.

## 8. Was ich von dir brauche

1. **Zielgruppe zuerst:** Trainer von Teams oder Vereinen, oder einzelne ambitionierte Athleten? (Mein Vorschlag: Trainer.)
2. **Fünf Trainer** für die Probe: Kennst du sie? Das entscheidet das Tempo mehr als jede Zeile Code.
3. **KI-Anbieter und Region**, und ob ein Auftragsverarbeitungsvertrag möglich ist.
4. **Monatsgrenze** für KI-Aufrufe pro Konto (Vorschlag: eine feste kleine Zahl je Plan).
5. **Strava-Anbindung:** ja oder erst später? Sie braucht eine Entwicklerfreigabe von Strava und Rechtstext.
6. **Schema-Änderung** für den Check (Migration, RLS in derselben Migration): einverstanden?
