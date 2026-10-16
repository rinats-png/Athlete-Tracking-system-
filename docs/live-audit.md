# Live-Audit Supabase

**Stand:** 11. Oktober 2026
**Projekt:** `bsbionvnsvqghaqijmpl` (`baseline-diagnostics`, eu-central-1). Es ist
dasselbe Projekt wie in `.env.example` und `netlify.toml`.
**Art:** nur lesend über den Supabase-Connector, geändert wurde nichts.
Inhalte von Nutzerdaten wurden nicht gelesen, nur Zählungen.

## Ergebnis in einem Satz

Das Fundament stimmt: RLS ist überall aktiv, der Profil-Trigger läuft, die
Speicherbereiche sind privat. Aber **sechs Migrationen und drei Edge
Functions aus dem Repo fehlen live**. Funktionen, die in der Produktion
eingeschaltet sind (KI-Formulierung, Planzuweisung, Kontolöschung), können
deshalb serverseitig nicht arbeiten.

## 1 Migrationen

Live sind 37 Migrationen eingespielt, die letzte ist `teams` vom
25.09.2026. Mehrere Dateien aus dem Repo wurden damals in Teilen
eingespielt (z. B. `health_shares_*`, `analytics_*`); deren Objekte sind
vorhanden.

**Fehlen live, mit den Tabellen, die dadurch nicht existieren:**

| Migration | fehlt live | Folge |
|---|---|---|
| `20260930100000_push_topics_activity` | `push_agenda`, `push_releases`, `push_prefs`, `push_events` | Push-Themen und Aktivitäts-Push laufen ins Leere |
| `20261004100000_shared_checkins` | `shared_checkins`, `coach_shared_checkins()` | «Check-ins mit Trainer teilen» schlägt fehl |
| `20261004110000_ai_usage` | `ai_usage`, `ai_usage_bump()` | Kontingent der KI-Formulierung fehlt |
| `20261004120000_push_weekly` | Cron-Eintrag Wochenbrief | kein Push für den Montagsbrief |
| `20261005100000_plan_assignments` | `plan_assignments`, `plan_assignment_results`, `athlete_is_minor()` | Planzuweisung (`VITE_PLAN_ASSIGN=on`) schlägt fehl |
| `20261005110000_push_plan_offer` | Trigger `plan_assignments_push_offer` | kein Push bei Planangebot |

`supabase/einspielen/offene_migrationen.sql` enthielt
`push_topics_activity` nicht, obwohl `push_weekly` darauf aufbaut. Die Datei
wurde mit den neuen Migrationen dieses Tages neu erzeugt (siehe unten).

## 2 Edge Functions

| Funktion | live | `verify_jwt` | Befund |
|---|---|---|---|
| `track` | ja | aus | begründet: `sendBeacon` sendet ohne Kopfzeilen (sicherheit.md) |
| `push` | ja | aus | wird vom Cron mit eigenem Geheimnis gerufen |
| `stripe-webhook` | ja | aus | richtig, Stripe signiert selbst |
| `change-plan` | ja | an | richtig |
| `create-checkout` | ja | an | richtig |
| **`delete-account`** | **nein** | — | **Kontolöschung funktioniert live nicht** (Art. 17 DSGVO). Dringend. |
| **`phrase`** | **nein** | — | KI-Formulierung (`VITE_AI_PHRASE=on`) schlägt fehl; die App fällt auf feste Texte zurück |
| **`billing-portal`** | **nein** | — | Abo-Verwaltung über Stripe nicht erreichbar |

## 3 Zugriffsregeln (RLS)

- Alle 30 Tabellen in `public` haben RLS eingeschaltet.
- `analytics_events` und `push_log` haben keine Richtlinie. Das ist
  gewollt: Es schreibt nur der Server, der Client hat keine Rechte. Der
  Hinweis des Advisors ist hier nur eine Information.
- Die Richtlinien für `athlete_documents` und `athlete_series` arbeiten
  über das Team (`can_use_pool`), wie im Repo.

## 4 Funktionen mit erweiterten Rechten

- Die 35 Hinweise «signed-in users can execute SECURITY DEFINER» betreffen
  bewusst aufrufbare RPCs (Teams, Freigaben, Prüffunktionen der RLS). Das
  ist so gewollt.
- **Befund:** `envelope_public_of`, `is_analytics_admin` und `my_coaches`
  sind auch **ohne Anmeldung** (Rolle `anon`) aufrufbar.
  - Im Repo steht `revoke all … from public`. Supabase vergibt `anon` aber
    eigene Rechte, die dieser Befehl nicht entzieht.
  - Die Auswirkung ist gering: `my_coaches()` liefert ohne Sitzung nichts,
    `is_analytics_admin()` liefert `false`, und `envelope_public_of()` gibt
    den öffentlichen Schlüssel eines Trainers zu einer bekannten UUID
    heraus.
  - Trotzdem soll es geschlossen werden. Die Migration
    `20261011110000_revoke_anon_rpc.sql` tut das.
- `delete_account_data`, `purge_expired` und `purge_orphaned_athletes` sind
  für Clients korrekt gesperrt.

## 5 Konto und Anmeldung

- Der Trigger `on_auth_user_created` mit `handle_new_user()` ist live
  vorhanden: Das Profil entsteht bei der Registrierung.
- **Schutz vor bekannten Passwörtern ist aus** (Advisor
  `auth_leaked_password_protection`). Er wird im Dashboard eingeschaltet:
  Authentication → Policies → Leaked password protection. Das geht nicht
  über eine Migration.
- Weiterleitungs-URLs, JWT-Laufzeit und Rate Limits sind über den
  Connector nicht lesbar. Sie müssen im Dashboard geprüft werden
  (Authentication → URL Configuration und Rate Limits).

## 6 Speicher und Zeitpläne

- Die Buckets `reports`, `avatars` und `branding` sind privat, mit
  Richtlinien für Lesen und Schreiben.
- Cron-Einträge: `push-due-hourly`, `push-purge-daily` und
  `team-invites-purge-daily`. Ein Eintrag für `purge_expired()` (Grabsteine
  nach 90 Tagen, Sicherheitsereignisse nach 365 Tagen) ist **nicht**
  geplant. Die Bereinigung läuft live also nicht von selbst.

## 7 Umfang der Daten

Live gibt es 4 Konten, 1 Athleten-Dokument, keine Zeitreihen und keine
Teams. Die offenen Punkte betreffen also noch kaum echte Nutzer. Das ist
der richtige Moment, sie zu schließen.

## Was zu tun ist, in dieser Reihenfolge

1. **`delete-account` ausrollen:** `supabase functions deploy delete-account`.
2. **Offene Migrationen einspielen:**
   `supabase/einspielen/offene_migrationen.sql` im SQL-Editor, oder
   `supabase db push`.
3. **`phrase` und `billing-portal` ausrollen.** Für `phrase` gilt: erst
   nach Migration `20261011120000_ai_consents.sql` und der Rechtsprüfung in
   `docs/ki-einwilligung.md` §5.
4. **Schutz vor bekannten Passwörtern** im Dashboard einschalten.
5. **Cron für `purge_expired()`** einrichten. Das steckt in der Migration
   `20261011100000_document_tombstones.sql`.
6. **Weiterleitungs-URLs und Rate Limits** im Dashboard prüfen.

Die Schritte 1–3 ändern die Produktion. Sie laufen nur mit ausdrücklicher
Freigabe des Betreibers.

## Nachtrag 11.10.2026: was ausgerollt ist

| Schritt | Stand |
|---|---|
| `delete-account` | **live**, Version 1, `verify_jwt` an. Die Kontolöschung funktioniert wieder. |
| `billing-portal` | **live**, Version 1, `verify_jwt` an |
| Offene Migrationen | **nicht eingespielt.** Das Schreiben in die Produktionsdatenbank wurde in dieser Sitzung zweimal abgebrochen. Der Betreiber führt `supabase/einspielen/offene_migrationen.sql` im SQL-Editor aus. |
| `push` (neue Fassung) | **bewusst nicht ausgerollt.** Sie braucht die Tabellen aus den Migrationen (`push_agenda`, `push_events`, `push_prefs`, Spalte `topics`). Ohne sie bräche auch der Erinnerungs-Push. Reihenfolge: erst Migrationen, dann `push`. |
| `phrase` | wartet auf die Rechtsprüfung (`docs/ki-einwilligung.md` §5) |

Geheimnisse: `billing-portal` braucht `STRIPE_SECRET_KEY` und `APP_ORIGIN`.
Beide nutzt auch `create-checkout`, sie sollten also gesetzt sein. Prüfen im
Dashboard: Edge Functions → Secrets.

**Nach dem Einspielen** lesend gegenprüfen:
- die Tabellen `ai_consents`, `plan_assignments`, `shared_checkins`,
  `ai_usage` und `push_events` existieren;
- `athlete_documents` hat die Spalte `deleted_at`;
- in `cron.job` steht `purge-expired-daily`;
- der Advisor meldet `anon` nicht mehr für `envelope_public_of`,
  `is_analytics_admin` und `my_coaches`.
