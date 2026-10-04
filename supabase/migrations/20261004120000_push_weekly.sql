-- Push: Thema «weekly» (Montagsbrief), Etappe 8d.
--
-- Der Brief entsteht auf dem Gerät; der Server meldet nur, DASS die Woche
-- begonnen hat — ohne Namen, ohne Werte. Das Thema ist ein Angebot: es steht
-- NICHT in der Vorgabe und kommt nur zu Geräten, die es eingeschaltet haben.
-- Je Woche und Konto geht höchstens eine Meldung hinaus (Prüfung über push_log).

alter table public.push_subscriptions drop constraint if exists push_subscriptions_topics_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_topics_check
  check (topics <@ array['due', 'agenda', 'release', 'activity', 'weekly']::text[]);

alter table public.push_log drop constraint if exists push_log_kind_check;
alter table public.push_log
  add constraint push_log_kind_check
  check (kind in ('due', 'broadcast', 'coach', 'test', 'agenda', 'release', 'activity', 'weekly'));

-- Zeitplan: montags 07:00 UTC. Das Cron-Geheimnis wird zur Laufzeit aus dem
-- Vault gelesen und steht nicht in dieser Datei.
select cron.schedule('push-weekly', '0 7 * * 1', $$select net.http_post(url:='https://bsbionvnsvqghaqijmpl.supabase.co/functions/v1/push', body:='{"action":"weekly"}'::jsonb, headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='push_cron_secret')))$$);
