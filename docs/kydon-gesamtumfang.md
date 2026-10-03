# KYDON — der gesamte Umfang der App

**Stand:** 3. Oktober 2026 · Zahlen aus dem Code gezählt (Testkatalog, Schema 29), Preise aus `src/data/pricing.ts`.
Dieses Dokument fasst zusammen, was KYDON ist, für wen es gedacht ist, was man damit tun kann und was als Nächstes geplant ist. Die Detailquellen stehen am Ende.

---

## 1. Was KYDON ist

KYDON ist eine **Leistungsdiagnostik-App für Athleten und Trainer**, gebaut als Web-App (PWA, auch auf dem Telefon nutzbar).
Sie macht aus wiederkehrenden **Feldtests** belastbare Messungen: Jeder Test hat ein Protokoll, jedes Ergebnis wird gegen veröffentlichte Referenzwerte eingeordnet, und jede Veränderung wird gegen den **Messfehler** geprüft, bevor die App «besser» oder «schlechter» sagt.

**Claim:** Measure. Benchmark. Develop.

**Was KYDON nicht ist:** kein Workout-Tracker, kein Laborersatz (keine Spiroergometrie, keine Laktatdiagnostik), kein Trainingsplan-Generator, keine ärztliche Diagnose und kein soziales Netzwerk.

### Die Prinzipien (die harten Regeln)

1. **Gemessen, nicht geschätzt.** Ein Test ohne Protokoll ist kein Test.
2. **Quelle oder Schweigen.** Keine Referenzwerte ohne Quelle, keine Platzhalter-Normen. Fehlt eine Referenz, bleibt die Achse leer und die App sagt das.
3. **Rauschen benennen.** «Besser» oder «schlechter» nur, wenn die Änderung größer ist als der Messfehler.
4. **Lokal zuerst.** Das Gerät ist die Quelle der Daten. Messen funktioniert ohne Netz. Die Cloud ist Sicherung und Zusammenarbeit, keine Voraussetzung.
5. **Ehrlich verkaufen.** Nie mitten am Testtag sperren. Freischaltungen schreibt nur der Server.
6. **Geheimnisse nie im Client**, Fachlogik nur im reinen Domainteil, jeder Oberflächentext in allen 8 Sprachen.

## 2. Für wen

| Gruppe | Beschreibung | Was sie braucht |
|---|---|---|
| **Ambitionierte Athleten** | Kampfsport, Functional Fitness und HYROX, Ausdauer, Einsatzkräfte (Polizei, Feuerwehr, Militär) | Wissen, wo sie stehen und ob ihr Training wirkt |
| **Trainer (einzeln)** | Personal Trainer und Athletiktrainer, die Diagnostik als Leistung anbieten | Testtage effizient durchführen, Ergebnisse professionell berichten |
| **Trainerteams und Vereine** | Mehrere Trainer, gemeinsamer Athletenbestand | Gemeinsam an denselben Athleten arbeiten, Gruppen vergleichen |
| **Termin-Kunden** | Einmalige Diagnostik, zum Beispiel vor einer Saison | Ein fundierter Bericht ohne Abo |

**Sprachen:** Deutsch, Englisch, Französisch, Spanisch, Schwedisch, Dänisch, Norwegisch (Bokmål), Niederländisch. Primärmarkt ist DACH, danach Nord- und Westeuropa.

## 3. Der Umfang in Zahlen

| Bereich | Umfang |
|---|---|
| Tests im Katalog | **125** (Ausdauer 36, Kraftausdauer 23, Kondition 23, Power 16, Maximalkraft 15, Schnelligkeit 6, Agilität 6) |
| Beobachtungswerte (zweite Messart) | **39** aktive |
| Disziplinen mit eigenem Profil | **50** in **11** Kategorien |
| Testbatterien | **11** (zum Beispiel Judo, HYROX, Tactical) |
| Übungen im Trainingslog | **72** |
| Lebensmittel im kuratierten Kern | **245** in 19 Kategorien, dazu die Open-Food-Facts-Suche |
| Bilder | **125 Tests und 39 Beobachtungswerte** haben ein Bild; die 72 Übungen noch nicht |
| Sprachen | **8**, vollständig |
| Datenschema | Version **29** mit Migrationen ohne Datenverlust |

## 4. Was man damit tun kann

### 4.1 Messen

- **Testkatalog** durchsuchen nach Sportart, Bereich oder Testbatterie. Jeder Test hat ein Protokoll, Ausrüstung, Wertung, Methodenbeleg und ein Bild.
- **Durchführung mit Timer, Zähler und Stufen**, auch ohne Netz. Werte lassen sich nachträglich bearbeiten.
- **Testtag** als eigenes Objekt: Bedingungen einmal erfassen, mehrere Athleten über mehrere Stationen, Laufplan als Rundlauf.
- **Beobachtungswerte** (Schlaf, Ruhepuls, DOMS, Screening, Körper …) werden erfasst und im Verlauf gezeigt, aber nie bewertet.
- **HRV-Messung** mit Bluetooth-Brustgurt (RMSSD und Ruhepuls, mit eigener Einwilligung; Chrome und Edge, iPhone erst mit einer nativen App).

### 4.2 Einordnen

- **Referenzwerte mit Quelle**, Methode und Qualitätsstufe A bis D.
- **Radar-Profil** pro Athlet: gegen die persönliche Bestleistung oder gegen eine Population (Perzentil), Fenster 18 Monate.
- **Performance Score** erst ab drei Achsen mit Referenz.
- **Veränderung gegen den typischen Fehler** (ab vier Messungen): besser, schlechter, im Rauschen, Fehler unbekannt oder Erstmessung.
- **Anforderungslücke** zur Sportart, **Formprognose** und **Saisonplan** (Plus): drei Kontrollpunkte rückwärts vom Wettkampf. Der Plan legt fest, wann gemessen wird, nicht was trainiert wird.
- **Nächster sinnvoller Test** und **Nachmess-Erinnerungen** aus dem eigenen Rhythmus.
- **Hinweise** aus festen Regeln mit Belegen, mit Sperrfrist und «erledigt» oder «ausblenden».

### 4.3 Zwischen den Tests

- **Tagebuch** (leicht kostenlos, voll ab Plus): Schlaf, Belastung, Bereitschaft.
- **Trainingslog** mit Übungskatalog (Plus).
- **Belastung** über 7, 28 und 90 Tage, zwölf Wochen, Monotonie und Strain (Plus), **Ermüdungsresistenz** aus Tests.
- **Sportanalyse:** HYROX-Simulation und Kampfsport-Runden mit Auswertung.
- **Ernährung** (Pro): Tagesspanne Kohlenhydrate und Protein nach Quelle, Gewichtsband, beobachteter Umsatz.
- **Fuel** (Pro): Verpflegungsplanung je Einheit, zunächst Ausdauer, danach Kampfsport; Supplements mit Hinweis auf Evidenz und Verlinkung.
- **Cockpit und Entscheidungslog** (Pro): Signale aus 7 gegen 28 Tage, jede Schwelle von einem Menschen gesetzt, mit Nachverfolgung der Entscheidungen.
- **Gesundheit, Peak Week, Sportmodul** (Elite): Labor, Symptome und Zyklus Ende-zu-Ende verschlüsselt; die Art.-9-Entscheidung ist offen.

### 4.4 Läufe (Analyse → Reiter «Läufe», Pro)

Auswertung von Läufen und Einheiten aus **Strava- oder Garmin-Listen** (Datei-Import; direkte Anbindung später).

- **Befund:** der eine Befund der Woche (zum Beispiel «lockere Läufe nicht locker», Umfangssprung, starke Belastung) mit Grundlage «belegt» oder «Hinweis».
- **Formkurve** (Fitness, Ermüdung, Form nach Banister), **Skyline des Jahres**, **Wochenumfang mit Ringen**.
- **Rennprognose** aus VDOT (Daniels und Gilbert) und Riegel als **Spanne**, Zielzeit als «ehrgeizig, realistisch, sicher», **nie als Prozent-Chance**.
- **Tempo bei gleichem Puls**, Intensitätsverteilung in fünf Zonen, Gewohnheiten, Rekorde, Schuhkilometer, «Daten und Annahmen» mit allen Formeln.
- **Rennwetter** (Open-Meteo) nur auf Tipp des Nutzers, bis zur Freigabe des Datenschutztextes **verborgen**. Gesendet werden nur Ort und Tag, nie Läufe oder Puls.
- Die Läufe bleiben **auf dem Gerät** und gehen nicht in die Synchronisierung.

### 4.5 Berichten und Teilen

- **Ergebnisbildschirm** mit Erklärung und Gruppeneinordnung, **Bericht und Einseiter** je Athlet (PDF), **Performance Card** (1080×1350) zum Teilen, **Jahresrückblick** (Plus).
- **Export** als CSV und ICS, **CSV-Import**, Erinnerungen per **Web Push**, Konto mit **Synchronisierung**, **Übergabe** eines Athleten.

### 4.6 Für Trainer

- **Trainermodus** mit mehreren Athleten und Athletenwahl.
- **Gruppentest:** ein Test, die ganze Gruppe, ein Eintrag je Athlet. **Testtag** für Gruppen.
- **Heatmap, Athletenvergleich, Gruppenbericht, Wirksamkeitsnachweis.**
- **Signale:** wer fällt, wer ist neu.
- **Teams:** Einladung per Link (14 Tage gültig, optional an eine E-Mail gebunden), gemeinsamer Bestand, Rollen Inhaber und Trainer, **eigenes Branding** ab Coach Team.
- **Einwilligung** mit Teamname, auch für Minderjährige.
- **Push an den Trainer**, wenn ein verbundener Athlet etwas einträgt (der Athlet kann das ausschalten).

### 4.7 Konto und Sicherheit

Gast- und Demomodus ohne Konto, Konto per E-Mail, Synchronisierung mit Konfliktbehandlung (beide Stände bleiben), serverseitige Kontolöschung, Zugriffsregeln (RLS) auf allen Tabellen, strikte Inhaltsrichtlinie, «Was ist neu»-Hinweis bei einer neuen App-Fassung.

## 5. Pakete und Preise

Quelle der Wahrheit: `src/data/pricing.ts`. Der Bezahlweg über Stripe ist gebaut, scharf aber erst mit `VITE_BILLING=on`.

**Athleten**

| Paket | Preis | Kern |
|---|---|---|
| Kydon (frei) | 0 € | Messen, Verlauf, Fehlerband, eigenes Profil, Export, Erinnerungen, Tagebuch leicht |
| Plus | 49 €/Jahr · 4,90 €/Monat | Prognose, Saisonplan, Anforderungslücke, Perzentil, Sync, Card, Jahresrückblick, Trainingslog, Belastung, Ermüdungsresistenz, Sportanalyse |
| Pro | 99 €/Jahr · 9,90 €/Monat | zusätzlich Ernährung und Fuel, Läufe-Auswertung, Entscheidungslog, Cockpit |
| Elite | 199 €/Jahr · 19,90 €/Monat | zusätzlich Gesundheit, Peak Week, Sportmodul |
| Kydon Date | 69 € einmalig | Plus-Funktionen, Zielstandards, PDF-Bericht |

**Trainer** (alle mit Gruppentest, CSV-Import, Wirksamkeitsnachweis, unbegrenzten Berichten, PDF)

| Stufe | Preis | Athleten pro Jahr | Trainer |
|---|---|---|---|
| Coach Free | 0 € | 3 | 1 |
| Coach Start | 149 €/Jahr | 10 | 1 |
| Coach Team | 349 €/Jahr | 30 | 2 |
| Coach Pro | 649 €/Jahr | 75 | 3 |
| Coach Club | 999 €/Jahr | 150 | 5 |

Gezählt wird für das Team. Überschreitung der Athletengrenze: 14 Tage Frist. Hochstufen anteilig und sofort, Herabstufen zur Verlängerung. Gründerpreis −30 % im ersten Jahr für die ersten 100 Trainer (Stripe-Gutschein noch anzulegen).

## 6. Technik in Kürze

React 19, Vite, Tailwind 4, **lokaler Speicher zuerst**, Supabase (Datenbank, Auth, Edge Functions, Cron, Vault), Stripe, Netlify. Fachlogik rein in `src/domain` (ohne React, Netz und Speicher), Kataloge in `src/data`. Playwright-Prüffälle, Sicherheits-Gate (RLS-Prüfung, Geheimnissuche, `npm audit`), Kontrast nach WCAG 2.1 AA, Tastaturbedienung. Eigenständige Landingpage mit three.js.

## 7. Stand und offene Punkte

**Gebaut:** Messen, Einordnen, Berichten, Trainerfunktionen, Zwischen-den-Tests-Module, Konto und Sync, Bezahlweg, Push, Läufe (Stufen 1 bis 4), Fuel, alle 8 Sprachen, Bilder für Tests und Beobachtungswerte.

**Offen vor dem öffentlichen Start:**

1. Betreiberangaben im Impressum (`src/data/operator.ts`).
2. Anwaltliche Prüfung der Rechtstexte; Art. 9 DSGVO und Medizinprodukt-Abgrenzung für das Gesundheitsmodul.
3. Stripe einrichten (Preise, Gründer-Gutschein, Webhook), dann `VITE_BILLING=on`.
4. Supabase-Migrationen und die `push`-Function ausrollen (liegt bei dir).
5. Datenschutztexte ergänzen: Brustgurt-Messung, Push, Fuel, Rennwetter (Entwurf in `docs/rennwetter-datenschutz.md`).
6. Wetterdienst: Open-Meteo ist nur nichtkommerziell frei; Alternative (MET Norway über eigene Edge Function) offen.
7. Rechtslage der Referenzquellen (14 offene Fälle).
8. Domain-Aufteilung Landingpage und App, Merch-Adresse.
9. Bilder für die 72 Übungen (Bildauftrag liegt bereit, die Anzeige dafür fehlt noch).

**Ausblick laut Produktplan:** Community-Kohortenvergleich (der Bildschirm steht, die Daten fehlen), App-Store-Version über Capacitor, weitere Referenzwerte, Wearable-Anbindungen.

---

## 8. Plan: der Wochenrhythmus (damit man jede Woche reinschaut und dafür zahlt)

**Status: Plan, nichts davon gebaut.** Er ist ein Vorschlag zur Entscheidung. Preise, Rechtstexte und die Wahl eines KI-Anbieters ändere ich nur nach deiner Freigabe. Zahlen zu Kosten und Nutzerverhalten sind Schätzungen. Vollständig: `docs/wochenrhythmus.md`.

### 8.1 Der Grundgedanke

Tests macht man vier- bis sechsmal im Jahr, das trägt keine Gewohnheit. Eine Wochengewohnheit braucht vier Dinge:

1. **Die Daten kommen von allein** (Import, später Anbindung, täglicher Aufwand höchstens 20 Sekunden).
2. **Die App liefert eine Aussage statt Diagramme.**
3. **Ein fester Zeitpunkt**, zum Beispiel Montagmorgen per Push.
4. **Eine zweite Person wartet auf das Ergebnis.** Der Trainer schaut Montag in die Liste, also füllt der Athlet sie Sonntag aus.

Der **Trainer** zahlt, weil das Cockpit ihm Zeit spart, seine Athleten sind dabei. **Hobbyathleten** zahlen nur für Pro.

### 8.2 Die Bausteine

**Für Athleten**

| # | Baustein | Inhalt |
|---|---|---|
| A1 | **Montagsbrief** | Eine Seite: Form, der eine Befund, Wochenumfang gegen Ziel, nächster Schritt. Lokal gebaut, per Push angekündigt. |
| A2 | **20-Sekunden-Check am Morgen** | Schlaf, Gefühl, Ruhepuls, HRV. Zeigt den Tag gegenüber der **eigenen** Normalspanne, mit dem Messfehler als Grenze. Keine Ampel, keine Trainingsfreigabe. |
| A3 | **Zielplan** | Ziel mit Countdown, Taper-Projektion, Wochenplan gegen Ist. Den Plan liefert Athlet oder Trainer, KYDON vergleicht nur. |
| A4 | **Testrhythmus mit Fortschrittsmoment** | «Dein Mini-Test ist fällig», danach «echt besser, nicht nur Rauschen» nur über dem Messfehler. |
| A5 | **Laufende Daten** | Datei-Import, später direkte Strava-Anbindung. |
| A6 | **Fuel-Wochenplan** | Eine Zeile im Brief für den langen Lauf (Pro). |

**Für Trainer**

| # | Baustein | Inhalt |
|---|---|---|
| B1 | **Montags-Cockpit «Diese Woche»** | Wer braucht Aufmerksamkeit, je Zeile ein Grund (Belastungssprung, Check fehlt, Wert auffällig, Retest überfällig). Der Kern, für den ein Trainer zahlt. |
| B2 | **Wochenbericht** | Automatisch erzeugt für Athlet, Eltern oder Verband, vom Trainer geprüft. |
| B3 | **Check-in-Quote** | Wer hat diese Woche geantwortet? |
| B4 | **Testtag-Planer mit Teamvergleich** | Ist da, braucht nur Feinschliff. |
| B5 | **Nachricht an Athlet** | Schließt die Schleife aus dem Cockpit. |
| B6 | **Rückkehr nach Pause oder Verletzung** | **Zurückgestellt**, nur nach Rechtsprüfung (Nähe zum Medizinprodukt). |

**Die Schleife:** Athlet macht den Check → Trainer sieht das Cockpit → Trainer schreibt zurück → Athlet öffnet die App wieder.

### 8.3 Wo KI hilft und wo nicht

**Grundsatz (verbindlich):** Zahlen und Urteile kommen aus `src/domain`, nie vom Sprachmodell. Die KI **formuliert und sortiert**, sie rechnet nicht und entscheidet nicht.

- Das Modell bekommt nur **fertige Fakten** als JSON, ohne Namen und ohne Rohdaten.
- Seine Ausgabe wird **geprüft**: Jede Zahl im Text muss in den Fakten vorkommen, sonst erscheint die **Vorlage ohne KI**.
- **Ohne Netz oder bei Fehler** erscheint immer die Vorlage. Messen und Auswerten hängen nie an der KI.
- Aufruf nur über eine **Edge Function** (Schlüssel im Vault), das Recht darauf prüft der Server nach Plan, mit **Monatsgrenze** je Konto.

| # | Einsatzort | Was die KI tut | Risiko | Phase |
|---|---|---|---|---|
| K1 | Montagsbrief | Schreibt die Fakten in zwei, drei sachliche Sätze in der Sprache des Nutzers | niedrig | 3 |
| K2 | Trainer-Cockpit | Fasst die Signale der Woche zusammen und **entwirft** Antworten; der Trainer bearbeitet und sendet | niedrig bis mittel | 3 |
| K3 | Wochenbericht | Entwirft den Fließtext für Eltern oder Verband, der Trainer prüft | mittel | 3 |
| K4 | Fragen an die eigenen Daten | Wählt aus einem **festen Katalog** vorhandener Auswertungen, kein freies Rechnen | mittel | 4 |
| K5 | Import-Helfer | Schlägt für unbekannte Spalten eine Zuordnung vor, der Nutzer bestätigt | niedrig | 2 |
| K6 | Tippfehler-Prüfung | Erst Regeln, KI nur wo Regeln nicht reichen | niedrig | laufend |
| K7 | Sprachnotiz ins Tagebuch | Diktat wird zum Eintrag; Datenschutz heikel | hoch | später |
| K8 | Essensfoto in Fuel | Schätzt eine Mahlzeit aus dem Bild; ungenau | hoch | später |

**Bewusst ohne KI:** Bewertung von Messwerten, Schwellen, «besser oder schlechter», Trainingsfreigabe, Prognosezeiten, Rückkehr nach Verletzung, alles mit Normwerten.

**Datenschutz:** Pulswerte und Schlaf sind Gesundheitsdaten (Art. 9 DSGVO). Ohne eigene Einwilligung je Kategorie und einen Auftragsverarbeitungsvertrag geht nichts davon an ein Modell. Vorschlag: nur Fakten ohne Namen, Region EU, kein Training mit unseren Daten, kein Speichern der Inhalte beim Anbieter. KI-Texte über Minderjährige nur mit Einwilligung der Eltern.

**Kosten (Schätzung):** Ein Brief ist klein (rund 1.000 Token hinein, 200 heraus), mit einem kleinen Modell ein Bruchteil eines Cents. Bei 1.000 Konten mit je 4 Briefen im Monat voraussichtlich einstellige bis niedrige zweistellige Euro im Monat. Teurer werden Fragen mit mehreren Schritten und Bilder, deshalb eine Monatsgrenze je Konto. Die Preise des Anbieters sind vor der Entscheidung zu prüfen.

### 8.4 Was dafür bezahlt wird (Vorschlag, ohne Preisänderung)

| Wer | Plan | Enthält aus diesem Plan |
|---|---|---|
| Athlet, Frei | – | Montagsbrief ohne KI, 20-Sekunden-Check, Testrhythmus |
| Athlet, Plus | 49 € | zusätzlich Zielplan, Tagebuch-Verlauf |
| Athlet, Pro | 99 € | zusätzlich Läufe, Fuel-Zeile im Brief, KI-Formulierung des Briefs, Fragen an die Daten |
| Trainer | Coach-Stufen | Montags-Cockpit, Check-in-Quote, Wochenbericht, KI-Entwürfe; die Athleten der Stufe sind dabei |

Die Schranken setzt der Server. Mitten am Testtag wird nie gesperrt.

### 8.5 Reihenfolge

| Phase | Inhalt | Dauer (Schätzung) | Prüfung der Wirkung |
|---|---|---|---|
| **0** | Montagsbrief ohne KI, Cockpit «Diese Woche» aus vorhandenen Signalen, Push-Thema `weekly` | 2 bis 3 Wochen | Öffnen am Montag |
| **1** | 20-Sekunden-Check (mit Migration), Check-in-Quote, Rückmeldung | 3 bis 4 Wochen | Anteil Athleten mit mindestens 4 Checks pro Woche |
| **2** | Strava-Anbindung, Import-Helfer, Zielplan gegen Ist | 4 bis 6 Wochen | Anteil mit laufendem Datenstrom |
| **3** | KI-Schicht v1 (K1 bis K3) mit Zahlenprüfung und Vorlage als Rückfall | 3 bis 4 Wochen | Lesezeit, «nützlich»-Rückmeldung |
| **4** | Fragen an die Daten (K4), Fortschrittsmoment (A4) | 3 bis 4 Wochen | Nutzung pro Konto |
| **Später** | Rückkehr nach Verletzung (nur nach Rechtsprüfung), K7, K8 | offen | – |

**Frühe Probe:** Nach Phase 0 und 1 testen **fünf Trainer** mit ihren Athleten **acht Wochen**. Ohne sie sollten Phase 2 bis 4 nicht anlaufen.

**Woran wir nach acht Wochen merken, ob es trägt** (Zielwerte sind Annahmen): Trainer öffnet das Cockpit in mindestens 6 von 8 Wochen; mehr als die Hälfte der Athleten macht den Check an mindestens 4 Tagen pro Woche; mindestens 3 von 5 Trainern würden weiterzahlen; der Zeitgewinn liegt über einer Stunde pro Woche. Erfüllt es das nicht, ändern wir den Zuschnitt, bevor mehr gebaut wird.

### 8.6 Entscheidungen, die ich von dir brauche

1. **Zielgruppe zuerst:** Trainer von Teams oder Vereinen (mein Vorschlag) oder einzelne ambitionierte Athleten?
2. **Fünf Trainer** für die Probe.
3. **KI-Anbieter und Region**, Auftragsverarbeitungsvertrag möglich?
4. **Monatsgrenze** für KI-Aufrufe je Konto.
5. **Strava-Anbindung** jetzt oder später (braucht Entwicklerfreigabe von Strava und Rechtstext).
6. **Schema-Änderung** für den täglichen Check (Migration mit RLS in derselben Migration).

## 9. Ehrliche Einschätzung

**Stärken:** Die Disziplin ist selten: Bewertung nur gegen den Messfehler, keine erfundenen Normwerte, Quellen für Formeln, offline und lokal zuerst. Das ist glaubwürdig und unterscheidet KYDON von Apps, die alles in Ampeln pressen. Der Umfang ist groß und sauber gebaut.

**Schwächen und Risiken:**
- **Zu breit, zu früh.** Diagnostik, Trainerwerkzeug, Ernährung, Laufanalyse, Push und KI sind fünf Produkte für verschiedene Zielgruppen.
- **Starker Wettbewerb** bei Läufern und Radfahrern (Strava, Garmin, TrainingPeaks, Intervals.icu). Dort gewinnt KYDON nicht.
- **Kein täglicher Anlass.** Tests sind selten. Genau das soll der Wochenrhythmus lösen.
- **Rechtliche Offenheit:** Gesundheitsdaten (Art. 9), Medizinprodukt-Abgrenzung, Rechtstexte ohne Anwaltsprüfung.
- **Die stärkste Nische** ist das Werkzeug für Trainer und Vereine, die regelmäßig mit Gruppen testen. Dort sind Offline-Fähigkeit, Messfehler-Logik und Gruppenerfassung echte Argumente.

Marktdaten, Nutzerzahlen und Zahlungsbereitschaft kenne ich nicht. Das sind Einschätzungen aus dem Stand des Codes und der Dokumentation, die mit echten Nutzern geprüft werden müssen.

## 10. Quellen im Repository

| Thema | Datei |
|---|---|
| Produkt (PRD, teils älterer Stand) | `docs/prd.md` |
| Architektur, harte Regeln | `docs/architecture.md` |
| Preise und Begründung | `docs/preise.md`, `src/data/pricing.ts` |
| Läufe | `docs/laeufe.md` |
| Rennwetter, Datenschutz-Entwurf | `docs/rennwetter-datenschutz.md` |
| Wochenrhythmus und KI (Plan) | `docs/wochenrhythmus.md` |
| Fuel | `docs/fuel.md` |
| Push | `docs/push.md` |
| Sicherheit | `docs/sicherheit.md` |
| Bilder | `docs/bildauftrag.md`, `docs/uebungsbilder.md` |
| Testbibliothek | `docs/testbibliothek.md`, `docs/testprotokoll-v1.md` |
