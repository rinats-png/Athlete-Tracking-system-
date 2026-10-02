# Läufe (Analyse → Reiter «Läufe»)

Auswertung von Läufen und Einheiten aus Strava, Garmin oder einer anderen Aktivitätenliste, im KYDON-Design.
Ausgangspunkt war ein Dashboard-Prompt (Strava-Export → Einzeldatei). Übernommen sind die Fachideen, nicht
Marke, Netzaufruf oder fremdes Design.

**Stand:** 2. Oktober 2026 · Stufen 1 und 2 gebaut.

## Entscheidungen

| Frage | Entscheidung |
|---|---|
| Wo | Reiter «Läufe» in der Analyse (`/analyse/laeufe`), Schranke `runAnalysis` (Pro) |
| Daten | Zunächst Datei-Import (CSV), später auch direkte Anbindung (dafür gibt es die neutrale Schicht «Aktivität») |
| Wetter für den Wettkampf | nur freiwillig mit Einwilligung (Stufe 4), nur Ort und Datum gehen raus |
| Design | KYDON-Design, nur Skyline und Ringe als Signatur |
| Chance auf die Zielzeit | als Spanne («ehrgeizig / realistisch / sicher»), keine Prozentzahl: die Streuungsbänder haben keine Quelle |
| Repair Guide | nicht als automatische Planänderung, höchstens ein Hinweis ohne Anweisung |

## Stufen

| Stufe | Inhalt | Stand |
|---|---|---|
| 1 | Import und Datenmodell | ✅ |
| 2 | Rechnung in `src/domain/runMetrics.ts`: Belastung, Fitness/Ermüdung/Form, Wochenumfang, Konstanz, VDOT und Prognosespannen, Tempo bei gleichem Puls. Jede Zahl mit Quelle oder «vorläufig» im Formelregister | ✅ |
| 3 | Anzeige: Form-Kurve, Wochenumfang, Ringe, Skyline, Rennprognose, ein Befund | offen |
| 4 | Freiwilliges Rennwetter mit Einwilligung, Datenschutz anpassen (Rechtstext nur nach Freigabe) | offen |

## Stufe 1: was gebaut ist

- `src/domain/activityImport.ts` (rein): Spalten über Namen in Deutsch und Englisch erkannt; bei doppelten Namen
  (Strava: «Distance», «Elapsed Time», «Max Heart Rate») entscheidet die Grössenordnung (Meter statt Kilometer).
  Zahlen mit Dezimalkomma oder -punkt, Dauer als «00:48:12» oder Sekunden, Strava-Datum englisch in UTC, Garmin in
  Ortszeit, Umrechnung mit der Zeitzone des Geräts (Sommer-/Winterzeit, Tagesgrenze). Sportarten: Lauf (auch
  Laufband), Trail, Rad (auch Rolle), Kraft, Wandern, Schwimmen, Sonstiges. Kadenz von Läufen unter 120 wird
  verdoppelt. Pulswerte ausserhalb 30–230 (Maximalpuls 60–230) werden verworfen. **Fehlend heisst `null`**, nie 0;
  die Bewegungszeit wird nicht aus der Gesamtzeit erfunden.
- Schema 29: `activities` je Athlet (leer bei bestehenden Beständen). **Liegt nur auf dem Gerät**, geht nicht in
  den Abgleich (`stripSeries`), ist aber im Export. Puls und Strecken sind gesundheitsnah.
- Bildschirm: Datei wählen → Vorschau «Das habe ich erkannt» (Quelle, Zeitzone, Zeitraum, Einheiten je Sportart,
  welche Spalte wofür, Zahl ohne Puls, übersprungene Zeilen) → «Übernehmen». Doppelte werden erkannt (Kennung aus
  Zeitpunkt, Sportart, Strecke). «Importierte Einheiten löschen» mit Rückfrage.
- 8 Sprachen, Reiter «Profil / Läufe» in der Analyse, Pro-Schranke.

## Bekannte Grenzen

- Die Tabelle wird zeilenweise gelesen. Strava-Beschreibungen mit Zeilenumbruch im Feld können eine Zeile
  zerreissen; solche Zeilen werden als «ohne lesbares Datum» gezählt und übersprungen, nicht geraten.
- Die Zeitzone ist die des Geräts; eine Auswahl gibt es noch nicht.
- Schuhe, Kalorien und Höhenmeter werden gelesen und gespeichert, aber noch nicht angezeigt (Stufe 3).

## Stufe 2: was gebaut ist

`src/domain/runMetrics.ts` (rein, 23 Prüffälle mit handgerechneten Werten). Einstieg: `computeRunMetrics(aktivitäten, {restHr})`.

- **Heute** = Tag der letzten Einheit; zwölf Monate = 365 Tage; Wochen Montag bis Sonntag (52 abgeschlossene plus laufende).
- **Veröffentlicht:** VDOT (Daniels & Gilbert 1979; Daniels 2014), Riegel-Exponent 1,06, Fitness/Ermüdung/Form nach Banister et al. (1975).
- **Vorläufig (Formelregister):** Belastung aus quadriertem Pulsanteil und Faktoren ohne Puls (Schwimmen und Sonstiges 0,6 sind unsere Ergänzung, die Vorlage nannte sie nicht), Schwellenpuls und Zonen, Tempo bei gleichem Puls, die Namensregeln für lockere und harte Einheiten.
- **Parameter:** Maximalpuls (zweite Bestätigung innerhalb 3 Schläge, nie über 215), Schwellenpuls aus dem stärksten Lauf zwischen 9,5 und 21,5 km (unter 15 km mal 0,98), Zonen bei 85/90/95/100 %. Ruhepuls fehlt: 50, als «angenommen» gekennzeichnet.
- **Kennzahlen:** Form mit Wort (−25/−10/+5/+15), Rampe, akut zu chronisch (nur beschreibend), Monotonie, Sprung (jüngste Woche ab 30 km und über 30 %), abgeleitetes Wochenziel, Konstanz (Serien, Treffer der letzten sechs Wochen, aktive Tage), Rennen, Prognosespannen für 5 km, 10 km, Halbmarathon, Marathon, Lockerbereich (70 % und 62 % des VDOT), Taper-Projektion, Intensitätsverteilung, lockere und harte Läufe der letzten zwölf Wochen, Gewohnheit, Bestzeiten und Rekorde, Summen, Schuhe der letzten 90 Tage.
- **Abweichung von der Vorlage:** keine «Chance in Prozent». Stattdessen `raceOutlook`: Zielzeit unter, in oder über der Spanne («ehrgeizig / realistisch / sicher»).
- **Noch nicht gebaut:** der eine Befund in Worten und die Insights (Stufe 3 mit der Anzeige), Wochenplan gegen Ist, Race-Day-Wetter (Stufe 4).
