# Trainingsbibliothek (Übungsdatenbank v1.1 + Programm-Seed v4)

Stand: 8. Oktober 2026. Gehört zu [training-engine.md](training-engine.md).

## Quellen im Repo

| Datei | Inhalt |
|---|---|
| `content/library/kydon_exercise_registry_128_v1_1.json` | Übungsdatenbank v1.1, unverändert (128 Übungen, Validator: 0 Fehler) |
| `content/library/kydon_program_seed_v4.json` | Programm-Seed v4, unverändert (16 Pläne, 37 Methodenregeln, 14 Einheitenvorlagen, 16 Intents, 10 Tests) |
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
| Übernehmen | Athlet: AUTO-Pläne direkt, «Coach empfohlen» mit Bestätigung; COACH_SENSITIVE/TEMPLATE/ONLY nur über Trainer. Bei aktivem Block gesperrt (wie bisher) |
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

## Offene Bereiche (nachzureichen)

| # | Bereich | Was fehlt | Wer |
|---|---|---|---|
| 1 | Fachliche Prüfung | Alle 37 Methodenregeln stehen auf `DRAFT_UNREVIEWED`; erst ein Review (Name, Datum, Volltext) macht Pläne «geprüft» | Fachexperte |
| 2 | Quellen | 18 von 37 Regeln ohne Studienquelle (H1–H4, TS5, TS9, TS11, TS13–16, TS25–29, K3, K8); `MR_L6` zitiert Seiler 2010 (TID) für Krafttraining bei Läufern — passt nicht; `MR_K1/K2` stehen auf DIRECT mit allgemeinen Metaanalysen (Grappler-RCT Øvretveit & Tøien 2018 fehlt); ein Eintrag ohne Autoren (PLOS ONE 2023) | Autor des Seeds |
| 3 | Messfehler der neuen Tests | 7 Tests ohne belegten Messfehler → keine Bewertung «besser/schlechter» | Fachexperte |
| 4 | Übersetzung der Inhalte | 128 Übungen, 16 Pläne, 37 Regeln nur Deutsch | nach Freigabe |
| 5 | Sportzuordnungen der Übungen | `sport_mappings` der Datenbank leer → Transfer steht als «Recherche, nicht zugeordnet» | Redaktion |
| 6 | Breite der Bibliothek | 16 Pläne in voller Tiefe; 424 Katalog-Programme des Gesamtmasters noch nicht materialisiert; Kampfsport nur Grappling Base + Striking Conditioning | Autor des Seeds |
| 7 | Deload-/Taperwochen | im Seed von den Dosisgrenzen ausgenommen; eigene Grenzen (z. B. aus `MR_TS5`) fehlen | Fachexperte |
| 8 | Prüflücke | Positionen ohne passende Grenze (z. B. «30 m» unter `MR_TS9`, «2 min» unter `MR_H1`) werden nicht geprüft | Seed |
| 9 | Adaptive Anpassung | nur für Bibliothekspläne; eigene und berechnete Pläne haben keine Regelgrenzen je Position → nur manuelle Änderung | Entscheidung |
| 10 | KYDON-Coach | Bewertungstor vorhanden; Empfehlung eines Bibliotheksplans nach bestandenem Tor, 6 Pflichttests je Profil und Höchstalter je Test fehlen | Entscheidung + Bau |
| 11 | Erfassbare Werte im Player | Eingabefelder je Übung (Parameter Contract) werden angezeigt, Satz-Logs je Übung im Player noch nicht | Bau |
| 12 | Ersatz im Player | Ersatzübungen stehen im Übungsdetail, im Player und Plandetail noch nicht als Tausch | Bau |
| 13 | Medien | openGym-Medien gesperrt (Rechte ungeklärt); nur 35 Übungen haben Bilder (aus dem alten Katalog) | Rechteklärung |
| 14 | Trainer-Zuweisung von Bibliotheksplänen | Coach-Pläne übernimmt der Trainer selbst; Zuweisung an Athleten nutzt den bestehenden Weg, Bibliothekspläne darin ungetestet | Bau |
| 15 | Olympisches Gewichtheben, Bodybuilding (Wettkampf) | im Seed bewusst nicht aufgenommen | Re-Evaluation |
| 16 | 800 m / 1500 m | nutzen die 5-km-/10-km-Pläne als Basis, nicht disziplinspezifisch | Seed |
