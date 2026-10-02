# Läufe (Analyse → Reiter «Läufe»)

Auswertung von Läufen und Einheiten aus Strava, Garmin oder einer anderen Aktivitätenliste, im KYDON-Design.
Ausgangspunkt war ein Dashboard-Prompt (Strava-Export → Einzeldatei). Übernommen sind die Fachideen, nicht
Marke, Netzaufruf oder fremdes Design.

**Stand:** 2. Oktober 2026 · Stufe 1 gebaut.

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
| 2 | Rechnung in `src/domain`: Belastung, Fitness/Ermüdung/Form, Wochenumfang, Konstanz, VDOT und Prognosespannen, Tempo bei gleichem Puls. Jede Zahl mit Quelle oder «vorläufig» im Formelregister | offen |
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
