-- =============================================================================
-- Row Level Security
--
-- Grundregel: Zugriff auf Athletendaten läuft ausschliesslich über
-- `coach_athlete_links` oder über `athletes.user_id`. Es gibt keinen zweiten
-- Weg — auch der Ersteller eines Klienten braucht die (automatisch angelegte)
-- Verknüpfung.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Berechtigungs-Helfer. SECURITY DEFINER, damit die Policies sich nicht selbst
-- rekursiv auswerten.
-- -----------------------------------------------------------------------------
create or replace function public.can_view_athlete(p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.athletes a
    where a.id = p_athlete_id and a.user_id = auth.uid()
  ) or exists (
    select 1 from public.coach_athlete_links l
    where l.athlete_id = p_athlete_id
      and l.coach_id = auth.uid()
      and l.status = 'active'
  );
$$;

create or replace function public.can_edit_athlete(p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.athletes a
    where a.id = p_athlete_id and a.user_id = auth.uid()
  ) or exists (
    select 1 from public.coach_athlete_links l
    where l.athlete_id = p_athlete_id
      and l.coach_id = auth.uid()
      and l.status = 'active'
      and l.can_edit
  );
$$;

create or replace function public.can_view_result(p_result_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.can_view_athlete((select athlete_id from public.test_results where id = p_result_id));
$$;

create or replace function public.can_edit_result(p_result_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.can_edit_athlete((select athlete_id from public.test_results where id = p_result_id));
$$;

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_coach from public.profiles where id = auth.uid()), false);
$$;

-- Trainer, die mindestens einen meiner Athleten betreuen. Nötig, damit deren
-- eigene Tests und deren Branding in meiner App sichtbar sind.
create or replace function public.my_coach_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.coach_id
  from public.coach_athlete_links l
  join public.athletes a on a.id = l.athlete_id
  where a.user_id = auth.uid() and l.status = 'active';
$$;

-- -----------------------------------------------------------------------------
alter table public.profiles                    enable row level security;
alter table public.athletes                    enable row level security;
alter table public.coach_athlete_links         enable row level security;
alter table public.athlete_invitations         enable row level security;
alter table public.biometric_entries           enable row level security;
alter table public.test_definitions            enable row level security;
alter table public.test_definition_translations enable row level security;
alter table public.assessments                 enable row level security;
alter table public.test_results                enable row level security;
alter table public.test_result_stages          enable row level security;
alter table public.result_metrics              enable row level security;
alter table public.performance_norms           enable row level security;
alter table public.entitlements                enable row level security;
alter table public.coach_branding              enable row level security;
alter table public.reports                     enable row level security;
alter table public.health_connections          enable row level security;

-- profiles ---------------------------------------------------------------------
create policy "profiles_select_self_or_own_coach" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or id in (select public.my_coach_ids()));

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- athletes ---------------------------------------------------------------------
create policy "athletes_select_permitted" on public.athletes
  for select to authenticated using (public.can_view_athlete(id));

-- Eigener Datensatz immer; fremd verwaltete Klienten nur als Trainer.
create policy "athletes_insert_self_or_client" on public.athletes
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      user_id = (select auth.uid())
      or (user_id is null and public.is_coach())
    )
  );

create policy "athletes_update_permitted" on public.athletes
  for update to authenticated
  using (public.can_edit_athlete(id)) with check (public.can_edit_athlete(id));

-- Nur betreute Klienten ohne eigenen Account dürfen gelöscht werden; ein Athlet
-- mit Account löscht sich selbst über das Konto.
create policy "athletes_delete_managed" on public.athletes
  for delete to authenticated
  using (public.can_edit_athlete(id) and user_id is null);

-- coach_athlete_links -----------------------------------------------------------
create policy "links_select_involved" on public.coach_athlete_links
  for select to authenticated
  using (
    coach_id = (select auth.uid())
    or exists (
      select 1 from public.athletes a
      where a.id = athlete_id and a.user_id = (select auth.uid())
    )
  );

create policy "links_insert_as_coach" on public.coach_athlete_links
  for insert to authenticated
  with check (coach_id = (select auth.uid()) and public.is_coach());

-- Beide Seiten dürfen den Status ändern: der Trainer lädt ein, der Athlet
-- akzeptiert oder entzieht den Zugriff.
create policy "links_update_involved" on public.coach_athlete_links
  for update to authenticated
  using (
    coach_id = (select auth.uid())
    or exists (
      select 1 from public.athletes a
      where a.id = athlete_id and a.user_id = (select auth.uid())
    )
  );

create policy "links_delete_involved" on public.coach_athlete_links
  for delete to authenticated
  using (
    coach_id = (select auth.uid())
    or exists (
      select 1 from public.athletes a
      where a.id = athlete_id and a.user_id = (select auth.uid())
    )
  );

-- athlete_invitations -----------------------------------------------------------
create policy "invitations_manage_own" on public.athlete_invitations
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and public.can_edit_athlete(athlete_id));

-- biometric_entries -------------------------------------------------------------
create policy "biometrics_select" on public.biometric_entries
  for select to authenticated using (public.can_view_athlete(athlete_id));
create policy "biometrics_insert" on public.biometric_entries
  for insert to authenticated with check (public.can_edit_athlete(athlete_id));
create policy "biometrics_update" on public.biometric_entries
  for update to authenticated
  using (public.can_edit_athlete(athlete_id)) with check (public.can_edit_athlete(athlete_id));
create policy "biometrics_delete" on public.biometric_entries
  for delete to authenticated using (public.can_edit_athlete(athlete_id));

-- test_definitions ---------------------------------------------------------------
create policy "test_definitions_select" on public.test_definitions
  for select to authenticated
  using (
    is_system
    or owner_coach_id = (select auth.uid())
    or owner_coach_id in (select public.my_coach_ids())
  );

-- Eigene Tests anlegen ist ein Pro-Feature für Trainer.
create policy "test_definitions_insert_own" on public.test_definitions
  for insert to authenticated
  with check (
    not is_system
    and owner_coach_id = (select auth.uid())
    and public.has_entitlement((select auth.uid()), 'coach_pro')
  );
create policy "test_definitions_update_own" on public.test_definitions
  for update to authenticated
  using (owner_coach_id = (select auth.uid())) with check (owner_coach_id = (select auth.uid()));
create policy "test_definitions_delete_own" on public.test_definitions
  for delete to authenticated using (owner_coach_id = (select auth.uid()));

create policy "test_translations_select" on public.test_definition_translations
  for select to authenticated
  using (exists (select 1 from public.test_definitions d where d.id = test_definition_id));
create policy "test_translations_write_own" on public.test_definition_translations
  for all to authenticated
  using (exists (
    select 1 from public.test_definitions d
    where d.id = test_definition_id and d.owner_coach_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.test_definitions d
    where d.id = test_definition_id and d.owner_coach_id = (select auth.uid())
  ));

-- assessments ---------------------------------------------------------------------
create policy "assessments_select" on public.assessments
  for select to authenticated using (public.can_view_athlete(athlete_id));
create policy "assessments_insert" on public.assessments
  for insert to authenticated with check (public.can_edit_athlete(athlete_id));
create policy "assessments_update" on public.assessments
  for update to authenticated
  using (public.can_edit_athlete(athlete_id)) with check (public.can_edit_athlete(athlete_id));
create policy "assessments_delete" on public.assessments
  for delete to authenticated using (public.can_edit_athlete(athlete_id));

-- test_results ---------------------------------------------------------------------
create policy "results_select" on public.test_results
  for select to authenticated using (public.can_view_athlete(athlete_id));
create policy "results_insert" on public.test_results
  for insert to authenticated with check (public.can_edit_athlete(athlete_id));
create policy "results_update" on public.test_results
  for update to authenticated
  using (public.can_edit_athlete(athlete_id)) with check (public.can_edit_athlete(athlete_id));
create policy "results_delete" on public.test_results
  for delete to authenticated using (public.can_edit_athlete(athlete_id));

create policy "stages_select" on public.test_result_stages
  for select to authenticated using (public.can_view_result(result_id));
create policy "stages_write" on public.test_result_stages
  for all to authenticated
  using (public.can_edit_result(result_id)) with check (public.can_edit_result(result_id));

create policy "result_metrics_select" on public.result_metrics
  for select to authenticated using (public.can_view_result(result_id));
create policy "result_metrics_write" on public.result_metrics
  for all to authenticated
  using (public.can_edit_result(result_id)) with check (public.can_edit_result(result_id));

-- performance_norms -----------------------------------------------------------------
-- Referenzwerte sind für alle lesbar; geschrieben wird ausschliesslich per
-- Migration oder service_role (keine Schreib-Policy).
create policy "norms_select_all" on public.performance_norms
  for select to authenticated using (true);

-- entitlements ------------------------------------------------------------------------
-- Nur lesbar. Geschrieben wird ausschliesslich vom Stripe-Webhook (service_role).
create policy "entitlements_select_own" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));

-- coach_branding ----------------------------------------------------------------------
create policy "branding_select_own_or_my_coach" on public.coach_branding
  for select to authenticated
  using (coach_id = (select auth.uid()) or coach_id in (select public.my_coach_ids()));
create policy "branding_write_own" on public.coach_branding
  for all to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

-- reports -------------------------------------------------------------------------------
create policy "reports_select" on public.reports
  for select to authenticated
  using (public.can_view_athlete(athlete_id) or coach_id = (select auth.uid()));

-- Report-Erzeugung ist die zentrale Bezahlschranke des B2B-Abos.
create policy "reports_insert_pro_coach" on public.reports
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and public.can_edit_athlete(athlete_id)
    and public.has_entitlement((select auth.uid()), 'coach_pro')
  );
create policy "reports_delete_own" on public.reports
  for delete to authenticated using (coach_id = (select auth.uid()));

-- health_connections ----------------------------------------------------------------------
create policy "health_connections_own" on public.health_connections
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
