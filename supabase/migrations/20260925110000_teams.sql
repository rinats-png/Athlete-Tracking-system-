-- =============================================================================
-- Teams, gemeinsamer Bestand und die Zählung gemessener Athleten
--
-- WAS EIN TEAM IST
--
-- Ab Coach Team dürfen mehrere Trainer im selben Konto arbeiten (Team 2,
-- Pro 3, Club 5 Plätze — src/data/pricing.ts). Ein Team gehört einem
-- INHABER: er zahlt, er lädt ein, er entfernt. Die anderen sind TRAINER: sie
-- messen, sehen dieselben Athleten, erstellen Reports.
--
-- DER GEMEINSAME BESTAND IST DER BESTAND DES INHABERS
--
-- Die App führt je Konto genau einen Bestand: `athlete_documents` und
-- `athlete_series` mit `owner_id`. Statt ein zweites Datenmodell für Teams
-- einzuführen, arbeiten die Trainer eines Teams im Bestand des Inhabers —
-- `my_pool_owner()` sagt, welcher das ist. Die Zugriffsregeln der beiden
-- Tabellen fragen deshalb nicht mehr «ist das meiner?», sondern «darf ich in
-- diesem Bestand arbeiten?» (`can_use_pool`). Für jeden, der in keinem Team
-- ist, ist das dieselbe Frage wie vorher.
--
-- Daraus folgt, was der Nutzer verlangt hat: Ein Trainer, der dreissig
-- eigene Athleten mitbringt und misst, misst sie IM BESTAND DES TEAMS — und
-- dort werden sie gezählt. Es gibt keinen zweiten Bestand, in dem man am
-- Preis vorbei messen könnte, solange man im Team arbeitet.
--
-- Verlässt ein Trainer das Team, bleiben die Athleten beim Team. Sein Gerät
-- leert beim nächsten Abgleich den Teambestand (src/lib/supabase/sync.ts)
-- und holt wieder seinen eigenen.
--
-- DIE ZÄHLUNG LIEGT AUF DEM SERVER
--
-- Gezählt werden Athleten im Bestand, die im laufenden Abojahr mindestens
-- eine Messung haben. Das rechnet `my_coach_status()` aus den Dokumenten —
-- nicht das Gerät, das sonst seine eigene Rechnung vorlegen könnte. Dieselbe
-- Funktion merkt sich, seit wann die Stufe überschritten ist
-- (`coach_usage.over_limit_since`): Ab dann laufen vierzehn Tage, in denen
-- weiter gemessen werden darf (src/domain/upgrade.ts).
--
-- DIE ZAHLEN DER STUFEN stehen hier ein zweites Mal (coach_limit,
-- coach_seats). Der Prüffall tests/teams.spec.ts vergleicht sie mit
-- pricing.ts — laufen sie auseinander, schlägt er fehl.
-- =============================================================================

-- --- Stufen: Grenze und Plätze ------------------------------------------------

create or replace function public.coach_limit(p_product text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_product
    when 'coach_start' then 10
    when 'coach_team' then 30
    when 'coach_pro' then 75
    when 'coach_club' then 150
    else 3
  end;
$$;

create or replace function public.coach_seats(p_product text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_product
    when 'coach_team' then 2
    when 'coach_pro' then 3
    when 'coach_club' then 5
    else 1
  end;
$$;

grant execute on function public.coach_limit(text) to authenticated;
grant execute on function public.coach_seats(text) to authenticated;

-- Die höchste aktive Trainerstufe eines Kontos, als Text — oder NULL.
create or replace function public.coach_product_of(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.product::text
  from public.entitlements e
  where e.user_id = p_user_id
    and e.product::text in ('coach_start', 'coach_team', 'coach_pro', 'coach_club')
    and e.status in ('active', 'trialing')
    and (e.current_period_end is null or e.current_period_end > now())
  order by case e.product::text
    when 'coach_club' then 4
    when 'coach_pro' then 3
    when 'coach_team' then 2
    else 1
  end desc
  limit 1;
$$;

revoke execute on function public.coach_product_of(uuid) from public, anon, authenticated;

-- --- Tabellen -------------------------------------------------------------------

create table if not exists public.teams (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references auth.users (id) on delete cascade,
  name             text not null default '',
  created_at       timestamptz not null default now(),
  constraint teams_name_len check (char_length(name) <= 80)
);

comment on table public.teams is
  'Ein Team je Inhaber. Der Bestand des Teams ist der Bestand des Inhabers (athlete_documents.owner_id).';

-- Ein Konto ist in höchstens EINEM Team (unique user_id). Zwei Teams hiessen
-- zwei Bestände gleichzeitig, und dann wüsste das Gerät nicht, in welchen es
-- schreibt.
create table if not exists public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  role       text not null,
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id),
  constraint team_members_role_check check (role in ('owner', 'coach'))
);

create index if not exists team_members_team_idx on public.team_members (team_id);

-- Einladungen. Gespeichert wird nur der Hash des Codes; der Code selbst
-- existiert einmal — in der Antwort an den Inhaber.
create table if not exists public.team_invites (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete cascade,
  token_hash   text not null unique,
  email        text,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint team_invites_email_len check (email is null or char_length(email) <= 254)
);

create index if not exists team_invites_team_idx on public.team_invites (team_id);

-- Zählstand und Frist je Bestand. Auch Trainer ohne Team haben eine Zeile:
-- die Frist gilt für jeden, der seine Stufe überschreitet.
create table if not exists public.coach_usage (
  owner_id          uuid primary key references auth.users (id) on delete cascade,
  measured          integer not null default 0,
  over_limit_since  timestamptz,
  -- Hochstufen ohne Rückfrage — nur, wenn der Inhaber das selbst einschaltet.
  auto_upgrade      boolean not null default false,
  checked_at        timestamptz not null default now()
);

-- --- Wer in welchem Bestand arbeitet -------------------------------------------

-- Der Bestand, in dem ich arbeite: der des Inhabers, wenn ich Trainer in einem
-- Team bin und das Team noch Plätze für mich hat — sonst mein eigener.
create or replace function public.my_pool_owner()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select t.owner_id
      from public.team_members m
      join public.teams t on t.id = m.team_id
      where m.user_id = (select auth.uid())
        and m.role = 'coach'
        and public.coach_seats(public.coach_product_of(t.owner_id)) >= 2
    ),
    (select auth.uid())
  );
$$;

revoke execute on function public.my_pool_owner() from public, anon;
grant execute on function public.my_pool_owner() to authenticated;

-- Darf ich in diesem Bestand arbeiten? Im eigenen immer. In einem fremden nur
-- als Trainer seines Teams — und nur, solange die Stufe des Inhabers mehrere
-- Trainer trägt. Fällt sie auf Start oder läuft sie aus, endet der Zugriff
-- der Teammitglieder von selbst; die Daten bleiben beim Inhaber.
create or replace function public.can_use_pool(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_owner is not null and (
    p_owner = (select auth.uid())
    or exists (
      select 1
      from public.team_members m
      join public.teams t on t.id = m.team_id
      where m.user_id = (select auth.uid())
        and m.role = 'coach'
        and t.owner_id = p_owner
        and public.coach_seats(public.coach_product_of(t.owner_id)) >= 2
    )
  );
$$;

revoke execute on function public.can_use_pool(uuid) from public, anon;
grant execute on function public.can_use_pool(uuid) to authenticated;

-- --- Zugriffsregeln des Bestands: vom Eigentümer auf den Bestand ---------------

drop policy if exists documents_select_own on public.athlete_documents;
drop policy if exists documents_insert_own on public.athlete_documents;
drop policy if exists documents_update_own on public.athlete_documents;
drop policy if exists documents_delete_own on public.athlete_documents;

create policy documents_select_pool on public.athlete_documents
  for select to authenticated using (public.can_use_pool(owner_id));

create policy documents_insert_pool on public.athlete_documents
  for insert to authenticated with check (public.can_use_pool(owner_id));

create policy documents_update_pool on public.athlete_documents
  for update to authenticated
  using (public.can_use_pool(owner_id))
  with check (public.can_use_pool(owner_id));

-- Löschen bleibt beim Inhaber. Ein Trainer im Team, der einen Athleten aus dem
-- gemeinsamen Bestand entfernen könnte, könnte auch die Zählung drücken.
create policy documents_delete_own on public.athlete_documents
  for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists series_select_own on public.athlete_series;
drop policy if exists series_insert_own on public.athlete_series;
drop policy if exists series_update_own on public.athlete_series;
drop policy if exists series_delete_own on public.athlete_series;

create policy series_select_pool on public.athlete_series
  for select to authenticated using (public.can_use_pool(owner_id));

create policy series_insert_pool on public.athlete_series
  for insert to authenticated with check (public.can_use_pool(owner_id));

create policy series_update_pool on public.athlete_series
  for update to authenticated
  using (public.can_use_pool(owner_id))
  with check (public.can_use_pool(owner_id));

create policy series_delete_own on public.athlete_series
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- --- «Zahlt dieser Trainer?» — jetzt auch über das Team -------------------------

create or replace function public.has_coach_plan(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.coach_product_of(p_user_id) is not null
    or exists (
      select 1
      from public.team_members m
      join public.teams t on t.id = m.team_id
      where m.user_id = p_user_id
        and m.role = 'coach'
        and public.coach_seats(public.coach_product_of(t.owner_id)) >= 2
    );
$$;

revoke execute on function public.has_coach_plan(uuid) from public, anon;
grant execute on function public.has_coach_plan(uuid) to authenticated;

-- --- Zählen -------------------------------------------------------------------

create or replace function public.safe_timestamptz(p_text text)
returns timestamptz
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if p_text is null or p_text !~ '^\d{4}-\d{2}-\d{2}' then
    return null;
  end if;
  return p_text::timestamptz;
exception when others then
  return null;
end;
$$;

grant execute on function public.safe_timestamptz(text) to authenticated;

-- Beginn des laufenden Abojahrs. Jahresabo: Beginn des bezahlten Zeitraums.
-- Monatsabo: der letzte Jahrestag des Abobeginns. Ohne Abo (Coach Free): die
-- letzten zwölf Monate.
create or replace function public.coach_window_start(p_owner uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select case
        when e.billing_interval = 'yearly' and e.current_period_start is not null
          then e.current_period_start
        when e.started_at is not null
          then e.started_at + make_interval(years => extract(year from age(now(), e.started_at))::int)
        else null
      end
      from public.entitlements e
      where e.user_id = p_owner
        and e.product::text = public.coach_product_of(p_owner)
      limit 1
    ),
    now() - interval '365 days'
  );
$$;

revoke execute on function public.coach_window_start(uuid) from public, anon, authenticated;

-- Athleten im Bestand mit mindestens einer Messung seit p_since. Ein Athlet
-- zählt einmal, egal wie oft gemessen — wie athletesMeasuredInWindow().
create or replace function public.pool_measured_count(p_owner uuid, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.athlete_documents d
  where d.owner_id = p_owner
    and exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(d.document -> 'results') = 'array' then d.document -> 'results' else '[]'::jsonb end
      ) r
      where public.safe_timestamptz(r ->> 'performedAt') >= p_since
        and public.safe_timestamptz(r ->> 'performedAt') <= now()
    );
$$;

revoke execute on function public.pool_measured_count(uuid, timestamptz) from public, anon, authenticated;

-- --- Die eine Auskunft für das Gerät -------------------------------------------
--
-- Zählt, merkt sich die Überschreitung und sagt dem Gerät alles, was es für
-- Hinweis, Frist und Teamverwaltung braucht. Schreibt ausschliesslich in
-- coach_usage, und zwar nur die Zeile des eigenen Bestands.
create or replace function public.my_coach_status()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_pool uuid;
  v_product text;
  v_limit integer;
  v_since timestamptz;
  v_count integer;
  v_over timestamptz;
  v_auto boolean;
  v_team_id uuid;
  v_team_name text;
  v_role text;
  v_members jsonb := '[]'::jsonb;
  v_invites integer := 0;
  v_interval text;
  v_period_end timestamptz;
  v_scheduled text;
  v_has_sub boolean := false;
begin
  if v_uid is null then
    raise exception 'nicht angemeldet' using errcode = '42501';
  end if;

  v_pool := public.my_pool_owner();
  v_product := public.coach_product_of(v_pool);
  v_limit := public.coach_limit(v_product);
  v_since := public.coach_window_start(v_pool);
  v_count := public.pool_measured_count(v_pool, v_since);

  insert into public.coach_usage (owner_id, measured, over_limit_since, checked_at)
  values (v_pool, v_count, case when v_count > v_limit then now() end, now())
  on conflict (owner_id) do update
    set measured = excluded.measured,
        checked_at = now(),
        over_limit_since = case
          when excluded.measured > v_limit then coalesce(public.coach_usage.over_limit_since, now())
          else null
        end
  returning over_limit_since, auto_upgrade into v_over, v_auto;

  select m.team_id, m.role, t.name
    into v_team_id, v_role, v_team_name
  from public.team_members m
  join public.teams t on t.id = m.team_id
  where m.user_id = v_uid;

  if v_team_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
             'user_id', m.user_id,
             'role', m.role,
             'name', coalesce(a.display_name, ''),
             'joined_at', m.joined_at
           ) order by (m.role = 'owner') desc, m.joined_at), '[]'::jsonb)
      into v_members
    from public.team_members m
    left join public.accounts a on a.id = m.user_id
    where m.team_id = v_team_id;

    select count(*)::int into v_invites
    from public.team_invites i
    where i.team_id = v_team_id and i.accepted_at is null and i.expires_at > now();
  end if;

  -- Laufzeit und vorgemerkte Änderung nur für den Inhaber des Bestands:
  -- das Abo gehört ihm, nicht den Trainern im Team.
  if v_pool = v_uid and v_product is not null then
    select e.billing_interval, e.current_period_end, e.scheduled_product::text, e.stripe_subscription_id is not null
      into v_interval, v_period_end, v_scheduled, v_has_sub
    from public.entitlements e
    where e.user_id = v_uid and e.product::text = v_product
    limit 1;
  end if;

  return jsonb_build_object(
    'pool_owner', v_pool,
    'is_owner', v_pool = v_uid,
    'product', v_product,
    'limit', v_limit,
    'seats', public.coach_seats(v_product),
    'measured', v_count,
    'window_start', v_since,
    'over_limit_since', v_over,
    'auto_upgrade', coalesce(v_auto, false),
    'interval', v_interval,
    'period_end', v_period_end,
    'scheduled_product', v_scheduled,
    'has_subscription', coalesce(v_has_sub, false),
    'team', case when v_team_id is null then null else jsonb_build_object(
      'id', v_team_id,
      'name', v_team_name,
      'role', v_role,
      'members', v_members,
      'open_invites', v_invites
    ) end
  );
end;
$$;

revoke execute on function public.my_coach_status() from public, anon;
grant execute on function public.my_coach_status() to authenticated;

create or replace function public.set_auto_upgrade(p_on boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet' using errcode = '42501';
  end if;
  insert into public.coach_usage (owner_id, auto_upgrade)
  values (auth.uid(), coalesce(p_on, false))
  on conflict (owner_id) do update set auto_upgrade = coalesce(p_on, false);
end;
$$;

revoke execute on function public.set_auto_upgrade(boolean) from public, anon;
grant execute on function public.set_auto_upgrade(boolean) to authenticated;

-- --- Teams verwalten ------------------------------------------------------------
--
-- Alles über Funktionen, keine Schreibregel auf den Tabellen. Jede Funktion
-- prüft, WER handelt (auth.uid()), und nimmt keine Kennung aus dem Aufruf,
-- die über Rechte entscheidet — genau die Lehre aus links_update_involved.

create or replace function public.create_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_team uuid;
begin
  if v_uid is null then
    raise exception 'nicht angemeldet' using errcode = '42501';
  end if;
  if exists (select 1 from public.team_members where user_id = v_uid) then
    raise exception 'already_in_team' using errcode = 'P0001';
  end if;
  if public.coach_seats(public.coach_product_of(v_uid)) < 2 then
    raise exception 'plan_without_team' using errcode = 'P0001';
  end if;

  insert into public.teams (owner_id, name)
  values (v_uid, left(coalesce(trim(p_name), ''), 80))
  returning id into v_team;
  insert into public.team_members (team_id, user_id, role) values (v_team, v_uid, 'owner');

  perform public.log_security_event('team_created', v_uid, null, jsonb_build_object('team_id', v_team));
  return v_team;
end;
$$;

create or replace function public.rename_team(p_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.teams set name = left(coalesce(trim(p_name), ''), 80)
  where owner_id = auth.uid();
  if not found then
    raise exception 'not_team_owner' using errcode = 'P0001';
  end if;
end;
$$;

-- Einen Code ausstellen. Ein Platz gilt als belegt, sobald eine offene
-- Einladung dafür existiert — sonst liessen sich mehr Codes ausgeben, als es
-- Plätze gibt, und der Schnellste gewönne.
create or replace function public.create_team_invite(p_email text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_team uuid;
  v_seats integer;
  v_used integer;
  v_token text;
begin
  select id into v_team from public.teams where owner_id = v_uid;
  if v_team is null then
    raise exception 'not_team_owner' using errcode = 'P0001';
  end if;

  v_seats := public.coach_seats(public.coach_product_of(v_uid));
  select (select count(*) from public.team_members where team_id = v_team)
       + (select count(*) from public.team_invites where team_id = v_team and accepted_at is null and expires_at > now())
    into v_used;
  if v_used >= v_seats then
    raise exception 'seats_full' using errcode = 'P0001';
  end if;

  -- Zwei zufällige UUIDs ohne Striche: 244 Bit Zufall, ohne Erweiterung.
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.team_invites (team_id, token_hash, email)
  values (v_team, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), nullif(lower(trim(coalesce(p_email, ''))), ''));

  perform public.log_security_event('team_invite_created', v_uid, null, jsonb_build_object('team_id', v_team));
  return v_token;
end;
$$;

create or replace function public.revoke_team_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.team_invites i
  using public.teams t
  where i.id = p_invite_id
    and i.team_id = t.id
    and t.owner_id = auth.uid()
    and i.accepted_at is null;
end;
$$;

create or replace function public.accept_team_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.team_invites%rowtype;
  v_owner uuid;
  v_name text;
  v_members integer;
  v_email text;
begin
  if v_uid is null then
    raise exception 'nicht angemeldet' using errcode = '42501';
  end if;

  select * into v_invite
  from public.team_invites
  where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
    and accepted_at is null
    and expires_at > now()
  for update;
  if v_invite.id is null then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.team_members where user_id = v_uid) then
    raise exception 'already_in_team' using errcode = 'P0001';
  end if;

  -- Eine Einladung an eine Adresse gilt nur für diese Adresse.
  if v_invite.email is not null then
    select lower(email) into v_email from auth.users where id = v_uid;
    if v_email is distinct from v_invite.email then
      raise exception 'invite_other_email' using errcode = 'P0001';
    end if;
  end if;

  select owner_id, name into v_owner, v_name from public.teams where id = v_invite.team_id;
  select count(*) into v_members from public.team_members where team_id = v_invite.team_id;
  if v_members >= public.coach_seats(public.coach_product_of(v_owner)) then
    raise exception 'seats_full' using errcode = 'P0001';
  end if;

  insert into public.team_members (team_id, user_id, role) values (v_invite.team_id, v_uid, 'coach');
  update public.team_invites set accepted_at = now(), accepted_by = v_uid where id = v_invite.id;

  perform public.log_security_event('team_member_joined', v_owner, null,
    jsonb_build_object('team_id', v_invite.team_id, 'member', v_uid));
  return jsonb_build_object('team_id', v_invite.team_id, 'owner_id', v_owner, 'name', v_name);
end;
$$;

create or replace function public.remove_team_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team uuid;
begin
  select id into v_team from public.teams where owner_id = auth.uid();
  if v_team is null then
    raise exception 'not_team_owner' using errcode = 'P0001';
  end if;
  delete from public.team_members
  where team_id = v_team and user_id = p_user_id and role = 'coach';
  if found then
    perform public.log_security_event('team_member_removed', p_user_id, null, jsonb_build_object('team_id', v_team));
  end if;
end;
$$;

create or replace function public.leave_team()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team uuid;
begin
  delete from public.team_members
  where user_id = auth.uid() and role = 'coach'
  returning team_id into v_team;
  if v_team is not null then
    perform public.log_security_event('team_member_left', auth.uid(), null, jsonb_build_object('team_id', v_team));
  end if;
end;
$$;

-- Das Team auflösen. Die Trainer verlieren den Zugriff, die Athleten bleiben
-- im Bestand des Inhabers — dort, wo sie immer lagen.
create or replace function public.dissolve_team()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team uuid;
begin
  delete from public.teams where owner_id = auth.uid() returning id into v_team;
  if v_team is not null then
    perform public.log_security_event('team_dissolved', auth.uid(), null, jsonb_build_object('team_id', v_team));
  end if;
end;
$$;

revoke execute on function public.create_team(text) from public, anon;
revoke execute on function public.rename_team(text) from public, anon;
revoke execute on function public.create_team_invite(text) from public, anon;
revoke execute on function public.revoke_team_invite(uuid) from public, anon;
revoke execute on function public.accept_team_invite(text) from public, anon;
revoke execute on function public.remove_team_member(uuid) from public, anon;
revoke execute on function public.leave_team() from public, anon;
revoke execute on function public.dissolve_team() from public, anon;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.rename_team(text) to authenticated;
grant execute on function public.create_team_invite(text) to authenticated;
grant execute on function public.revoke_team_invite(uuid) to authenticated;
grant execute on function public.accept_team_invite(text) to authenticated;
grant execute on function public.remove_team_member(uuid) to authenticated;
grant execute on function public.leave_team() to authenticated;
grant execute on function public.dissolve_team() to authenticated;

-- --- Lesen: nur das eigene Team -------------------------------------------------

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.coach_usage enable row level security;

create or replace function public.my_team_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select team_id from public.team_members where user_id = (select auth.uid());
$$;

revoke execute on function public.my_team_id() from public, anon;
grant execute on function public.my_team_id() to authenticated;

drop policy if exists teams_select_member on public.teams;
create policy teams_select_member on public.teams
  for select to authenticated using (id = public.my_team_id());

drop policy if exists team_members_select_same_team on public.team_members;
create policy team_members_select_same_team on public.team_members
  for select to authenticated using (team_id = public.my_team_id());

drop policy if exists team_invites_select_owner on public.team_invites;
create policy team_invites_select_owner on public.team_invites
  for select to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id and t.owner_id = (select auth.uid())));

drop policy if exists coach_usage_select_pool on public.coach_usage;
create policy coach_usage_select_pool on public.coach_usage
  for select to authenticated using (public.can_use_pool(owner_id));

-- --- Aufräumen: abgelaufene Einladungen ------------------------------------------
--
-- Wie bei den Athleten-Einladungen: dreissig Tage nach Ablauf weg. Der Hash
-- eines nie eingelösten Codes ist nutzlos, aber er ist ein Datum, das
-- niemand mehr braucht.
create or replace function public.purge_team_invites()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with gone as (
    delete from public.team_invites
    where accepted_at is null and expires_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::int from gone;
$$;

revoke execute on function public.purge_team_invites() from public, anon, authenticated;

-- Täglich, wie die übrigen Aufräumläufe.
select cron.schedule('team-invites-purge-daily', '27 3 * * *', $$select public.purge_team_invites()$$);
