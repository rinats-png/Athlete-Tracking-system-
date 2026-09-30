-- Push, zweite Ausbaustufe: Themen je Gerät, Termin-Erinnerungen, Hinweis auf
-- eine neue App-Fassung, Aktivitätsmeldung an Trainer.
--
-- WAS DER SERVER DABEI ERFÄHRT — und was nicht
--   * Termine: je Konto und Art (Wettkampf, Testtermin) NUR ein Datum, wie bei
--     push_due. Kein Name, kein Test, kein Wert.
--   * Aktivität: der Server sieht nur, DASS ein verbundener Athlet etwas
--     eingetragen hat (Anzahl der Ergebnisse im Dokument stieg / neuer Eintrag
--     im Tagebuch oder Training). Nichts davon steht in der Nachricht; sie
--     nennt keinen Namen und keinen Wert.
--   * Aktivität geht nur an aktiv verbundene Trainer (coach_athlete_links,
--     status = 'active'): dieselbe Beziehung, auf der schon der Zugriff auf
--     die Daten beruht. Der Athlet kann sie ausschalten (push_prefs), der
--     Trainer im Gerät (Thema «activity»).
--   * Versand nur über die Edge Function `push`. Neue Tabellen: RLS ein, für
--     den Browser nur, was er für die eigenen Zeilen braucht.

-- Themen je Gerät ---------------------------------------------------------------

alter table public.push_subscriptions
  add column if not exists topics text[] not null default array['due', 'agenda', 'release', 'activity']
  check (topics <@ array['due', 'agenda', 'release', 'activity']::text[]);

-- Versandprotokoll: neue Arten ---------------------------------------------------

alter table public.push_log drop constraint if exists push_log_kind_check;
alter table public.push_log
  add constraint push_log_kind_check
  check (kind in ('due', 'broadcast', 'coach', 'test', 'agenda', 'release', 'activity'));

-- Termine (Wettkampf, Testtermin): je Konto und Art ein Datum -----------------------

create table public.push_agenda (
  user_id  uuid not null references auth.users (id) on delete cascade,
  kind     text not null check (kind in ('competition', 'assessment')),
  due_at   timestamptz not null,
  sent_for timestamptz,
  primary key (user_id, kind)
);
alter table public.push_agenda enable row level security;
create policy push_agenda_own_all on public.push_agenda
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.push_agenda from anon;

-- Welche App-Fassung schon angekündigt wurde (jede genau einmal) --------------------

create table public.push_releases (
  release_id text primary key check (release_id ~ '^\d{4}-\d{2}-\d{2}(\.\d{1,3})?$'),
  sent_at    timestamptz not null default now(),
  sender     uuid references auth.users (id) on delete set null
);
alter table public.push_releases enable row level security;
revoke all on public.push_releases from anon, authenticated;

-- Einstellung des Athleten: darf sein Trainer bei Aktivität benachrichtigt werden?
-- Vorgabe ja (die Verbindung erlaubt dem Trainer ohnehin die Einsicht); der
-- Athlet kann es jederzeit ausschalten.

create table public.push_prefs (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  notify_coach boolean not null default true
);
alter table public.push_prefs enable row level security;
create policy push_prefs_own_all on public.push_prefs
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.push_prefs from anon;

-- Warteschlange für die Aktivitätsmeldung -------------------------------------------

create table public.push_events (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('result', 'entry')),
  athlete_user uuid not null references auth.users (id) on delete cascade,
  coach_id     uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index push_events_pending_idx on public.push_events (coach_id, created_at) where sent_at is null;
alter table public.push_events enable row level security;
revoke all on public.push_events from anon, authenticated;

-- Auslöser: ein Athlet trägt etwas ein --------------------------------------------------
--
-- Ergebnisse liegen im Dokument. Gezählt wird, ob die Zahl der Ergebnisse
-- STIEG (nur bei UPDATE: der erste Upload eines Geräts ist keine neue
-- Aktivität). Ein Sprung um mehr als 20 gilt als Import und meldet nichts.

create or replace function public.push_activity_document()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n_new integer;
  n_old integer;
begin
  n_new := case when jsonb_typeof(new.document -> 'results') = 'array' then jsonb_array_length(new.document -> 'results') else 0 end;
  n_old := case when jsonb_typeof(old.document -> 'results') = 'array' then jsonb_array_length(old.document -> 'results') else 0 end;
  if n_new > n_old and n_new - n_old <= 20 then
    insert into public.push_events (kind, athlete_user, coach_id)
    select 'result', new.owner_id, l.coach_id
    from public.athletes a
    join public.coach_athlete_links l on l.athlete_id = a.id
    where a.user_id = new.owner_id
      and a.archived_at is null
      and l.status = 'active'
      and l.coach_id <> new.owner_id
      and coalesce((select p.notify_coach from public.push_prefs p where p.user_id = new.owner_id), true);
  end if;
  return null;
end;
$$;
revoke all on function public.push_activity_document() from public, anon, authenticated;

drop trigger if exists athlete_documents_push_activity on public.athlete_documents;
create trigger athlete_documents_push_activity
  after update on public.athlete_documents
  for each row execute function public.push_activity_document();

-- Tagebuch und Training: neue Einträge der letzten Tage (kein Nachtragen alter Einträge).

create or replace function public.push_activity_series()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.kind in ('diary', 'workout') and new.deleted_at is null and new.day >= current_date - 2 then
    insert into public.push_events (kind, athlete_user, coach_id)
    select 'entry', new.owner_id, l.coach_id
    from public.athletes a
    join public.coach_athlete_links l on l.athlete_id = a.id
    where a.user_id = new.owner_id
      and a.archived_at is null
      and l.status = 'active'
      and l.coach_id <> new.owner_id
      and coalesce((select p.notify_coach from public.push_prefs p where p.user_id = new.owner_id), true);
  end if;
  return null;
end;
$$;
revoke all on function public.push_activity_series() from public, anon, authenticated;

drop trigger if exists athlete_series_push_activity on public.athlete_series;
create trigger athlete_series_push_activity
  after insert on public.athlete_series
  for each row execute function public.push_activity_series();

-- Aufräumen: erledigte und alte Meldungen ---------------------------------------------

create or replace function public.push_purge()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.push_log where created_at < now() - interval '90 days';
  delete from public.push_events where created_at < now() - interval '7 days';
$$;
revoke all on function public.push_purge() from public, anon, authenticated;

-- Zeitplan: Aktivität alle zehn Minuten. Das Cron-Geheimnis wird zur Laufzeit
-- aus dem Vault gelesen und steht nicht in dieser Datei.
select cron.schedule('push-activity', '*/10 * * * *', $$select net.http_post(url:='https://bsbionvnsvqghaqijmpl.supabase.co/functions/v1/push', body:='{"action":"activity"}'::jsonb, headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='push_cron_secret')))$$);
