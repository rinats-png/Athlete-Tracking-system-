# Push-Benachrichtigungen

Stand: 24.09.2026. Umgesetzt mit Web Push und VAPID über die Bibliothek `web-push` 3.6.7 (npm), die in der Edge Function läuft.

## Anlässe

| Anlass | Auslöser | Wer darf | Grenze |
|---|---|---|---|
| Fällige Nachmessung | pg_cron, stündlich zur Minute 7 | Server, mit Cron-Geheimnis | Eine Meldung je Fälligkeitsdatum |
| Nachricht an alle | Admin-Dashboard | nur `is_analytics_admin()` | 3 pro Tag |
| Trainer an Athlet | Profil → «Nachricht an deine Athleten» | aktive Verbindung in `coach_athlete_links` | 3 pro Athlet und Tag |
| Probenachricht | «Erinnerungen» | nur an die eigenen Geräte | 5 pro Stunde |

## Datenfluss

- `push_subscriptions` enthält Endpunkt, Schlüssel und Sprache je Gerät. Jede Person liest und schreibt nur die eigenen Einträge (RLS).
- `push_due` enthält nur das nächste Fälligkeitsdatum, 9 Uhr Ortszeit. Welcher Test fällig ist, bleibt auf dem Gerät.
- `push_log` ist das Versandprotokoll ohne Inhalt, nur für die Grenzen. Es wird nach 90 Tagen gelöscht.
- Wird das Konto gelöscht, verschwinden alle drei Einträge mit (Fremdschlüssel auf `auth.users`, `on delete cascade`).
- Antwortet der Push-Dienst mit 404 oder 410, wird das Abonnement gelöscht.

## Schlüssel

- Der VAPID-Schlüssel und das Cron-Geheimnis liegen im Supabase Vault (`push_vapid_public`, `push_vapid_private`, `push_cron_secret`).
- Lesen darf sie nur `service_role`, über `push_config()`.
- Der öffentliche Schlüssel steht zusätzlich in `src/lib/push.ts`.
- Schlüssel wechseln: neues Paar erzeugen, beide Vault-Einträge mit `vault.update_secret` ersetzen und die Konstante im Code anpassen. Danach müssen alle Nutzer Push einmal neu einschalten.

## Grenzen

- Auf dem iPhone funktioniert Push nur aus der installierten App (Home-Bildschirm), ab iOS 16.4.
- Ohne Konto gibt es kein Push. Der Server braucht ein Konto, um zu wissen, wem er schreibt.
