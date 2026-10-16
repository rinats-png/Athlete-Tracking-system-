# Feldphysiologie (Mastertabelle v2)

Stand: 2026-10. Grundlage: Mastertabelle v2 (160 Tests), Gesamtdokumentation
„INSCYD-Vergleich, Zero-Gear-Erweiterung & Physiologie-Engine“ und die
Formelsammlung des Auftraggebers. Jede Formel und jeder Grenzwert wurde gegen
die Primärliteratur (PubMed) geprüft. Übernommen ist, was dort steht — mit dem
Gültigkeitsbereich der Quelle.

## Wo was steht

| Was | Ort |
|---|---|
| Formeln, rein | `src/domain/fieldPhysiology.ts` |
| Kennzahlen aus zwei Tests (Speed Reserve, CMJ/SJ) | `src/domain/combinedMetrics.ts` |
| Neue Tests | `src/data/testCatalogFieldV2.ts` |
| Disziplin-Zuordnungen aus der Tabelle | `src/data/sportProfilesMasterV2.ts` |
| Formel, Quelle, Messfehler je Kennzahl | `src/domain/formulaRegistry.ts` |
| Anzeige | Sportmodul: Panel „Aus zwei Tests“, Intensitätsbereiche unter der CS |
| Prüffälle | `tests/fieldPhysiology.spec.ts` |

## Übernommen

| Kennzahl | Formel | Quelle | Messfehler / Gültigkeit |
|---|---|---|---|
| Critical Speed, D′ | Gerade Strecke = CS · Zeit + D′, 2–3 Läufe von 2–15 min | Monod & Scherrer 1965; Galbraith 2014 | CS: Schätzfehler 0,14 m/s; D′ CV 13 % — nur Rohwert |
| CS aus 3-Minuten-Test | Ø Geschwindigkeit der letzten 30 s | Pettitt 2012 | CS SEM 1,3–2,2 %; D′ SEM 27 % (Busso 2024) |
| Intensitätsbereiche | moderat bis 82,3 % CS, schwer bis CS | Hunter 2024; Poole 2016 | CS liegt ≈ 8 % über MLSS (Nixon 2021) |
| MAS | Strecke in 5 min | Berthon 1997 | SEM 0,15–0,34 km/h; keine VO2max daraus |
| VO2max aus 30-15 IFT | Gleichung nach Buchheit 2008 | Buchheit 2008 | SEE 4,9 ml/kg/min, Bias +4,1 — Schätzwert |
| RSI | Höhe / Kontaktzeit; Höhe aus Flugzeit g·t²/8 | Young 1995; Bosco 1983 | CV 2–3 % (Markwick 2015) |
| Bosco-Leistung | g²·Tf·Ttot / (4·n·(Ttot−Tf)) | Bosco 1983 | r = 0,95 Reproduzierbarkeit |
| Treppenleistung | m·g·h/t | Margaria 1966 | Anlauf/Methode ±9 % — geräteabhängig |
| FV-Profil Sprung | F0, v0, Pmax = F0·v0/4 | Samozino 2008/2014 | Sfv CV 14–30 % — nur für den Verlauf |
| Ruffier, Ruffier-Dickson | Indizes aus drei Pulswerten | Ruffier/Dickson 1950; Sartor 2016 | keine Klassen; r = −0,40 zur Fitness |
| ASR, SRR | MSS − MAS, MSS / MAS | Sandford 2019/2021 | keine Profilgrenzen |
| CMJ/SJ | Verhältnis der Höhen | McGuigan 2006 | ohne Bewertung |

Ob sich ein Wert verändert hat, entscheidet weiter `domain/change.ts` aus der
eigenen Streuung des Athleten (§19 Regel 7) — dafür braucht kein Test einen
Literatur-Messfehler.

## Bewusst nicht übernommen

| Aus der Vorlage | Grund |
|---|---|
| Glykolytischer Index aus D′, Phänotypen < 110 / > 175 m | in der Literatur nicht gefunden; D′ ≠ anaerobe Kapazität (Zagatto 2012) |
| „D′ = VLamax-Ersatz“, „CS = MLSS“ | nicht belegt bzw. widerlegt |
| SRR-Grenzen 1,80 / 1,95, Fasertyp aus SRR | nicht gefunden; publiziert nur 1,36/1,48/1,58 für männliche Elite-Mittelstreckler |
| Zonen 65/76/87/96/102/112 % CS | nicht gefunden |
| Riegel-Bewertung 1,04–1,06 / > 1,09 | nicht gefunden |
| CODD-Stufen 1,25 / 1,50 s; CODD für 5-10-5 | nicht gefunden; belegt nur 505 − 10 m (kein 505 im Katalog) |
| Samozino-Optimum mit Faktor 2,1, FV-Imbalance | Formel falsch; Originalgleichung noch nicht gegen den Anhang geprüft |
| Handzeit +0,24 s „nach Hetzler“ | Hetzler 2008 lehnt eine Korrektur ab |
| Dickson-/Ruffier-Klassen | keine Primärquelle |
| BOLT-Atemtest | keine Reliabilität, kein Zusammenhang mit Leistung (Kowalski 2024) |
| Knee-to-Wall, Y-Balance als Agilität | Beweglichkeit/Stabilität, keine Agilität; Y-Balance besteht als Beobachtungswert |

## Abweichungen von der Tabelle

- `critical_speed_run`: statt 400 + 1500 m zwei oder drei Läufe von 2–15 min
  (z. B. 1200/2400/3600 m). Ein 400-m-Lauf zählt nicht.
- `run_6min_mas` heißt `run_5min_mas` und misst 5 min (belegter Test).
- Alle neuen Zuordnungen sind Zusatztests. Die Rolle aus der Tabelle steht im
  `documentLabel` („Mastertabelle v2 (Kern)“). Kerntests ändern, was ein
  vollständiges Profil ist — das Hochstufen ist eine eigene Entscheidung.

## Offen

- Samozino-Optimum nach Originalgleichung (Anhang Samozino 2012) prüfen.
- Normwerte, wo es sie gibt (Burpee: Podstawski 2019; Y-Balance: Plisky 2021;
  3MT: Kramer 2020), nach Prüfung des Volltexts aufnehmen.
- 505-Test aufnehmen, dann CODD nach Nimphius 2016.
- Knee-to-Wall als Beobachtungswert (MDC 1,6–1,9 cm, Powden 2015).
