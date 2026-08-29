# Baseline — Sportdiagnostik-PWA

Progressive Web App für **periodische Sporttests und Leistungsdiagnostik**. Kein
Workout-Tracker: die App wird alle paar Wochen oder Monate benutzt, um Leistung
messbar zu machen — für ambitionierte Athleten (Functional Fitness, Kampfsport,
Tactical) und für Trainer, die Diagnostik als Dienstleistung anbieten.

> **Arbeitstitel:** „Baseline“ ist ein Platzhaltername (passt zu „eine Baseline
> setzen“ und funktioniert in DE und EN). Er steckt in `package.json`, im
> Manifest, im Wortmarken-SVG und im Namen des Supabase-Projekts — Umbenennen
> ist an diesen vier Stellen erledigt.

## Stand

| Bereich | Status |
|---|---|
| Supabase-Schema, RLS, Storage | steht, auf dem Projekt angewendet |
| Testkatalog (14 Systemtests, DE/EN) | eingespielt |
| Referenzwerte (Perzentile) | eingespielt, **Platzhalterdaten** — siehe unten |
| Scoring-Funktionen (Radar, Delta) | stehen in der Datenbank |
| Designsystem, Theme-Switch, i18n | steht |
| Athlete-Dashboard | steht, läuft mit Demodaten |
| Auth, Test-Engine, Trainer-Hub, PDF, Stripe | noch nicht begonnen |

## Loslegen

```bash
npm install
cp .env.example .env.local     # enthält bereits URL + Publishable Key
npm run dev
```

Ohne Sitzung läuft das Dashboard mit Demodaten (`src/data/demo.ts`) — das
Layout ist also ohne Login beurteilbar.

```bash
npm run build     # Produktionsbuild inkl. Service Worker
npm run lint      # Typprüfung
npm run db:types  # Supabase-Typen erzeugen (braucht supabase CLI + Link)
```

## Architektur

* **Frontend:** React 19 + TypeScript, Vite, Tailwind v4, ECharts, i18next,
  React Query, `vite-plugin-pwa` (offlinefähig — die Testdurchführung muss auch
  im Funkloch der Halle laufen).
* **Backend:** Supabase — Postgres für die Daten, Auth für den Login, Storage
  für PDF-Reports und Trainer-Logos.
* **Projekt:** `baseline-diagnostics`, Region `eu-central-1` (Frankfurt).

Der Zugriffsschutz liegt vollständig in der Datenbank (RLS). Der Client hält
nur den Publishable Key; ein kompromittierter Client kann keine fremden Daten
lesen.

## Datenmodell

```
auth.users ──1:1── profiles ──────────┐
                                      │ is_coach
athletes ─────< coach_athlete_links >─┘
   │  user_id NULL  = vom Trainer verwalteter Klient ohne Account
   │  user_id gesetzt = Self-Serve-Athlet (kann später übernommen werden)
   │
   ├─< biometric_entries      Zeitreihe: Gewicht, Grösse, KFA, Ruhe-/Max-Puls
   ├─< assessments            ein Diagnostiktermin = Klammer um mehrere Tests
   └─< test_results ──┬─< test_result_stages   Stufen (Laktat-Ramp, Beep-Test)
                      └─< result_metrics       1RM, VO2max, Relativkraft, Sinclair …

test_definitions ──< test_definition_translations   (de/en)
                 └──< performance_norms             Perzentil-Stützstellen

entitlements   Bezahlschranken (Stripe schreibt, App liest)
coach_branding White-Label: Logo, Farben, Fusszeile
reports        erzeugte PDFs (Storage-Bucket `reports`)
health_connections  Vorbereitung Health Connect / Apple Health
```

### Entscheidungen, die nicht offensichtlich sind

**Körpergewicht ist eine Zeitreihe, kein Profilfeld.** Relativkraft und Sinclair
brauchen das Gewicht *zum Testzeitpunkt*. `test_results` speichert zusätzlich
einen Snapshot von Gewicht, Alter und Geschlecht — ein Ergebnis muss Jahre
später reproduzierbar bleiben, auch wenn Stammdaten korrigiert werden.

**Berechnete Werte liegen relational, nicht als JSON-Spalte.** `result_metrics`
hält je Ergebnis beliebig viele abgeleitete Werte mit Einheit *und der
verwendeten Formel*. Damit sind Verläufe je Metrik direkt abfragbar, und ein
Formelwechsel (z. B. Epley → Brzycki) macht alte Werte nicht stillschweigend
inkonsistent.

**`test_definitions.dimension_metrics` verbindet Tests mit Radar-Achsen.** Eine
Map `Dimension → metric_key`, z. B. bei der Kniebeuge
`{"max_strength":"one_rm_kg","relative_strength":"relative_strength_bw"}`.
Ein Test kann so auf mehrere Achsen einzahlen — mit dem jeweils *passenden*
Wert, nicht mit demselben.

**Zugriff läuft ausschliesslich über `coach_athlete_links`.** Auch der Trainer,
der einen Klienten selbst angelegt hat, braucht die (per Trigger automatisch
erzeugte) Verknüpfung. Eine Quelle der Wahrheit, ein Weg zum Entzug.

**Eigene Tests sind ein Pro-Feature auf DB-Ebene.** Die RLS-Policy für
`test_definitions` und `reports` prüft `has_entitlement(..., 'coach_pro')` —
die Bezahlschranke lässt sich nicht durch Umgehen der UI aushebeln.

## Scoring

`public.athlete_radar_profile(athlete_id, mode, as_of, window, population)`
liefert die sechs Achsen als 0–100-Werte in zwei Modi:

* **`personal_best`** — aktueller Wert gegen die eigene Bestleistung.
  100 = Bestwert. Das ist eine **Formstand-Ansicht**, keine Stärken/Schwächen-
  Analyse (siehe offene Punkte).
* **`population`** — Perzentil gegen `performance_norms`, linear zwischen den
  Stützstellen interpoliert, ausserhalb auf die Randstützstelle geklemmt.
  Richtungsunabhängig: bei Zeit-Tests fällt das Perzentil mit steigendem Wert
  von selbst.

`public.athlete_radar_delta(...)` liefert die Differenz zweier Zeitpunkte je
Achse — die Grundlage für die Prozentangaben im Trainer-Report.

Die Formeln der App (`src/lib/metrics/`) sind rein und getrennt vom UI:
1RM nach Epley/Brzycki/Lombardi, VO2max nach Cooper und Léger, Sinclair,
Ruder-Watt nach Concept2, Laktatschwelle und daraus abgeleitete Trainingszonen.

### ⚠ Referenzwerte sind Platzhalter

Alle Zeilen in `performance_norms` tragen `source = 'baseline_v0_placeholder'`.
Sie liegen in plausibler Grössenordnung für trainierte Erwachsene, stammen aber
**nicht aus einer publizierten Normstudie**. Vor dem Produktivstart müssen sie
gegen belastbare Quellen ersetzt werden (ACSM Guidelines, Cooper Institute,
nationale Behörden-Standards). Die Tabellenstruktur bleibt dabei unverändert:

```sql
select * from performance_norms where source = 'baseline_v0_placeholder';
```

Für die absolute Maxkraft (`one_rm_kg`) ist mittelfristig ein
körpergewichtsnormiertes Verfahren (Wilks / IPF-GL) die bessere Grundlage als
rohe Kilogramm-Perzentile.

## Designsystem

Gestaltungsrichtung **„Instrument Panel“**: die App ist ein Messgerät, kein
Motivations-Feed. Harte Kanten (2 px Radius), Haarlinien statt Schatten,
Millimeterraster im Hintergrund, Eckmarken an den Hauptpanels.

* **Schrift:** Saira Condensed (Anzeigetafel-Beschriftungen, Überschriften),
  IBM Plex Sans (Fliesstext), IBM Plex Mono mit Tabellenziffern (alle Messwerte).
* **Farbe:** neutraler Graphit/Knochen-Grund, ein Signalakzent (Limette
  `#C8F531`). Hell und dunkel sind beide bewusst gesetzt, nicht invertiert.
  Alle Rollen liegen als CSS-Custom-Properties in `src/styles/theme.css` und
  werden über `@theme inline` an Tailwind durchgereicht — eine Quelle der
  Wahrheit für UI und Diagramme.
* **Diagrammfarben** sind mit dem Validator der dataviz-Methode gegen genau
  diese Oberflächen geprüft (Helligkeitsband, Chroma, Farbfehlsichtigkeit,
  Normalsicht-Abstand, Kontrast) — Serie 1 Limette `#6F9E00` / `#79A11D`,
  Serie 2 Blau `#2a78d6` / `#3987e5`.
* **Zugänglichkeit:** jedes Diagramm hat eine Tabellenansicht, jede
  Richtungsangabe trägt zusätzlich ein Icon, Umschalter sind echte Radiogruppen.

White-Label ist tokenbasiert vorbereitet: `coach_branding` liefert Primär- und
Akzentfarbe, die als Custom Properties überschrieben werden können — dieselben
Werte gehen später in den PDF-Report.

## Offene Punkte

1. **Der Bestleistungs-Modus ergibt bei steigender Leistung ein flaches Profil.**
   Wer sich überall verbessert, steht überall bei 100 — das Spinnennetz zeigt
   dann keine Stärken und Schwächen mehr, sondern nur „Form überall am Peak“.
   Das ist inhaltlich korrekt und für die Periodisierung durchaus nützlich, aber
   nicht die Stärken/Schwächen-Analyse. Drei Wege stehen offen:
   *(a)* so lassen und den Modus klar „Formstand“ nennen (aktuell umgesetzt),
   *(b)* die Bestleistung ohne die aktuelle Messung berechnen, dann sind Werte
   über 100 möglich („neue Bestleistung, +6 %“),
   *(c)* den Modus auf einen gleitenden 24-Monats-Bestwert beziehen.
   Zu entscheiden.
2. Referenzwerte ersetzen (siehe oben).
3. Testintervall: aktuell fest 4 Monate (`RETEST_INTERVAL_MONTHS`) — soll das
   pro Athlet oder pro Trainer einstellbar sein?
4. Freie Klientenanzahl vor der Pro-Schranke ist noch nicht festgelegt; die
   RLS-Policy erlaubt derzeit jedem Trainer beliebig viele Klienten, die
   Bezahlschranke greift beim PDF-Report und bei eigenen Tests.

## Nächste Schritte

1. Auth (Magic Link + Passwort), Onboarding mit Rollenwahl und Biometrie
2. Test-Engine: geführter Modus mit Timer, Stufentabelle, Ergebniserfassung
3. Dashboard an echte Daten hängen (React-Query-Hooks auf die RPCs)
4. Trainer-Hub: Klientenliste, Einladungen, Branding
5. PDF-Report als Edge Function (Delta-Vergleich, Trainingszonen, White-Label)
6. Stripe: Einmalkauf B2C, Abo B2B, Webhook schreibt `entitlements`
7. Health Connect / Apple Health für Herzfrequenzen

## Verzeichnisse

```
supabase/migrations/   Schema, RLS, Storage, Seeds — in Reihenfolge anwendbar
src/lib/metrics/       Sportwissenschaftliche Formeln, rein und testbar
src/components/charts/ ECharts-Wrapper, Radar, Verlauf
src/features/dashboard/Athlete-Dashboard
src/i18n/              DE/EN
src/data/demo.ts       Demodaten, mit derselben Logik gerechnet wie die DB
```
