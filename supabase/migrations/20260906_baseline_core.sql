-- BASELINE — Kern des Servers.
--
-- WAS HIER GESPEICHERT WIRD, UND WARUM SO WENIG
--
-- Der Server ist kein zweiter Datenbestand mit eigener Struktur, sondern eine
-- ZWEITSCHRIFT des lokalen. Je Athlet liegt genau ein Dokument: derselbe
-- geprüfte JSON-Stand, den das Gerät führt, mit seiner Schemaversion daneben.
--
-- Der Grund ist nicht Bequemlichkeit. Ein normalisiertes Serverschema wäre ein
-- zweites Datenmodell, das mit jeder Migration des lokalen mitwandern müsste —
-- und beim ersten Auseinanderlaufen entstünde genau das, was §89 verbietet:
-- stille Rechenunterschiede zwischen zwei Ansichten derselben Messung. Die App
-- rechnet ohnehin auf dem Gerät; der Server muss nichts davon verstehen.
--
-- Was der Server dadurch NICHT kann: serverseitig auswerten, aggregieren oder
-- Bestenlisten bilden. Das ist beabsichtigt. Für den anonymisierten Vergleich
-- (§28) käme später eine eigene, ausdrücklich eingewilligte Tabelle — nicht
-- diese.
--
-- ZUGRIFF: ausschliesslich der Eigentümer. Es gibt keine Freigabe, keine
-- Rolle mit Lesezugriff auf fremde Bestände, keinen Administrator im
-- Anwendungssinn. Ein Trainer führt seine Athleten in SEINEM Bestand — das
-- entspricht dem lokalen Modell und hält die Regeln einfach genug, um sie
-- prüfen zu können.

create extension if not exists pgcrypto;

-- --- Konto ------------------------------------------------------------------

create table if not exists public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'athlete',
  plan_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_role_check check (role in ('athlete', 'coach')),
  constraint accounts_display_name_len check (char_length(display_name) <= 120),
  constraint accounts_plan_len check (plan_id is null or char_length(plan_id) <= 40)
);

comment on table public.accounts is
  'Rolle und gewaehlte Stufe. Bewusst ohne E-Mail: die steht in auth.users und wird nicht verdoppelt (§50).';

-- --- Bestand je Athlet ------------------------------------------------------

create table if not exists public.athlete_documents (
  owner_id uuid not null references auth.users (id) on delete cascade,
  athlete_id text not null,
  schema_version integer not null,
  document jsonb not null,
  -- Welches Geraet zuletzt geschrieben hat. Nur fuer die Konfliktmeldung:
  -- "zuletzt geaendert auf einem anderen Geraet" ist eine andere Aussage als
  -- "du selbst hast es geaendert".
  device_id text not null default '',
  updated_at timestamptz not null default now(),
  primary key (owner_id, athlete_id),
  constraint athlete_documents_id_len check (char_length(athlete_id) between 1 and 80),
  constraint athlete_documents_version_range check (schema_version between 1 and 999),
  -- Obergrenze gegen versehentlich riesige Belegbilder: ein Bestand mit
  -- Fotos wird gross, aber nicht beliebig. Ueber der Grenze schlaegt der
  -- Schreibvorgang fehl, statt still die Datenbank zu fuellen.
  constraint athlete_documents_size check (pg_column_size(document) <= 8 * 1024 * 1024)
);

create index if not exists athlete_documents_owner_idx
  on public.athlete_documents (owner_id, updated_at desc);

-- --- updated_at von Hand zu setzen waere eine Fehlerquelle -------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists accounts_touch on public.accounts;
create trigger accounts_touch before update on public.accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists athlete_documents_touch on public.athlete_documents;
create trigger athlete_documents_touch before update on public.athlete_documents
  for each row execute function public.touch_updated_at();

-- --- Konto entsteht mit der Registrierung -----------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id, display_name, role, plan_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach' else 'athlete' end,
    nullif(new.raw_user_meta_data ->> 'plan_id', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Zugriffsregeln ---------------------------------------------------------
--
-- Eine Regel je Vorgang statt einer fuer alles: bei "for all" sieht man einer
-- Tabelle nicht mehr an, ob Lesen und Schreiben wirklich dieselbe Bedingung
-- haben — und genau dort entstehen Luecken.

alter table public.accounts enable row level security;
alter table public.athlete_documents enable row level security;

drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own on public.accounts
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists accounts_insert_own on public.accounts;
create policy accounts_insert_own on public.accounts
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists accounts_update_own on public.accounts;
create policy accounts_update_own on public.accounts
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists accounts_delete_own on public.accounts;
create policy accounts_delete_own on public.accounts
  for delete to authenticated using ((select auth.uid()) = id);

drop policy if exists documents_select_own on public.athlete_documents;
create policy documents_select_own on public.athlete_documents
  for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists documents_insert_own on public.athlete_documents;
create policy documents_insert_own on public.athlete_documents
  for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists documents_update_own on public.athlete_documents;
create policy documents_update_own on public.athlete_documents
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists documents_delete_own on public.athlete_documents;
create policy documents_delete_own on public.athlete_documents
  for delete to authenticated using ((select auth.uid()) = owner_id);
