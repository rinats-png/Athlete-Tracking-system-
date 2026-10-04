-- =============================================================================
-- Geteilte Check-ins (Umbau Etappe 3, docs/umbauplan.md)
--
-- WAS DAS IST: drei Zahlen von 1 bis 5 je Tag (Energie, Muskelkater, Stress) —
-- eine Selbsteinschätzung, keine Messung. Sie liegen zuerst auf dem Gerät des
-- Athleten (Tagebuch). Diese Tabelle gibt es nur für den Fall, dass der
-- Athlet sie seinem verbundenen Trainer ausdrücklich zeigt.
--
-- WER SIE SEHEN DARF: nur der Athlet selbst über die Tabelle (RLS: Eigentümer).
-- Der Trainer liest AUSSCHLIESSLICH über `coach_shared_checkins()` — eine
-- Funktion, die nur Zeilen von Athleten mit aktiver Verknüpfung zurückgibt.
-- Es gibt bewusst keine Leserichtlinie für Trainer auf der Tabelle selbst:
-- eine zweite Policy wäre eine zweite Stelle für eine Lücke.
--
-- DIE FREIGABE IST ZEILENWEISE UND WIDERRUFBAR: Zeilen existieren nur, solange
-- der Schalter an ist. Ausschalten löscht sie (das tut der Client; zusätzlich
-- räumt die Aufbewahrung nach 90 Tagen und die Kontolöschung alles ab).
--
-- DATENSCHUTZ: Selbsteinschätzungen zu Muskelkater und Stress sind
-- gesundheitsnah. Diese Migration ist die technische Grundlage; live wird sie
-- erst mit freigegebenem Datenschutztext (docs/checkin-datenschutz.md) und dem
-- Bau-Schalter VITE_CHECKIN_SHARE=on.
-- =============================================================================

create table if not exists public.shared_checkins (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  energy     smallint,
  soreness   smallint,
  stress     smallint,
  updated_at timestamptz not null default now(),
  primary key (owner_id, day),
  constraint shared_checkins_scale check (
    (energy   is null or energy   between 1 and 5) and
    (soreness is null or soreness between 1 and 5) and
    (stress   is null or stress   between 1 and 5)
  ),
  -- Eine Zeile ohne jeden Wert trägt nichts.
  constraint shared_checkins_not_empty check (energy is not null or soreness is not null or stress is not null)
);

comment on table public.shared_checkins is
  'Freiwillig geteilte Check-ins (Energie, Muskelkater, Stress, 1 bis 5). Nur Eigentümer direkt; Trainer lesen über coach_shared_checkins().';

alter table public.shared_checkins enable row level security;

drop policy if exists shared_checkins_select_own on public.shared_checkins;
create policy shared_checkins_select_own on public.shared_checkins
  for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists shared_checkins_insert_own on public.shared_checkins;
create policy shared_checkins_insert_own on public.shared_checkins
  for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists shared_checkins_update_own on public.shared_checkins;
create policy shared_checkins_update_own on public.shared_checkins
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists shared_checkins_delete_own on public.shared_checkins;
create policy shared_checkins_delete_own on public.shared_checkins
  for delete to authenticated using ((select auth.uid()) = owner_id);

create index if not exists shared_checkins_owner_day_idx on public.shared_checkins (owner_id, day desc);

-- --- Der Weg des Trainers ----------------------------------------------------
-- Nur aktive Verknüpfungen, nur nicht archivierte Athleten, nur der Zeitraum
-- ab p_since (höchstens 60 Tage zurück). Kein Name außer dem Anzeigenamen.
create or replace function public.coach_shared_checkins(p_since date)
returns table (athlete_id uuid, display_name text, day date, energy smallint, soreness smallint, stress smallint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id,
         nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''),
         c.day, c.energy, c.soreness, c.stress
  from public.coach_athlete_links l
  join public.athletes a on a.id = l.athlete_id
  join public.shared_checkins c on c.owner_id = a.user_id
  where l.coach_id = (select auth.uid())
    and l.status = 'active'
    and a.user_id is not null
    and a.archived_at is null
    and c.day >= greatest(p_since, (current_date - 60))
  order by a.id, c.day;
$$;
revoke all on function public.coach_shared_checkins(date) from public, anon;
grant execute on function public.coach_shared_checkins(date) to authenticated;

-- --- Aufbewahrung ------------------------------------------------------------
create or replace function public.shared_checkins_purge()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.shared_checkins where day < current_date - 90;
$$;
revoke all on function public.shared_checkins_purge() from public, anon, authenticated;
select cron.schedule('shared-checkins-purge-daily', '27 3 * * *', $$select public.shared_checkins_purge()$$);

-- --- Kontolöschung nimmt die geteilten Check-ins mit -------------------------
-- Die Aufzählung ist absichtlich eine Liste und keine Kaskade (siehe
-- 20260921120000_athlete_series.sql): eine neue Tabelle fällt hier auf, wenn
-- sie fehlt.
create or replace function public.delete_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_own integer := 0; v_managed integer := 0; v_docs integer := 0; v_series integer := 0;
  v_health integer := 0; v_shares integer := 0; v_analytics integer := 0; v_checkins integer := 0;
begin
  if p_user_id is null then
    raise exception 'kein Konto angegeben' using errcode = '22004';
  end if;

  delete from public.athletes a
  where a.user_id is null
    and exists (select 1 from public.coach_athlete_links l where l.athlete_id = a.id and l.coach_id = p_user_id);
  get diagnostics v_managed = row_count;

  delete from public.athletes where user_id = p_user_id;
  get diagnostics v_own = row_count;

  delete from public.athlete_series where owner_id = p_user_id;
  get diagnostics v_series = row_count;

  delete from public.shared_checkins where owner_id = p_user_id;
  get diagnostics v_checkins = row_count;

  delete from public.health_entries where owner_id = p_user_id;
  get diagnostics v_health = row_count;

  delete from public.health_shares where owner_id = p_user_id or coach_id = p_user_id;
  get diagnostics v_shares = row_count;

  delete from public.analytics_events
  where user_id = p_user_id
     or session_id in (select distinct session_id from public.analytics_events where user_id = p_user_id and session_id is not null);
  get diagnostics v_analytics = row_count;

  delete from public.athlete_documents where owner_id = p_user_id;
  get diagnostics v_docs = row_count;

  delete from public.accounts where id = p_user_id;
  delete from public.profiles where id = p_user_id;

  return jsonb_build_object(
    'own_athletes', v_own, 'managed_athletes', v_managed, 'documents', v_docs,
    'series', v_series, 'health_entries', v_health, 'health_shares', v_shares,
    'analytics_events', v_analytics, 'shared_checkins', v_checkins
  );
end;
$function$;
