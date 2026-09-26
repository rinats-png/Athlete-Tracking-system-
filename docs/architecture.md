# KYDON — Architektur

Stand: 26.09.2026. Beschreibt, **wie** KYDON gebaut ist. Was es können soll,
steht in [prd.md](prd.md).

---

## 1. Überblick

```
┌───────────────────────── Gerät (PWA) ──────────────────────────┐
│  React 19 · React Router 7 · Tailwind 4 · i18next (8 Sprachen)   │
│                                                                   │
│  features/*  ──►  domain/* (reine Logik)  ◄──  data/* (Kataloge)  │
│       │                                                           │
│       ▼                                                           │
│  lib/store  ── localStorage `kydon.data.v1` (zod, Schema v26)     │
│       │                                                           │
│  lib/supabase/sync ──────────────┐   Service Worker (Workbox)     │
└──────────────────────────────────┼────────────────────────────────┘
                                   │ HTTPS / WSS (nur mit Konto)
┌──────────────────────────────────▼────────────────────────────────┐
│ Supabase: Postgres + RLS · Auth · Edge Functions · Cron · Vault   │
│   athlete_documents / athlete_series · entitlements · teams …     │
└───────────────┬───────────────────────────────┬──────────────────┘
                ▼                               ▼
             Stripe                        Web Push (VAPID)
```

Drei Grundentscheidungen tragen alles Weitere:

1. **Lokal zuerst.** Die App ist ohne Konto und ohne Netz vollständig
   benutzbar. Das Gerät hält den maßgeblichen Stand; der Server ist Sicherung,
   Abgleich zwischen Geräten und Zusammenarbeit im Team.
2. **Fachlogik ist rein.** Alles, was rechnet (Einordnung, Messfehler, Score,
   Berechtigungen), liegt in `src/domain` als Funktion ohne React und ohne I/O —
   deshalb in Playwright ohne Browser prüfbar.
3. **Der Server entscheidet über Geld und Zugriff.** Freischaltungen schreibt
   nur der Stripe-Webhook; Zugriff auf Daten regelt RLS. Der Client zeigt an,
   er gewährt nicht.

## 2. Technologie

| Schicht | Wahl |
|---|---|
| Sprache / Build | TypeScript 5.7, Vite 6, `tsc -b && vite build` |
| UI | React 19, React Router 7 (`createBrowserRouter`, Bildschirme lazy) |
| Styling | Tailwind 4, CVA, eigene Primitives in `src/components/ui` |
| Schriften | IBM Plex Sans / Mono, Saira Condensed (lokal gebündelt) |
| Diagramme | Eigenes SVG (`src/components/charts`), keine Chart-Bibliothek |
| i18n | i18next + react-i18next, 8 Sprachen |
| Validierung | zod |
| Backend | Supabase (`@supabase/supabase-js` 2) |
| PWA | vite-plugin-pwa (Workbox, `autoUpdate`) |
| Tests | Playwright 1.62 |
| Auslieferung | Netlify, statisch |

Kein globaler State-Manager: der Datenbestand liegt in einem React-Context
(`src/lib/store/AppDataProvider.tsx`), Abrechnung in `BillingProvider`.

## 3. Quelltext

```
src/
  App.tsx            Router; Intro, Willkommen, Onboarding vor dem Router
  routes/AppShell    Hülle mit Kopf und Navigationsleiste
  features/          Bildschirme je Bereich (siehe unten)
  domain/            reine Fachlogik (~50 Module)
  data/              statische Kataloge: Tests, Sportarten, Referenzen, Preise …
  lib/
    store/           lokaler Bestand, Schema, Migrationen, Backup, Übergabe
    supabase/        Client, Auth, Sync, Serien, Gesundheit, AVV, Analytics
    health/          Ende-zu-Ende-Verschlüsselung der Gesundheitsdaten
    metrics/         abgeleitete Kennzahlen (Kraft, Ausdauer)
    export/          CSV, ICS
    scoring.ts       Radar-Profil (Client-Port der SQL-Funktionen)
  components/        ui/, charts/, signature/, body/
  i18n/              Sprachen, Wörterbücher, Inhaltsergänzung
  types/             domain.ts, supabase.ts (generiert)
```

**Feature-Ordner:** admin, analysis, assessments, auth, billing, coach, cockpit,
dashboard, diagnostics, diary, health, history, intro, legal, nutrition,
observations, onboarding, overview, profile, push, report, shared, sport, tests,
training.

**Routen** (deutsche Pfade): `/` Übersicht · `diagnostik/…` · `sport/:id` ·
`batterie/:slug` · `tests/:slug` · `ergebnis/:id` · `verlauf/…` · `analyse` ·
`trainer/…` (Gruppentest, Testtag, Vergleich, Gruppenbericht, Heatmap,
Nachweis) · `bericht`, `einseiter` · `tagebuch`, `training`, `cockpit`,
`ernaehrung`, `gesundheit`, `peakweek`, `sportmodul` · `profil`, `preise`,
`team/beitreten` · Rechtsseiten.

Abhängigkeitsrichtung: `features → domain, data, lib, components`;
`domain → data`; `domain` importiert nie aus `features` oder `lib/supabase`.

## 4. Datenmodell auf dem Gerät

- **Speicher:** localStorage, Schlüssel `kydon.data.v1`
  (`src/lib/store/localStore.ts`).
- **Schema:** `src/lib/store/schema.ts`, zod, `CURRENT_SCHEMA_VERSION = 26`.
- **Wurzel:** `version`, `branding`, `lastExportAt`, `role` (`solo` | `coach`),
  `athletes[]` (mindestens einer), `activeAthleteId`, `testDays[]`.
- **Je Athlet:** Profil, Ergebnisse, Beobachtungen, Tagebuch, Einheiten
  (Workout → Übung → Satz), Mahlzeiten, Entscheidungen, Cockpit-Schwellen,
  Gesundheit (Labor, Symptome, Zyklus, Medikamente, Fotos), Peak Week.
- **Migrationen:** `MIGRATIONS` in `schema.ts`, je Version eine benannte
  Funktion. Zusicherungen: kein Datenverlust; ein neuerer gespeicherter Stand
  wird nicht angefasst, sondern gemeldet; Importe werden validiert und mit
  benanntem Fehler abgelehnt (`newer_version`, `unknown_format`,
  `storage_full`, `invalid_json`).
- **Weitere Schlüssel:** `kydon.sync.v1` (Sync-Zustand), `kydon.theme`,
  `kydon.locale`, `kydon.coachStatus.v1` (letzter Zählstand), `kydon.billing.mode`.
  Alte `baseline.*`-Schlüssel werden beim Start umbenannt (`migrateStorage.ts`).

## 5. Synchronisierung

Datei: `src/lib/supabase/sync.ts`. Nur mit Konto und eingeschaltetem Sync.

| Ebene | Tabelle | Inhalt | Konfliktregel |
|---|---|---|---|
| Dokument | `athlete_documents` | ein JSON je Athlet: Profil, Ergebnisse, Notizen | Compare-and-set auf `updated_at`; bei Abweichung Konflikt, beide Stände bleiben, Nutzer entscheidet |
| Serie | `athlete_series` | eine Zeile je Eintrag (Tagebuch, Einheit, Entscheidung, Mahlzeit) | Upsert in 200er-Paketen, neueres `updatedAt` gewinnt, Löschen als Grabstein `deleted_at`, inkrementeller Abruf |

- **Pool:** Beide Tabellen sind nach `owner_id` geschlüsselt. Ein Trainer im
  Team arbeitet im Bestand des Inhabers; `rpc('my_pool_owner')` liefert,
  welcher Pool gilt. Beim Wechsel wird der lokale Bestand ersetzt; beim
  Beitreten kommt der eigene Bestand nur mit ausdrücklicher Wahl mit.
- **Gesundheit** wird aus dem Dokument entfernt und getrennt, verschlüsselt
  übertragen (`lib/health/*`, `healthSync.ts`). Der Schlüssel stammt aus einer
  eigenen Passphrase, nicht aus dem Passwort.

## 6. Backend (Supabase)

Projekt `baseline-diagnostics`, Region `eu-central-1` (Frankfurt).

### Tabellen (Auswahl, aus `supabase/migrations`, 32 Migrationen)
| Bereich | Tabellen |
|---|---|
| Identität | `profiles`, `accounts` |
| Sync | `athlete_documents`, `athlete_series` |
| Abrechnung | `entitlements`, `coach_usage` |
| Teams | `teams`, `team_members`, `team_invites` |
| Gesundheit | `health_entries` (verschlüsselt), `health_shares` |
| Push | `push_subscriptions`, `push_due`, `push_log` |
| Audit / Analytics | `security_events`, `analytics_events` |
| Frühes relationales Schema | `athletes`, `coach_athlete_links`, `test_results`, `assessments`, `performance_norms` u. a. — seit dem Dokument-Sync nur noch teilweise in Gebrauch |

### Zugriffsschutz
- RLS auf allen Tabellen. Teamzugriff über `can_use_pool(owner)`, das auch
  prüft, ob die Stufe des Inhabers noch weitere Trainer trägt.
- Löschen von Athleten nur durch den Inhaber des Pools.
- Hilfsfunktionen `SECURITY DEFINER`, Ausführungsrechte eng vergeben.
- `scripts/auditPolicies.mjs` prüft die Richtlinien statisch aus den
  Migrationen; Teil von `npm run security` und CI.

### Edge Functions (`supabase/functions`)
| Funktion | Zweck | JWT |
|---|---|---|
| `create-checkout` | Stripe-Kasse; Käufer aus dem Token, Preis-ID aus der Umgebung, Gründer-Gutschein | ja |
| `stripe-webhook` | einziger Ort, der Freischaltungen schreibt; HMAC-Signatur, 5 min Toleranz | nein (Signatur) |
| `change-plan` | Stufenwechsel: Vorschau, Anwenden, Vormerkung zurücknehmen | ja |
| `billing-portal` | Stripe-Kundenportal | ja |
| `delete-account` | Kontolöschung; einziger Ort mit Service-Role-Schlüssel | ja |
| `push` | Web Push: fällige Erinnerungen (Cron), Test, Rundruf, Trainer | ja / Cron-Geheimnis |
| `track` | Analytics-Eingang ohne IP und User-Agent | ja |

Gemeinsamer Code: `_shared/stripe.ts` (ohne SDK, rein und prüfbar),
`_shared/push.ts`, `_shared/analytics.ts`.

### Cron und Geheimnisse
- `push-due-hourly`, `push-purge-daily`, `team-invites-purge-daily`.
- Vault: VAPID-Schlüssel, Cron-Geheimnis. Stripe-Schlüssel und Preis-IDs als
  Umgebung der Edge Functions. Nichts davon im Repository.

## 7. Abrechnung und Berechtigungen

- **Produkte:** `athlete_plus|pro|elite|termin`, `coach_start|team|pro|club`
  (`src/lib/billing.ts`, `src/data/pricing.ts`).
- **Ablauf:** Kasse (`create-checkout`) → Stripe → `stripe-webhook` schreibt
  `entitlements` → App liest Freischaltungen → `accessFor()` in
  `src/domain/entitlement.ts` ergibt Paket und Trainerstufe.
- **Trainerstufe im Team:** Mitglieder erben die Stufe des Inhabers.
- **Zählung:** `my_coach_status()` zählt Athleten mit Messung im
  Abrechnungsjahr, hält `over_limit_since` fest; Frist 14 Tage
  (`src/domain/upgrade.ts`).
- **Sperren:** `<Gate feature=…>` um Routen und Bereiche. `FREE_CORE`
  ist nie gesperrt.
- **Schalter:** Abrechnung nur mit `VITE_BILLING=on`, Gründerpreis mit
  `VITE_FOUNDER_OFFER=on`.

## 8. Fachlogik

| Thema | Ort | Kern |
|---|---|---|
| Testkatalog | `data/testCatalog*.ts` | 82 Tests mit Protokoll, Ausrüstung, Wertung |
| Sportarten | `data/sportProfiles*.ts` | 49 Disziplinen, 11 Kategorien, Achsensatz je Disziplin |
| Batterien | `data/testBatteries.ts` | 11 Batterien |
| Referenzen | `data/referenceModel.ts`, `references*.ts` | Methode (mean_sd, Perzentile, Bänder …), Qualität A–D, Quelle {Studie, n}, Lückenliste |
| Radar | `lib/scoring.ts` | Bestleistung oder Perzentil, Fenster 18 Monate |
| Score | `domain/performanceScore.ts` | erst ab 3 Achsen mit Referenz |
| Messfehler | `domain/change.ts` | typischer Fehler je Athlet und Test ab 4 Messungen; Schwelle 1,96·√2; Urteile besser / schlechter / Rauschen / unbekannt / erste |

## 9. Internationalisierung

- `src/i18n/locales.ts`: `de en fr es sv da nb nl`; Deutsch ist Ausweichsprache
  der Oberfläche, Englisch die der Inhalte.
- Oberfläche: `<lang>.json` + `<lang>.extra.json`, nachgeladen.
- Inhalte (Testnamen, Anleitungen …): `{ de, en }` in den Datenmodulen, für
  die übrigen Sprachen aus `i18n/content/<lang>.json` ergänzt, gelesen über
  `pick()`.
- `scripts/checkLocale.mjs` prüft Schlüssel und Platzhalter gegen Deutsch.
- Details: [sprachen.md](sprachen.md).

## 10. Sicherheit

- CSP `default-src 'self'`, `connect-src` nur Supabase und Open Food Facts,
  `frame-ancestors 'none'`, HSTS, COOP/CORP (`public/_headers`).
- Der öffentliche Supabase-Schlüssel steht bewusst im Build; Schutz über RLS.
- Abmelden leert das Gerät; Kontolöschung serverseitig; sicherheitsrelevante
  Ereignisse in `security_events` mit Aufbewahrungsfrist.
- `npm run security`: Typen, Richtlinienprüfung, Geheimnissuche, `npm audit`.
- Details und Restrisiken: [sicherheit.md](sicherheit.md).

## 11. Offline und Aktualisierung

- Workbox precacht JS, CSS, HTML, Bilder, Schriften; Navigation fällt auf
  `index.html` zurück.
- Neue Version: `autoUpdate`, Registrierung in `src/lib/pwaUpdate.ts`.
- Web Push über `public/push-sw.js` im selben Service Worker.

## 12. Qualitätssicherung

- **Playwright** gegen den Produktionsbau (`vite preview`), Profile `phone`,
  `phone-split-viewport`, `phone-landscape`, `tablet`, `desktop`; rund 100 Spezifikationen.
- Fachlogik wird direkt importiert und ohne Browser geprüft.
- **Datenbank-Szenarien** in `supabase/scenarios` gegen lokales Postgres.
- **CI** (`.github/workflows/security-gate.yml`) bei jedem Push, jedem PR und
  wöchentlich: `npm ci` → `tsc` → Sprachprüfung → Richtlinien → `npm audit` →
  Bau → Geheimnissuche → Playwright (desktop, phone). CI liefert nicht aus.

## 13. Auslieferung

- Netlify: `npm run build`, Verzeichnis `dist`, SPA-Weiterleitung
  (`netlify.toml`). Manuell oder per Git, siehe [auslieferung.md](auslieferung.md).
- Edge Functions und Migrationen werden getrennt nach Supabase ausgerollt.
- Landingpage: eigenes Projekt unter `landing/` (Vite + three.js), eigener Bau.

## 14. Architekturentscheidungen

| Entscheidung | Warum | Preis |
|---|---|---|
| localStorage statt IndexedDB | einfach, synchron, reicht für den Umfang je Nutzer | Grenze ~5 MB; Fotos und große Serien müssen knapp bleiben |
| Dokument + Serie statt relationaler Sync | ein Athlet ist eine Einheit; Einträge wachsen getrennt | frühes relationales Schema liegt teilweise brach |
| Kein Stripe-SDK | drei HTTP-Aufrufe und ein HMAC; weniger Code mit geheimem Schlüssel | eigene Pflege der Felder |
| Eigene SVG-Diagramme | volle Kontrolle über Darstellung und Barrierefreiheit | mehr eigener Code |
| Fachlogik ohne React | prüfbar ohne Browser, wiederverwendbar im Server | Disziplin beim Import |
| Freischaltung nur per Webhook | kein Client kann sich selbst freischalten | kurze Verzögerung nach dem Kauf |

## 15. Bekannte Grenzen

- Ein Gerät, das offline ist, behält Teamdaten nach dem Austritt bis zum
  nächsten Abgleich.
- Löscht ein Trainer im Team einen Athleten lokal, bleibt er auf dem Server
  (nur der Inhaber löscht).
- Community-Vergleich ohne Datenbasis.
- Speichergrenze von localStorage.
