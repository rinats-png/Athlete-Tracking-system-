-- =============================================================================
-- Bezahlweg: Trainerstufen als eine Frage, der Trainer-Zuschuss, die
-- serverseitigen Schranken auf die neuen Produkte
-- =============================================================================

-- --- «Zahlt dieser Trainer?» — eine Funktion statt drei Vergleiche ---------
--
-- Die drei Trainerstufen trennt die Anzahl betreuter Athleten, nicht die
-- Tiefe. Jede serverseitige Schranke, die bisher coach_pro verlangte, meint
-- «eine bezahlte Trainerstufe» — und fragt jetzt genau das.

create or replace function public.has_coach_plan(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.user_id = p_user_id
      and e.product in ('coach_start', 'coach_team', 'coach_pro')
      and e.status in ('active', 'trialing')
      and (e.current_period_end is null or e.current_period_end > now())
  );
$$;

revoke execute on function public.has_coach_plan(uuid) from public, anon;
grant execute on function public.has_coach_plan(uuid) to authenticated;

-- --- Der Trainer-Zuschuss ---------------------------------------------------
--
-- Ein Athlet, den ein zahlender Trainer betreut, bekommt Plus über ihn
-- (COACH_INCLUDES_ATHLETE_PLUS in src/data/pricing.ts). Die Frage «betreut
-- mich ein zahlender Trainer» beantwortet der Server, weil nur er die
-- Freischaltungen ANDERER Konten sehen darf — und auch hier nur als ja/nein,
-- nie als Zeile.

create or replace function public.my_coach_plan_grant()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.coach_athlete_links l
    join public.athletes a on a.id = l.athlete_id
    where a.user_id = (select auth.uid())
      and l.status = 'active'
      and public.has_coach_plan(l.coach_id)
  );
$$;

revoke execute on function public.my_coach_plan_grant() from public, anon;
grant execute on function public.my_coach_plan_grant() to authenticated;

-- --- Serverseitige Schranken auf «bezahlte Trainerstufe» --------------------

drop policy if exists "reports_insert_pro_coach" on public.reports;
create policy "reports_insert_pro_coach" on public.reports
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and public.can_edit_athlete(athlete_id)
    and public.has_coach_plan((select auth.uid()))
  );

drop policy if exists "reports_write_permitted" on storage.objects;
create policy "reports_write_permitted" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and public.can_edit_athlete(public.safe_uuid(split_part(name, '/', 1)))
    and public.has_coach_plan((select auth.uid()))
  );

-- --- Freischaltungen: nur lesen, nur eigene — das bleibt ---------------------
--
-- Es gibt weiterhin keine Insert-, Update- oder Delete-Policy auf
-- entitlements. Geschrieben wird ausschliesslich vom Webhook mit dem
-- Dienstschlüssel. Ein Client, der seine Stufe selbst setzen will, bekommt
-- von PostgREST eine Absage — und genau das prüft tests/authz-live.spec.ts.

comment on table public.entitlements is
  'Freischaltungen je Konto. Schreibt nur der Stripe-Webhook (service_role); die App liest die eigene Zeile.';
