-- =============================================================================
-- Zugewiesene Pläne (Trainingsbereich Etappe 10, docs/training-engine.md)
--
-- WAS DAS IST: ein Trainer schickt einem verbundenen Athleten einen Plan. Der
-- Athlet nimmt ihn an oder lehnt ihn ab; angenommen wird er auf dem Gerät des
-- Athleten zum Block. Der Plan ist eine Struktur (Format `kydon-plan`, siehe
-- src/domain/planFile.ts): Dosis und Evidenz stehen nie in der Nutzlast, die
-- App baut sie beim Annehmen aus dem Regelregister.
--
-- WER WAS SIEHT:
--  * Der Trainer sieht seine eigenen Zuweisungen (nur bei aktiver Verknüpfung).
--  * Der Athlet sieht die Zuweisungen an ihn.
--  * Ergebnisse (erledigt, Dauer/RPE, Puls) schreibt nur der Athlet über eine
--    Funktion, und nur so weit er sie ausdrücklich freigegeben hat. Drei
--    getrennte Freigaben, alle aus: «erledigt», «Dauer und RPE», «Puls».
--    Widerruf wirkt sofort: ausgeschaltete Spalten werden genullt, «erledigt»
--    aus löscht die Zeilen. Der Trainer liest über coach_plan_progress(), die
--    zusätzlich zur Lesezeit maskiert.
--  * Es gibt KEINE Schreibrichtlinie auf den Tabellen: alles läuft über die
--    Funktionen unten, die Verknüpfung, Rolle und Zustand prüfen.
--
-- DATENSCHUTZ: Puls ist ein Gesundheitsdatum (Art. 9). Diese Migration ist die
-- technische Grundlage; live wird die Zuweisung erst mit freigegebenem
-- Datenschutztext und dem Bau-Schalter VITE_PLAN_ASSIGN=on. Nicht ausgerollt.
-- =============================================================================

create table if not exists public.plan_assignments (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users (id) on delete cascade,
  athlete_id    uuid not null references public.athletes (id) on delete cascade,
  name          text not null default '',
  payload       jsonb not null,
  status        text not null default 'offered',
  share_done    boolean not null default false,
  share_results boolean not null default false,
  share_hr      boolean not null default false,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint plan_assignments_status check (status in ('offered', 'accepted', 'declined', 'withdrawn')),
  constraint plan_assignments_name_len check (char_length(name) <= 60),
  constraint plan_assignments_payload_size check (octet_length(payload::text) <= 200000)
);

comment on table public.plan_assignments is
  'Vom Trainer zugewiesene Pläne (Struktur ohne Dosis und Evidenz). Schreiben nur über Funktionen.';

alter table public.plan_assignments enable row level security;

drop policy if exists plan_assignments_select_coach on public.plan_assignments;
create policy plan_assignments_select_coach on public.plan_assignments
  for select to authenticated
  using (
    coach_id = (select auth.uid())
    and exists (
      select 1 from public.coach_athlete_links l
      where l.coach_id = plan_assignments.coach_id and l.athlete_id = plan_assignments.athlete_id and l.status = 'active'
    )
  );

drop policy if exists plan_assignments_select_athlete on public.plan_assignments;
create policy plan_assignments_select_athlete on public.plan_assignments
  for select to authenticated
  using (exists (select 1 from public.athletes a where a.id = plan_assignments.athlete_id and a.user_id = (select auth.uid())));

create index if not exists plan_assignments_coach_idx on public.plan_assignments (coach_id, status);
create index if not exists plan_assignments_athlete_idx on public.plan_assignments (athlete_id, status);

create table if not exists public.plan_assignment_results (
  assignment_id uuid not null references public.plan_assignments (id) on delete cascade,
  session_key   text not null,
  day           date not null,
  duration_min  smallint,
  rpe           smallint,
  avg_hr        smallint,
  max_hr        smallint,
  updated_at    timestamptz not null default now(),
  primary key (assignment_id, session_key, day),
  constraint plan_results_key_len check (char_length(session_key) between 1 and 80),
  constraint plan_results_duration check (duration_min is null or duration_min between 1 and 600),
  constraint plan_results_rpe check (rpe is null or rpe between 1 and 10),
  constraint plan_results_hr check (
    (avg_hr is null or avg_hr between 30 and 230) and (max_hr is null or max_hr between 30 and 230)
  )
);

comment on table public.plan_assignment_results is
  'Erledigte Einheiten einer Zuweisung, so weit der Athlet sie freigegeben hat. Schreiben nur über report_plan_completion().';

alter table public.plan_assignment_results enable row level security;

drop policy if exists plan_results_select_athlete on public.plan_assignment_results;
create policy plan_results_select_athlete on public.plan_assignment_results
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_assignments p
      join public.athletes a on a.id = p.athlete_id
      where p.id = plan_assignment_results.assignment_id and a.user_id = (select auth.uid())
    )
  );

-- --- Trainer: Plan anbieten --------------------------------------------------
create or replace function public.offer_plan_assignment(p_athlete_id uuid, p_name text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coach uuid := (select auth.uid());
  v_id uuid;
begin
  if v_coach is null then raise exception 'nicht angemeldet' using errcode = '28000'; end if;
  if not exists (
    select 1 from public.coach_athlete_links l
    join public.athletes a on a.id = l.athlete_id
    where l.coach_id = v_coach and l.athlete_id = p_athlete_id and l.status = 'active' and a.user_id is not null
  ) then
    raise exception 'keine aktive Verknüpfung mit einem Athleten mit Konto' using errcode = '42501';
  end if;
  if p_payload is null or octet_length(p_payload::text) > 200000 then
    raise exception 'Plan zu groß' using errcode = '22001';
  end if;
  if coalesce(p_payload ->> 'format', '') <> 'kydon-plan' then
    raise exception 'kein KYDON-Plan' using errcode = '22023';
  end if;
  -- Höchstens fünf offene Angebote je Trainer und Athlet: kein Überschwemmen.
  if (select count(*) from public.plan_assignments where coach_id = v_coach and athlete_id = p_athlete_id and status = 'offered') >= 5 then
    raise exception 'zu viele offene Angebote' using errcode = '54000';
  end if;
  insert into public.plan_assignments (coach_id, athlete_id, name, payload)
  values (v_coach, p_athlete_id, left(coalesce(p_name, ''), 60), p_payload)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.offer_plan_assignment(uuid, text, jsonb) from public, anon;
grant execute on function public.offer_plan_assignment(uuid, text, jsonb) to authenticated;

-- --- Trainer: zurückziehen ---------------------------------------------------
create or replace function public.withdraw_plan_assignment(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_rows integer;
begin
  update public.plan_assignments
     set status = 'withdrawn', responded_at = now(), share_done = false, share_results = false, share_hr = false
   where id = p_id and coach_id = (select auth.uid()) and status in ('offered', 'accepted');
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return false; end if;
  delete from public.plan_assignment_results where assignment_id = p_id;
  return true;
end;
$$;
revoke all on function public.withdraw_plan_assignment(uuid) from public, anon;
grant execute on function public.withdraw_plan_assignment(uuid) to authenticated;

-- --- Athlet: annehmen oder ablehnen, mit den drei Freigaben ------------------
create or replace function public.respond_plan_assignment(p_id uuid, p_accept boolean, p_share_done boolean, p_share_results boolean, p_share_hr boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_rows integer;
begin
  update public.plan_assignments p
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now(),
         share_done = p_accept and coalesce(p_share_done, false),
         share_results = p_accept and coalesce(p_share_done, false) and coalesce(p_share_results, false),
         share_hr = p_accept and coalesce(p_share_done, false) and coalesce(p_share_hr, false)
   where p.id = p_id and p.status = 'offered'
     and exists (select 1 from public.athletes a where a.id = p.athlete_id and a.user_id = (select auth.uid()));
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;
revoke all on function public.respond_plan_assignment(uuid, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.respond_plan_assignment(uuid, boolean, boolean, boolean, boolean) to authenticated;

-- --- Athlet: Freigaben ändern, Widerruf wirkt sofort -------------------------
create or replace function public.set_plan_assignment_share(p_id uuid, p_done boolean, p_results boolean, p_hr boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
  v_done boolean := coalesce(p_done, false);
  v_res boolean := coalesce(p_done, false) and coalesce(p_results, false);
  v_hr boolean := coalesce(p_done, false) and coalesce(p_hr, false);
begin
  update public.plan_assignments p
     set share_done = v_done, share_results = v_res, share_hr = v_hr
   where p.id = p_id and p.status = 'accepted'
     and exists (select 1 from public.athletes a where a.id = p.athlete_id and a.user_id = (select auth.uid()));
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return false; end if;
  if not v_done then
    delete from public.plan_assignment_results where assignment_id = p_id;
  else
    update public.plan_assignment_results
       set duration_min = case when v_res then duration_min end,
           rpe = case when v_res then rpe end,
           avg_hr = case when v_hr then avg_hr end,
           max_hr = case when v_hr then max_hr end
     where assignment_id = p_id;
  end if;
  return true;
end;
$$;
revoke all on function public.set_plan_assignment_share(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_plan_assignment_share(uuid, boolean, boolean, boolean) to authenticated;

-- --- Athlet: erledigte Einheit melden ----------------------------------------
-- Ohne Freigabe «erledigt» passiert nichts. Spalten ohne Freigabe bleiben leer.
create or replace function public.report_plan_completion(p_id uuid, p_key text, p_day date, p_duration integer, p_rpe integer, p_avg integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_p public.plan_assignments%rowtype;
begin
  select p.* into v_p from public.plan_assignments p
   where p.id = p_id and p.status = 'accepted' and p.share_done
     and exists (select 1 from public.athletes a where a.id = p.athlete_id and a.user_id = (select auth.uid()));
  if not found then return false; end if;
  insert into public.plan_assignment_results (assignment_id, session_key, day, duration_min, rpe, avg_hr, max_hr, updated_at)
  values (
    p_id, left(p_key, 80), p_day,
    case when v_p.share_results then p_duration end,
    case when v_p.share_results then p_rpe end,
    case when v_p.share_hr then p_avg end,
    case when v_p.share_hr then p_max end,
    now()
  )
  on conflict (assignment_id, session_key, day) do update
    set duration_min = excluded.duration_min, rpe = excluded.rpe, avg_hr = excluded.avg_hr, max_hr = excluded.max_hr, updated_at = now();
  return true;
end;
$$;
revoke all on function public.report_plan_completion(uuid, text, date, integer, integer, integer, integer) from public, anon;
grant execute on function public.report_plan_completion(uuid, text, date, integer, integer, integer, integer) to authenticated;

-- --- Trainer: Fortschritt lesen ----------------------------------------------
-- Aktive Verknüpfung, eigene Zuweisung, angenommen; Spalten zusätzlich nach
-- dem AKTUELLEN Stand der Freigaben maskiert.
create or replace function public.coach_plan_progress(p_id uuid)
returns table (session_key text, day date, duration_min smallint, rpe smallint, avg_hr smallint, max_hr smallint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.session_key, r.day,
         case when p.share_results then r.duration_min end,
         case when p.share_results then r.rpe end,
         case when p.share_hr then r.avg_hr end,
         case when p.share_hr then r.max_hr end
  from public.plan_assignments p
  join public.plan_assignment_results r on r.assignment_id = p.id
  where p.id = p_id
    and p.coach_id = (select auth.uid())
    and p.status = 'accepted'
    and p.share_done
    and exists (select 1 from public.coach_athlete_links l where l.coach_id = p.coach_id and l.athlete_id = p.athlete_id and l.status = 'active')
  order by r.day, r.session_key;
$$;
revoke all on function public.coach_plan_progress(uuid) from public, anon;
grant execute on function public.coach_plan_progress(uuid) to authenticated;

-- --- Aufbewahrung ------------------------------------------------------------
create or replace function public.plan_assignments_purge()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.plan_assignment_results where day < current_date - 180;
  delete from public.plan_assignments where status in ('declined', 'withdrawn') and responded_at < now() - interval '30 days';
$$;
revoke all on function public.plan_assignments_purge() from public, anon, authenticated;
select cron.schedule('plan-assignments-purge-daily', '33 3 * * *', $$select public.plan_assignments_purge()$$);

-- --- Kontolöschung nimmt Zuweisungen und Ergebnisse mit ----------------------
-- Athletenseite räumt die Kaskade über `athletes` ab; die Trainerseite löschen wir ausdrücklich.
create or replace function public.delete_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_own integer := 0; v_managed integer := 0; v_docs integer := 0; v_series integer := 0;
  v_health integer := 0; v_shares integer := 0; v_analytics integer := 0; v_checkins integer := 0;
  v_plans integer := 0;
begin
  if p_user_id is null then
    raise exception 'kein Konto angegeben' using errcode = '22004';
  end if;

  delete from public.plan_assignments where coach_id = p_user_id;
  get diagnostics v_plans = row_count;

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
    'analytics_events', v_analytics, 'shared_checkins', v_checkins, 'plan_assignments', v_plans
  );
end;
$function$;
