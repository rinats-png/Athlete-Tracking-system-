# Fuel Management

Ausbau von «Ernährung» zu einer Entscheidungshilfe für Verpflegung, Flüssigkeit
und Erholung — pro Sportart, Wettkampfformat und Einheit. Grundlage ist die
Master-Spezifikation «Fuel Management v2.0» (30. September 2026). Diese Seite
legt fest, **was davon gebaut wird, was nicht und in welcher Reihenfolge**.

**Stand:** 30. September 2026 · Entwurf, Entscheidungen des Auftraggebers eingearbeitet.

## 1. Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| 1 | RED-S, Energieverfügbarkeit, Gewichtsklassen-Abkochen | **Nicht gebaut.** Nur ein Hinweistext mit Verweis auf Fachpersonal (§4). |
| 2 | Tarif | Teil von **Pro**, wie Ernährung. Keine Preisänderung. |
| 3 | Reihenfolge der Sportarten | **Zuerst Ausdauer**, danach Kampfsport. |
| 4 | Supplemente | Nur **Informationsseite**: Evidenz, Quelle, Verlinkung, Anti-Doping-Hinweis. Keine Empfehlung, keine Dosierung als Anweisung. |
| 5 | Protein | **1,6–2,2 g/kg und Tag** (Morton et al. 2018) statt 1,2–2,0 (Thomas 2016). |

## 2. Wo es hingehört

Ein Reiter «Fuel» innerhalb von Ernährung (`features/nutrition`), kein eigener
Bereich. Fachlogik nur in `src/domain` (rein, ohne React, Netz, Storage), Regeln
als Daten in `src/data`. Was es schon gibt und erweitert wird:

- `domain/fueling.ts`: Tagesspanne Kohlenhydrate und Protein, Verpflegung je
  Einheit, Gewichtsband, Insight-Regeln.
- Tagebuch-Einheit: Kohlenhydrate, Flüssigkeit, Magen-Darm-Wert 0–10, Masse vor
  und nach der Einheit. **Schweissrate und Magen-Darm-Verlauf sind damit
  teilweise vorhanden** und werden nur sichtbar gemacht und verknüpft.
- Test `body_mass_change_pct` (T071) in der Testbibliothek.

## 3. Was aus der Spezifikation übernommen wird

- **Evidenzobjekt an jeder Regel:** Typ, Stärke, Sportartbezug, Prüfstatus,
  Regelversion, Quelle. Jede Spanne in der App trägt ein Abzeichen. Ohne
  Quelle keine Regel (Hartregel 6).
- **Sportgruppen statt 35 Einzelprofile.** G1 Kraft/Gewichtsklasse, G2 Physique,
  G3 kontinuierliche Ausdauer, G4 Multisport, G5 Hybrid/HIFT, G6 Kampf, dazu
  Teamsport und Taktik. Eine Sportart erbt von ihrer Gruppe und legt nur
  Abweichungen ab (Wettkampfformat, Dauer, Zwischenläufe, Hinweise).
- **Modell:** Sportart × Wettkampfformat × Einheit × Umwelt × Erholungszeit →
  Bedarf → Vorher / Währenddessen / Nachher. Ergebnis sind Spannen, keine
  Sollwerte.
- **Arbeitsbereiche** (Spezifikation §0.2): Tagesbedarf nach Belastung, Aufladen
  bei Ereignissen über 90 min (10–12 g/kg über 36–48 h, ohne Entleerungsphase),
  vor dem Ereignis 1–4 g/kg, während 30–60 g/h ab etwa 1 h, bis etwa 90 g/h
  über 2,5 h, 90–120 g/h nur nach Magen-Darm-Training und nie als Standard,
  schnelle Wiederauffüllung 1,0–1,2 g/kg/h bei unter 8 h Erholung, Vor-
  Flüssigkeit 5–10 ml/kg, Nach-Flüssigkeit 125–150 % des gemessenen Defizits.
- **Schutzregeln** (Spezifikation §8): kein festes 2:1-Verhältnis
  Glukose:Fruktose, kein «20–30 g Protein pro Mahlzeit» (relative Dosis 0,3 g/kg,
  im Defizit 0,4–0,55), kein Trinkplan, der jeden Gewichtsverlust verhindern
  will (Schutz vor Überhydrierung), ACWR nur beschreibend, Refeeds nicht als
  «Reset» darstellen, Registereinträge nie als Wirksamkeitsbeleg.

## 4. Was nicht gebaut wird

| Aus der Spezifikation | Grund |
|---|---|
| `EA_risk_level`, LEAF-Q, RED-S-Signale | Nach `docs/rechtspruefung-art9-mdr.md` voraussichtlich Medizinprodukte-Software und Art.-9-Daten. Ein «Flag, keine Diagnose» ändert daran wahrscheinlich nichts. |
| `cut_risk_flag`, `weight_class_readiness`, Zeitplan nach dem Wiegen | Faktisch eine Anleitung zum Abkochen; Risiko besonders bei Jugendlichen. |
| Zyklusfelder, Mikronährstoff-Risiken (Eisen, Vitamin D, B12) | Gesundheitsdaten nach Art. 9 DSGVO. |
| ClinicalTrials.gov-Tabelle (§6) | Registereinträge sind Kontext, keine Evidenz. |
| Sportartspezifische Benchmarks in Fuel | Bleiben in der Diagnostikbibliothek, getrennt versioniert. |

**Hinweistext (in den Sportgruppen mit Gewichtsklasse und bei Energiemangel-
Themen, in allen 8 Sprachen):** Gewichtsklassen, Abkochen und Anzeichen von
Energiemangel gehören in die Hand von Sportmedizin und Ernährungsfachpersonal.
KYDON rechnet dazu nichts und gibt keine Anleitung. Mit Verweis auf die
Konsensuspapiere (IOC REDs 2023, ISSN Kampfsport 2025) als Lesehinweis.

## 5. Supplement-Informationsseite

Je Substanz eine Karte: Evidenzabzeichen (Stärke, Sportartbezug), was die
Quelle belegt und was nicht, Verlinkung zur Originalquelle, Hinweis auf
Anti-Doping und Fremdprüfung («third-party tested»). Startumfang laut Quellen
der Spezifikation: Koffein (Guest 2021), Kreatin (Kreider 2017), Bikarbonat
(Grgic 2021), Beta-Alanin (Trexler 2015), Übersicht IOC (Maughan 2018). Keine
Markennamen, keine Dosierungsanweisung, keine Rangliste nach Ziel.

## 6. Daten und Sicherheit

- Schemaänderung = Migration in `src/lib/store/schema.ts` mit Versionssprung.
  Neue Entitäten: `FuelPlan`, `HydrationProfile`, `GutToleranceProfile`,
  `ResponseLog`. Ein Teil lässt sich aus Tagebuch-Einheiten ableiten und braucht
  gar keine neue Tabelle — das wird in Stufe 1 geprüft.
- Wird etwas synchronisiert: neue Tabelle mit RLS **in derselben Migration**.
- Alles funktioniert ohne Netz.
- Freischaltung Pro nur serverseitig (`stripe-webhook`, `change-plan`).
- Alle Texte in 8 Sprachen (`checkLocale`).

## 7. Reihenfolge

| Stufe | Inhalt |
|---|---|
| 1 | Regelbasis: Evidenzobjekt, Sportgruppen, Ausdauer-Sportarten (Laufen 5–10 km, Marathon/Ultra, Radfahren, Schwimmen, Triathlon kurz und lang, Rudern). Protein auf 1,6–2,2 samt Quelle in Formelregister und Texten aller Sprachen. Vorhandenes Fueling darauf umgestellt. |
| 2 | Plan je Einheit und Wettkampftag (Vorher / Währenddessen / Nachher), Aufladen, Schweissrate und Magen-Darm-Grenze sichtbar, Rückmeldung nach der Einheit. |
| 3 | Hitze, Höhe, Reise als Modifikatoren; Supplement-Informationsseite. |
| 4 | Kampfsport (G6) und Teamsport: Turniertag-Planer für Zwischenkämpfe, mit Hinweistext aus §4. |

## 8. Offen

- Quelle der Protein-Spanne 1,6–2,2: Morton et al. (2018, Meta-Analyse,
  PMID 28698222) belegt 1,6 als Plateau; die Obergrenze 2,2 ist der obere Rand
  des Konfidenzintervalls. Vor dem Einbau am Volltext gegenprüfen.
- Ausdauer-Werte mit «LOW» oder «EMERGING» (120 g/h, Natrium) werden nur mit
  entsprechendem Abzeichen gezeigt.
- Rechtlicher Blick (Fachanwalt) auf den Hinweistext und die Supplement-Seite.
