# Testprotokoll v1.0

Stand: 23.09.2026. Die Grundlage ist die «Standardisierte Testdokumentation» mit 13 Tests. Alle offenen Punkte daraus sind entschieden. Die Regeln stehen in `src/data/protocolV1.ts` und werden an die Durchführungsvorschriften in `src/data/testProcedure.ts` angehängt.

## Was jedes Ergebnis jetzt trägt

| Feld | Bedeutung |
|---|---|
| `protocol.version` | `"1.0"`. Ältere Ergebnisse haben `null` und werden als «Protokoll unbekannt» angezeigt. Das ist keine Abwertung. |
| `protocol.method` | Pflichtfeld, vorbelegt mit der Standardmethode. Mögliche Werte: direktes 1RM, geschätztes 1RM (Epley), Handstoppung, Lichtschranke, Ergometer-Anzeige, Massband, Audio-Protokoll, gezählte Wiederholungen |
| `protocol.tester` | Testleiter |
| `protocol.deviation` | Abweichung vom Protokoll. Leer heisst: gemessen nach Protokoll. |
| `protocol.abortReason` | Grund für einen Abbruch |
| `protocol.invalidAttempts` | Ungültige Versuche mit Index und Grund. Sie bleiben gespeichert, werden aber nicht gewertet. |

Der CSV-Export hat die Spalten `protocol_version` (bei älteren Ergebnissen `unknown`), `measurement_method`, `tester`, `protocol_deviation`, `abort_reason` und `invalid_attempts`.

## Entscheidungen

1. **Beep-Test:** Fassung nach Léger (1988). Abbruch nach zwei verpassten Linien hintereinander.
2. **1RM-Tests:** Standard ist das direkt getestete 1RM. Das nach Epley geschätzte 1RM (e1RM) ist eine eigene, gekennzeichnete Methode. Zwischen den schweren Versuchen 3–5 Minuten Pause.
3. **Kniebeuge:** Die Hüftfalte kommt unter die Oberkante des Knies.
4. **Kreuzheben:** Konventionell ist der Standard. Sumo wird als Abweichung vermerkt. Gürtel ist erlaubt, Zughilfen (Straps) nicht.
5. **Bankdrücken:** Sichtbare Pause auf der Brust. Füsse flach am Boden, Gesäss und Schulterblätter auf der Bank.
6. **Clean & Jerk:** Maximallasttest nach den Regeln des Wettkampf-Gewichthebens (IWF), höchstens 6 Versuche. Power-Varianten sind eine eigene Übung.
7. **Snatch:** Regeln wie Clean & Jerk.
8. **Bear Complex:** Eine Runde besteht aus 7 Wiederholungen dieser Folge: Power Clean, Front Squat, Push Press, Back Squat, Push Press. Wird die Hantel abgesetzt, ist die Runde ungültig. Zwischen den Runden 3–5 Minuten Pause.
9. **Cindy:** Standards nach CrossFit. Klimmzüge strikt, mit Kipping oder als Butterfly sind erlaubt; die Variante gehört in die Notiz.
10. **Assault Bike:** Das Gerätemodell wird im Feld «Ausrüstung» festgehalten. Kalorien verschiedener Modelle sind nicht vergleichbar.
11. **Illinois:** Start in Bauchlage, Hände auf Schulterhöhe. Lichtschranke ist der Standard, Handzeit wird gekennzeichnet. 2 Versuche, der schnellste gültige zählt.
12. **Standweitsprung:** 3 Versuche, der weiteste gültige zählt. Gemessen wird bis zur hintersten Ferse.
13. **Aufwärmen:** Etwa 10 Minuten, standardisiert. Wiederholungsmessung frühestens nach 48 Stunden, zur selben Tageszeit. Das ist eine Durchführungsregel, keine persönliche Empfehlung.

## 5-stufige Auswertungslogik

Die App trennt die Auswertung schon jetzt in diese Ebenen:

1. Rohwert: `values`
2. Normierte Kennzahl: `metrics`, abgeleitet über `derive`
3. Referenzpopulation: nach Geschlecht und Alter, nur wo belegte Referenzen existieren
4. Einordnung: Perzentil
5. Verlauf: Veränderung gegenüber dem Messfehler

Dabei gelten zwei Regeln:
- Die App gibt keine Empfehlungen (§81) und keine medizinischen Aussagen (§82).
- «Nicht gemessen» wird nie als schwach gewertet (§89).
