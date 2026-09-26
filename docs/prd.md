# KYDON — Product Requirements Document

Stand: 26.09.2026 · Version 1.0 · Eigentümer: Produkt (Rinat S)

Dieses Dokument beschreibt, **was** KYDON ist, für wen, und was es können muss.
**Wie** es gebaut ist, steht in [architecture.md](architecture.md). Preislogik im
Detail: [preise.md](preise.md). Ausbauplan: [ausbau.md](ausbau.md).
Gestaltungsregeln und Strategie: [produktstrategie.md](produktstrategie.md).

---

## 1. Kurzfassung

KYDON ist eine Leistungsdiagnostik-App für Sportlerinnen, Sportler und Trainer.
Sie macht aus wiederkehrenden **Feldtests** belastbare Messungen: jeder Test mit
Protokoll, jedes Ergebnis gegen veröffentlichte Referenzwerte eingeordnet, jede
Veränderung gegen den Messfehler geprüft.

**Claim:** Measure. Benchmark. Develop.

KYDON ist **kein Workout-Tracker** und **kein Laborersatz**. Es ersetzt keine
Spiroergometrie, Laktatdiagnostik oder Kraftmessplatte. Es macht die Tests, die
man in jeder Halle, auf jeder Matte und jeder Bahn durchführen kann, so
verlässlich, dass man aus ihnen Entscheidungen ableiten darf.

## 2. Problem

- Leistungsdiagnostik im Labor ist teuer, selten und für die meisten
  Athletinnen und Athleten unerreichbar.
- Feldtests werden zwar gemacht, aber ohne einheitliches Protokoll. Ergebnisse
  aus zwei Terminen oder zwei Hallen sind nicht vergleichbar.
- Ein Wert ohne Einordnung sagt nichts: „42 Klimmzüge“ ist gut oder schlecht,
  je nach Sportart, Alter, Geschlecht und Leistungsstufe.
- Veränderungen werden überbewertet. Ein Zuwachs innerhalb des Messfehlers wird
  als Fortschritt gefeiert, ein echter Rückgang übersehen.
- Trainer verwalten Testtage in Tabellen, ohne Gruppenübersicht und ohne
  Nachweis, ob ihr Training wirkt.

## 3. Zielgruppen

| Gruppe | Beschreibung | Hauptbedürfnis |
|---|---|---|
| **Ambitionierte Athleten** | Kampfsport, Functional Fitness / HYROX, Ausdauer, Einsatzkräfte (Polizei, Feuerwehr, Militär). Trainieren gezielt, testen periodisch. | Wissen, wo sie stehen und ob ihr Training wirkt. |
| **Trainer (einzeln)** | Personal Trainer, Athletiktrainer, die Diagnostik als Leistung anbieten. | Testtage effizient durchführen, Ergebnisse professionell berichten. |
| **Trainerteams / Vereine** | Mehrere Trainer, gemeinsamer Athletenbestand. | Gemeinsam an denselben Athleten arbeiten, Gruppen vergleichen. |
| **Test-Termin-Kunden** | Einmalige Diagnostik (z. B. vor einer Saison). | Ein fundierter Bericht ohne Abo. |

Sprachen: Deutsch, Englisch, Französisch, Spanisch, Schwedisch, Dänisch,
Norwegisch (Bokmål), Niederländisch. Primärmarkt DACH, dann Nord- und Westeuropa.

## 4. Ziele und Nicht-Ziele

### Ziele
1. Jeder Test in KYDON ist reproduzierbar: Protokoll, Ausrüstung, Wertung.
2. Jedes Ergebnis wird eingeordnet — und nur dort, wo eine belastbare Quelle
   existiert. Wo keine existiert, sagt die App das.
3. Fortschritt wird nur behauptet, wenn er über dem Messfehler liegt.
4. Die App funktioniert offline in der Halle, Daten liegen zuerst auf dem Gerät.
5. Trainer können eine Gruppe in einer Einheit testen und das Ergebnis teilen.

### Nicht-Ziele
- Kein Trainingsplan-Generator. Eine Trainingsempfehlung aus dem Limiter wurde
  bewusst verworfen (siehe produktstrategie.md).
- Kein Ersatz für ärztliche oder labordiagnostische Untersuchungen; keine
  Diagnose im Sinne der MDR (Bewertung: [rechtspruefung-art9-mdr.md](rechtspruefung-art9-mdr.md)).
- Kein soziales Netzwerk. Teilen ja (Performance Card, Bericht), Feed nein.
- Keine erfundenen Normwerte. Platzhalter-Normen wurden entfernt.

## 5. Produktprinzipien

1. **Gemessen, nicht geschätzt.** Ein Test ohne Protokoll ist kein Test.
2. **Quelle oder Schweigen.** Referenzwerte tragen Studie, Stichprobe und
   Qualitätsstufe (A–D). Fehlt eine Referenz, bleibt die Achse leer statt null.
3. **Rauschen benennen.** Jede Veränderung bekommt ein Urteil: besser,
   schlechter, im Rauschen, Fehler unbekannt, Erstmessung.
4. **Lokal zuerst.** Das Gerät ist die Quelle; die Cloud ist Sicherung und
   Zusammenarbeit, keine Voraussetzung.
5. **Ehrlich verkaufen.** Keine Sperre mitten am Testtag; Grenzen werden
   angekündigt, mit Frist.

## 6. Kern-Journeys

### J1 — Athlet misst sich
1. Einstieg: Rolle, Person, Sportart, Ziel, Ausrüstung, Rhythmus, vorhandene
   Werte, Plan (Onboarding in 9 Schritten).
2. Test wählen (nach Sportart, Bereich oder Testbatterie), Protokoll lesen,
   mit Timer/Zähler durchführen, Wert speichern.
3. Ergebnis sehen: Einordnung gegen Referenz, Veränderung gegen eigenen
   Messfehler, „Was bedeutet das?“.
4. Übersicht: Radar-Profil, Performance Score (ab 3 Achsen mit Referenz),
   nächster sinnvoller Test.

### J2 — Testtag
1. Termin (Testtag) anlegen, Bedingungen einmal für den ganzen Tag erfassen.
2. Tests nacheinander durchführen, Zwischenstand je Athlet.
3. Abschluss: Zusammenfassung, Bericht, Einseiter.

### J3 — Trainer mit Gruppe
1. Athleten anlegen oder per CSV importieren, Einwilligung (auch für
   Minderjährige) einholen.
2. Gruppentest: ein Test, die ganze Gruppe, ein Eintrag je Athlet.
3. Auswertung: Heatmap, Athletenvergleich, Gruppenbericht, Wirksamkeitsnachweis.
4. Team: weitere Trainer einladen (ab Coach Team), gemeinsamer Bestand.

### J4 — Zwischen den Tests
Tagebuch (Schlaf, Belastung, Bereitschaft), Trainingslog, Ernährung, Cockpit
und Entscheidungslog, Gesundheit und Peak Week (Elite), Beobachtungswerte.

### J5 — Teilen und Behalten
Performance Card, Jahresrückblick, Export (CSV, ICS), Erinnerungen per Web
Push, Konto mit Synchronisierung, Übergabe eines Athleten.

## 7. Funktionale Anforderungen

Status: ✅ gebaut · 🟡 teilweise / hinter Schalter · ⬜ offen.

### 7.1 Messen
| ID | Anforderung | Status |
|---|---|---|
| M-1 | Testkatalog mit Protokoll, Ausrüstung, Wertung (derzeit 82 Tests) | ✅ |
| M-2 | Sportprofile je Disziplin mit eigenem Achsensatz (derzeit 49 Disziplinen in 11 Kategorien) | ✅ |
| M-3 | Testbatterien (derzeit 11, z. B. Judo, HYROX, Tactical) | ✅ |
| M-4 | Durchführung mit Timer, Zähler, Stufen; Wert nachträglich bearbeitbar | ✅ |
| M-5 | Beobachtungswerte als zweite Messart (Einschätzung statt Zahl) | ✅ |
| M-6 | Testtag als eigenes Objekt mit gemeinsamen Bedingungen | ✅ |
| M-7 | Gerätepflicht und Methodenbeleg je Test sichtbar | ✅ |

### 7.2 Einordnen
| ID | Anforderung | Status |
|---|---|---|
| E-1 | Referenzwerte mit Quelle (Studie, n), Methode, Qualitätsstufe A–D | ✅ |
| E-2 | Lücken ohne belastbare Referenz werden benannt, nicht gefüllt | ✅ |
| E-3 | Radar-Profil: persönliche Bestleistung oder Population (Perzentil), Fenster 18 Monate | ✅ |
| E-4 | Performance Score nur ab 3 Achsen mit Referenz | ✅ |
| E-5 | Veränderung gegen typischen Fehler (ab 4 Messungen, Faktor 1,96·√2) | ✅ |
| E-6 | Anforderungslücke zur Sportart, Formprognose, Saisonplan | ✅ (Plus) |
| E-7 | Community-Kohortenvergleich | ⬜ Bildschirm vorhanden, Daten fehlen |

### 7.3 Berichten
| ID | Anforderung | Status |
|---|---|---|
| B-1 | Ergebnisbildschirm mit Erklärung und Gruppeneinordnung | ✅ |
| B-2 | Bericht und Einseiter je Athlet, PDF | ✅ |
| B-3 | Performance Card (1080×1350) zum Teilen | ✅ |
| B-4 | Jahresrückblick | ✅ (Plus) |
| B-5 | Export CSV / ICS, CSV-Import | ✅ |

### 7.4 Trainer
| ID | Anforderung | Status |
|---|---|---|
| T-1 | Trainermodus mit mehreren Athleten, Athletenwahl | ✅ |
| T-2 | Gruppentest, Testtag für Gruppen | ✅ |
| T-3 | Heatmap, Vergleich, Gruppenbericht, Wirksamkeitsnachweis | ✅ |
| T-4 | Teams: Einladung per Link (14 Tage gültig, optional an E-Mail gebunden), gemeinsamer Bestand, Rollen Inhaber/Trainer | ✅ |
| T-5 | Eigenes Branding (White Label) ab Coach Team | ✅ |
| T-6 | Einwilligung mit Teamname, auch für Minderjährige | ✅ |

### 7.5 Zwischen den Tests
| ID | Anforderung | Status |
|---|---|---|
| Z-1 | Tagebuch (leicht frei, voll ab Plus) | ✅ |
| Z-2 | Trainingslog mit Übungskatalog | ✅ (Plus) |
| Z-3 | Ernährung mit Open Food Facts und kuratiertem Kern | ✅ (Pro) |
| Z-4 | Cockpit und Entscheidungslog | ✅ (Pro) |
| Z-5 | Gesundheit (Labor, Symptome, Zyklus …), Ende-zu-Ende verschlüsselt | 🟡 (Elite; Art.-9-Entscheidung offen) |
| Z-6 | Peak Week (nur Dokumentation), Sportmodul | ✅ (Elite) |
| Z-7 | Hinweise aus festen Regeln mit Belegen, Sperrfrist, Erledigt/Ausblenden (`/hinweise`) | ✅ (Regeln je nach Merkmal) |
| Z-8 | Tageskontext: Schlaf, Befinden, Belastung, HRV, Ruhepuls gegen die eigene 28-Tage-Bandbreite | ✅ |
| Z-9 | Belastung 7/28/90 Tage, zwölf Wochen, Monotonie, Strain (`/belastung`) | ✅ (Plus) |
| Z-10 | Ermüdungsresistenz aus Tests (frisch gegen ermüdet) im Verlauf | ✅ (Plus) |
| Z-11 | HYROX-Simulation und Kampfsport-Runden mit Auswertung (`/sportanalyse`) | ✅ (Plus, Trainerstufen ab Start) |
| Z-12 | Tagesspanne Kohlenhydrate/Protein nach Quelle, Verpflegung je Einheit, Gewichtsband, beobachteter Umsatz | ✅ (Pro) |
| Z-13 | HRV-Messung mit Brustgurt (Web Bluetooth, RMSSD und Ruhepuls → Tageskontext), eigene Einwilligung | ✅ (Chrome/Edge; iPhone erst mit nativer App) |

### 7.6 Konto, Sync, Abrechnung
| ID | Anforderung | Status |
|---|---|---|
| K-1 | Gast- und Demomodus ohne Konto | ✅ |
| K-2 | Konto per E-Mail und Passwort; Kontolöschung serverseitig | ✅ |
| K-3 | Synchronisierung mit Konfliktbehandlung (beide Stände bleiben) | ✅ |
| K-4 | Abonnements über Stripe: Kasse, Kundenportal, Stufenwechsel | 🟡 live nur mit `VITE_BILLING=on` |
| K-5 | Hochstufen anteilig und sofort, Herabstufen zur Verlängerung | ✅ |
| K-6 | Überschreitung der Athletengrenze: 14 Tage Frist, danach nur bereits gezählte Athleten messbar | ✅ |
| K-7 | Gründerpreis −30 % im ersten Jahr für die ersten 100 Trainer | 🟡 Stripe-Gutschein anzulegen |
| K-8 | App-Store-Version (Capacitor) | ⬜ geplant, [store-weg.md](store-weg.md) |

## 8. Pakete und Preise

Quelle der Wahrheit: `src/data/pricing.ts`. Begründung: [preise.md](preise.md).

**Athleten**

| Paket | Preis | Athleten | Kern |
|---|---|---|---|
| Kydon (frei) | 0 € | 1 | Messen, Verlauf, Fehlerband, eigenes Profil, Export, Erinnerungen, Tagebuch leicht |
| Plus | 49 €/Jahr · 4,90 €/Monat | 3 | Prognose, Saisonplan, Anforderungslücke, Perzentil, Sync, Card, Jahresrückblick, Trainingslog, Belastung, Ermüdungsresistenz, Sportanalyse |
| Pro | 99 €/Jahr · 9,90 €/Monat | 3 | + Ernährung, Entscheidungslog, Cockpit |
| Elite | 199 €/Jahr · 19,90 €/Monat | 3 | + Gesundheit, Peak Week, Sportmodul |
| Kydon Date | 69 € einmalig | 3 | Plus-Funktionen, Zielstandards, PDF-Bericht |

**Trainer** — alle mit Gruppentest, CSV-Import, Wirksamkeitsnachweis, unbegrenzten Berichten, PDF; ab Coach Start zusätzlich die Sportanalyse (HYROX, Kampfsport).

| Stufe | Preis | Gemessene Athleten/Jahr | Trainer |
|---|---|---|---|
| Coach Free | 0 € | 3 | 1 |
| Coach Start | 149 €/Jahr · 15 €/Monat | 10 | 1 |
| Coach Team | 349 €/Jahr · 35 €/Monat | 30 | 2 |
| Coach Pro | 649 €/Jahr · 65 €/Monat | 75 | 3 |
| Coach Club | 999 €/Jahr · 99 €/Monat | 150 | 5 |

Regeln: Gezählt wird für das Team, nicht je Trainer. Mitten am Testtag wird nie
gesperrt. Auto-Hochstufung nur mit Zustimmung des Inhabers.

## 9. Nicht-funktionale Anforderungen

| Bereich | Anforderung |
|---|---|
| **Offline** | Alle Kernfunktionen (Messen, Verlauf, Auswertung) ohne Netz. PWA mit Precache. |
| **Datenschutz** | DSGVO: Daten lokal zuerst, Sync nur mit Konto und Zustimmung; Gesundheitsdaten Ende-zu-Ende verschlüsselt; Analytics nur mit Einwilligung, ohne IP und User-Agent; Auftragsverarbeitung für Trainer. |
| **Sicherheit** | RLS auf allen Tabellen, statisch geprüft; strikte CSP; Geheimnisse nur in Umgebung/Vault; Security-Gate in CI ([sicherheit.md](sicherheit.md)). |
| **Sprachen** | 8 Sprachen vollständig; Rechtstexte nur DE/EN, in den übrigen Sprachen ausdrücklich so benannt. |
| **Geräte** | Telefon hoch und quer, Tablet, Desktop. Getestet in fünf Playwright-Profilen. |
| **Zugänglichkeit** | Tastaturbedienung, sichtbarer Fokus, Kontrast WCAG 2.1 AA (niedrigster Textwert 4,78:1), `prefers-reduced-motion`. |
| **Datenhaltung** | Schema versioniert (derzeit v26) mit Migrationen ohne Datenverlust; Import validiert. |
| **Leistung** | Bildschirme nachgeladen (Route-Splitting); Start ohne Netz. |

## 10. Erfolgskennzahlen

Vorschlag; Zielwerte werden nach den ersten 90 Tagen Livebetrieb festgelegt.

| Kennzahl | Definition |
|---|---|
| Aktivierung | Anteil neuer Nutzer mit mindestens einem gespeicherten Test in 7 Tagen |
| Wiederholung | Anteil Athleten mit einem zweiten Test desselben Typs innerhalb 90 Tagen |
| Belegter Fortschritt | Anteil Wiederholungen mit Urteil „besser“ außerhalb des Rauschens |
| Trainer-Nutzung | Gemessene Athleten je zahlendem Trainer und Jahr |
| Umwandlung | Anteil Konten mit bezahltem Paket nach 30 Tagen |
| Kündigung | Monatliche Abwanderung je Paket |

## 11. Abhängigkeiten

- Supabase (Datenbank, Auth, Edge Functions, Cron, Vault)
- Stripe (Abonnements, Kundenportal)
- Open Food Facts (Lebensmittelsuche, ODbL — [odbl.md](odbl.md))
- Netlify (Auslieferung — [auslieferung.md](auslieferung.md))
- Web Push (VAPID — [push.md](push.md))

## 12. Risiken

| Risiko | Umgang |
|---|---|
| Gesundheitsdaten (Art. 9 DSGVO) und Medizinprodukt-Abgrenzung (MDR) | Gesundheitsmodul hinter Elite und Verschlüsselung; rechtliche Prüfung offen |
| Referenzlücken in Nischendisziplinen | Lücken sichtbar machen statt füllen; Referenzen laufend ergänzen |
| Offline-Geräte behalten Teamdaten nach Austritt | Löschen beim nächsten Online-Gang; im Sicherheitsdokument benannt |
| Rechtstexte ohne Anwaltsprüfung | Vor öffentlichem Start prüfen lassen |
| Betreiberangaben fehlen (§ 5 DDG) | `src/data/operator.ts` vor Start befüllen |

## 13. Offene Punkte vor dem öffentlichen Start

1. Betreiberangaben im Impressum (`src/data/operator.ts`).
2. Anwaltliche Prüfung der Rechtstexte; Entscheidung Art. 9 / MDR.
3. Stripe einrichten: Preise, Gründer-Gutschein, Webhook-Ereignisse; dann
   `VITE_BILLING=on` und `VITE_FOUNDER_OFFER=on`.
4. Domain-Aufteilung Landingpage / App festlegen (`VITE_APP_URL`).
5. Merch-Shop-Adresse (`VITE_MERCH_URL`).
6. Datenschutzerklärung um die Brustgurt-Messung ergänzen (Bluetooth, Puls
   und HRV als Gesundheitsdaten, lokale Verarbeitung der Schlagfolge).
7. Rechtelage der Referenzquellen klären: 14 offene Fälle in
   [referenzlizenzen.md](referenzlizenzen.md).

## 14. Ausblick

- Community-Kohortenvergleich, sobald genug zugestimmte Daten vorliegen.
- App-Store-Version über Capacitor — vollständiger Plan in
  [native-app.md](native-app.md).
- Weitere Referenzwerte für Disziplinen mit Lücken.
- Wearable- und Gesundheitsanbindungen (Tabelle `health_connections` vorbereitet).
