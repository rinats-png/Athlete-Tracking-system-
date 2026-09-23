-- =============================================================================
-- Auswertung der Nutzungsereignisse — nur für den Admin.
--
-- DER SCHUTZ SITZT HIER, NICHT IN DER OBERFLÄCHE. Jede Funktion prüft als
-- Erstes is_analytics_admin() und bricht sonst mit 42501 ab — PostgREST macht
-- daraus ein 403. Die Route /admin/analytics prüft zusätzlich, aber nur, um
-- Fremden einen leeren Bildschirm zu ersparen; umgehen lässt sich hier
-- nichts, weil die Tabelle selbst niemandem offensteht.
--
-- WER EINE PERSON IST: das Konto, wo es eines gibt, sonst die Sitzung. Und
-- eine Sitzung, in der sich jemand irgendwann angemeldet hat, gehört ganz zu
-- diesem Konto — sonst zählte ein Mensch, der sich mitten im Einstieg
-- registriert, als zwei, und jeder Funnel über die Anmeldung hinweg bräche
-- genau dort ab.
-- =============================================================================

create or replace function public.analytics_guard()
returns void
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.is_analytics_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$function$;

-- Die Ereignisse eines Zeitraums mit einer Personenkennung.
create or replace function public.analytics_identified(p_from timestamptz, p_to timestamptz)
returns table (id uuid, event_name text, ident text, user_id uuid, session_id uuid, properties jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with session_owner as (
    select session_id, (array_agg(user_id order by created_at desc))[1] as owner
    from public.analytics_events
    where session_id is not null and user_id is not null
    group by session_id
  )
  select e.id, e.event_name,
         coalesce(e.user_id::text, so.owner::text, 's:' || e.session_id::text) as ident,
         e.user_id, e.session_id, e.properties, e.created_at
  from public.analytics_events e
  left join session_owner so on so.session_id = e.session_id
  where e.created_at >= p_from and e.created_at < p_to
    and (e.user_id is not null or e.session_id is not null);
$function$;
-- Nur für die Admin-Funktionen unten, nie direkt aufrufbar.
revoke all on function public.analytics_identified(timestamptz, timestamptz) from public, anon, authenticated;

-- --- Kennzahlen ----------------------------------------------------------------
create or replace function public.analytics_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v jsonb;
begin
  perform public.analytics_guard();
  select jsonb_build_object(
    'total_events', (select count(*) from public.analytics_events where created_at >= p_from and created_at < p_to),
    'unique_people', (select count(distinct ident) from public.analytics_identified(p_from, p_to)),
    'signed_in_people', (select count(distinct user_id) from public.analytics_events where created_at >= p_from and created_at < p_to and user_id is not null),
    'sessions', (select count(*) from public.analytics_events where created_at >= p_from and created_at < p_to and event_name = 'session_start')
  ) into v;
  return v;
end;
$function$;

create or replace function public.analytics_top_events(p_from timestamptz, p_to timestamptz, p_limit int default 5)
returns table (event_name text, total bigint, people bigint)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.analytics_guard();
  return query
    select i.event_name, count(*)::bigint, count(distinct i.ident)::bigint
    from public.analytics_identified(p_from, p_to) i
    group by i.event_name
    order by count(*) desc, i.event_name
    limit least(greatest(p_limit, 1), 50);
end;
$function$;

-- Das Ereignisprotokoll, seitenweise über den Zeitstempel (Keyset statt
-- OFFSET: bei neuen Ereignissen verrutscht keine Seite).
create or replace function public.analytics_event_log(p_from timestamptz, p_to timestamptz, p_before timestamptz default null, p_limit int default 50)
returns table (id uuid, created_at timestamptz, event_name text, user_id uuid, session_id uuid, properties jsonb)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.analytics_guard();
  return query
    select e.id, e.created_at, e.event_name, e.user_id, e.session_id, e.properties
    from public.analytics_events e
    where e.created_at >= p_from and e.created_at < p_to
      and (p_before is null or e.created_at < p_before)
    order by e.created_at desc
    limit least(greatest(p_limit, 1), 200);
end;
$function$;

-- --- Was die Leute hält -----------------------------------------------------
--
-- Je Seite: wie oft geöffnet, wie lange im Mittel geblieben, und wie oft sie
-- die LETZTE Seite war, bevor der Tab in den Hintergrund ging.
create or replace function public.analytics_pages(p_from timestamptz, p_to timestamptz)
returns table (path text, views bigint, avg_seconds numeric, median_seconds numeric, exits bigint)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.analytics_guard();
  return query
    with views as (
      select properties->>'path' as path, count(*)::bigint as n
      from public.analytics_events
      where created_at >= p_from and created_at < p_to and event_name = 'page_view'
      group by 1
    ), leaves as (
      select properties->>'path' as path,
             avg((properties->>'seconds')::numeric) as avg_s,
             percentile_cont(0.5) within group (order by (properties->>'seconds')::numeric) as med_s,
             count(*) filter (where properties->>'reason' = 'hidden')::bigint as exits
      from public.analytics_events
      where created_at >= p_from and created_at < p_to and event_name = 'page_leave'
        and properties ? 'seconds'
      group by 1
    )
    select v.path, v.n, round(l.avg_s, 1), round(l.med_s::numeric, 1), coalesce(l.exits, 0)
    from views v left join leaves l on l.path = v.path
    where v.path is not null
    order by v.n desc
    limit 30;
end;
$function$;

-- Wiederkehr: von allen, die im Zeitraum ZUM ERSTEN MAL da waren — wie viele
-- kamen nach mindestens einem, sieben, dreissig Tagen wieder?
create or replace function public.analytics_retention(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v jsonb;
begin
  perform public.analytics_guard();
  with everyone as (
    select ident, created_at from public.analytics_identified(now() - interval '90 days', now())
  ), first_seen as (
    select ident, min(created_at) as first_at from everyone group by ident
  ), cohort as (
    select * from first_seen where first_at >= p_from and first_at < p_to
  )
  select jsonb_build_object(
    'cohort', (select count(*) from cohort),
    'returned_1d', (select count(*) from cohort c where exists (select 1 from everyone e where e.ident = c.ident and e.created_at >= c.first_at + interval '1 day')),
    'returned_7d', (select count(*) from cohort c where exists (select 1 from everyone e where e.ident = c.ident and e.created_at >= c.first_at + interval '7 days')),
    'returned_30d', (select count(*) from cohort c where exists (select 1 from everyone e where e.ident = c.ident and e.created_at >= c.first_at + interval '30 days')),
    -- Wie viele Tage der Kohorte überhaupt schon 1/7/30 Tage alt sind — sonst
    -- sähe eine Kohorte von gestern aus, als käme niemand nach 30 Tagen wieder.
    'eligible_1d', (select count(*) from cohort where first_at <= now() - interval '1 day'),
    'eligible_7d', (select count(*) from cohort where first_at <= now() - interval '7 days'),
    'eligible_30d', (select count(*) from cohort where first_at <= now() - interval '30 days')
  ) into v;
  return v;
end;
$function$;

-- --- Funnel -------------------------------------------------------------------
--
-- Schritt N zählt nur, wenn er NACH Schritt N−1 derselben Person kam. Genommen
-- wird jeweils das erste passende Ereignis nach dem vorigen Schritt — so
-- zählt ein Mensch, der den Test dreimal beginnt und einmal beendet, einmal.
create or replace function public.analytics_funnel(p_steps text[], p_from timestamptz, p_to timestamptz)
returns table (step int, event_name text, people bigint)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare n int := coalesce(array_length(p_steps, 1), 0);
begin
  perform public.analytics_guard();
  if n < 2 or n > 10 then
    raise exception 'ein Funnel hat 2 bis 10 Schritte' using errcode = '22023';
  end if;

  return query
    with recursive ev as (
      select i.ident, i.event_name, i.created_at
      from public.analytics_identified(p_from, p_to) i
      where i.event_name = any (p_steps)
    ), walk as (
      select 1 as s, ev.ident, min(ev.created_at) as at
      from ev where ev.event_name = p_steps[1]
      group by ev.ident
      union all
      select w.s + 1, w.ident, nxt.at
      from walk w
      cross join lateral (
        select min(e.created_at) as at
        from ev e
        where e.ident = w.ident and e.event_name = p_steps[w.s + 1] and e.created_at > w.at
      ) nxt
      where w.s < n and nxt.at is not null
    )
    select g.s, p_steps[g.s], coalesce(count(w.ident), 0)::bigint
    from generate_series(1, n) as g(s)
    left join walk w on w.s = g.s
    group by g.s
    order by g.s;
end;
$function$;

-- Welche Ereignisnamen es überhaupt gibt — für die Auswahl im Funnel.
create or replace function public.analytics_event_names(p_from timestamptz, p_to timestamptz)
returns table (event_name text, total bigint)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.analytics_guard();
  return query
    select e.event_name, count(*)::bigint from public.analytics_events e
    where e.created_at >= p_from and e.created_at < p_to
    group by e.event_name order by e.event_name;
end;
$function$;

-- Aufrufbar nur für Angemeldete — und dann entscheidet die Wache.
do $$
declare f text;
begin
  foreach f in array array[
    'analytics_guard()',
    'analytics_summary(timestamptz, timestamptz)',
    'analytics_top_events(timestamptz, timestamptz, int)',
    'analytics_event_log(timestamptz, timestamptz, timestamptz, int)',
    'analytics_pages(timestamptz, timestamptz)',
    'analytics_retention(timestamptz, timestamptz)',
    'analytics_funnel(text[], timestamptz, timestamptz)',
    'analytics_event_names(timestamptz, timestamptz)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- --- Kontolöschung nimmt die Ereignisse mit ---------------------------------
--
-- Ohne diese Zeile blieben die Ereignisse eines gelöschten Kontos liegen —
-- nur ohne Kennung (on delete set null). Das ist für Art. 17 zu wenig: Die
-- Sitzungskennung daneben bliebe, und die Ereignisse gehörten weiter zu
-- einem Menschen, der gelöscht werden wollte.
create or replace function public.delete_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_own integer := 0; v_managed integer := 0; v_docs integer := 0; v_series integer := 0;
  v_health integer := 0; v_shares integer := 0; v_analytics integer := 0;
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

  delete from public.health_entries where owner_id = p_user_id;
  get diagnostics v_health = row_count;

  delete from public.health_shares where owner_id = p_user_id or coach_id = p_user_id;
  get diagnostics v_shares = row_count;

  -- Alle Ereignisse des Kontos UND aller Sitzungen, in denen es angemeldet
  -- war — sonst blieben die anonymen Ereignisse derselben Sitzung übrig.
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
    'analytics_events', v_analytics
  );
end;
$function$;
