-- Szenario-Prüfung der Team-Migration gegen ein lokales Postgres 16.
-- Aufbau: shim.sql (Supabase-Nachbildung: auth.uid(), Rollen, gekürzte Tabellen),
-- dann die Migrationen 20260921130000, 20260922090000, 20260925100000, 20260925100100,
-- 20260925110000, dann diese Datei. Jede Zeile mit 'FEHLER' bricht ab.

create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema cron;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
-- aus den bestehenden Migrationen, auf das Nötige gekürzt
create type public.entitlement_product as enum ('athlete_pro','coach_pro');
create type public.entitlement_status as enum ('active','trialing','past_due','canceled','expired');
create table public.entitlements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product public.entitlement_product not null, status public.entitlement_status not null default 'active',
  source text not null default 'stripe', stripe_customer_id text, stripe_subscription_id text, stripe_price_id text,
  current_period_end timestamptz, granted_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, product));
alter table public.entitlements enable row level security;
create policy ent_select on public.entitlements for select to authenticated using (user_id = auth.uid());
create table public.accounts (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '');
create table public.athlete_documents (owner_id uuid not null references auth.users(id) on delete cascade, athlete_id text not null, schema_version int not null, document jsonb not null, device_id text not null default '', updated_at timestamptz not null default now(), primary key (owner_id, athlete_id));
create table public.athlete_series (owner_id uuid not null references auth.users(id) on delete cascade, athlete_id text not null, kind text not null, entry_id text not null, payload jsonb, primary key (owner_id, athlete_id, kind, entry_id));
alter table public.athlete_documents enable row level security; alter table public.athlete_series enable row level security;
create policy documents_select_own on public.athlete_documents for select to authenticated using (auth.uid() = owner_id);
create table public.security_events (id bigint generated always as identity primary key, actor_id uuid, event text, subject_user_id uuid, subject_athlete_id uuid, detail jsonb);
create or replace function public.log_security_event(p_event text, p_subject_user_id uuid default null, p_subject_athlete_id uuid default null, p_detail jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$ begin insert into public.security_events (actor_id, event, subject_user_id, subject_athlete_id, detail) values (auth.uid(), p_event, p_subject_user_id, p_subject_athlete_id, p_detail); end $$;
