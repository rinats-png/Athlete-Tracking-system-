-- =============================================================================
-- Zeitreihen aus dem Athletendokument heraus (Etappe 0, docs/ausbau.md §6)
--
-- DER BEFUND: `athlete_documents` traegt je Athlet EIN Dokument, hoechstens
-- 8 MB, und jeder Abgleich schreibt es GANZ. Fuer periodische Diagnostik war
-- das richtig. Mit Tagebuch (S1), Saetzen (S2), Entscheidungen (S3) und
-- Mahlzeiten (S4) waechst das Dokument um rund ein Megabyte je Jahr — und
-- ein Tagebucheintrag von 400 Byte loest eine Uebertragung von Megabytes
-- aus. Auf dem Telefon im Funkloch ist das die falsche Architektur.
--
-- DER SCHNITT: Stammdaten (Profil, Messwerte, Notizen, Schwerpunkte) bleiben
-- im Dokument. Alles, was TAEGLICH entsteht, wird eine Zeile je Eintrag in
-- `athlete_series`. Eine Zeile wird geschrieben, wenn ein Eintrag sich
-- aendert — nicht das ganze Jahr.
--
-- WARUM EINE TABELLE UND NICHT VIER (der Plan nannte daily_entries,
-- training_sets, decisions, meals): Die vier Arten haben dieselbe Form —
-- Eigentuemer, Athlet, Kennung, Tag, Nutzlast, Zeitstempel — und dieselben
-- Zugriffsregeln. Vier Tabellen waeren vier Kopien derselben Policy, und
-- jede davon ein Ort, an dem eine Luecke entstehen kann. `kind` trennt die
-- Arten; die Gesundheitsschicht (S5, Art. 9) bekommt SPAETER eine eigene
-- Tabelle mit eigener Einwilligung — sie gehoert nicht hier hinein.
--
-- DER SERVER VERSTEHT DIE DATEN WEITERHIN NICHT: die Nutzlast ist `jsonb`,
-- lokal gegen Zod geprueft, hier nur als Objekt und in seiner Groesse
-- begrenzt. In eigene Spalten wandert nur, was der Abgleich braucht: die
-- Kennung, der Tag, der Zeitstempel. Die Rechenhoheit bleibt auf dem Geraet.
--
-- LOESCHEN IST EIN GRABSTEIN, KEIN LOCH: `deleted_at` statt DELETE, damit
-- ein zweites Geraet vom Loeschen erfaehrt. Die Aufbewahrung raeumt
-- Grabsteine nach 90 Tagen (purge_expired unten).
-- =============================================================================

create table if not exists public.athlete_series (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  athlete_id text not null,
  kind       text not null,
  entry_id   text not null,
  day        date not null,
  payload    jsonb not null,
  device_id  text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_id, athlete_id, kind, entry_id),
  constraint athlete_series_kind check (kind in ('diary', 'workout', 'decision', 'meal')),
  constraint athlete_series_id_len check (char_length(athlete_id) between 1 and 80 and char_length(entry_id) between 1 and 80),
  constraint athlete_series_is_object check (jsonb_typeof(payload) = 'object'),
  -- Eine Einheit mit zwanzig Uebungen und zwanzig Saetzen liegt bei rund
  -- 30 kB. 256 kB ist Luft, kein Einfallstor.
  constraint athlete_series_size check (pg_column_size(payload) <= 256 * 1024)
);

comment on table public.athlete_series is
  'Taegliche Eintraege je Athlet (Tagebuch, Einheit, Entscheidung, Mahlzeit) als je eine Zeile. Nutzlast jsonb, lokal geprueft; der Server rechnet nichts.';

-- Der Abgleich holt «alles seit dem letzten Mal» — genau dieser Index.
create index if not exists athlete_series_owner_updated_idx
  on public.athlete_series (owner_id, updated_at);
create index if not exists athlete_series_owner_athlete_idx
  on public.athlete_series (owner_id, athlete_id, kind, day);

drop trigger if exists athlete_series_touch on public.athlete_series;
create trigger athlete_series_touch before update on public.athlete_series
  for each row execute function public.touch_updated_at();

-- --- Zugriff: ausschliesslich der Eigentuemer, eine Regel je Vorgang --------

alter table public.athlete_series enable row level security;

drop policy if exists series_select_own on public.athlete_series;
create policy series_select_own on public.athlete_series
  for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists series_insert_own on public.athlete_series;
create policy series_insert_own on public.athlete_series
  for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists series_update_own on public.athlete_series;
create policy series_update_own on public.athlete_series
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists series_delete_own on public.athlete_series;
create policy series_delete_own on public.athlete_series
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- --- Kontoloeschung nimmt die Zeitreihen mit -------------------------------
--
-- Die Aufzaehlung in delete_account_data ist absichtlich eine Liste und
-- keine Kaskade: eine neue Tabelle faellt hier auf, weil sie fehlt. Sie
-- fehlt jetzt nicht mehr.

create or replace function public.delete_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_own integer := 0;
  v_managed integer := 0;
  v_docs integer := 0;
  v_series integer := 0;
begin
  if p_user_id is null then
    raise exception 'kein Konto angegeben' using errcode = '22004';
  end if;

  delete from public.athletes a
  where a.user_id is null
    and exists (
      select 1 from public.coach_athlete_links l
      where l.athlete_id = a.id and l.coach_id = p_user_id
    );
  get diagnostics v_managed = row_count;

  delete from public.athletes where user_id = p_user_id;
  get diagnostics v_own = row_count;

  delete from public.athlete_series where owner_id = p_user_id;
  get diagnostics v_series = row_count;

  delete from public.athlete_documents where owner_id = p_user_id;
  get diagnostics v_docs = row_count;

  delete from public.accounts where id = p_user_id;
  delete from public.profiles where id = p_user_id;

  return jsonb_build_object(
    'own_athletes', v_own,
    'managed_athletes', v_managed,
    'documents', v_docs,
    'series', v_series
  );
end;
$$;

revoke execute on function public.delete_account_data(uuid) from public, anon, authenticated;

-- --- Aufbewahrung: Grabsteine nach 90 Tagen -------------------------------
--
-- Ein Grabstein muss lange genug stehen, dass jedes Geraet ihn gesehen hat.
-- Neunzig Tage decken einen Sommer ohne zweites Geraet ab. Danach ist er
-- nur noch eine Zeile ohne Zweck.

create or replace function public.purge_expired()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_events integer;
  v_invites integer;
  v_links integer;
  v_orphans integer;
  v_tombstones integer;
begin
  delete from public.security_events where occurred_at < now() - interval '365 days';
  get diagnostics v_events = row_count;

  delete from public.athlete_invitations
  where accepted_at is null and expires_at < now() - interval '30 days';
  get diagnostics v_invites = row_count;

  delete from public.coach_athlete_links
  where status = 'revoked' and revoked_at is not null and revoked_at < now() - interval '90 days';
  get diagnostics v_links = row_count;

  delete from public.athlete_series
  where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics v_tombstones = row_count;

  v_orphans := public.purge_orphaned_athletes();

  return jsonb_build_object(
    'security_events', v_events,
    'athlete_invitations', v_invites,
    'coach_athlete_links', v_links,
    'orphaned_athletes', v_orphans,
    'series_tombstones', v_tombstones
  );
end;
$$;

revoke execute on function public.purge_expired() from public, anon, authenticated;
