# KYDON – Produktdoktrin und Zielarchitektur

> ## Nachtrag 1 (4. Oktober 2026): Trainingsplanung aus belegten Regeln
>
> **Entscheidung des Inhabers.** Die Doktrin wird an einer Stelle geändert: KYDON darf Trainingspläne erzeugen, aber nur unter diesen Bedingungen. Wo dieser Nachtrag einer Aussage weiter unten widerspricht (§1 «empfiehlt nicht, wie…», §5, §26, §45, §46, §49 «kein Trainingsplaner»), gilt der Nachtrag. Alles andere bleibt.
>
> 1. **Jeder Plan hat einen Grund, jeder Grund hat Evidenz, jeder Block endet mit einer erneuten Messung.** Ohne gemessene Lücke und ohne Messung am Blockende wird nichts geplant.
> 2. **Deterministisch.** Die Planlogik stammt aus hinterlegten Regeln im Code (`src/domain`, `src/data`). Ein Sprachmodell erfindet keine Regel, keine Dosis und keine Zahl; es darf höchstens formulieren (§28 gilt unverändert).
> 3. **Jede Regel trägt Quelle, Evidenzstärke, Spezifität und Prüfstatus.** Evidence Strength, Specificity und Data Confidence bleiben getrennt und werden nie zu einem Score verrechnet (§11).
> 4. **Prüfstatus.** Eine Regel ist `unreviewed` oder `reviewed`. Nur geprüfte Regeln gehen in einen Plan, den ein Mensch ohne Vorschauschalter sieht. Geprüft heißt: eine fachkundige Person (Sportwissenschaft oder Trainer) hat Quelle und Regel gegengelesen, mit Namen und Datum im Register. Ungeprüfte Regeln erscheinen nur hinter dem Bau-Schalter `VITE_TRAINING_PLAN=preview` und sind dort sichtbar als ungeprüft gekennzeichnet.
> 5. **Der Trainer hat das letzte Wort.** Jeder Planvorschlag ist änderbar; Änderungen tragen einen Grund (Coach Override). Der Athlet sieht, ob ein Plan vom Trainer geändert wurde.
> 6. **Keine Medizin.** Weiterhin keine Diagnose, keine Behandlung, keine Rückkehr-Freigabe, keine Gewichtmachen-Automatik, keine Verletzungsvorhersage, keine zyklusbasierten Empfehlungen (§25, §45 bleiben).
> 7. **Wo die Evidenz nicht reicht, gibt es keine Regel.** `INSUFFICIENT` heißt: keine automatische Verordnung, nur Beschreibung und ein Hinweis, dass die Lage offen ist.
> 8. **Der Wächter-Test bleibt.** Texte beschreiben und begründen; sie urteilen nicht über Personen und behaupten keine Ursachen aus Gleichzeitigem (§29).
>
> Umsetzung und Reihenfolge: [training-engine.md](training-engine.md).

**Stand:** 4. Oktober 2026  
**Zweck:** Verbindliche Leitlinie für die weitere Produktentwicklung von KYDON.

## 1. Strategische Grundentscheidung

KYDON soll **nicht** zu einem „Performance Operating System für alles“ werden.

Die Kernidee lautet:

> **KYDON ist die Antwort auf die Frage „Was nun?“ – für Athleten, Trainer und Teams, ehrlich, messbar und belegt.**

KYDON empfiehlt nicht, **wie** ein Athlet trainieren soll.  
KYDON zeigt, **was seine Daten belegen**, wo Daten fehlen und was sinnvoll erneut überprüft werden sollte.

Die bestehende Stärke von KYDON liegt bereits in standardisierten Tests, dokumentierten Protokollen, Referenzwerten mit Quellen, Messfehler-/Typical-Error-Logik, wiederholter Leistungsdiagnostik, Gruppen- und Testtag-Workflows, Trainerfunktionen, Fuel als ergänzendem Leistungsmodul sowie datenbasierter statt intuitiver Bewertung.

Diese Stärken sollen verdichtet werden, statt immer neue Produktbereiche hinzuzufügen.

## 2. Zentrale Produktdoktrin

### 2.1 Was KYDON sagen darf

KYDON darf:

- Messwerte darstellen.
- Veränderungen darstellen.
- Veränderungen gegen bekannte Messfehler einordnen.
- Populations- und Sport-Benchmarks zeigen.
- Perzentile anzeigen.
- fehlende Daten benennen.
- veraltete Daten kennzeichnen.
- messbare Leistungsunterschiede sichtbar machen.
- Auffälligkeiten gegenüber der eigenen Baseline darstellen.
- gleichzeitig aufgetretene Veränderungen beschreiben.
- Evidenz und Quellen hinter Aussagen zeigen.
- einen sinnvollen nächsten Test empfehlen.
- auf fällige Retests hinweisen.
- Fuel-Anforderungen für eine konkrete Belastung beschreiben.
- Trainer auf Athleten aufmerksam machen, deren Daten geprüft werden sollten.

### 2.2 Was KYDON nicht sagen darf

KYDON soll grundsätzlich **nicht**:

- Trainingspläne erzeugen.
- Übungen als Lösung für eine Leistungslücke vorschreiben.
- Trainingsvolumen eigenständig erhöhen oder reduzieren.
- Trainingsfreigaben geben.
- medizinische Diagnosen stellen.
- Verletzungsrisiken prognostizieren.
- Return-to-Sport-Freigaben erteilen.
- aus Korrelationen Ursachen ableiten.
- unbelegte Sportmodelle mit erfundenen Prozentgewichten erzeugen.
- fehlende Referenzdaten durch geschätzte Normwerte ersetzen.
- Gesundheitsrisiken aus unsicheren Daten diagnostizieren.
- gefährliche Weight-Cut- oder Dehydratationsprotokolle automatisieren.

## 3. Der Markenkern

> **Keine Aussage ohne Quelle.  
> Keine Veränderung ohne Messfehler.  
> Keine Ursache aus Korrelation.  
> Keine Sicherheit, wo Daten fehlen.**

Kurzform:

> **Wir sagen dir, was belegbar ist – und schweigen, wo es nicht belegbar ist.**

## 4. Die fünf Kernfragen der App

### Frage 1 – Wo stehe ich?

- aktuelles Leistungsprofil
- letzte valide Tests
- persönliche Bestwerte
- Populationsreferenzen
- Sportreferenzen
- Perzentile
- Testalter
- Messmethode
- Datenqualität
- Data Confidence

### Frage 2 – Wo liegen meine messbaren Lücken?

Nicht: „Was limitiert mich?“

Mögliche Inhalte:

- vorhandene Messwerte versus belegte Sportanforderungen
- niedriger ausgeprägte Leistungsdimensionen
- fehlende Messbereiche
- Unterschiede zu Vergleichsgruppen
- Abdeckung des Sportprofils
- veraltete Daten
- fehlende Testdaten

Eine messbare Lücke darf nicht automatisch als Ursache für Wettkampfleistung dargestellt werden.

### Frage 3 – Was ist diese Woche auffällig?

- Veränderung oberhalb des Messfehlers
- neue persönliche Bestleistung
- ungewöhnliche Belastung
- fehlender Check-in
- fälliger Retest
- veraltete Leistungsdaten
- auffälliger Verlauf gegenüber persönlicher Baseline
- Fuel-Anforderung einer geplanten Belastung
- bevorstehender Wettkampf

### Frage 4 – Was hat sich wirklich verändert?

Jede Veränderung soll eingeordnet werden als:

- **Meaningful improvement**
- **Meaningful decline**
- **Within measurement noise**
- **Measurement error unknown**
- **First measurement**
- **Method not comparable**

### Frage 5 – Was sollte als Nächstes überprüft werden?

- Retest
- bisher fehlende Leistungsdimension
- veralteter Test
- unvollständiges Sportprofil
- Messung mit besserer Methode
- Competition Check
- Fuel-Rehearsal
- persönlicher Verlauf
- Trainerreview

## 5. Erlaubte Next Actions

| Typ | Beispiel |
|---|---|
| **Measure** | „CMJ erneut testen; letzte Messung ist 9 Wochen alt.“ |
| **Review** | „Power liegt außerhalb deiner üblichen Schwankung. Details prüfen.“ |
| **Monitor** | „Belastung lag diese Woche deutlich über deinem 28-Tage-Verlauf.“ |
| **Fuel** | „Für die geplante 120-Minuten-Einheit gilt ein höherer Kohlenhydratbedarf.“ |
| **Communicate** | „Trainer kann diese Veränderung prüfen und kommentieren.“ |

Nicht erlaubt:

- „Mach mehr Plyometrie.“
- „Reduziere dein Trainingsvolumen.“
- „Trainiere mehr Zone 2.“
- „Du brauchst mehr Regeneration.“

## 6. Neue Informationsarchitektur

### Athlete Navigation

- **Today**
- **Performance**
- **Test**
- **Fuel**
- **More**

### Coach Navigation

- **Today**
- **Athletes**
- **Test**
- **Team**
- **More**

## 7. Das Wochen-Home

Das Wochen-Home wird das Zentrum der App.

Maximal drei bis fünf wirklich relevante Aussagen.

Beispiel:

### THIS WEEK

**Performance**  
Aerobic Capacity ↑  
Power →  
Recovery-Daten unvollständig

**One thing that matters**  
Lower-body power ist aktuell die größte messbare Lücke innerhalb des vorhandenen HYROX-Profils.

**Today**  
Intervals – 75 min  
Fuel Demand: HIGH

**Next Assessment**  
CMJ – fällig in 4 Tagen

**Event**  
HYROX Frankfurt – 23 Tage

## 8. Athlete Performance Profile

Zentrales Objekt:

> **Athlete Performance Profile**

Mögliche Dimensionen:

- Aerobic Capacity
- Anaerobic Capacity
- Strength
- Relative Strength
- Power
- Speed
- Agility / Change of Direction
- Strength Endurance
- Mobility
- Recovery Context

Jede Dimension zeigt:

- aktuellen Wert
- verwendete Tests
- Referenzpopulation
- Perzentil
- Verlauf
- Messfehlerstatus
- Aktualität
- Data Confidence

## 9. Kein scheingenauer Gesamtscore

Ein Gesamtscore darf nur zusammen mit folgenden Informationen erscheinen:

- Datenabdeckung
- Testalter
- Datenqualität
- Referenzabdeckung
- Methodenkonsistenz
- Data Confidence

## 10. Data Confidence

Data Confidence beantwortet:

> **Wie belastbar ist diese konkrete Aussage für diesen Athleten?**

Faktoren:

- Alter der Messung
- Anzahl Messungen
- Vergleichbarkeit der Methode
- bekannte Messfehler
- Vollständigkeit
- Protokolltreue
- Equipment
- Umgebungsbedingungen
- Referenzpassung
- Datenabdeckung

Stufen:

- HIGH
- MODERATE
- LOW
- INSUFFICIENT

## 11. Evidence Confidence

Evidence Confidence beantwortet:

> **Wie gut ist die allgemeine wissenschaftliche Grundlage der Empfehlung oder Aussage?**

Beispiel:

- Evidence Strength: Moderate
- Evidence Type: Consensus + observational
- Specificity: General endurance
- Applied to: HYROX
- Transfer: Extrapolated

Data Confidence und Evidence Confidence dürfen nicht zu einem Score verschmolzen werden.

## 12. Evidence Drawer

Jede relevante Empfehlung kann einen Evidence-Button besitzen.

Beispiel:

- Recommendation: 30–60 g Kohlenhydrate pro Stunde
- Evidence: MODERATE / HIGH
- Population: Endurance athletes
- Specificity: General endurance
- Applied to HYROX: Extrapolated
- Source: publizierte Quelle

## 13. Sport Performance Models ohne Fantasiegewichte

Keine Modelle mit unbelegten Prozentanteilen.

Stattdessen:

- **Core**
- **Relevant**
- **Context dependent**
- **Optional**

Beispiel HYROX:

**Core**
- Running Performance
- Aerobic Capacity
- Strength Endurance

**Relevant**
- Lower-body Strength
- Grip Endurance

**Context dependent**
- Power
- Mobility

## 14. Assessment Coverage

> **Wie vollständig wurde das sportbezogene Leistungsprofil gemessen?**

Beispiel:

HYROX Performance Profile  
**Assessment Coverage: 72 %**

Noch nicht ausreichend gemessen:

- lower-body power
- grip endurance

## 15. „What should I test?“

Inputs:

- Sport
- Altersgruppe
- Geschlecht
- Level
- verfügbare Zeit
- Equipment
- Anzahl Athleten
- Anzahl Trainer
- vorhandene Daten
- letzte Tests

Outputs:

- Essential
- Recommended
- Optional

KYDON empfiehlt Tests, keine Trainingsmaßnahmen.

## 16. Kiosk Mode

Ablauf:

1. Athlet auswählen oder QR-Code scannen.
2. Test anzeigen.
3. Versuch 1 erfassen.
4. Versuch 2 erfassen.
5. Versuch 3 erfassen.
6. bester gültiger Versuch markieren.
7. nächster Athlet.

Anforderungen:

- kein Dashboard
- kein Logout pro Athlet
- große Eingabeflächen
- Offlinefähigkeit
- spätere Synchronisierung

## 17. Test Day Builder

Inputs:

- Anzahl Athleten
- Anzahl Trainer
- verfügbare Zeit
- Tests
- Equipment
- Stationskapazität
- Pausenanforderungen
- Testreihenfolge

Outputs:

- Gruppen
- Stationen
- Rotationsplan
- Zeitfenster
- Fortschritt

## 18. Personal Baseline vs. Population Benchmark

**Population Benchmark:** Wie gut ist dieser Wert im Vergleich zu anderen?

**Personal Baseline:** Wie unterscheidet sich dieser Wert vom üblichen Zustand dieses Athleten?

Beide Ebenen dürfen nicht vermischt werden.

## 19. Weekly Review

Beispiel:

### YOUR WEEK

Training Load +7 %  
Performance Stable  
Sleep −4 %  
Fuel Sessions 3 geplant / 2 dokumentiert  
Tests 1 neues PB

**Biggest Win**  
5 km – neue Bestleistung

**Needs Review**  
Power-Test fällig

Keine künstliche Streak-Mechanik.

## 20. Progress Moments

Beispiel:

> **This wasn't noise.**

Broad Jump: +8 cm  
Typical Error: ±3 cm

> Die Veränderung liegt oberhalb der typischen Messschwankung.

## 21. Notifications

Gute Push-Nachrichten:

- „Eine Veränderung liegt erstmals außerhalb deiner üblichen Messschwankung.“
- „Dein nächster Benchmark ist fällig.“
- „Dein finaler Assessment-Zeitraum vor dem Wettkampf beginnt.“
- „Dein Trainer hat deinen Wochenbericht kommentiert.“

Keine künstlichen Come-back- oder Streak-Nachrichten.

## 22. Competition Profile statt Competition Readiness

Beispiel:

HYROX Frankfurt – 23 Tage

- Assessment Coverage: 82 %
- Current Benchmarks: 6 / 8 vorhanden
- Fuel Strategy: Prepared
- Last Key Assessment: 18 Tage
- Data Confidence: MODERATE

KYDON sagt nicht: „Du bist zu 82 % bereit.“

## 23. Fuel Engine

Fuel bleibt ein Pro-Zusatz, wird aber fachlich sauber vervollständigt.

Inputs:

- Sport
- Sessiontyp
- Dauer
- Intensität
- Körpermasse
- Klima
- Zeitpunkt
- Zeit bis nächste Belastung
- Wettkampf ja/nein
- persönliche Fuel-Toleranz
- bekannte Sweat Rate

Outputs:

### Before
- Kohlenhydrate
- Flüssigkeit
- Timing

### During
- Kohlenhydrate pro Stunde
- Flüssigkeit
- Elektrolytkontext
- GI-Toleranz

### After
- Protein
- Kohlenhydrat-Recovery
- Rehydration
- Recovery-Urgency

## 24. Was Fuel nicht werden soll

Nicht bauen:

- Rezeptdatenbank
- Meal Scanner
- generisches Kalorientracking
- automatisierte Diätplanung
- Bodybuilding Contest Prep
- Weight-Cut-Protokolle
- aggressives Rapid Weight Loss Management
- automatische RED-S-Diagnose
- medizinische Mikronährstoffbehandlung

## 25. Health-/Gesundheitsbereich

Vorläufig zurückstellen:

- RED-S Risk Score
- Cycle Recommendation
- Weight Cut Risk
- Injury Readiness
- Medical Readiness
- Laborinterpretation
- Return-to-Sport-Freigaben

Voraussetzungen für spätere Entwicklung:

1. Rechtsprüfung
2. Art.-9-DSGVO-Konzept
3. Medizinprodukt-Abgrenzung
4. konkreter Nutzerbedarf
5. definierte fachliche Verantwortung
6. sichere Datenverarbeitung

## 26. Trainingslog

Training bleibt Kontextgeber.

Zweck:

> Was wurde gemacht?

Damit KYDON beschreiben kann:

> Was hat sich gleichzeitig verändert?

Training ist Input.  
Leistungsdiagnostik und Interpretation bleiben Output.

## 27. Laufanalyse

Positionierung:

> **Running Performance Analysis**

Nicht:

> Running Tracker

KYDON konkurriert nicht um GPS-Tracking, sondern um Leistungsinterpretation.

## 28. KI-Grundregeln

Die KI darf niemals:

- Referenzwerte erfinden.
- Scores frei berechnen.
- Messfehler schätzen.
- Trainingsentscheidungen treffen.
- Diagnosen stellen.
- Verletzungen prognostizieren.
- Kausalitäten behaupten.
- fehlende Fachlogik ersetzen.

Fachlogik bleibt in `src/domain`.

## 29. KI darf Beziehungen beschreiben – nicht erklären

Erlaubt:

> Im gleichen Zeitraum stieg dein Laufumfang um 21 %, während dein Broad Jump sank.

Nicht erlaubt:

> Dein Broad Jump sank wegen des höheren Laufumfangs.

Besser:

> Beide Veränderungen traten im gleichen Zeitraum auf. Aus diesen Daten lässt sich keine Ursache bestimmen.

## 30. Ask KYDON

Kein freier allgemeiner Chatbot.

Beispiele:

- Wie hat sich meine Ausdauer entwickelt?
- Welche Leistungen haben sich wirklich verändert?
- Welcher Test ist überfällig?
- Warum zeigt KYDON „unverändert“?
- Welche Daten fehlen?
- Welche Fuel-Anforderung hat meine morgige Einheit?
- Welche Tests wurden mit unterschiedlichen Methoden durchgeführt?

## 31. Domain Tools für Ask KYDON

- `getTestHistory()`
- `getTypicalError()`
- `getMeasurementMethod()`
- `getReferenceStatus()`
- `getPerformanceProfile()`
- `getAssessmentCoverage()`
- `getPerformanceGaps()`
- `getLoadTrend()`
- `getFuelRequirement()`
- `getCompetitionProfile()`
- `getDataConfidence()`
- `getEvidenceConfidence()`

Das LLM formuliert Ergebnisse.  
Es erzeugt nicht die Ergebnisse.

## 32. Coach Copilot

Der Coach Copilot spart Zeit.

Beispiel:

### THIS WEEK

23 Athleten

**Review: 3 Athleten**

- Schmidt: Power-Veränderung außerhalb Typical Error
- Müller: mehrere Check-ins mit erhöhter Soreness
- Weber: Assessment überfällig

## 33. KI-Nachrichtenentwürfe

KYDON darf Nachrichten vorschlagen.

Beispiel:

> Deine letzten beiden Power-Werte liegen unter deiner bisherigen persönlichen Spanne. Wie fühlst du dich aktuell?

Trainer prüft, bearbeitet und sendet.

## 34. Entscheidungslog

KYDON dokumentiert:

- Entscheidung
- Grund
- spätere Entwicklung

Es behauptet nicht, dass eine Entscheidung die spätere Veränderung verursacht hat.

## 35. Intervention Tracking

Optional später.

Beispiel:

- Goal: CMJ beobachten
- Start: 1. Oktober
- End: 30. November
- Trainer-defined intervention: Plyometrics 2×/week
- Pre: 41 cm
- Post: 45 cm
- Typical Error: ±2 cm

Interpretation:

> Messbarer Unterschied während des Interventionszeitraums.

Nicht:

> Die Intervention verursachte die Verbesserung.

## 36. Trainer-Cockpit

Ein Trainer soll in weniger als einer Minute erkennen:

- wer neu gemessen wurde
- wer relevante Veränderung zeigt
- wer Retest benötigt
- wer unvollständige Daten besitzt
- wer eine Nachricht oder Prüfung benötigt

## 37. Team Heatmap

Bevorzugt:

- normierte Werte
- Perzentile
- Abweichungen
- Data Confidence
- messbare Lücken

Nicht rohe Werte ohne Kontext.

## 38. Organisation und Teams

Struktur:

- Organization
- Team
- Untergruppe
- Rollen

Mögliche Rollen:

- Owner
- Head Coach
- Coach
- Analyst
- Athlete
- Parent / Guardian

## 39. Club-/Team-Normen

Später möglich, wenn:

- Protokolle standardisiert sind
- Messmethoden vergleichbar sind
- Fallzahlen ausreichend sind
- Daten de-identifiziert sind
- Consent und Rechtsgrundlage vorhanden sind

## 40. Community Norms

Voraussetzungen:

- standardisierte Tests
- bekannte Protokollversion
- bekannte Messmethode
- Alters-/Geschlechtsgruppe
- ausreichend große Stichprobe
- Qualitätsfilter
- transparente Stichprobengröße

Keine Norm anzeigen, wenn die Datenbasis nicht ausreichend ist.

## 41. Custom Tests

### KYDON STANDARDIZED

- verifiziertes Protokoll
- bekannte Vergleichbarkeit
- Referenzdaten möglich
- Messfehlerdaten sofern vorhanden

### CUSTOM

- trainerdefiniert
- keine globale Vergleichbarkeit
- keine KYDON-Norm ohne Validierung

## 42. Kiosk/Testtag vor Wearables priorisieren

Prioritäten:

1. Wochen-Home
2. Trainer-Cockpit
3. Kiosk Mode
4. Assessment Coverage
5. Data Confidence
6. Evidence Confidence
7. Ask KYDON
8. Fuel-Integration

## 43. Wearables – später und selektiv

Mögliche Priorität:

1. Garmin
2. Strava
3. Apple Health
4. Health Connect
5. Polar
6. COROS
7. weitere nur bei realer Nachfrage

Zweck: Kontextdaten, nicht eine zweite Wearable-App.

## 44. Pricing-Grundidee

### Free
- messen
- Verlauf
- Basisvergleich
- Testprotokolle
- einfacher Wochenüberblick

### Performance / Plus
- vollständiges Performance Profile
- Perzentile
- Assessment Coverage
- Data Confidence
- Reports
- Sync

### Pro
- Fuel
- Ask KYDON
- erweiterte Analysen
- Competition Profile
- Wochenberichte

### Coach
- mehrere Athleten
- Testtage
- Kiosk
- Trainer-Cockpit
- Gruppenvergleich
- Reports

### Club
- mehrere Trainer
- Teams
- Rollen
- Branding
- organisationsweite Auswertung
- Club-Normen später

## 45. Was vorerst nicht weitergebaut wird

- Weight-Class Management
- Bodybuilding Contest Prep
- RED-S Scoring
- Zyklus-basierte Trainings-/Fuel-Empfehlungen
- Injury Prediction
- Return-to-Sport-Freigaben
- komplexes Medical Module
- Social Network
- Rezeptdatenbank
- Meal Scanner
- komplette Trainingsplanung
- Workout Marketplace
- generischer AI Chatbot
- umfangreiche Wearable-Landschaft
- Youth Maturation Engine
- Travel Engine
- Climate Engine als eigenes Produkt

## 46. Was bleibt, aber nicht weiter aufgebläht wird

### Fuel
Bleibt Pro-Funktion.  
Wird fachlich vervollständigt.  
Keine Ernährungssuite.

### Running
Bleibt Analysefunktion.  
Kein GPS-Tracker.

### Weather
Bleibt Kontextinformation.  
Keine Wetterplattform.

### Training Log
Bleibt Kontext.  
Kein Trainingsplaner.

## 47. Priorisierte Roadmap

### Phase 1 – KYDON verständlich machen
- neue Navigation
- Wochen-Home
- Athlete Performance Profile
- Assessment Coverage
- messbare Lücken
- Data Confidence
- Evidence Confidence

### Phase 2 – KYDON wöchentlich relevant machen
- schneller Check-in
- Weekly Review
- Montagsbrief
- Fortschrittsmomente
- relevante Push-Events
- Trainer-Cockpit
- Check-in-Quote

### Phase 3 – Testtag perfektionieren
- Kiosk Mode
- Test Day Builder
- Stationsplanung
- Gruppenrotation
- Testfortschritt
- schneller Athletenwechsel
- Offline-Optimierung

### Phase 4 – strukturierte Intelligenz
- Ask KYDON
- Coach Copilot
- Wochenbericht
- Evidence Explainer
- Daten-/Methoden-Erklärung
- deterministische Tool-Schicht

### Phase 5 – Fuel sauber integrieren
- Session Fuel
- Before / During / After
- Hydration
- Sweat Profile
- GI Tolerance
- Competition Fuel
- Evidence Drawer

### Phase 6 – B2B skalieren
- Organizations
- Untergruppen
- Rollen
- Branding
- Club Analytics
- Team Benchmarks
- Club-Normen
- Reporting-Automation

### Phase 7 – Daten-Moat
- KYDON Community Norms
- bessere Sportbenchmarks
- eigene populationsbasierte Referenzen
- longitudinales Athlete Model
- Decision→Outcome-Daten
- persönliche Reaktionsmuster

## 48. Was KYDON langfristig sein soll

Nicht:

- eine App mit möglichst vielen Sportfunktionen
- ein KI-Coach
- ein Trainingsplaner
- ein Gesundheitsmonitor

Sondern:

> **Ein System, das standardisierte Leistungsdaten in belastbare, verständliche Entscheidungen und nächste Messschritte übersetzt.**

## 49. Finale Produktformulierung

### Kurz

> **KYDON zeigt dir, was deine Leistungsdaten wirklich sagen.**

### Präziser

> **KYDON verbindet standardisierte Tests, belastbare Referenzwerte, Messfehler und wiederholte Messungen zu einem nachvollziehbaren Leistungsprofil – und zeigt Athleten und Trainern, was sich tatsächlich verändert hat und was als Nächstes überprüft werden sollte.**

### Markendoktrin

> **Wir sagen dir, was belegbar ist – und schweigen, wo es nicht belegbar ist.**

## 50. Entscheidungsregel für jedes neue Feature

Ein neues Feature muss mindestens eine dieser Fragen klar verbessern:

1. Wo stehe ich?
2. Wo liegen meine messbaren Lücken?
3. Was ist diese Woche auffällig?
4. Was hat sich wirklich verändert?
5. Was sollte als Nächstes überprüft werden?

Zusätzlich muss es folgende Prüfung bestehen:

- Gibt es einen klaren Nutzerjob?
- Gibt es belastbare Daten?
- Ist die Aussage fachlich zulässig?
- Ist die Datenqualität sichtbar?
- Kann die Funktion ohne KI zuverlässig arbeiten?
- Erhöht sie den Kernnutzen oder nur den Umfang?
- Wird dadurch KYDON klarer oder komplizierter?
- Würde ein Trainer oder Athlet dafür wiederkommen?
- Würde ein Trainer oder Verein dafür bezahlen?

## Schlussprinzip

Die Zukunft von KYDON sollte nicht durch **mehr Funktionen**, sondern durch **bessere Verbindung bestehender Funktionen** entstehen.

> **MEASURE → BENCHMARK → UNDERSTAND → THIS WEEK → REVIEW → MEASURE AGAIN**

Alles andere ist Ergänzung.
