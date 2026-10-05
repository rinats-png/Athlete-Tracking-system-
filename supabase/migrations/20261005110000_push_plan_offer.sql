-- Push: Hinweis auf ein neues Angebot vom Trainer (Thema «plan»), Trainingsbereich.
--
-- Setzt die Migration 20261005100000_plan_assignments.sql voraus (Tabelle
-- plan_assignments). Nicht ausgerollt.
--
-- WAS DER SERVER DABEI ERFÄHRT — und was nicht: nur, DASS ein verbundener
-- Trainer einem Athleten ein Angebot geschickt hat. Die Nachricht nennt weder
-- Trainer noch Plan noch Inhalt; sie sagt nur, dass etwas wartet, und führt auf
-- /plan, wo der Athlet entscheidet. Das Thema ist ein Angebot des Athleten:
-- es steht NICHT in der Vorgabe und kommt nur zu Geräten, die es eingeschaltet
-- haben. Höchstens eine Meldung je Athlet und Stunde.

alter table public.push_subscriptions drop constraint if exists push_subscriptions_topics_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_topics_check
  check (topics <@ array['due', 'agenda', 'release', 'activity', 'weekly', 'plan']::text[]);

alter table public.push_log drop constraint if exists push_log_kind_check;
alter table public.push_log
  add constraint push_log_kind_check
  check (kind in ('due', 'broadcast', 'coach', 'test', 'agenda', 'release', 'activity', 'weekly', 'plan'));

alter table public.push_events drop constraint if exists push_events_kind_check;
alter table public.push_events
  add constraint push_events_kind_check
  check (kind in ('result', 'entry', 'plan_offer'));

-- Auslöser: ein neues Angebot ----------------------------------------------------------
-- `athlete_user` ist hier der EMPFÄNGER (der Athlet), `coach_id` der Absender; die
-- Meldung nennt den Absender nicht.
create or replace function public.push_plan_offer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'offered' then
    insert into public.push_events (kind, athlete_user, coach_id)
    select 'plan_offer', a.user_id, new.coach_id
    from public.athletes a
    where a.id = new.athlete_id and a.user_id is not null and a.archived_at is null;
  end if;
  return null;
end;
$$;
revoke all on function public.push_plan_offer() from public, anon, authenticated;

drop trigger if exists plan_assignments_push_offer on public.plan_assignments;
create trigger plan_assignments_push_offer
  after insert on public.plan_assignments
  for each row execute function public.push_plan_offer();

-- Zeitplan: alle zehn Minuten. Das Cron-Geheimnis wird zur Laufzeit aus dem
-- Vault gelesen und steht nicht in dieser Datei.
select cron.schedule('push-plan-offer', '*/10 * * * *', $$select net.http_post(url:='https://bsbionvnsvqghaqijmpl.supabase.co/functions/v1/push', body:='{"action":"plan_offer"}'::jsonb, headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='push_cron_secret')))$$);
