-- =============================================================================
-- Nutzungsanalyse: eigene Ereignistabelle statt eines Drittanbieters.
--
-- WARUM SELBST GEBAUT: Ein Dienst wie PostHog wäre ein weiterer Empfänger
-- personenbezogener Daten, mit eigenem Auftragsverarbeitungsvertrag und
-- eigener Drittlandfrage. Eine Tabelle in der vorhandenen Datenbank ist
-- nichts davon.
--
-- DREI GRENZEN, die in der Datenbank selbst stehen und nicht nur im Code:
--
--   1. KEIN CLIENT LIEST ODER SCHREIBT DIESE TABELLE. RLS ist an, und es gibt
--      keine einzige Regel für `anon` oder `authenticated`. Geschrieben wird
--      nur über die Edge Function `track` mit dem Dienstschlüssel; gelesen
--      nur über Funktionen, die den Admin prüfen.
--   2. KEINE IP, KEIN USER-AGENT. Es gibt dafür keine Spalte. Was nicht
--      gespeichert werden kann, kann nicht versehentlich gespeichert werden.
--   3. NEUNZIG TAGE. `purge_expired()` löscht, was älter ist.
--
-- ERFASST WIRD NUR MIT EINWILLIGUNG (§ 25 TDDDG). Das prüft der Client, bevor
-- er überhaupt eine Sitzungskennung anlegt; der Server kann Einwilligungen
-- nicht sehen und verlässt sich darauf nicht allein — er verwirft zusätzlich
-- alles aus der Gesundheitsschicht (siehe Edge Function).
-- =============================================================================

create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  event_name  text not null,
  user_id     uuid references auth.users (id) on delete set null,
  session_id  uuid,
  properties  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint analytics_event_name_shape check (event_name ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint analytics_properties_object check (jsonb_typeof(properties) = 'object'),
  constraint analytics_properties_size check (octet_length(properties::text) <= 4096)
);

comment on table public.analytics_events is
  'Nutzungsereignisse, nur mit Einwilligung. Keine IP, kein User-Agent, keine Gesundheitsdaten. Aufbewahrung 90 Tage.';

-- Zeitreihen je Ereignis: «wie oft kam X in den letzten 7 Tagen».
create index if not exists analytics_events_name_time_idx on public.analytics_events (event_name, created_at desc);
-- Das Ereignisprotokoll und alle Zeitfenster ohne Ereignisfilter.
create index if not exists analytics_events_time_idx on public.analytics_events (created_at desc);
-- Abfragen nach Metadaten, etwa properties @> '{"path": "/preise"}'.
create index if not exists analytics_events_properties_idx on public.analytics_events using gin (properties jsonb_path_ops);
-- Funnels gehen je Person durch die Zeit.
create index if not exists analytics_events_user_time_idx on public.analytics_events (user_id, created_at) where user_id is not null;
create index if not exists analytics_events_session_time_idx on public.analytics_events (session_id, created_at) where session_id is not null;

alter table public.analytics_events enable row level security;
-- Bewusst KEINE Regel. Ohne Regel sieht und schreibt kein Client etwas.
-- Und zusätzlich kein Tabellenrecht: Supabase vergibt es standardmässig an
-- anon und authenticated. RLS ohne Regel blockt schon; zwei Riegel sind
-- besser als einer, falls jemand später versehentlich eine Regel anlegt.
revoke all on table public.analytics_events from anon, authenticated;

-- --- Wer Admin ist ----------------------------------------------------------
--
-- Genau eine Adresse, und nur mit BESTÄTIGTER E-Mail. Die Bestätigung ist der
-- Punkt: Registriert sich jemand anderes mit dieser Adresse, bekommt er die
-- Bestätigungsmail nicht — sie geht an das Postfach des Eigentümers — und ist
-- damit nie Admin.
--
-- Gelesen wird aus auth.users, nicht aus dem Token. Ein Token trägt die
-- E-Mail vom Zeitpunkt der Anmeldung; wurde sie seither geändert, soll das
-- sofort gelten und nicht erst beim nächsten Login.
create or replace function public.is_analytics_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and lower(u.email) = 'info@kydon.app'
      and u.email_confirmed_at is not null
  );
$function$;

revoke all on function public.is_analytics_admin() from public;
grant execute on function public.is_analytics_admin() to authenticated;

-- --- Neunzig Tage -----------------------------------------------------------
create or replace function public.purge_expired()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_events integer; v_invites integer; v_links integer; v_orphans integer;
  v_tombstones integer; v_health integer; v_shares integer; v_analytics integer;
begin
  delete from public.security_events where occurred_at < now() - interval '365 days';
  get diagnostics v_events = row_count;

  delete from public.athlete_invitations
  where accepted_at is null and expires_at < now() - interval '30 days';
  get diagnostics v_invites = row_count;

  delete from public.athlete_series
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_tombstones = row_count;

  delete from public.health_entries
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_health = row_count;

  delete from public.health_shares s
  where not exists (
    select 1 from public.coach_athlete_links l
    join public.athletes a on a.id = l.athlete_id
    where l.coach_id = s.coach_id and a.user_id = s.owner_id
      and l.status = 'active' and l.revoked_at is null
  );
  get diagnostics v_shares = row_count;

  -- Nutzungsereignisse: 90 Tage, wie in der Datenschutzerklärung zugesagt.
  delete from public.analytics_events where created_at < now() - interval '90 days';
  get diagnostics v_analytics = row_count;

  delete from public.coach_athlete_links
  where status = 'revoked' and revoked_at is not null and revoked_at < now() - interval '90 days';
  get diagnostics v_links = row_count;

  v_orphans := public.purge_orphaned_athletes();

  return jsonb_build_object(
    'security_events', v_events, 'athlete_invitations', v_invites,
    'coach_athlete_links', v_links, 'orphaned_athletes', v_orphans,
    'series_tombstones', v_tombstones, 'health_tombstones', v_health,
    'health_shares', v_shares, 'analytics_events', v_analytics
  );
end;
$function$;
