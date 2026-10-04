# Umbauplan nach der Produktdoktrin

**Stand:** 4. Oktober 2026 · Grundlage: `docs/produktdoktrin.md` und vier Mockups (Athlet Today, Athlet Performance, Athlet Fuel, Trainer Today).

## Entscheidungen (vom Betreiber bestätigt)

| Thema | Entscheidung |
|---|---|
| Doktrin gegen Mockup | Die Doktrin gilt. Mockup-Texte werden angepasst («größte messbare Lücke», Teamstatus «Aktuell / Zu prüfen / Überfällig», kein Bereitschaftsurteil). |
| Vorgehen | Etappe für Etappe. Zuerst der Trainer, danach der Athlet. |
| Farbwelt | Die bestehende KYDON-Farbwelt (Jade, hell und dunkel) bleibt. Kein Gold. Rot und Grün nur für ein Urteil gegen den Messfehler. |
| Bilder | Die vorhandenen KYDON-Testbilder statt neuer Fotos, im hellen wie im dunklen Modus. Keine Gesichts-Fotos. |
| Check-in | lokal; für den Trainer nur sichtbar mit ausdrücklicher Freigabe des Athleten (Etappe 2). |
| Preise und Pakete | unverändert. |
| Texte | alle in 8 Sprachen; keine festen Breiten, Karten dürfen umbrechen. |
| Streaks | in den Läufen entfernt. |
| Wächter-Test | prüft die Texte auf Ratgeber- und Kausalsprache. |

## Etappen

| Etappe | Inhalt | Stand |
|---|---|---|
| 1 | **Trainer:** Navigation (Today, Athleten, Test, Team, Mehr), Trainer-Today, Team-Hub, Mehr-Seite, Wächter-Test | ✅ gebaut |
| 2 | **Athlet:** Navigation (Heute, Leistung, Test, Fuel, Mehr), Heute, Leistungsprofil mit Assessment Coverage und Data Confidence | ✅ gebaut |
| 3 | Check-in (Migration), Trainer-Cockpit mit Check-in-Quote, Montagsbrief | offen |
| 4 | Kiosk-Modus und Testtag-Planer | offen |
| 5 | Ask KYDON, Coach Copilot (erst Werkzeugschicht, dann Sprachmodell) | offen |
| 6 | Fuel-Vervollständigung mit Evidence Drawer | offen |

Jede neue Funktion besteht die Prüfung aus Doktrin §50.

## Etappe 1: was gebaut ist

- **Navigation nach Rolle** (`BottomNav.tsx`): Trainer sehen Heute, Athleten, Test, Team, Mehr. Athleten behalten bis Etappe 2 ihre sechs Bereiche. Die Adressen bleiben alle, wie sie waren.
- **Heute** (`CoachToday.tsx`, Logik in `domain/coachToday.ts`): Teamstatus (Aktuell, Zu prüfen, Überfällig; beschreibt nur Daten), «Zuerst ansehen» mit Grund, Team-Heatmap in Jade-Stufen, nächster Testtag, Muster im Team, Schnellzugriff. Karten mit Bild nutzen die vorhandenen Testbilder (`ImageCard`), in beiden Erscheinungsbildern.
- **Team** (`TeamHub.tsx`) und **Mehr** (`MoreScreen.tsx`) ordnen vorhandene Werkzeuge, ohne etwas zu verschieben.
- **Läufe:** die Serien-Kacheln sind entfernt (keine Streak-Mechanik, Doktrin §19).
- **Wächter** (`tests/doctrine.spec.ts`): schlägt an, wenn Ratgeber- oder Kausalsprache in den deutschen oder englischen Texten steht. Der heutige Bestand war sauber.

## Etappe 2: was gebaut ist

- **Navigation des Athleten:** Heute, Leistung, Test, Fuel, Mehr. Alle Adressen blieben; Verlauf, Analyse und Bericht liegen unter Leistung, Profil, Tagebuch, Training und Rechtliches unter Mehr. Die frühere Übersicht ist unter `/uebersicht` erreichbar.
- **Heute** (`features/today/AthleteToday.tsx`, Logik in `domain/performanceView.ts`): Veränderungen je Test mit Urteil gegen den Messfehler, größte messbare Lücke im vorhandenen Profil, heutige Einheit, Tages-Check-in (die bestehende Karte), nächster Test, Wettkampf. Ohne Messung zeigt Heute weiter den geführten Einstieg.
- **Leistung** (`features/performance/PerformanceScreen.tsx`): Datenbasis mit Data Confidence (HIGH, MODERATE, LOW, INSUFFICIENT), Kerntests als Anzahl, Radar, Dimensionen mit Perzentil, «keine Referenz» oder «keine Daten», vier Karten. Kein Gesamtwert.
- **Gefunden und behoben:** Der Radar zeigte über dem Diagramm einen Rohschlüssel (`radar.unitPercentile`); die Schlüssel hießen anders im Wörterbuch.
- **Noch nicht:** der Check-in aus dem Mockup (Energie, Muskelkater, Stress mit Freigabe an den Trainer) braucht eine Migration und folgt in Etappe 3.
