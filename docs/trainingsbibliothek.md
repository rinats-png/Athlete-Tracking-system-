# Trainingsbibliothek (Übungsdatenbank v1.1 + Programm-Seed v4.1)

Stand: 9. Oktober 2026 (Seed v4.1, Kalender, Satz-Log, Ersatz). Gehört zu [training-engine.md](training-engine.md).

## Quellen im Repo

| Datei | Inhalt |
|---|---|
| `content/library/kydon_exercise_registry_128_v1_1.json` | Übungsdatenbank v1.1, unverändert (128 Übungen, Validator: 0 Fehler) |
| `content/library/kydon_program_seed_v4_1.json` | Programm-Seed v4.1, unverändert (16 Pläne, 37 Methodenregeln, 14 Einheitenvorlagen, 16 Intents, 10 Tests mit typischem Messfehler, Sporttransfer-Entwurf für 128 Übungen). Gegenüber v4: Entlastungswochen RPE 7 → 6 (163 Positionen), 15 Intensitätsangaben, Deload-/Taper-Grenzen (TS5, K6, L7), fehlende Grenz-Schlüssel (TS9, H4, TS1, TS19, TS27, TS28), Quelle L6 korrigiert, K1/K2/K5 auf RELATED |
| `scripts/buildLibrary.mjs` (`npm run library:build`) | erzeugt `src/data/library/` — ordnet nur um, formuliert nichts um |
| `src/data/library/legacyExerciseMap.ts` | Zuordnung alter Katalog → Datenbank (35 Übungen) |
| `src/data/library/testMap.ts` | Seed-Test-IDs → Tests des KYDON-Katalogs |

Die Daten werden nachgeladen (eigener Teil, nicht im Startpaket) und liegen
danach im Service-Worker-Cache: offline nutzbar.

## Regelkette — was der Prüffall `tests/library.spec.ts` sichert

1. Jede Position in einer Arbeitswoche liegt in den Grenzen ihrer
   Methodenregel (Hauptübung → Regel der Einheit, Zusatz → `MR_TS19`, Rumpf →
   `MR_TS28`). Die Einheit der Menge entscheidet über die Grenze («30 m» →
   Strecke, «2 min» → Zeit). Ergebnis: 2 089 Positionen, 0 Verstöße.
2. Intent der Position gehört zur Übung und ist in der Einheitenvorlage erlaubt.
3. Plan-Autonomie ist nie lockerer als die strengste Methode des Plans.
4. Alle Regeln `DRAFT_UNREVIEWED` → kein Plan gilt als geprüft (Regel 11).
5. Jeder Retest zeigt auf einen Test des Seeds und des KYDON-Katalogs.
6. Jeder Plan wird ein gültiger Block (Schema 41).
7. Adaptive Anpassung bleibt in den Regelgrenzen; Rücknahme stellt den Stand wieder her.

## Produktentscheidungen (8. Oktober 2026)

| Thema | Entscheidung |
|---|---|
| Sprachen | Oberfläche in 8 Sprachen; Inhalte (Übungs-, Plan-, Regeltexte) vorerst Deutsch mit sichtbarem Hinweis — bewusste Ausnahme von Regel 10 bis zur fachlichen Freigabe |
| Sichtbarkeit | Produktion bleibt im Vorschaumodus; jeder Plan trägt sichtbar «fachlich ungeprüft – Testphase» |
| Übungskatalog | zusammengeführt: Datenbank ist Hauptkatalog, alte Kennungen bleiben gültig, Varianten ohne Gegenstück bleiben als «Weitere» |
| Übernehmen | Jeder Plan ist frei wählbar, für Athleten wie Trainer (Entscheidung 9. Oktober 2026; vorher Sperre «nur über Trainer» nach Autonomie des Seeds). Klein am Plan: «Passt zu …» (Seed-Zuordnung Sportart → Ziel), «Unterstützt …» (Plan trainiert eine Fähigkeit, die das Sportprofil ≥ 0,7 gewichtet), «Anderer Schwerpunkt». Läuft ein Block, beendet ein zweiter Tipp ihn und startet den neuen |
| Neue Tests | 5RM/3RM/10RM, Halb-HYROX, GPP-Zirkel, HF-Rückgang 60 s, Opener-Simulation — ohne Referenzwerte, ohne Bewertung bis Messfehler belegt |
| Neue Sportarten | Muay Thai, 800 m, 1500 m; Kerntests aus dem Gesamtmaster v3 Kap. 8.1–8.3 als Produktkonzept; Gewichte Produktannahme |

## Adaptive Anpassung (Produktannahme, gehört zum Review)

- Rückmeldung 1–5 und «Schmerz» je erledigter Einheit.
- Review frühestens 3 Tage nach Start und ab 2 Rückmeldungen in 14 Tagen;
  Mittel ≤ 2 → Vorschlag +10, ≥ 4 → −10; Schmerz → −10 und Steigerungssperre.
- Wunsch ±10 → Anstrengung (RPE ±1), ±20 → ein Satz, ±30 → zwei Sätze,
  Dauer bei Ausdauer um ±10/20/30 % — je Position genau eine Stellgröße.
- Nur künftige, nicht erledigte Einheiten, keine Entlastungswochen; was die
  Regelgrenze sprengen würde, bleibt. Übernehmen → neue Planversion mit
  Änderungsliste; die letzte lässt sich zurücknehmen.

## Kalender, Satz-Log, Ersatz (Schema 42)

**Termine.** Jede Einheit eines Blocks hat je Woche einen Termin mit echtem
Datum (`occurrences` in `domain/trainingBlock.ts`). Ein einzelner Termin lässt
sich frei verschieben (`moveOccurrence`): jeder Tag ab heute bis zwei Wochen
nach Blockende, auch über Wochengrenzen, **ohne Grund** — der Athlet plant
seine Woche. Gespeichert wird nur die Abweichung (`block.moves`: Einheit,
geplanter Tag → neuer Tag); zurück auf den geplanten Tag löscht sie.

- Gesperrt: Erledigtes, Vergangenheit, zwei Schlüsseleinheiten an einem Tag
  (Planungsregel 1).
- Hinweis, keine Sperre (`moveWarnings`): harte Tage hintereinander,
  Wettkampfnähe (≤ 2 Tage bei Schlüsseleinheiten), voller Tag, außerhalb des
  Blocks.
- Die ganze Serie auf einen anderen Wochentag zu legen bleibt Coach Override
  mit Grund (`overrideSession`); einzelne Verschiebungen dieser Einheit
  fallen dabei weg.
- Verpasste Termine (vor heute, nicht erledigt) stehen oben im Kalender:
  «Heute nachholen» oder «Tag wählen». Nichts verschiebt sich von selbst.
- Erledigt wird ein Termin über seinen geplanten Tag: `completion.planDay`
  hält ihn fest, wenn an einem anderen Tag trainiert wurde. Wochenprüfung
  und Bericht zählen darum richtig.
- Export: «In den Gerätekalender» schreibt die offenen Termine als `.ics`
  (ganztägig — die App kennt keine Uhrzeit und erfindet keine).

**Satz-Log.** Im Player hat jede Übung (Bibliothek, Regel-Kraft, eigene) eine
Zeile je Satz. Welche Felder (höchstens drei), sagt der Parametervertrag der
Übung (`setFieldsFor`). Ein Satz zählt erst mit Haken; nach dem Haken läuft
die Pause aus dem Plan. «Letztes Mal» zeigt die Sätze der jüngsten Einheit
mit derselben Übung — nur Anzeige, kein Vorschlag. Gespeichert in
`completion.sets`; Sätze mit Wiederholungen gehen zusätzlich als Workout ins
Trainingslog (Verlauf, e1RM), ohne Dauer und RPE — die Last trägt das
Tagebuch, an genau einer Stelle.

**Ersatz.** «Ersetzen» bietet zuerst die Ersatzübungen des Plans
(`substitutions` des Seeds), dann gleiches Bewegungsmuster
(`substituteOptions`). Eine selbst geführte Übung wird nie durch eine «nur mit
Trainer» ersetzt. Dosis und Methodenregel der Position bleiben. Standard:
nur heute (`completion.swaps`); auf Wunsch auch in den folgenden Einheiten —
dann als neue Planversion mit Änderungsliste (`source: substitution`),
rücknehmbar wie jede Anpassung.

## Offene Bereiche (nachzureichen)

| # | Bereich | Was fehlt | Wer |
|---|---|---|---|
| 1 | Fachliche Prüfung | Alle 37 Methodenregeln stehen auf `DRAFT_UNREVIEWED`; erst ein Review (Name, Datum, Volltext) macht Pläne «geprüft» | Fachexperte |
| 2 | Quellen | v4.1: `MR_L6` auf Rønnestad & Mujika 2014 korrigiert, K1/K2/K5 auf RELATED, Taper-Quelle mit Autoren. Weiter offen: 18 Regeln ohne Studienquelle (H1–H4, TS5, TS9, TS11, TS13–16, TS25–29, K3, K8) | Autor des Seeds |
| 3 | Messfehler der neuen Tests | v4.1 nennt je Test einen typischen Messfehler aus der Literatur (Hopkins 2000, ungeprüft) — angezeigt, aber nicht zum Urteilen benutzt; «besser/schlechter» weiter nur mit eigenem Messfehler (Regel 7) | Fachexperte |
| 4 | Übersetzung der Inhalte | 128 Übungen, 16 Pläne, 37 Regeln nur Deutsch | nach Freigabe |
| 5 | Sportzuordnungen der Übungen | v4.1: Sporttransfer-Entwurf je Übung (aus Bewegungsmustern, EXTRAPOLATED, ungeprüft) im Übungsdetail; geprüfte Recherche je Übung/Sportart fehlt | Redaktion |
| 6 | Breite der Bibliothek | 16 Pläne in voller Tiefe; 424 Katalog-Programme des Gesamtmasters noch nicht materialisiert; Kampfsport nur Grappling Base + Striking Conditioning | Autor des Seeds |
| 7 | Deload-/Taperwochen | v4.1 bringt eigene Grenzen (TS5, K6, L7); der Prüffall prüft Entlastungswochen noch nicht gegen sie | Bau |
| 8 | Prüflücke | v4.1 ergänzt Grenz-Schlüssel (u. a. TS9 `distance_m`/`work_s`); Prüffall auf die neuen Schlüssel noch nicht erweitert | Bau |
| 9 | Adaptive Anpassung | nur für Bibliothekspläne; eigene und berechnete Pläne haben keine Regelgrenzen je Position → nur manuelle Änderung | Entscheidung |
| 10 | KYDON-Coach | Bewertungstor vorhanden; Empfehlung eines Bibliotheksplans nach bestandenem Tor, 6 Pflichttests je Profil und Höchstalter je Test fehlen | Entscheidung + Bau |
| 11 | Erfassbare Werte im Player | erledigt (Satz-Log, siehe oben). Offen: Zeit-/Streckensätze erscheinen nicht im Trainingslog (es kennt nur kg × Wdh.) | — |
| 12 | Ersatz im Player | erledigt (Ersatz im Training, siehe oben). Offen: Gerätefilter (welche Geräte der Athlet hat) gibt es noch nicht | Entscheidung + Bau |
| 13 | Medien | openGym-Medien gesperrt (Rechte ungeklärt); nur 35 Übungen haben Bilder (aus dem alten Katalog) | Rechteklärung |
| 14 | Trainer-Zuweisung von Bibliotheksplänen | Coach-Pläne übernimmt der Trainer selbst; Zuweisung an Athleten nutzt den bestehenden Weg, Bibliothekspläne darin ungetestet | Bau |
| 15 | Olympisches Gewichtheben, Bodybuilding (Wettkampf) | im Seed bewusst nicht aufgenommen | Re-Evaluation |
| 16 | 800 m / 1500 m | nutzen die 5-km-/10-km-Pläne als Basis, nicht disziplinspezifisch | Seed |
| 17 | Verschiebungen beim Trainer | Die Rückmeldung einer Zuweisung (`plan_assignments`) meldet nur «erledigt» je Einheit und Tag; verschobene Termine und Sätze erscheinen dort nicht | Entscheidung (Freigabe Athlet) + Server |
| 18 | Blockansicht | zeigt Einheiten je Blockwoche nach Plan; verschobene Termine sieht man im Kalender, Heute und Player | Bau |
| 19 | Uhrzeit und Erinnerung | Termine sind ganztägig; Uhrzeit, Push-Erinnerung am Trainingstag und Abgleich mit dem Gerätekalender (zwei Richtungen) fehlen | Entscheidung + Bau |
| 20 | Wettkämpfe und Tests im Kalender | nur der Wettkampftermin des Blocks erscheint; fällige Nachmessungen, Testtage und mehrere Wettkämpfe fehlen | Bau |
| 21 | Verfügbarkeit | keine Sperrtage (Urlaub, Krankheit) und keine Wochenvorlage «an welchen Tagen kann ich» für automatisches Umplanen | Entscheidung + Bau |
