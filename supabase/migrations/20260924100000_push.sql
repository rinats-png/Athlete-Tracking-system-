-- Push-Benachrichtigungen (Web Push, VAPID).
--
-- DREI ANLÄSSE, EIN WEG
--   1. Fällige Nachmessung: die App meldet NUR das nächste Fälligkeitsdatum
--      (push_due). Welcher Test, welche Werte — das bleibt auf dem Gerät.
--   2. Nachricht des Admins an alle, die Push eingeschaltet haben.
--   3. Nachricht eines Trainers an seine aktiv verbundenen Athleten.
-- Verschickt wird ausschliesslich über die Edge Function `push`; der Browser
-- schreibt nur seine eigenen Abonnements.
--
-- DER PRIVATE VAPID-SCHLÜSSEL liegt im Vault, nicht im Code und nicht in
-- einer Tabelle. Gelesen wird er über push_config(), die nur service_role
-- ausführen darf. Der Schlüssel selbst wird nicht per Migration angelegt,
-- sondern einmalig per vault.create_secret (siehe docs/push.md).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Abonnements --------------------------------------------------------------

create table public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  endpoint        text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh          text not null check (length(p256dh) <= 200),
  auth            text not null check (length(auth) <= 100),
  locale          text not null default 'de' check (locale ~ '^[a-z]{2}$'),
  created_at      timestamptz not null default now(),
  last_success_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own_select on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy push_subscriptions_own_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_subscriptions_own_update on public.push_subscriptions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_subscriptions_own_delete on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon;

-- Nächste Fälligkeit (nur ein Datum je Konto) ------------------------------

create table public.push_due (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  due_at   timestamptz not null,
  -- Für welches Fälligkeitsdatum schon benachrichtigt wurde. Ein neues
  -- Datum setzt die Meldung wieder scharf.
  sent_for timestamptz
);
alter table public.push_due enable row level security;
create policy push_due_own_all on public.push_due
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.push_due from anon;

-- Versandprotokoll (Bremse gegen Missbrauch) -------------------------------

create table public.push_log (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('due', 'broadcast', 'coach', 'test')),
  sender     uuid references auth.users (id) on delete set null,
  recipient  uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index push_log_sender_idx on public.push_log (sender, kind, created_at);
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;

-- Schlüssel aus dem Vault, nur für die Edge Function ------------------------

create or replace function public.push_config()
returns jsonb
language sql
stable
security definer
set search_path = public, vault, pg_temp
as $$
  select jsonb_build_object(
    'vapid_public',  (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public'),
    'vapid_private', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_private'),
    'cron_secret',   (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
  );
$$;
revoke all on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;

-- Verbundene Athleten eines Trainers ---------------------------------------

create or replace function public.push_my_athletes()
returns table (athlete_id uuid, display_name text, has_push boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id,
         nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''),
         exists (select 1 from public.push_subscriptions s where s.user_id = a.user_id)
  from public.coach_athlete_links l
  join public.athletes a on a.id = l.athlete_id
  where l.coach_id = (select auth.uid())
    and l.status = 'active'
    and a.user_id is not null
    and a.archived_at is null
  order by 2 nulls last;
$$;
revoke all on function public.push_my_athletes() from public, anon;
grant execute on function public.push_my_athletes() to authenticated;

-- Aufräumen ----------------------------------------------------------------

create or replace function public.push_purge()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.push_log where created_at < now() - interval '90 days';
$$;
revoke all on function public.push_purge() from public, anon, authenticated;

-- Zeitplan ------------------------------------------------------------------
-- Stündlich: fällige Nachmessungen melden. Das Cron-Geheimnis wird zur
-- Laufzeit aus dem Vault gelesen und steht nicht in dieser Datei.
select cron.schedule('push-due-hourly', '7 * * * *', $$select net.http_post(url:='https://bsbionvnsvqghaqijmpl.supabase.co/functions/v1/push', body:='{"action":"due"}'::jsonb, headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='push_cron_secret')))$$);
select cron.schedule('push-purge-daily', '17 3 * * *', $$select public.push_purge()$$);
