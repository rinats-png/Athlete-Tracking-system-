# Referenzwerte: Rechtelage je Quelle

Stand: 2026-09-26 · Grundlage: Feld `license` an jeder Referenzquelle
(`src/data/referenceModel.ts`, Master-Spezifikation Entscheidung 13).

Das ist **keine Rechtsauskunft**, sondern die Buchführung darüber, wo die
übernommenen Werte herkommen und was vor einem breiten Vertrieb geprüft
werden muss. Einzelne Kennwerte (Mittelwert, Streuung, Perzentile) sind
Tatsachen und als solche nicht urheberrechtlich geschützt; heikel sind
**ganze Tabellen** aus nicht offenen Veröffentlichungen (Datenbank- und
Tabellenschutz) und **Sekundärquellen**, deren Herkunft nicht nachvollziehbar ist.

## Kategorien

| Wert | Bedeutung | Handlungsbedarf |
|---|---|---|
| `open_access` | Artikel unter offener Lizenz (PMC-OA, PLoS: CC BY; J Exerc Rehabil: CC BY-NC) | Quelle nennen. Bei CC BY-NC prüfen, ob die kommerzielle Nutzung der **Werte** (nicht des Textes) berührt ist. |
| `public_domain` | amtlicher Standard einer Behörde | keiner |
| `published_values` | einzelne Kennwerte aus einer Arbeit, mit Quelle zitiert | keiner über die Quellenangabe hinaus |
| `published_table` | ganze Normtabelle aus einer nicht offenen Veröffentlichung | **offen**: Umfang der Übernahme prüfen, ggf. Lizenz anfragen oder auf Stützstellen reduzieren |
| `unclear` | Handbuch, Webseite, Praxisübliches, Sekundärquelle | **offen**: Primärquelle finden oder Eintrag entfernen |

## Offene Fälle

### Ganze Tabellen aus nicht offenen Veröffentlichungen (`published_table`)

| Quelle | Tests |
|---|---|
| Cooper 1968, JAMA — Originalnormen des 12-Minuten-Laufs | cooper_12min |
| Cooper Institute / ACSM, Laufband-Referenztabellen | mehrere (VO2max u. a.) |
| Peterman et al. 2019, Mayo Clin Proc, FRIEND-I (Laufband) | mehrere (VO2max u. a.) |

Vorschlag: FRIEND (Peterman 2019) und Cooper Institute/ACSM beim Herausgeber
anfragen; bis dahin nur die Stützstellen führen, die für das Perzentil nötig
sind (tut die App bereits — keine vollständige Wiedergabe der Tabelle in der
Oberfläche).

### Unklare Herkunft (`unclear`)

| Quelle | Tests |
|---|---|
| Allgemeine 30-m-Sprintnormen (brianmac) | sprint_30m |
| Coggan/Allen-Leistungsprofil, Kategoriegrenzen der Praxis | ftp_20min |
| CSS-Stufentabelle, verbreitete Einteilung im Schwimmsport | swim_css_test |
| Franchini et al., Arch Budo 2011 · Sportdiagnostik-Referenzhandbuch (Ausgangstabelle + ClinicalTrials.gov) | gi_grip_hang |
| MMA physiologische Profile · Sportdiagnostik-Referenzhandbuch (Ausgangstabelle + ClinicalTrials.gov) | mehrere (VO2max u. a.) |
| NIH Toolbox US | grip_strength |
| Regionale Kaderstudien · Sportdiagnostik-Referenzhandbuch (Ausgangstabelle + ClinicalTrials.gov) | mehrere (VO2max u. a.) |
| Regionale Studien (u. a. Bumi Siliwangi) | mehrere (VO2max u. a.) |
| SMI-Kaderstudie Pencak Silat (UNJA Repository 2025) | mehrere (VO2max u. a.) |
| SWFT/SWPT-Normtabelle · Sportdiagnostik-Referenzhandbuch (Ausgangstabelle + ClinicalTrials.gov) | special_wrestling_fitness_test |
| Taekwondo physiological profile · Sportdiagnostik-Referenzhandbuch (Ausgangstabelle + ClinicalTrials.gov) | mehrere (VO2max u. a.) |

Vorschlag: für jeden Eintrag die Primärarbeit heraussuchen. Einträge aus dem
«Sportdiagnostik-Referenzhandbuch» gehen auf eine Ausgangstabelle zurück,
deren Quellen nicht einzeln belegt sind. Findet sich keine Primärarbeit,
fliegt der Eintrag — «keine Referenzwerte ohne Quelle» (CLAUDE.md, Regel 6).

## Geklärt

### Offen lizenziert (`open_access`)

| Quelle | Tests |
|---|---|
| Chaabene et al., KSAT-Validierung (PMC4594135) | mehrere (VO2max u. a.) |
| Diaz-Lara, Gi-Griffausdauer (Systematic Review PMC5306420) | gi_grip_hang |
| Dodds et al. 2014, PLoS ONE, zwölf britische Bevölkerungsstudien | grip_strength |
| Gi-Griffausdauer, Blau- bis Schwarzgurt (Systematic Review PMC5306420) | gi_grip_hang |
| Griffkraft erfahrener BJJ-Athleten (Systematic Review, PMC5306420) | grip_strength |
| Sensitivity of Field Tests for Wrestlers Specific Fitness (PMC9465761) | special_wrestling_fitness_test |
| Sterkowicz-Przybycień & Franchini 2018, J Exerc Rehabil (Kadetten/Junioren) | special_judo_fitness_test |

### Gemeinfrei (`public_domain`)

| Quelle | Tests |
|---|---|
| US Army Fitness Test, offizieller Standard ab Juni 2025 | hand_release_push_up, plank_hold, run_2_mile, sprint_drag_carry |

### Einzelne Kennwerte, zitiert (`published_values`)

| Quelle | Tests |
|---|---|
| Anthropometric/Physiological Profile Elite MMA | mehrere (VO2max u. a.) |
| Anthropometric/Physiological Profile Elite MMA, Chin-up-Test | pull_up_max_reps |
| Fitness Assessment of Fencers | grip_strength |
| Franchini et al. 2011, Arch Budo — Judogi-Griffausdauer | gi_grip_hang |
| Kirk, MMA-Elitekohorte (UCLan) | countermovement_jump, squat_jump |
| Kirk, Querschnittsvergleich VO2max im Kampfsport (UCLan) | mehrere (VO2max u. a.) |
| Marathon Performance in Female Distance Runners | mehrere (VO2max u. a.) |
| Maximal Strength/Sprint/Jump Study, Photozellen | sprint_10m |
| Meta-Analyse SJFT, 37 Studien | special_judo_fitness_test |
| Reliability/Validity FTP20 | ramp_test_bike |
| Review Physical/Physiological Characteristics Judo | mehrere (VO2max u. a.) |
| Review-Zitat aus Primärstudie, Gi Grip Endurance | grip_hang_time |
| Schick et al. 2010, MMA-Athleten | mehrere (VO2max u. a.) |
| Systematic Review BJJ | mehrere (VO2max u. a.) |
| VO2max Athletes vs Nonathletes (Kontrollgruppe) | mehrere (VO2max u. a.) |
| VO2max-Schätzungsvergleich, aktive gesunde Erwachsene | mehrere (VO2max u. a.) |
| Wheeler et al. 2012, Elite-Taekwondo | mehrere (VO2max u. a.) |

## Pflege

Jede neue Referenzquelle braucht ein `license`. Der Typ erzwingt es; der
Prüffall `tests/referenceLicense.spec.ts` stellt zusätzlich sicher, dass jede
Quelle mit `published_table` oder `unclear` hier unter «Offene Fälle» steht.
