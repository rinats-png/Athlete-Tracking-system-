# Push-Benachrichtigungen

Stand: 30.09.2026 (zweite Ausbaustufe: Themen, Termine, App-Aktualisierung, Aktivität an Trainer). Erstfassung 24.09.2026. Umgesetzt mit Web Push und VAPID über die Bibliothek `web-push` 3.6.7 (npm), die in der Edge Function läuft.

## Anlässe

| Anlass | Auslöser | Wer darf | Grenze |
|---|---|---|---|
| Fällige Nachmessung | pg_cron, stündlich zur Minute 7 | Server, mit Cron-Geheimnis | Eine Meldung je Fälligkeitsdatum |
| Nachricht an alle | Admin-Dashboard | nur `is_analytics_admin()` | 3 pro Tag |
| Trainer an Athlet | Profil → «Nachricht an deine Athleten» | aktive Verbindung in `coach_athlete_links` | 3 pro Athlet und Tag |
| Probenachricht | «Erinnerungen» | nur an die eigenen Geräte | 5 pro Stunde |
| Termine | pg_cron, stündlich (mit «Fällige Nachmessung») | Server, mit Cron-Geheimnis | Wettkampf: Vortag 9 Uhr; Testtermin: am Tag 9 Uhr; je Datum eine Meldung |
| Neue App-Fassung | Admin-Dashboard («Push: neue App-Fassung») oder Aufruf beim Ausliefern mit Cron-Geheimnis | Admin (`is_analytics_admin`) oder Cron-Geheimnis | Jede Kennung genau einmal (Primärschlüssel in `push_releases`); Admin höchstens 3 am Tag |
| Aktivität an Trainer | Auslöser in der Datenbank → Warteschlange `push_events` → pg_cron alle 10 Minuten | Server, mit Cron-Geheimnis | Nur an aktiv verbundene Trainer; höchstens 1 Meldung je Trainer und Stunde |

## Themen und Einstellungen

- Jedes Gerät schaltet vier Themen einzeln: `due` (Nachmessung), `agenda` (Termine), `release` (App-Aktualisierung), `activity` (nur Trainer). Vorgabe: alle an. Gespeichert in `push_subscriptions.topics`; der Server sendet nur an Geräte mit dem Thema.
- Der Athlet kann ausschalten, dass sein Trainer bei Aktivität benachrichtigt wird (`push_prefs.notify_coach`, Vorgabe an).
- Nachricht an alle, Trainer-Nachricht und Probenachricht sind bewusst nicht themenabhängig (ausdrückliche Handlung).

## Was der Server erfährt

| Anlass | Was er erfährt | Was nicht |
|---|---|---|
| Nachmessung | das nächste Fälligkeitsdatum | Test, Werte |
| Termine | je Art ein Datum (`push_agenda`) | Name des Wettkampfs, Tests |
| Aktivität | DASS ein verbundener Athlet etwas eingetragen hat: Zahl der Ergebnisse im Dokument stieg (höchstens 20 auf einmal, sonst Import) oder ein neuer Tagebuch-/Trainingseintrag der letzten 2 Tage | was eingetragen wurde; die Meldung nennt keinen Namen, nur die Anzahl der Athleten |

Der Auslöser sitzt an `athlete_documents` (nur UPDATE, nicht der erste Upload) und `athlete_series` (nur INSERT). Er meldet nur an Trainer mit aktiver Verbindung in `coach_athlete_links` — dieselbe Beziehung, auf der schon die Einsicht in die Daten beruht.

## Neue App-Fassung ankündigen

Im Admin-Dashboard die Kennung aus `src/data/whatsNew.ts` (z. B. `2026-09-30`) eintragen und «Ankündigen». Beim Ausliefern lässt sich derselbe Aufruf automatisieren:

    curl -X POST https://<projekt>.supabase.co/functions/v1/push \
      -H 'Content-Type: application/json' -H "x-cron-secret: $PUSH_CRON_SECRET" \
      -d '{"action":"release","releaseId":"2026-09-30"}'

Das Cron-Geheimnis kommt aus dem Vault bzw. aus den Secrets der Auslieferung, nie in das Repository. Ein zweiter Aufruf mit derselben Kennung ist wirkungslos («already_sent»). Beim nächsten Öffnen zeigt die App «Neu bei KYDON».

## Einspielen (nicht automatisch geschehen)

1. Migration `20260930100000_push_topics_activity.sql` einspielen (`supabase db push`).
2. Edge Function `push` neu ausliefern (`supabase functions deploy push`).
3. Datenschutzerklärung anpassen (Termin-Daten, Aktivitätsmeldung an Trainer) — Rechtstext, nur nach Freigabe.

## Datenfluss

- `push_subscriptions` enthält Endpunkt, Schlüssel und Sprache je Gerät. Jede Person liest und schreibt nur die eigenen Einträge (RLS).
- `push_due` enthält nur das nächste Fälligkeitsdatum, 9 Uhr Ortszeit. Welcher Test fällig ist, bleibt auf dem Gerät.
- `push_log` ist das Versandprotokoll ohne Inhalt, nur für die Grenzen. Es wird nach 90 Tagen gelöscht.
- `push_agenda`, `push_prefs` (eigene Zeilen, RLS), `push_releases`, `push_events` (nur Server, für den Browser gesperrt). Die Warteschlange wird nach 7 Tagen geleert.
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

## Montagsbrief (Thema `weekly`, Etappe 8d)

- Fünftes Thema, **nicht in der Vorgabe**: kommt nur zu Geräten, die es einschalten (Athleten; für Trainer ausgeblendet).
- Der Server meldet nur, dass die Woche begonnen hat. Der Text ist arm (kein Name, kein Wert); Ziel der Nachricht ist `/brief`.
- Zeitplan: montags 07:00 UTC über `pg_cron` (Aktion `weekly` der Funktion `push`, Cron-Geheimnis aus dem Vault). Je Konto und Woche höchstens eine Meldung (Prüfung über `push_log`).
- Einzuspielen: Migration `20261004120000_push_weekly.sql`, danach die Funktion `push` neu ausrollen.

## Hinweis auf ein Angebot vom Trainer (Thema `plan`, vorbereitet, nicht ausgerollt)

- Sechstes Thema, **nicht in der Vorgabe**: ein Angebot des Athleten, kommt nur zu Geräten, die «Pläne von deinem Trainer» einschalten (nur Athleten, nur mit `VITE_PLAN_ASSIGN=on`).
- Auslöser: ein neues Angebot in `plan_assignments` (Migration `20261005100000_plan_assignments.sql`) legt über einen Datenbank-Auslöser ein Ereignis `plan_offer` in `push_events` ab; `athlete_user` ist hier der Empfänger. Die Aktion `plan_offer` der Funktion `push` (alle zehn Minuten aus pg_cron, Cron-Geheimnis aus dem Vault) sendet an dessen Geräte mit dem Thema.
- Der Server erfährt nur, DASS ein Angebot da ist. Die Nachricht nennt weder Trainer noch Plan noch Inhalt («Neuer Plan wartet») und führt auf `/plan`. Höchstens eine Meldung je Athlet und Stunde; was dazwischen liegt, wandert in den nächsten Lauf. Die Aktivitätsmeldung an Trainer ignoriert diese Ereignisse (`kind in ('result','entry')`).
- **Einzuspielen, in dieser Reihenfolge:** `20261005100000_plan_assignments.sql`, dann `20261005110000_push_plan_offer.sql`, danach die Funktion `push` neu ausliefern (`supabase functions deploy push`). Ohne die Funktion bleibt das Ereignis liegen (Aufräumen nach 7 Tagen); ohne die Migration gibt es das Thema nicht.
- **Rechtstext:** beim Einspielen einen Satz in den Abschnitt «Push-Benachrichtigungen» und «Pläne vom Trainer» der Datenschutzerklärung aufnehmen (Hinweis auf ein Angebot, ohne Namen und Inhalt, nur mit eingeschaltetem Thema). Nicht geschehen: Rechtstexte ändere ich nur auf deine Anweisung.
