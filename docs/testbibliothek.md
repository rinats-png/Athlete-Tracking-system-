# Testbibliothek (Protokoll 1.0)

Quelle: «Standardisierte Testbibliothek für die App», Protokollversion 1.0, 133 Testeinträge
(126 verschiedene) in 29 Bereichen. Sie wird in Wellen nach Disziplin übertragen.

## Stand

| Welle | Bereiche | Stand |
|---|---|---|
| 1 | Kampfsport (Judo, Ringen, Boxen, BJJ, MMA, Karate, Taekwondo, Fechten, Pencak Silat) | übertragen |
| 2 | Laufen, Radfahren, Schwimmen, Triathlon, Rudern | übertragen |
| 3 | Teamsport (Fußball, Basketball, Handball, Volleyball, Rugby, Cricket) | übertragen |
| 4 | Kraftsport, Allgemein, HYROX, Tactical | übertragen |
| 5 | Recovery, Thermal, NIRS, Ü40+ | offen |

## Wohin was gehört

| Was | Wo |
|---|---|
| Test, den die App noch nicht hatte (Bezeichnung, Felder, Ausrüstung) | `src/data/testCatalogLibrary.ts` (Startpaket) |
| Einordnung (Achse, Richtung) | `src/data/testClassification.ts` |
| Ausführliche Beschreibung: Ziel, Aufbau, Schritte, Zeit, Strecke, Abbruch, Bewertung, Skizze | `src/data/testProcedureLibrary.ts` (nachgeladen) |
| Beobachtungswert (Screening, Sensor, keine Leistung) | `src/data/observations.ts` + Beschreibung in `OBSERVATION_PROCEDURES` |
| Skizzen | `src/features/tests/figures/library.tsx` (nachgeladen, ohne Wörter) |
| Zuordnung zu einer Sportart | `src/data/sportProfiles.ts` (`addedOptional`) |
| Bewusst nicht übernommen, mit Grund | `src/data/documentCoverage.ts` |

## Entscheidungen

- **Vorhandene Tests** behalten ihre Vorschrift; die Bibliothek ergänzt Ziel, Aufbau, Schritte,
  Bewertung und Skizze. Tests ohne eigene Vorschrift bekommen sie vollständig.
- **Doppelte Einträge** sind ein Test für mehrere Disziplinen (z. B. VO₂max, Judogi-Klimmzug).
- **Geräte- und Labortests** bleiben Tests (`setting: 'lab'`, `deviceBound`), sind aber nie
  Voraussetzung für ein Profil. Screening-, Monitoring- und Sensorwerte (Balance, Beweglichkeit,
  Reaktionszeit, Atemdruck) sind Beobachtungswerte: erfasst, nicht bewertet.
- **Nicht übernommen:** SCAT3 (ärztlich, §82), ANT (lizenzierte Software), Roundhouse-Kinematik
  (3D-Analyse); PVT und Stroop (validierte Reizsoftware), VISA-A (lizenzierter Fragebogen).
- **Fußball** war gesperrt (`BLOCKED_DISCIPLINES`); der Auftraggeber hat die Sperre mit Welle 3
  aufgehoben. Die Liste bleibt als Mechanismus, ist aber leer. Fußball steht als Disziplin in
  `sportProfiles.ts` (`TEAM_FOOTBALL`); Kerntests sind nur die universellen (Sprint, CMJ), die
  Tests der Bibliothek sind Ergänzungen. Die Gewichte sind eine Voreinstellung der App.
- **Technikwerte** (Schuss- und Wurfgenauigkeit) sind Beobachtungswerte der Gruppe «Technik»:
  keine Leistungsachse, keine Bewertung. GPS-Strecke und Hochgeschwindigkeitsstrecke sind
  Sensor-Beobachtungswerte.
- **Doppelt im Dokument:** Schulter-ER/IR (Handball) ist derselbe Wert wie in Schwimmen.
- **Körperzusammensetzung:** DXA und BIA sind zwei getrennte Beobachtungswerte, weil die Quelle
  ausdrücklich verbietet, sie zu mischen. Der FMS ist der Beobachtungswert `fms_total` (ohne
  Skizze: sieben Bewegungsmuster, keine Bewertung erfunden). Sit-and-Reach steht doppelt im
  Dokument und ist ein Beobachtungswert.
- **AFT (Tactical):** Die Quellenanker («Maximalwert 350 lb», «61 Reps», «13:25») stehen als
  Kohortenwerte im Abschnitt «Bewertung»; das 3RM-Kreuzheben ist ein eigener Test ohne
  1RM-Umrechnung.
- **Rudern** hat im Katalog keine Disziplin. Die Ruder-Tests (500 m, 30 s Leistung) und der
  1000-m-Lauf stehen im Katalog, sind aber keiner Disziplin zugeordnet.
- **Quellenfehler:** Der 10-km-Lauf nennt in der Quelle «10,000 km»; übernommen sind 10 km.
- **Einbeinsprung:** die schwächere Seite zählt, der Seitenindex (Limb Symmetry Index) steht
  daneben — wie bei der Seitstütz-Ausdauer.
- **Zahlen im Abschnitt «Bewertung»** sind Kohortenwerte aus der Quelle, keine Normen. Ins
  Referenzmodell kommt ein Wert nur mit belegter Quelle. Die App weist am Abschnitt darauf hin.
- **Leere Platzhalter** des Dokuments («Keine zusätzliche feste Zeitvorgabe …») stehen nicht in
  der App.

## Neue Welle übertragen

1. Einträge dem Schema zuordnen: vorhanden ergänzen, neuer Test, Beobachtungswert oder Lücke.
2. Deutsch aus dem Dokument, Englisch übersetzen, dann `content/<lang>.json` für die sechs
   weiteren Sprachen (Export: `scripts/exportContent.ts`; Prüfung: `checkLocale`).
3. Skizze nur, wo eine Grafik den Aufbau klärt; Maße nur, wo das Protokoll sie nennt.
4. Prüfen: `npm run lint`, `tests/testLibrary.spec.ts`, Katalog- und Sprachfälle, Größe des
   Startpakets (`tests/loading.spec.ts`).
