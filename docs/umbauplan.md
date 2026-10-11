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
| 5 | Ask KYDON, Coach Copilot (erst Werkzeugschicht, dann Sprachmodell) | ✅ Werkzeugschicht gebaut; Sprachmodell wartet auf Entscheidungen |
| 6 | Fuel-Vervollständigung mit Evidence Drawer | ✅ Drawer an der Regelkarte gebaut |

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

## Etappe 7 — Montagsbrief, Wochenziel, Sprachmodell (umgesetzt)

- **7a** Montagsbrief (`/brief`): Datenlage, der eine Befund, Belastung, nächste Messung, aus Fakten im Format der Fragen. Push-Thema `weekly` fehlt noch (braucht Server-Job und Vault-Geheimnis).
- **7b** Wochenziel gegen Ist: Schema 32, Ziel im Profil vom Menschen gesetzt, Gegenüberstellung ohne Wertung, Countdown zum Wettkampf. Taper-Projektion bewusst nicht gebaut (wäre Trainingsrat, Doktrin).
- **7c** Sprachmodell-Schicht, aus bis zur Freigabe: siehe [ask-kydon.md](ask-kydon.md).

## Etappe 8 — Aufräumen, Übungsbilder, Wochenbericht, Push weekly (umgesetzt)

- **8a** `npm audit fix` (0 Schwachstellen); der RLS-Audit erkennt Tabellen, denen Endnutzern alle Rechte entzogen sind, als Absicht (0 Befunde). Keine Policy wurde geändert.
- **8b** Anzeige für Übungsbilder (`src/data/exerciseImages.ts`, Vorschau im Trainingseditor). Die Liste ist leer, bis die Bilder `U_<key>.jpg` geliefert sind; ein Prüffall hält Liste und Dateien im Gleichlauf.
- **8c** Wochenbericht des Trainers (`/trainer/wochenbericht`): Athlet, Eltern oder Verband, je Empfänger datensparsam, Bestätigung vor Kopieren und Drucken.
- **8d** Push-Thema `weekly`, siehe [push.md](push.md).

## Etappe 9 — Training Engine (Entscheidung vom 4. Oktober 2026)

Doktrin geändert (Nachtrag 1): Pläne aus belegten, geprüften Regeln. Pilot in drei Sportwelten, schrittweise, ohne Neubau. Siehe [training-engine.md](training-engine.md).

## Neugestaltung «weniger Text, mehr Bild» (Entscheidung vom 9. Oktober 2026)

Freigegeben nach den Entwürfen (Zeitleiste C mit Startkarte aus B, dunkler
Player A). Alle bisherigen Inhalte bleiben: Bilder, Grafiken, Lupen-Dock,
jede Funktion. Geändert ist die Gewichtung:

- **Erklärungen eine Ebene tiefer.** `ScreenHeader` zeigt die Einleitung erst
  nach dem ⓘ neben dem Titel; `InfoNote` macht dasselbe in Karten (z. B. die
  Grundlage der Veränderungen, der Satz zur messbaren Lücke). Der Text bleibt
  im Dokument, die Doktrin-Aussagen gehen nicht verloren.
- **Fotokarte** (`components/ui/PhotoCard.tsx`): Bild füllt die Karte, Text
  hell auf dunklem Verlauf, gleicher Kontrast hell wie dunkel. `Segments`
  zeigt Wochen bzw. gemessene Tests als Balken.
- **Bildzuordnung** (`data/visuals.ts`): Planziel → Bild, Absicht → Bild,
  Einheit → erste bebilderte Übung. Nur vorhandene Dateien aus
  `public/testbilder`; die Bilder sind Schmuck (`alt=""`).
- **Heute:** Startkarte mit der Einheit des Tages aus dem aktiven Block
  («Los geht’s» → Player), Zeitleiste (verpasst, als Nächstes, Wettkampf),
  danach Veränderungen, Lücke, nächster Test, Check-in, Woche.
- **Plan:** laufender Plan als Fotokarte mit Wochenbalken, «Diese Woche» als
  Liste mit Bildern und Stand, Begründung aufklappbar, vier Wege als
  Bildkacheln (Fertige Pläne, Übungen, Eigener Plan, Kalender).
- **Fertige Pläne / Plan-Detail:** Vorschaubild je Plan, Fotokopf im Detail.
- **Player:** immer dunkel (`.scope-dark` in `theme.css` übernimmt die Werte
  von Mondlicht für einen Bereich), Fotokopf der ersten Übung.
- **Testen:** Fotokarte «Kerntests: x von y gemessen», Vorschaubild je Test.

**Zweiter Schritt (übrige Bereiche).** `ScreenHeader` nimmt ein Titelfoto
(`image`, Bilder in `AREA_IMAGES`); die Seite behält ihre Überschrift, das ⓘ
liegt hell auf dem Bild.

- **Fotokopf:** Läufe, Gesundheit, HRV-Messung, Peak Week, Fuel, Trainingslog,
  Tagebuch, Belastung, Entwicklung, Wochenrückblick, Termine, Testdetail,
  Messung, Übungsdetail, Testtage, Wochenbericht und Trainer-Übersicht.
- **Bildkarten:** «Geplant für heute» in Fuel (erste Übung der Einheit), Weg
  zur Peak Week in Gesundheit, Bestwert der Woche.
- **Vorschaubilder:** Trainingslog (Einheiten und Bestleistungen), fällige
  Tests der Woche, Termine, Blöcke in Entwicklung. Der Verlauf zeigt die
  gemessenen Tests als Bildreihe zum Antippen.
- **Weitere Bilder:** Der Kiosk zeigt das Testbild als Band. Das Profil zeigt
  Name und Sportart mit dem Sportmotiv.
- **Hinweise hinter ⓘ:** Neu dahinter liegen die Hinweise in Woche und
  Entwicklung sowie die Einleitungen von Messung und neuem Termin.
- **Bewusst sichtbar** bleiben der Umfangshinweis der Gesundheitsschicht
  (Art. 9) und alle Warn- und Rechtstexte.

**Dritter Schritt (Unterzeilen der Karten).** `PanelHeader` kennt neben
`subtitle` jetzt `note`: eine Erklärung, die ein ⓘ neben dem Kartentitel
aufklappt (`components/ui/InfoNote.tsx` für Erklärungen im Kartenkörper).

Die Regel:

- **`subtitle` (sichtbar):** kurze Fakten, die man zum Lesen braucht, also
  Anzahl, Datum, Einheit, Fassung oder Stand.
- **`note` (hinter ⓘ):** Sätze, die erklären, wie eine Fläche gemeint ist.
- **Bewusst sichtbar** bleiben, auch wenn es Sätze sind:
  - alles in der Gesundheitsschicht;
  - Rechts-, Preis- und Datenschutzhinweise;
  - Legenden, ohne die ein Diagramm nicht lesbar ist;
  - jeder Satz, der eine Fehldeutung von Zahlen verhindert. Beispiele:
    «kein gemessener 1RM», «kein Referenzwert», «keine medizinische
    Aussage», «eine Festlegung dieser App», «keine Freigabe, keine Sperre».

Neue Karten folgen derselben Regel.

## Sprint 0 nach der Marktanalyse (Entscheidung vom 11. Oktober 2026)

Grundlage: die Marktanalyse mit Umbauplan und die aktualisierte Einordnung
vom selben Tag. Zuerst kommen Datenintegrität und eine einzige
Veränderungslogik, dann neue Funktionen. Umgesetzt sind die vier Punkte, die
ohne Freigabe möglich waren:

1. **Rettung je Bereich mit Quarantäne.**
   - Scheitert die Prüfung des Gesamtbestands, rettet `parseStoredData`
     jetzt jedes Feld einzeln. Das gilt für jeden Athleten und für den
     Bestand, Listen Eintrag für Eintrag und Objekte Feld für Feld.
   - Vorher kamen nur Profil, Körperwerte, Testtermine und Ergebnisse
     zurück. Tagebuch, Trainingsblöcke, Gesundheit, Notizen und Testtage
     fielen still weg.
   - Verworfene Einträge stehen mit Rohwert im Bericht (`quarantine`).
     `localStore.ts` legt sie unter `kydon.quarantine.v1` ab (ohne Doppelte,
     höchstens 1,5 Mio. Zeichen). Ein unlesbarer Speicher (kein JSON) wird
     als Rohtext aufbewahrt.
   - Die Meldung nennt den Bereich, sagt «aufbewahrt, nicht gelöscht» und
     zeigt, ob eine Sicherung auf dem Gerät liegt. Ein Knopf sichert die
     Quarantäne als Datei.
2. **Eine Veränderungslogik.**
   - `testTrend` urteilt nicht mehr mit festen 0,5 % je 30 Tage. Geprüft
     wird die Veränderung entlang der Geraden über den ganzen Zeitraum, mit
     `judgeChange` aus `change.ts`.
   - Unter vier Messungen heisst das «unklar», nicht «stabil».
   - «Stabil» heisst in der Oberfläche jetzt «keine klare Veränderung».
   - Auch der Trainernachweis nutzt `judgeChange`, statt die Schwelle
     nachzurechnen.
3. **Kennzeichnung ungeprüfter Regeln:** siehe unten.
4. **Bestand aus einer neueren Fassung.**
   - Der Schutz vor dem Lesen bestand schon. Gespeichert wurde trotzdem: der
     Bestand galt als «leer», die ältere Zweitschrift sprang ein, und das
     erste Speichern überschrieb die neueren Daten.
   - Jetzt gilt eine Schreibsperre: nicht speichern, keine Zweitschrift,
     kein Import, kein Abgleich. Gelöst wird sie nur durch ausdrückliches
     Löschen.
   - Der Einstieg wird übersprungen. Die Meldung sagt, dass Änderungen nicht
     gespeichert werden, und bietet «App neu laden» an.

Offen und nur mit Freigabe:
- Löschweg für ganze Athleten-Dokumente (Migration + RLS);
- KI-Einwilligung je Nutzer (Rechtstext);
- Live-Audit von Supabase;
- wer die Regeln fachlich prüft.

Ebenfalls offen ist der Blockvergleich im Trainingslog (`training.ts`,
`blockCompare`). Er urteilt mit einer festen Schwelle von 1 % über den
e1RM. Das ist eine Trainingsmessung, kein Test, braucht aber dieselbe
Entscheidung.

