# Prüfbogen: fachliche Regelprüfung, erste Runde

Erzeugt am 11.10.2026 aus `src/data/library/programIndex.json` und
`src/data/trainingRules.ts`. Der Ablauf steht in `docs/regelpruefung.md`.
Je Regel ein Abschnitt; die Felder unter «Entscheidung» füllt die prüfende Person aus.

## Teil A: Pilotregeln der Engine (Grappling, Hybrid, Striking)

### vo2_4x4: Intervalle 4 × 4 Minuten

- Quelle(n): Helgerud et al. 2007, Med Sci Sports Exerc 39(4):665–71
- Ort im Code: `src/data/trainingRules.ts`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### rst_30m: Wiederholte Sprints, 3 Sätze × 6 × 30 m

- Quelle(n): Thurlow et al. 2024, Sports Med (Repeated-Sprint Training)
- Ort im Code: `src/data/trainingRules.ts`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### max_strength_80: Maximalkraft ab 80 % 1RM

- Quelle(n): ACSM Position Stand 2026; Cid-Calfucura et al. 2023; Llanos-Lagos et al. 2025
- Ort im Code: `src/data/trainingRules.ts`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### power_30_70: Power bei 30 bis 70 % 1RM

- Quelle(n): ACSM Position Stand 2026; Cid-Calfucura et al. 2023
- Ort im Code: `src/data/trainingRules.ts`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### plyo_combat: Plyometrie im Kampfsport

- Quelle(n): Ojeda-Aravena et al. 2023, Sports (Basel)
- Ort im Code: `src/data/trainingRules.ts`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

## Teil B: Bibliotheksregeln der vier vorrangigen Pläne

Pläne: `PLN_COMBAT_GRAPPLING_BASE_8W`, `PLN_STR_BASE_8W`, `PLN_HYROX_BASE_8W`, `PLN_RUN5K_BASE_8W`.

### MR_K1: HIIT / SIT (kampfsportspezifisch)

- Name: HIIT / SIT (kampfsportspezifisch) (DEVELOPMENT_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_COMBAT_GRAPPLING_BASE_8W
- Dosisgrenzen: interval_s 15–240, intensity ≥90 % HFmax bzw. all-out, rounds 3–5, rpe 8–10
- Häufigkeit/Woche: [1, 2], Dauer (Wochen): [4, 8]
- Abbruch/Qualität: Max. 2 Einheiten/Woche; 48 h Abstand zu hartem Sparring
- Evidenz (Vorgabe): RELATED
- Quellen: Buchheit & Laursen 2013, Sports Med 43:313–338 (Part I) (doi 10.1007/s40279-013-0029-y); Helgerud et al. 2007, Med Sci Sports Exerc 39(4):665–671 (doi 10.1249/mss.0b013e3180304570)
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_K2: Maximalkrafttraining (Kampfsport)

- Name: Maximalkrafttraining (Kampfsport) (DEVELOPMENT_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_COMBAT_GRAPPLING_BASE_8W
- Dosisgrenzen: intensity_pct_1rm 85–92, reps 1–5, sets 3–5, rest_s 180–300, rpe 7–9
- Häufigkeit/Woche: [2, 3], Dauer (Wochen): [6, 12]
- Abbruch/Qualität: RPE-Deckel 9; ≥6 h Abstand zu hartem Sparring
- Evidenz (Vorgabe): RELATED
- Quellen: Rhea et al. 2003, Med Sci Sports Exerc 35:456–464 (Meta Dosis-Wirkung Kraft) (doi 10.1249/01.MSS.0000053727.63505.D4); Ralston et al. 2017, Sports Med 47(12):2585–2601 (Meta Satzvolumen/Kraft) (doi 10.1007/s40279-017-0762-7)
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_K3: Schnellkraft / Reaktivkraft

- Name: Schnellkraft / Reaktivkraft (QUALITY_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_COMBAT_GRAPPLING_BASE_8W
- Dosisgrenzen: contacts_per_session 20–60, reps 3–8, sets 3–5, rpe 5–8
- Häufigkeit/Woche: [1, 2], Dauer (Wochen): [4, 8]
- Abbruch/Qualität: Volle Pausen; nie erschöpft; Qualitätsabbruch
- Evidenz (Vorgabe): RELATED
- Quellen: — keine hinterlegt —
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_K4: Kraftausdauer & RSA

- Name: Kraftausdauer & RSA (DEVELOPMENT_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_COMBAT_GRAPPLING_BASE_8W, PLN_HYROX_BASE_8W
- Dosisgrenzen: work_s 20–45, rest_s 15–120, rounds 3–10, distance_m 15–40, rpe 7–9
- Häufigkeit/Woche: [1, 2], Dauer (Wochen): [4, 8]
- Abbruch/Qualität: Abbruch bei Technikzerfall
- Evidenz (Vorgabe): RELATED
- Quellen: Buchheit & Laursen 2013, Sports Med 43:313–338 (Part I) (doi 10.1007/s40279-013-0029-y)
- Hinweis der Recherche: RSA-Protokolle aus HIIT/RSA-Literatur übertragen.
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_K5: Aerobe Basis (Kampfsport, niedrig dosiert)

- Name: Aerobe Basis (Kampfsport, niedrig dosiert) (BASE_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_COMBAT_GRAPPLING_BASE_8W
- Dosisgrenzen: intensity_pct_hfmax 60–75, duration_min 20–60, rpe 3–5
- Häufigkeit/Woche: [2, 3], Dauer (Wochen): [6, 16]
- Abbruch/Qualität: Modalitätsneutral zur Gelenkentlastung; kein Ausdauer-Volumen
- Evidenz (Vorgabe): RELATED
- Quellen: Seiler 2010, Int J Sports Physiol Perform 5(3):276–291 (TID Best Practice) (doi 10.1123/ijspp.5.3.276)
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_K8: Concurrent Training / Einheiten-Integration

- Name: Concurrent Training / Einheiten-Integration (PROGRAM_ARCHITECTURE, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_COMBAT_GRAPPLING_BASE_8W
- Dosisgrenzen: separation_hours 6–24
- Häufigkeit/Woche: None, Dauer (Wochen): [6, 16]
- Abbruch/Qualität: Kraft vor Conditioning; ≥6 h Abstand wo möglich
- Evidenz (Vorgabe): RELATED
- Quellen: — keine hinterlegt —
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_TS19: Hypertrophie-Programmierung

- Name: Hypertrophie-Programmierung (HYPERTROPHY_PROGRAM, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_COMBAT_GRAPPLING_BASE_8W, PLN_STR_BASE_8W, PLN_HYROX_BASE_8W, PLN_RUN5K_BASE_8W
- Dosisgrenzen: reps 6–30, sets 1–6, rpe 6–9, hard_sets_per_muscle_week 10–20, holds_s 10–60
- Häufigkeit/Woche: [2, 6], Dauer (Wochen): [6, 16]
- Abbruch/Qualität: Doppelprogression: erst Wiederholungen, dann Last
- Evidenz (Vorgabe): DIRECT
- Quellen: Schoenfeld, Ogborn & Krieger 2017, J Sports Sci 35(11):1073–1082 (Meta) (doi 10.1080/02640414.2016.1210197); Grgic et al. 2018, Sports Med 48(5):1207–1220 (Meta Frequenz/Kraft) (doi 10.1007/s40279-018-0872-x)
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_TS28: Core-/Rumpftraining

- Name: Core-/Rumpftraining (SUPPLEMENTAL_PROGRAM, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_COMBAT_GRAPPLING_BASE_8W, PLN_STR_BASE_8W, PLN_HYROX_BASE_8W, PLN_RUN5K_BASE_8W
- Dosisgrenzen: reps 6–20, holds_s 10–120, distance_m 10–40, sets 1–4, rpe 4–8, rest_s 30–180
- Häufigkeit/Woche: [2, 4], Dauer (Wochen): [4, 12]
- Abbruch/Qualität: Qualität der Lagerung vor Dauer
- Evidenz (Vorgabe): GENERAL
- Quellen: — keine hinterlegt —
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_TS1: Lineare Periodisierung

- Name: Lineare Periodisierung (PERIODIZATION_ARCHITECTURE, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_STR_BASE_8W, PLN_HYROX_BASE_8W
- Dosisgrenzen: intensity_pct_1rm 55–85, reps 3–10, sets 2–6, rest_s 90–300, rpe 5–9, holds_s 10–90
- Häufigkeit/Woche: None, Dauer (Wochen): [8, 16]
- Abbruch/Qualität: Scheitert ein Satz → Gewicht halten, nicht steigern
- Evidenz (Vorgabe): RELATED
- Quellen: Rhea & Alderman 2004, Res Q Exerc Sport 75:413–422 (Meta Periodisierung) (doi 10.1080/02701367.2004.10609174)
- Hinweis der Recherche: Periodisierung meta-analytisch belegt (Rhea & Alderman 2004); die konkreten Wochensteigerungen (+2,5–5 %) sind Praxis-Standard, nicht trial-getestet — daher RELATED.
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_TS21: Autoregulation / RPE

- Name: Autoregulation / RPE (CONTROL_LAYER, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_STR_BASE_8W
- Dosisgrenzen: scale 1–10, default_cap 7–8
- Häufigkeit/Woche: None, Dauer (Wochen): None
- Abbruch/Qualität: RPE-Deckel des Plans gilt vor %-Vorgabe
- Evidenz (Vorgabe): DIRECT
- Quellen: Scott et al. 2016, Sports Med 46(5):687–698 (RPE-Monitoring) (doi 10.1007/s40279-015-0454-0)
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_H3: Stations-Kraftausdauer

- Name: Stations-Kraftausdauer (DURABILITY_SPECIFIC_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_HYROX_BASE_8W
- Dosisgrenzen: reps 8–50, distance_m 15–50, sets 2–5, rpe 6–8, rest_s 45–120
- Häufigkeit/Woche: [1, 2], Dauer (Wochen): [6, 12]
- Abbruch/Qualität: Stationstechnik vor Dichte
- Evidenz (Vorgabe): RELATED
- Quellen: — keine hinterlegt —
- Hinweis der Recherche: Stationsspezifische Kraftausdauer: sportartspezifische Ableitung, keine direkten Trials.
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_H4: GPP-Grundgerüst

- Name: GPP-Grundgerüst (GENERAL_FOUNDATION, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_HYROX_BASE_8W, PLN_RUN5K_BASE_8W
- Dosisgrenzen: reps 5–20, sets 2–5, rpe 5–8, rest_s 45–150, distance_m 10–60
- Häufigkeit/Woche: [3, 5], Dauer (Wochen): [8, 16]
- Abbruch/Qualität: Alle Grundmuster pro Woche abgedeckt
- Evidenz (Vorgabe): GENERAL
- Quellen: — keine hinterlegt —
- Hinweis der Recherche: GPP-Gesundheitsgrundgerüst: allgemeine Trainingswissenschaft/Leitlinien.
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_L1: Grundlagenausdauer & Long Runs

- Name: Grundlagenausdauer & Long Runs (BASE_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_HYROX_BASE_8W, PLN_RUN5K_BASE_8W
- Dosisgrenzen: intensity_pct_hfmax 60–75, duration_min 25–120, long_run_share_pct_weekly_volume 25–35
- Häufigkeit/Woche: [2, 5], Dauer (Wochen): [6, 16]
- Abbruch/Qualität: Talk-Test negativ → Tempo senken
- Evidenz (Vorgabe): DIRECT
- Quellen: Seiler 2010, Int J Sports Physiol Perform 5(3):276–291 (TID Best Practice) (doi 10.1123/ijspp.5.3.276)
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_TS27: Mobility

- Name: Mobility (SUPPLEMENTAL_PROGRAM, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_HYROX_BASE_8W, PLN_RUN5K_BASE_8W
- Dosisgrenzen: holds_s 20–90, sets 1–4, rpe 3–6, reps 5–20
- Häufigkeit/Woche: [2, 5], Dauer (Wochen): [4, 12]
- Abbruch/Qualität: Nur erforderliche Bewegungsumfänge
- Evidenz (Vorgabe): GENERAL
- Quellen: — keine hinterlegt —
- Hinweis der Recherche: —
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_L6: Krafttraining für Läufer

- Name: Krafttraining für Läufer (SUPPORT_STRENGTH_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_RUN5K_BASE_8W
- Dosisgrenzen: reps 5–15, holds_s 10–90, sets 2–4, rpe 5–8
- Häufigkeit/Woche: [1, 2], Dauer (Wochen): [8, 12]
- Abbruch/Qualität: Keine Ermüdung, die die Laufqualität senkt
- Evidenz (Vorgabe): DIRECT
- Quellen: Rønnestad & Mujika 2014, Scand J Med Sci Sports 24(4):603–612 (Review Krafttraining für Läufer/Radfahrer) (doi 10.1111/sms.12104)
- Hinweis der Recherche: Krafttraining für Läufer: Laufökonomie-Verbesserung belegt; Dosisrahmen an TID-/Best-Practice-Literatur (Seiler 2010) angelehnt.
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

### MR_TS22: Polarized Training (80/20)

- Name: Polarized Training (80/20) (BASE_BLOCK, Autonomie bis `AUTO_WITH_RULES`)
- In Plänen: PLN_RUN5K_BASE_8W
- Dosisgrenzen: low_intensity_share_pct 80–90, high_intensity_share_pct 10–20
- Häufigkeit/Woche: None, Dauer (Wochen): [6, 16]
- Abbruch/Qualität: Verteilung gilt für Gesamtumfang, nicht als Dogma pro Einheit
- Evidenz (Vorgabe): RELATED
- Quellen: Stöggl & Sperlich 2014, Front Physiol 5:33 (doi 10.3389/fphys.2014.00033); Oliveira et al. 2024, Sports Med (Systematic Review/Meta) (doi 10.1007/s40279-024-02034-z)
- Hinweis der Recherche: Gesamtdokument: kein universelles 80/20 — Orientierung, keine Pflichtverteilung. Gesamtdokument v3: kein universelles 80/20. Polarisierte Verteilung ist für Ausdauer gut belegt, aber als Orientierung, nicht als Pflichtdogma — daher RELATED statt DIRECT.
- Ort im Code: `content/library/` → `node scripts/buildLibrary.mjs` → `programIndex.json`

**Entscheidung**

- [ ] Quelle im **Volltext** gelesen (nicht nur Abstract)
- [ ] Die Dosierung (Umfang, Intensität, Häufigkeit, Dauer) ist durch die Quelle gedeckt
- [ ] Die Evidenzstufe und die Spezifität je Sportart sind richtig angegeben
- [ ] Die Grenzen und Ausschlüsse (Trainingsalter, Kontraindikationen, Abbruchkriterien) genügen
- [ ] Die Retest-Metrik passt zum Ziel der Regel
- Ergebnis: ☐ freigegeben ☐ freigegeben mit Änderung ☐ abgelehnt
- Änderung / Begründung: ……………………………………………
- Name, Qualifikation, Datum: ……………………………………………
- Interessenkonflikte: ☐ keine ☐ ja: ……………

