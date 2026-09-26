# Lückenanalyse: Master-Spezifikation gegen KYDON

Stand: 26.09.2026. Grundlage: „KYDON Claude Code Master-Spezifikation“ (Word,
Abschnitte A–R) gegen den Code auf `claude/sports-diagnostics-pwa-jnqy42`.

## 1. Entscheidungen (Produkt, 26.09.2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Architektur | **Lokal zuerst bleibt.** Die Spezifikation gilt als fachlicher Bauplan, nicht als Technikvorgabe. Kein Monorepo, kein tRPC, keine Worker, keine Server-Tabelle `derived_metrics` als Quelle der Wahrheit. |
| 2 | Sensordaten / Integrationen | **Vorerst weg.** Kein Garmin, Polar, Apple Health, Health Connect, Strava, kein FIT/GPX. Damit entfallen Decoupling, CP/W′, VO₂max-Schätzung und Power-Kurven. |
| 3 | KYDON Analyst (LLM) | **Ohne KI.** Alles bleibt deterministisch. |
| 4 | Sport-Engines | **HYROX und Kampfsport zuerst.** |
| 5 | Bodybuilding / PED / Supplements | **Keine PED-Protokolle.** Supplemente höchstens als Freitext. |
| 6 | Ernährung | **Ausbauen, nicht verkleinern.** Observed TDEE, Fuel Demand, Fueling je Einheit. **Keine** Energieverfügbarkeit (RED-S-Nähe). |
| 7 | Umgebung (Hitze, Höhe, Reise) | **Später.** |
| 8 | Minderjährige | **Bleiben** (Einwilligung der Erziehungsberechtigten). |
| 9 | Peak Week | Auf reine Dokumentation prüfen. |
| 10 | Analytics / Fehler | Eigene Erfassung behalten, Ereignisliste + Positivliste + Prüffall; eigene gefilterte Fehlererfassung statt Sentry. |
| 11 | Readiness | Prüfen und komponentenbasiert bauen. |
| 12 | Pakete | Grund-Insights und Messqualität frei; Durability, Last-Trend in Plus; Sportauswertungen in Plus und in den Trainerstufen. |
| 13 | Normdaten-Lizenzen | Lizenzfeld je Referenzquelle, offene Fälle auflisten. |

## 2. Ist-Stand je Abschnitt der Spezifikation

| Abschnitt | KYDON heute | Lücke |
|---|---|---|
| A Prinzipien | §81/§82/§89 in Code und Doku: keine Medizin, keine erfundene Wissenschaft, kein Trainingsplan, leer ≠ 0 | keine |
| B Architektur | lokal zuerst, Supabase als Sicherung (bewusste Abweichung, Entscheidung 1) | — |
| C Datenmodell | Rohwerte (`values`, `attempts`) und Ableitungen (`metrics`) getrennt; Protokollversion, Bedingungen, Audit | Ableitungen tragen keine Algorithmusversion |
| D Metric Engine | `formulaRegistry` (belegt/vorläufig), `dataQuality`, `change` mit Messfehler | kein einheitlicher Vertrag (Stichprobe, Qualität, Konfidenz, Warnungen, Version) |
| D Readiness | ein 0–100-Wert am Testtermin (`readinessScore`), Cockpit-Signale 7 gegen 28 Tage | **Einzelzahl im Vordergrund**; keine Komponenten gegen persönliche Bandbreite |
| D Load | sRPE je Einheit, Wochenlast, A:C-Quotient beschreibend | kein 7/28/90-Verlauf, keine Wochenänderung, keine Monotonie |
| D Durability | Ermüdungsindex in einzelnen Tests, Brick-Test | keine Zusammenschau frisch gegen ermüdet, kein Verlauf |
| D TDEE / Fuel | PAL-Referenz, Mahlzeiten mit Pre/Intra/Post | kein beobachteter Umsatz, keine g/kg- und g/h-Richtwerte, kein Fueling je Einheit |
| E Sport-Engines | Sportmodul (Elite) mit Kennzahlen je Kategorie, Critical Speed; HYROX-Batterie; Kampfsport-Tests | keine HYROX-Rennauswertung (Runs 1–8, Stationen, Roxzone), kein Rundenverlust |
| F Benchmarks | Quelle, n, Methode, Qualität A–D, Lückenliste, keine künstlichen Perzentile | **Lizenz** je Quelle fehlt |
| G Insights | `insights.ts` (Datenlage zuerst, dann Limiter), Cockpit-Signale, `overdueDecisions` | keine Regel-ID/Version, keine Sperrfrist, keine Dedupe, kein Bestätigen/Verwerfen, keine Inbox |
| H Analyst | — | entfällt (Entscheidung 3) |
| I UX | Übersicht, Analyse, Tests, Verlauf, Cockpit, Decision-Log, Trainerbereich | Insights-Eingang, Belastung, Durability, Sportauswertung, Tageskontext |
| J API | Supabase direkt + Edge Functions | entfällt als eigene API (Entscheidung 1) |
| K Ingestion | CSV-Import | entfällt vorerst (Entscheidung 2) |
| L Privacy | Art.-9-Schicht verschlüsselt, Einwilligung je Kategorie, RLS | keine |
| M Product Analytics | `track` ohne IP/UA, Sperrpfade, Schlüssel-Sperrliste | **keine Ereignisliste, keine Positivliste** |
| N Observability | — | eigene gefilterte Fehlererfassung (Entscheidung 10) |
| O Testing | ~100 Playwright-Spezifikationen, Domänenlogik ohne Browser | Goldwerte der neuen Kennzahlen |

## 3. Umsetzungsplan (in dieser Reihenfolge)

1. **K1 Metric Contract** — `domain/metricContract.ts`: jede neue Kennzahl mit
   Algorithmus, Version, Stichprobe, Qualität, Konfidenz, Warnungen. Ergebnisse
   speichern die Version der Ableitung (Schema v27).
2. **K2 Insight Engine** — Regelregister mit ID, Version, Kategorie, Schwere,
   Sperrfrist, „warum jetzt“, Belegen; Zustand je Hinweis (bestätigt,
   verworfen, Sperrfrist) im Bestand; Insights-Eingang.
3. **K3 Tageskontext (Readiness)** — Komponenten gegen den eigenen robusten
   Median der letzten 28 Tage; Gesamtwert nur zweitrangig und aufschlüsselbar.
4. **K4 Durability und Belastung** — testbasiert frisch gegen ermüdet;
   Last 7/28/90 Tage, Wochenänderung, Monotonie, rein beschreibend.
5. **K5 HYROX und Kampfsport** — Rennsimulation mit Runs und Stationen,
   Rundentest; Tempoverlust, Stationsanteile, Rundenverlust, Limiter gegen die
   eigene Bandbreite.
6. **K6 Ernährung** — beobachteter Umsatz, Kohlenhydrat- und Proteinrichtwerte
   aus Leitlinien, Fueling je Einheit (g/h, Flüssigkeit, Magen-Darm),
   Zielband für die Gewichtsrate.
7. **K7 Peak Week** — Texte prüfen: nur Dokumentation.
8. **K8 Analytics** — Ereignisliste, Positivliste, Prüffall; Fehlererfassung.
9. **K9 Lizenzen** — Lizenzfeld, Liste offener Fälle.
10. **K10** — Pakete, acht Sprachen, Gesamtlauf, Doku.

## 3a. Umgesetzt (Stand 26.09.2026)

| Paket | Ergebnis | Wo |
|---|---|---|
| K1 | Metric Contract; Fassung der Ableitung am Ergebnis (Schema 27) | `domain/metricContract.ts`, `MetricMeta` |
| K2 | 24 feste Regeln mit ID, Version, Sperrfrist, Belegen; Eingang `/hinweise`, Top 3 auf der Übersicht | `domain/insightEngine.ts`, `features/insights` |
| K3 | Tageskontext: 8 Komponenten gegen den eigenen 28-Tage-Median (MAD); Ruhepuls als Beobachtungswert; Selbsteinschätzung zuerst als Einzelangaben, 0–100 nur als Zusammenfassung | `domain/readinessContext.ts`, `features/readiness` |
| K4 | `/belastung`: Last 7/28/90, zwölf Wochen, Wochenänderung, Monotonie, Strain; Ermüdungsresistenz aus vier Tests (+ zwei Simulationen) | `domain/load.ts`, `domain/durability.ts`, `features/load` |
| K5 | Tests `hyrox_simulation` und `combat_rounds`; `/sportanalyse` mit Laufabfall, Stationsanteilen, Station gegen eigenen Median, Rundenabfall | `data/testCatalogRaceSim.ts`, `domain/raceSim.ts`, `features/sport` |
| K6 | Tagesspanne KH/Protein nach Thomas et al. 2016; Verpflegung je Einheit (g/h, Schweissrate, Magen-Darm); Gewichtsband; beobachteter Umsatz nach Vertrag | `domain/fueling.ts`, `features/nutrition/FuelingPanels.tsx` |
| K7 | Peak Week geprüft: nur Dokumentation; Prüffall gegen Vorgaben | `tests/peakWeekDoc.spec.ts` |
| K8 | Ereignisliste als Positivliste in Client und Server, Prüffall; gefilterte Fehlererfassung | `_shared/eventRegistry.ts`, `lib/errorCapture.ts` |
| K9 | Lizenzfeld an allen Referenzquellen; 14 offene Fälle | `docs/referenzlizenzen.md` |
| K10 | Merkmale `durability`, `sportAnalysis` (Plus; Sportanalyse auch in den bezahlten Trainerstufen); acht Sprachen | `data/pricing.ts` |

Vorläufige Festlegungen (Formelregister): Schwelle der Belastungsspitze 30 %,
Untergrenze erkennbarer Durability-Veränderung 3 Prozentpunkte, Minutengrenzen
der Belastungsstufe für den Tagesbedarf.

## 4. Was bewusst nicht kommt

Monorepo, tRPC-API, Worker-Queue, PostHog, Sentry, LLM-Analyst,
Anbieter-Integrationen, Zeitreihen-Streams, CP/W′, Decoupling, VO₂max-Schätzung,
Energieverfügbarkeit, PED-Protokolle, Umwelt-Readiness (später), Verletzungs-
oder Übertrainingsaussagen jeder Art.
