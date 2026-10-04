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
| 3 | Check-in (Migration), Trainer-Check-ins mit Baseline, Wochenrückblick | ✅ gebaut; Teilen mit dem Trainer hinter Schalter bis zur Freigabe |
| 4 | Kiosk-Modus und Testtag-Planer (Startzeit, Pause, Zeitfenster) | ✅ gebaut |
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

## Etappe 3: was gebaut ist

- **Check-in** (`features/today/CheckInPanel.tsx`, Logik `domain/checkin.ts`): Energie, Muskelkater, Stress von 1 bis 5, in 15 Sekunden, auf «Heute» und unter `/checkin`. Die Werte stehen im Tagebuch (dieselben Felder, kein neues Datenformat) und sind eine Selbsteinschätzung, keine Messung.
- **Schema 30:** `shareCheckins` je Athlet, Vorgabe aus (Migration 29 → 30).
- **Trainer** (`CoachToday`, Karte «Check-ins diese Woche»): wer hat sich gemeldet, wer weicht von der EIGENEN Baseline ab (letzte 3 Tage gegen die 28 davor, ab einem Skalenpunkt, mindestens 7 Werte in der Baseline). Eine Beschreibung, keine Ursache und kein Urteil. Die Schwelle ist eine offene Produktentscheidung (`DEVIATION_POINTS`).
- **Teilen mit dem Trainer:** Schalter «Meinem Trainer zeigen» (aus), nur mit Bau-Schalter `VITE_CHECKIN_SHARE=on`. Serverseitig `supabase/migrations/20261004100000_shared_checkins.sql`: Tabelle mit RLS (nur Eigentümer), Lesen für Trainer nur über `coach_shared_checkins()` bei aktiver Verknüpfung, Aufbewahrung 90 Tage, Kontolöschung räumt ab. **Nicht ausgerollt, Datenschutztext nur als Entwurf** (`docs/checkin-datenschutz.md`).
- **Wochenrückblick** (`/woche`, `domain/weekReview.ts`): Belastung neben dem Mittel der vier Wochen davor, Check-in-Tage, neue Messungen, größter belegter Fortschritt (über der Messschwankung), überfällige Tests. Keine Streaks, keine Abzeichen.
- **Noch nicht:** der Montagsbrief als Push. Er braucht ein neues Push-Thema und eine Änderung der Edge Function `push`, das liegt bei dir zum Ausrollen. Bis dahin ist der Rückblick in der App erreichbar (Heute → «Deine Woche ansehen», Mehr).

## Etappe 4: was gebaut ist

- **Kiosk-Modus** (`features/coach/KioskScreen.tsx`, Logik `domain/kiosk.ts`, Adresse `/trainer/kiosk?test=…&tag=…`): ohne Kopfzeile, Leiste und Fächer. Athlet antippen oder «Nächster offener Athlet», bis zu drei Versuche, ungültige markieren, der beste GÜLTIGE zählt, «Speichern, nächster Athlet» führt ohne Umweg weiter. Große Eingabeflächen, läuft ohne Netz, alles bleibt auf dem Gerät. Gesperrte Athleten (fehlende Einwilligung, abgelaufene Frist) bleiben gesperrt, wie im Gruppentest.
- **Gespeichert** wird mit den Rohversuchen (`attempts`), ungültige in `protocol.invalidAttempts` markiert (nichts wird gelöscht), `values` ist der beste gültige Versuch, `attemptSelection` ist `best`; die Bedingungen des Testtags gelten für jeden Wert (neue Provider-Aktion `recordKioskResult`).
- **Nur für Tests mit einem Zahlenfeld.** Bei mehreren Feldern je Versuch (zum Beispiel 1RM aus Last und Wiederholungen) bleibt der Gruppentest zuständig; der Kiosk sagt das.
- **Testtag-Planer:** Beginn (Uhrzeit) und Pause zwischen den Runden (Schema 31). Der Plan zeigt Uhrzeiten je Runde («09:25–09:45 Uhr») und rechnet die Pause in die Gesamtdauer; an jeder Station steht «Kiosk» neben «Erfassen». Auch im Gruppentest gibt es den Weg in den Kiosk.
- **Noch nicht:** QR-Code zum Wählen des Athleten (braucht die Kamera und eine eigene Prüfung der Einwilligung), spätere Synchronisierung zwischen mehreren Kiosk-Geräten, Rotation nach Trainerzahl und Ausrüstung.

## Etappe 5 — Fragen an KYDON, Coach Copilot (umgesetzt)

Deterministische Werkzeugschicht: sieben feste Fragen (`/fragen`), Zahlenwächter,
Trainer-Zusammenfassung mit bearbeitbaren Nachrichtenentwürfen. Kein Sprachmodell.
Details: [ask-kydon.md](ask-kydon.md). Offen für ein Modell: Anbieter, Region,
Auftragsverarbeitung, Monatsdeckel.
