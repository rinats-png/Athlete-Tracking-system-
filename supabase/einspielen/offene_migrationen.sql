-- =============================================================================
-- KYDON: offene Migrationen in einer Datei (für den SQL-Editor in Supabase)
--
-- Reihenfolge ist wichtig und hier schon richtig. Erzeugt mit
-- scripts/buildSqlBundle.mjs aus den Einzeldateien in supabase/migrations/.
-- Nicht von Hand ändern: die Einzeldateien sind die Quelle.
--
-- Enthalten:
--   20261004100000_shared_checkins.sql
--   20261004110000_ai_usage.sql
--   20261004120000_push_weekly.sql
--   20261005100000_plan_assignments.sql
--   20261005110000_push_plan_offer.sql
--
-- Mehrfaches Ausführen ist unschädlich. Voraussetzung: pg_cron, pg_net und der
-- Vault-Eintrag push_cron_secret sind eingerichtet (siehe docs/push.md).
-- =============================================================================

-- ########## 20261004100000_shared_checkins.sql ##########

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

-- ########## 20261004110000_ai_usage.sql ##########

-- =============================================================================
-- Zähler für Sprachmodell-Texte (Umbau Etappe 7c, docs/ask-kydon.md)
--
-- WAS DAS IST: wie oft ein Konto in einem Kalendermonat die Umformulierung
-- durch ein Sprachmodell genutzt hat. Mehr steht hier nicht: kein Text, keine
-- Fakten, keine Anfrage. Die Grenze (30 je Monat, Pro) prüft die Edge
-- Function `phrase`; geschrieben wird nur über `ai_usage_bump`, aufrufbar nur
-- mit dem Service-Schlüssel der Edge Function. Der Client kann den Zähler
-- weder erhöhen noch zurücksetzen.
-- =============================================================================

create table if not exists public.ai_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      text not null check (month ~ '^\d{4}-\d{2}$'),
  calls      integer not null default 0 check (calls >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

comment on table public.ai_usage is
  'Aufrufe der Sprachmodell-Umformulierung je Konto und Monat. Nur Zähler, kein Inhalt. Schreiben nur über ai_usage_bump.';

alter table public.ai_usage enable row level security;

-- Lesen darf nur der Eigentümer (damit die App «noch 12 übrig» zeigen kann).
drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.ai_usage from anon, authenticated;

-- Erhöht den Zähler atomar, solange die Grenze nicht erreicht ist.
-- Gibt den neuen Stand zurück, oder null, wenn die Grenze schon erreicht war.
create or replace function public.ai_usage_bump(p_user uuid, p_month text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_calls integer;
begin
  insert into public.ai_usage as u (user_id, month, calls)
  values (p_user, p_month, 1)
  on conflict (user_id, month)
  do update set calls = u.calls + 1, updated_at = now()
  where u.calls < p_limit
  returning u.calls into new_calls;
  return new_calls;
end;
$$;

revoke all on function public.ai_usage_bump(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.ai_usage_bump(uuid, text, integer) to service_role;

-- ########## 20261004120000_push_weekly.sql ##########

-- Push: Thema «weekly» (Montagsbrief), Etappe 8d.
--
-- Der Brief entsteht auf dem Gerät; der Server meldet nur, DASS die Woche
-- begonnen hat — ohne Namen, ohne Werte. Das Thema ist ein Angebot: es steht
-- NICHT in der Vorgabe und kommt nur zu Geräten, die es eingeschaltet haben.
-- Je Woche und Konto geht höchstens eine Meldung hinaus (Prüfung über push_log).

alter table public.push_subscriptions drop constraint if exists push_subscriptions_topics_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_topics_check
  check (topics <@ array['due', 'agenda', 'release', 'activity', 'weekly']::text[]);

alter table public.push_log drop constraint if exists push_log_kind_check;
alter table public.push_log
  add constraint push_log_kind_check
  check (kind in ('due', 'broadcast', 'coach', 'test', 'agenda', 'release', 'activity', 'weekly'));

-- Zeitplan: montags 07:00 UTC. Das Cron-Geheimnis wird zur Laufzeit aus dem
-- Vault gelesen und steht nicht in dieser Datei.
select cron.schedule('push-weekly', '0 7 * * 1', $$select net.http_post(url:='https://bsbionvnsvqghaqijmpl.supabase.co/functions/v1/push', body:='{"action":"weekly"}'::jsonb, headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='push_cron_secret')))$$);

-- ########## 20261005100000_plan_assignments.sql ##########

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
-- MINDERJÄHRIGE (Entscheidung des Inhabers): Vor dem Senden bestätigt der Trainer,
-- dass der Athlet volljährig ist oder die Einwilligung der Erziehungsberechtigten
-- vorliegt (in der App bestätigt oder schriftlich eingeholt). Ohne diese
-- Bestätigung weist `offer_plan_assignment` das Angebot ab; der Zeitpunkt bleibt
-- in `consent_attested_at`. Die App kann die Einwilligung nicht prüfen: es ist
-- die Zusicherung des Trainers. Zusätzlich gibt es für Athleten unter 18 (nach
-- `athletes.birth_date`, wo bekannt) KEINE Pulsfreigabe: der Server setzt sie aus.
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
  -- Zeitpunkt, zu dem der Trainer bestätigt hat: volljährig oder Einwilligung der Eltern liegt vor.
  consent_attested_at timestamptz not null default now(),
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
-- Ist der Athlet nach dem Geburtsdatum auf dem Server unter 18? Ohne Datum: nein
-- (dann gilt die Zusicherung des Trainers).
create or replace function public.athlete_is_minor(p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select a.birth_date > (current_date - interval '18 years') from public.athletes a where a.id = p_athlete_id), false);
$$;
revoke all on function public.athlete_is_minor(uuid) from public, anon, authenticated;

create or replace function public.offer_plan_assignment(p_athlete_id uuid, p_name text, p_payload jsonb, p_consent_attested boolean)
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
  if p_consent_attested is not true then
    raise exception 'Bestätigung der Einwilligung fehlt' using errcode = '42501';
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
  insert into public.plan_assignments (coach_id, athlete_id, name, payload, consent_attested_at)
  values (v_coach, p_athlete_id, left(coalesce(p_name, ''), 60), p_payload, now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.offer_plan_assignment(uuid, text, jsonb, boolean) from public, anon;
grant execute on function public.offer_plan_assignment(uuid, text, jsonb, boolean) to authenticated;

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
         share_hr = p_accept and coalesce(p_share_done, false) and coalesce(p_share_hr, false) and not public.athlete_is_minor(p.athlete_id)
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
  -- Minderjährige: keine Pulsfreigabe.
  if v_hr and exists (select 1 from public.plan_assignments q where q.id = p_id and public.athlete_is_minor(q.athlete_id)) then v_hr := false; end if;
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

-- ########## 20261005110000_push_plan_offer.sql ##########

-- Push: Hinweis auf ein neues Angebot vom Trainer (Thema «plan»), Trainingsbereich.
--
-- Setzt die Migration 20261005100000_plan_assignments.sql voraus (Tabelle
-- plan_assignments). Nicht ausgerollt.
--
-- WAS DER SERVER DABEI ERFÄHRT — und was nicht: nur, DASS ein verbundener
-- Trainer einem Athleten ein Angebot geschickt hat. Die Nachricht nennt weder
-- Trainer noch Plan noch Inhalt; sie sagt nur, dass etwas wartet, und führt auf
-- /plan, wo der Athlet entscheidet. Das Thema ist ein Angebot des Athleten:
-- es steht NICHT in der Vorgabe und kommt nur zu Geräten, die es eingeschaltet
-- haben. Höchstens eine Meldung je Athlet und Stunde.

alter table public.push_subscriptions drop constraint if exists push_subscriptions_topics_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_topics_check
  check (topics <@ array['due', 'agenda', 'release', 'activity', 'weekly', 'plan']::text[]);

alter table public.push_log drop constraint if exists push_log_kind_check;
alter table public.push_log
  add constraint push_log_kind_check
  check (kind in ('due', 'broadcast', 'coach', 'test', 'agenda', 'release', 'activity', 'weekly', 'plan'));

alter table public.push_events drop constraint if exists push_events_kind_check;
alter table public.push_events
  add constraint push_events_kind_check
  check (kind in ('result', 'entry', 'plan_offer'));

-- Auslöser: ein neues Angebot ----------------------------------------------------------
-- `athlete_user` ist hier der EMPFÄNGER (der Athlet), `coach_id` der Absender; die
-- Meldung nennt den Absender nicht.
create or replace function public.push_plan_offer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'offered' then
    insert into public.push_events (kind, athlete_user, coach_id)
    select 'plan_offer', a.user_id, new.coach_id
    from public.athletes a
    where a.id = new.athlete_id and a.user_id is not null and a.archived_at is null;
  end if;
  return null;
end;
$$;
revoke all on function public.push_plan_offer() from public, anon, authenticated;

drop trigger if exists plan_assignments_push_offer on public.plan_assignments;
create trigger plan_assignments_push_offer
  after insert on public.plan_assignments
  for each row execute function public.push_plan_offer();

-- Zeitplan: alle zehn Minuten. Das Cron-Geheimnis wird zur Laufzeit aus dem
-- Vault gelesen und steht nicht in dieser Datei.
select cron.schedule('push-plan-offer', '*/10 * * * *', $$select net.http_post(url:='https://bsbionvnsvqghaqijmpl.supabase.co/functions/v1/push', body:='{"action":"plan_offer"}'::jsonb, headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='push_cron_secret')))$$);
